"""Teste la voix ewé SANS internet ni modèle : NASA, traductions et modèle vocal sont simulés."""
import contextlib
import io
import json
import os
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as appmod
import assistant
import nasa
import phrases_ewe
import voix

ok = True
def verifier(nom, condition):
    global ok
    ok = ok and bool(condition)
    print(("OK   " if condition else "ECHEC"), nom)

# --- NASA simulée (une semaine sèche et chaude) ---
nasa._cache[(9.55, 1.19)] = (1e18, {"lat": 9.55, "lon": 1.19, "erreurs": [], "climat": None, "recent": {
    "du": "2026-10-13", "au": "2026-11-11", "nb_jours": 30, "temp_moy_7j": 30.0, "tmax_dernier": 35.6, "tmax_moy_7j": 34.4,
    "tmin_moy_7j": 22.0, "tmax_max_30j": 37.0, "jours_chauds": 29, "pluie_3j": 0, "pluie_7j": 1, "pluie_totale": 10,
    "jours_secs_de_suite": 5, "jours_secs_30j": 25, "sol_surface_pct": 50, "sol_surface_moy_7j": 50,
    "sol_surface_il_y_a_7j": 55, "sol_racine_pct": None}})

# --- Fausse traduction (marqueurs, PAS de l'ewé) et faux modèle vocal ---
tmp = Path(tempfile.mkdtemp())
conseils = ["Il faut arroser votre champ régulièrement.", "Arrosez tôt le matin ou le soir.", "N'arrosez pas en plein soleil.",
            "Protégez vos jeunes plants de la chaleur."]
phrases_ewe.FICHIER = tmp / "phrases_ewe.json"
voix.DOSSIER_CACHE, voix.DOSSIER_AUDIO = tmp / "cache", tmp / "humain"
appels = {"n": 0}

class T:
    def __init__(self, a): self.a = a
    def cpu(self): return self
    def numpy(self): return self.a
class FauxModele:
    config = type("C", (), {"sampling_rate": 16000})()
    def eval(self): return self
    def __call__(self, **kw):
        appels["n"] += 1
        return type("S", (), {"waveform": [T(np.sin(np.linspace(0, 440, 8000)).astype("float32"))]})()
class FauxTorch:
    @staticmethod
    @contextlib.contextmanager
    def no_grad(): yield
voix._modele = (lambda texte, return_tensors=None: {"input_ids": texte}, FauxModele(), FauxTorch)

c = appmod.app.test_client()
ctx = {"parcelle": "A", "culture": "Riz", "region": "Kara", "stade": "J+42", "humidite_sol_pct": 82,
       "temperature_c": 31.9, "pluie_demain": False, "lat": 9.55, "lon": 1.19}
def poser(q): return c.post("/api/chat", json={"messages": [{"role": "user", "content": q}], "contexte": ctx}).get_json()
os.environ.pop("ANTHROPIC_API_KEY", None); os.environ.pop("VOIX_EWE", None)

print("--- 1. Aucune traduction validée : pas de bouton, le chat marche comme avant ---")
j = poser("Dois-je irriguer demain ?")
verifier("réponse normale", "Irriguer demain" in j["reponse"])
verifier("audio_ewe vide", j["audio_ewe"] == [])

print("--- 2. Traductions validées mais synthèse désactivée et pas d'enregistrement : rien à jouer ---")
phrases_ewe.FICHIER.write_text(json.dumps({f"P0{10 + i}": {"fr": f, "ee": f"[TEST] {i}"} for i, f in enumerate(conseils)}), encoding="utf-8")
verifier("audio_ewe vide (rien de jouable)", poser("Dois-je irriguer demain ?")["audio_ewe"] == [])

print("--- 3. Synthèse activée ---")
os.environ["VOIX_EWE"] = "1"
j = poser("Dois-je irriguer demain ?")
ids = [a["id"] for a in j["audio_ewe"]]
verifier("3 conseils d'arrosage proposés", ids == ["P010", "P011", "P012"])
verifier("liens /api/voix/Pxxx", all(a["src"] == f"/api/voix/{a['id']}" for a in j["audio_ewe"]))
j = poser("Comment protéger le riz de la chaleur ?")
verifier("chaleur : plantes + arrosage (pas de paille pour le riz)", [a["id"] for a in j["audio_ewe"]] == ["P013", "P011"])

print("--- 4. Route audio ---")
r = c.get("/api/voix/P010")
verifier("200 audio/wav", r.status_code == 200 and r.mimetype == "audio/wav")
w = wave.open(io.BytesIO(r.data))
verifier("WAV valide 16 kHz mono 16 bits", (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (16000, 1, 2))
c.get("/api/voix/P010")
verifier("2e demande servie depuis le cache (modèle appelé 1 fois)", appels["n"] == 1)
verifier("identifiant invalide -> 404", c.get("/api/voix/..%2Fapp").status_code == 404 and c.get("/api/voix/P1").status_code == 404)
verifier("identifiant inconnu -> 404", c.get("/api/voix/P099").status_code == 404)

print("--- 5. Enregistrement humain prioritaire ---")
voix.DOSSIER_AUDIO.mkdir()
(voix.DOSSIER_AUDIO / "P011.wav").write_bytes(b"RIFF-HUMAIN")
verifier("l'enregistrement humain remplace le modèle", c.get("/api/voix/P011").data == b"RIFF-HUMAIN")
os.environ.pop("VOIX_EWE")
(voix.DOSSIER_AUDIO / "P013.wav").write_bytes(b"RIFF-HUMAIN-2")
verifier("audio humain jouable même sans synthèse", [a["id"] for a in poser("Dois-je irriguer demain ?")["audio_ewe"]] == ["P011"])

print("--- 6. Pannes et limites ---")
os.environ["VOIX_EWE"] = "1"
voix._modele = None
voix._charger = lambda: (_ for _ in ()).throw(RuntimeError("torch absent"))
verifier("modèle indisponible -> 503 propre", c.get("/api/voix/P012").status_code == 503)
codes = [c.get("/api/voix/P011").status_code for _ in range(70)]
verifier("limite de débit audio", 429 in codes)
print("sante:", c.get("/api/sante").get_json()["voix_ewe"])
print("\nTOUS LES TESTS PASSENT" if ok else "\nDES TESTS ONT ECHOUE")
sys.exit(0 if ok else 1)
