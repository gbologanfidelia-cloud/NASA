import sys, datetime as dt, json
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nasa, assistant, app as appmod

# --- Fausse réponse NASA, au format exact de POWER ---
class Rep:
    def __init__(self, j): self.j = j
    def raise_for_status(self): pass
    def json(self): return self.j

def faux_get(url, params=None, timeout=None):
    if "daily" in url:
        if "GWETROOT" in params["parameters"] and FORCE_ECHEC_COMPLET:
            import requests; raise requests.HTTPError("422")
        d0 = dt.datetime.strptime(params["start"], "%Y%m%d")
        n = (dt.datetime.strptime(params["end"], "%Y%m%d") - d0).days + 1
        ks = [(d0 + dt.timedelta(days=i)).strftime("%Y%m%d") for i in range(n)]
        p = {"T2M": {k: 28 + (i % 5) for i, k in enumerate(ks)},
             "PRECTOTCORR": {k: (0 if i % 3 else 6.5) for i, k in enumerate(ks)},
             "GWETTOP": {k: 0.55 + 0.01 * (i % 4) for i, k in enumerate(ks)}}
        if "GWETROOT" in params["parameters"]:
            p["T2M_MAX"] = {k: 33 + (i % 4) for i, k in enumerate(ks)}
            p["T2M_MIN"] = {k: 22 for k in ks}
            p["GWETROOT"] = {k: 0.6 for k in ks}
        p["T2M"][ks[2]] = -999      # une valeur manquante
        return Rep({"properties": {"parameter": p}})
    fin = int(params["end"]); an0 = int(params["start"])
    pr, t2 = {}, {}
    for an in range(an0, fin + 1):
        for m in range(1, 13):
            pr[f"{an}{m:02d}"] = [0.2,0.5,2,3.5,4.5,5,6,8,7,3,0.8,0.2][m-1]
            t2[f"{an}{m:02d}"] = 27
        pr[f"{an}13"] = 3; t2[f"{an}13"] = 27
    return Rep({"properties": {"parameter": {"PRECTOTCORR": pr, "T2M": t2}}})

nasa.requests.get = faux_get
FORCE_ECHEC_COMPLET = False
c = appmod.app.test_client()
ctx = {"parcelle": "Parcelle Alpha", "culture": "Riz", "region": "Kara, Togo", "stade": "J+42",
       "humidite_sol_pct": 82, "temperature_c": 31.9, "pluie_demain": True, "lat": 9.55, "lon": 1.19}

def poser(q, **kw):
    r = c.post("/api/chat", json={"messages": [{"role": "user", "content": q}], "contexte": ctx, "langue": "fr", **kw})
    return r.status_code, r.get_json()

import os; os.environ.pop("ANTHROPIC_API_KEY", None)
print("=== SANS CLÉ : règles + vraies données (simulées) ===")
for q in ["Dois-je irriguer demain ?", "Y a-t-il un risque de chaleur ?", "Quelle culture planter après le riz ?", "Combien a-t-il plu ?", "Bonjour"]:
    s, j = poser(q); print(f"\nQ: {q} -> {s} source={j.get('source')} nasa={j.get('donnees_nasa_reelles')}\n{j.get('reponse')}")

print("\n=== Repli sur 3 paramètres si les 6 sont refusés ===")
nasa._cache.clear(); FORCE_ECHEC_COMPLET = True
s, j = poser("Dois-je irriguer demain ?"); print(s, j["donnees_nasa_reelles"], j["reponse"].splitlines()[0])

print("\n=== NASA en panne totale ===")
nasa._cache.clear()
import requests
def panne(*a, **k): raise requests.ConnectionError("hors ligne")
nasa.requests.get = panne
s, j = poser("Dois-je irriguer demain ?"); print(s, j["donnees_nasa_reelles"], "|", j["reponse"].splitlines()[0], "|", j["reponse"].splitlines()[1])
nasa.requests.get = faux_get; FORCE_ECHEC_COMPLET = False; nasa._cache.clear()

print("\n=== AVEC IA (client simulé) ===")
class Bloc: type = "text"; text = "Pas besoin d'irriguer : le sol est humide (données NASA)."
class Rp: content = [Bloc()]
class FauxMessages:
    def create(self, **kw):
        FauxMessages.dernier = kw; return Rp()
class FauxClient: messages = FauxMessages()
assistant._client = lambda: FauxClient()
msgs = [{"role": "assistant", "content": "Bonjour"}, {"role": "user", "content": "Dois-je irriguer ?"}]
r = c.post("/api/chat", json={"messages": msgs, "contexte": ctx}); j = r.get_json()
print(r.status_code, j["source"], "|", j["reponse"])
k = FauxMessages.dernier
print("modèle:", k["model"], "| 1er message role:", k["messages"][0]["role"], "| données dans le prompt:", "DONNÉES RÉELLES NASA" in k["system"], "| décision:", "Irrigation : Ne pas irriguer" in k["system"])
print("--- extrait du prompt ---\n" + k["system"].split("DONNÉES\n")[1][:1500])

print("\n=== IA en panne -> repli règles ===")
class Casse:
    class messages:
        @staticmethod
        def create(**kw): raise RuntimeError("quota dépassé")
assistant._client = lambda: Casse()
r = c.post("/api/chat", json={"messages": msgs, "contexte": ctx}); print(r.status_code, r.get_json()["source"])

print("\n=== Sécurité / validation ===")
print("JSON invalide:", c.post("/api/chat", data="x", content_type="application/json").status_code)
print("dernier msg assistant:", c.post("/api/chat", json={"messages": [{"role": "assistant", "content": "a"}]}).status_code)
print(".env servi ?", c.get("/serveur/.env").status_code, "| app.py servi ?", c.get("/serveur/app.py").status_code, "| ../ ?", c.get("/js/../serveur/app.py").status_code)
print("index:", c.get("/").status_code, "| js/chat.js:", c.get("/js/chat.js").status_code, "| sante:", c.get("/api/sante").get_json())
codes = [poser("x")[0] for _ in range(25)]; print("limite de débit:", codes.count(429), "refus sur 25")
