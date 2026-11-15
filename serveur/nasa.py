"""
Accès aux VRAIES données NASA POWER, avec cache.

- 30 derniers jours publiés : température, pluie, humidité du sol (par jour)
- 20 ans d'historique mensuel : pluie annuelle, tendance, saison des pluies

Si la NASA ne répond pas, la fonction renvoie ce qu'elle a pu obtenir et la liste des
erreurs : l'assistant dit alors honnêtement qu'il n'a pas de données NASA (il n'invente rien).
"""
import datetime as dt
import threading
import time

import requests

BASE = "https://power.larc.nasa.gov/api/temporal"
N_JOURS = 30            # fenêtre quotidienne analysée
DELAI_PUBLICATION = 4   # POWER publie avec quelques jours de retard (comme dans nasa-power.js)
DUREE_CACHE = 6 * 3600  # 6 h : les données changent une fois par jour
TIMEOUT = 12            # secondes, par requête

_cache = {}
_verrou = threading.Lock()


def _valide(v):
    return isinstance(v, (int, float)) and v > -900   # -999 = donnée manquante chez la NASA


def _requete(url, params):
    r = requests.get(url, params=params, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()["properties"]["parameter"]


def _moyenne(valeurs):
    v = [x for x in valeurs if x is not None]
    return sum(v) / len(v) if v else None


def _pente(xs, ys):
    """Pente d'une régression linéaire simple (unité par an)."""
    mx, my = _moyenne(xs), _moyenne(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = sum((x - mx) ** 2 for x in xs)
    return num / den if den else 0.0


# ---------------------------------------------------------------- quotidien

def charger_quotidien(lat, lon):
    fin = dt.date.today() - dt.timedelta(days=DELAI_PUBLICATION)
    debut = fin - dt.timedelta(days=N_JOURS - 1)
    base = {"community": "AG", "longitude": lon, "latitude": lat, "format": "JSON",
            "start": debut.strftime("%Y%m%d"), "end": fin.strftime("%Y%m%d")}
    p, erreur = None, None
    # 1er essai : tous les paramètres utiles ; 2e essai : les 3 paramètres déjà utilisés par l'application
    for parametres in ("T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETTOP,GWETROOT", "T2M,PRECTOTCORR,GWETTOP"):
        try:
            p = _requete(f"{BASE}/daily/point", {**base, "parameters": parametres})
            break
        except (requests.RequestException, KeyError, ValueError) as e:
            erreur = e
    if p is None:
        raise RuntimeError(f"NASA POWER quotidien indisponible ({erreur})")

    def val(nom, cle, facteur=1.0):
        v = p.get(nom, {}).get(cle)
        return v * facteur if _valide(v) else None

    jours = []
    for cle in sorted(p["T2M"].keys()):
        jours.append({
            "date": dt.datetime.strptime(cle, "%Y%m%d").date(),
            "t": val("T2M", cle), "tmax": val("T2M_MAX", cle), "tmin": val("T2M_MIN", cle),
            "pluie": val("PRECTOTCORR", cle),
            "sol_surface": val("GWETTOP", cle, 100),   # fraction 0-1 -> %
            "sol_racine": val("GWETROOT", cle, 100),
        })
    return resumer_recent(jours)


def resumer_recent(jours):
    derniers = [j for j in jours if j["t"] is not None and j["pluie"] is not None]
    if len(derniers) < 7:
        raise RuntimeError("NASA POWER : moins de 7 jours exploitables")
    d7 = derniers[-7:]
    serie_sec = 0
    for j in reversed(derniers):
        if j["pluie"] < 1:
            serie_sec += 1
        else:
            break
    tmax_ref = [j["tmax"] if j["tmax"] is not None else j["t"] for j in derniers]
    sols = [j["sol_surface"] for j in derniers if j["sol_surface"] is not None]
    dernier = derniers[-1]
    return {
        "du": derniers[0]["date"].isoformat(), "au": dernier["date"].isoformat(),
        "nb_jours": len(derniers),
        "temp_moy_7j": _moyenne([j["t"] for j in d7]),
        "tmax_dernier": dernier["tmax"] if dernier["tmax"] is not None else dernier["t"],
        "tmax_max_30j": max(tmax_ref),
        "jours_chauds": sum(1 for v in tmax_ref if v >= 35),
        "pluie_3j": sum(j["pluie"] for j in derniers[-3:]),
        "pluie_7j": sum(j["pluie"] for j in d7),
        "tmax_moy_7j": _moyenne([j["tmax"] if j["tmax"] is not None else j["t"] for j in d7]),
        "tmin_moy_7j": _moyenne([j["tmin"] for j in d7]),
        "jours_secs_30j": sum(1 for j in derniers if j["pluie"] < 1),
        "pluie_totale": sum(j["pluie"] for j in derniers),
        "jours_secs_de_suite": serie_sec,
        "sol_surface_pct": sols[-1] if sols else None,
        "sol_surface_moy_7j": _moyenne(sols[-7:]) if sols else None,
        "sol_surface_il_y_a_7j": sols[-8] if len(sols) >= 8 else None,
        "sol_racine_pct": dernier["sol_racine"],
    }


# ---------------------------------------------------------------- historique

def charger_climat(lat, lon):
    fin = dt.date.today().year - 1
    p = _requete(f"{BASE}/monthly/point", {
        "parameters": "PRECTOTCORR,T2M", "community": "AG", "longitude": lon, "latitude": lat,
        "start": fin - 19, "end": fin, "format": "JSON"})
    pr, t2 = p["PRECTOTCORR"], p["T2M"]
    annees, pluie, temp = [], [], []
    mensuel = {m: [] for m in range(1, 13)}
    for an in range(fin - 19, fin + 1):
        cles = [f"{an}{m:02d}" for m in range(1, 13)]
        if not all(_valide(pr.get(c)) and _valide(t2.get(c)) for c in cles):
            continue                                    # on ignore les années incomplètes
        jours = [(dt.date(an + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)).day for m in range(1, 13)]
        mm = [pr[c] * jours[i] for i, c in enumerate(cles)]  # mm/jour -> mm/mois
        for m in range(12):
            mensuel[m + 1].append(mm[m])
        annees.append(an)
        pluie.append(sum(mm))
        temp.append(_moyenne([t2[c] for c in cles]))
    if len(annees) < 8:
        raise RuntimeError("NASA POWER : historique incomplet")
    moy = _moyenne(pluie)
    ecart = (sum((v - moy) ** 2 for v in pluie) / len(pluie)) ** 0.5
    par_mois = [_moyenne(mensuel[m]) for m in range(1, 13)]
    return {
        "annees": f"{annees[0]}-{annees[-1]}", "nb_annees": len(annees),
        "pluie_annuelle": moy, "cv": ecart / moy, "pente_pluie": _pente(annees, pluie),
        "temp_moyenne": _moyenne(temp), "pente_temp": _pente(annees, temp),
        "pluie_par_mois": par_mois,
        "mois_pluvieux": [m + 1 for m, v in enumerate(par_mois) if v >= 100],
    }


# ---------------------------------------------------------------- point d'entrée

def obtenir(lat, lon):
    """Renvoie {'recent': ..., 'climat': ..., 'erreurs': [...]} (avec cache)."""
    cle = (round(lat, 2), round(lon, 2))
    with _verrou:
        ancien = _cache.get(cle)
        if ancien and time.time() - ancien[0] < DUREE_CACHE:
            return ancien[1]
    resultat = {"lat": lat, "lon": lon, "recent": None, "climat": None, "erreurs": []}
    for nom, fonction in (("recent", charger_quotidien), ("climat", charger_climat)):
        try:
            resultat[nom] = fonction(lat, lon)
        except Exception as e:                           # réseau, format inattendu...
            resultat["erreurs"].append(f"{nom}: {e}")
    if resultat["recent"] or resultat["climat"]:        # on ne met pas en cache un échec total
        with _verrou:
            _cache[cle] = (time.time(), resultat)
    return resultat
