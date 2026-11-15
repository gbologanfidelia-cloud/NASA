"""
Serveur Réact+ : sert le site ET répond à POST /api/chat (contrat : docs/CHAT_API.md).

Lancer :   python serveur/app.py      puis ouvrir   http://127.0.0.1:8000
La clé d'API du modèle d'IA reste ICI, côté serveur (variable ANTHROPIC_API_KEY), jamais dans le navigateur.
"""
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from flask import Flask, Response, abort, jsonify, request, send_from_directory

try:                                   # facultatif : lit le fichier serveur/.env s'il existe
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

import assistant
import nasa
import phrases_ewe
import voix

RACINE = Path(__file__).resolve().parent.parent
DOSSIERS_PUBLICS = {"css", "js", "vendor"}      # seuls ces dossiers sont servis (pas le code du serveur ni .env)
KARA = (9.55, 1.19)                             # même point que js/config.js
MAX_MESSAGES, MAX_CARACTERES = 10, 1000
LIMITE_PAR_MINUTE = 20
LIMITE_AUDIO_PAR_MINUTE = 60

app = Flask(__name__)
_appels = defaultdict(deque)


def _trop_de_requetes(ip, nom="chat", limite=LIMITE_PAR_MINUTE):
    maintenant = time.time()
    file = _appels[(nom, ip)]
    while file and maintenant - file[0] > 60:
        file.popleft()
    if len(file) >= limite:
        return True
    file.append(maintenant)
    return False


def _nombre(v, defaut, mini, maxi):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return defaut
    return v if mini <= v <= maxi else defaut


def _texte(v, defaut, n=60):
    return v.strip()[:n] if isinstance(v, str) and v.strip() else defaut


def nettoyer_contexte(brut):
    c = brut if isinstance(brut, dict) else {}
    pluie = c.get("pluie_demain")
    return {
        "parcelle": _texte(c.get("parcelle"), "Parcelle"), "culture": _texte(c.get("culture"), "Riz", 30),
        "region": _texte(c.get("region"), "Kara, Togo"), "stade": _texte(c.get("stade"), "?", 20),
        "humidite_sol_pct": _nombre(c.get("humidite_sol_pct"), None, 0, 100),
        "temperature_c": _nombre(c.get("temperature_c"), None, -10, 60),
        "pluie_demain": pluie if isinstance(pluie, bool) else None,
        "lat": _nombre(c.get("lat"), KARA[0], -90, 90), "lon": _nombre(c.get("lon"), KARA[1], -180, 180),
    }


@app.get("/")
def accueil():
    return send_from_directory(RACINE, "index.html")


@app.get("/<dossier>/<path:fichier>")
def statique(dossier, fichier):
    if dossier not in DOSSIERS_PUBLICS:
        abort(404)
    return send_from_directory(RACINE / dossier, fichier)


@app.get("/api/sante")
def sante():
    return jsonify({"ok": True, "ia_configuree": assistant._client() is not None, "modele": assistant.MODELE,
                    "voix_ewe": phrases_ewe.etat()})


@app.get("/api/voix/<cle>")
def voix_ewe(cle):
    """Audio ewé d'un conseil du catalogue (enregistrement humain, sinon synthèse du modèle)."""
    if not phrases_ewe.FORMAT_ID.match(cle):
        abort(404)
    if _trop_de_requetes(request.remote_addr, "audio", LIMITE_AUDIO_PAR_MINUTE):
        return jsonify({"erreur": "trop de requêtes audio"}), 429
    try:
        octets = voix.audio_pour(cle, phrases_ewe.texte_ewe(cle))
    except Exception as e:                               # modèle absent, mémoire insuffisante...
        print(f"[voix] synthèse impossible pour {cle} : {type(e).__name__}: {e}")
        return jsonify({"erreur": "synthèse vocale indisponible"}), 503
    if octets is None:
        abort(404)
    return Response(octets, mimetype="audio/wav", headers={"Cache-Control": "public, max-age=86400"})


@app.post("/api/chat")
def chat():
    if _trop_de_requetes(request.remote_addr):
        return jsonify({"erreur": "trop de requêtes, réessayez dans une minute"}), 429
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("messages"), list):
        return jsonify({"erreur": "format invalide"}), 400

    messages = []
    for m in data["messages"][-MAX_MESSAGES:]:
        if isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str) and m["content"].strip():
            messages.append({"role": m["role"], "content": m["content"].strip()[:MAX_CARACTERES]})
    if not messages or messages[-1]["role"] != "user":
        return jsonify({"erreur": "la dernière question est manquante"}), 400

    contexte = nettoyer_contexte(data.get("contexte"))
    donnees = nasa.obtenir(contexte["lat"], contexte["lon"])
    texte, source = assistant.repondre(messages, contexte, donnees)
    conseils = assistant.phrases_conseil(messages[-1]["content"], contexte, donnees)
    return jsonify({
        "reponse": texte,
        "source": source,                               # 'ia' ou 'regles'
        "donnees_nasa_reelles": bool(donnees["recent"] or donnees["climat"]),
        "audio_ewe": phrases_ewe.preparer(conseils),    # [] tant qu'aucune traduction ewé validée n'existe
    })


if __name__ == "__main__":
    # Chauffe le cache pour que la première question soit rapide
    threading.Thread(target=nasa.obtenir, args=KARA, daemon=True).start()
    print("Réact+ : http://127.0.0.1:8000   (IA configurée :", assistant._client() is not None, ")")
    app.run(host="127.0.0.1", port=8000, debug=False)
