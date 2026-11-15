"""
Catalogue des phrases validées par un locuteur ewé (fichier phrases_ewe.json, créé par importer_phrases_ewe.py).

Principe : l'assistant ne TRADUIT PAS ses réponses à la volée (la traduction automatique se trompe) ;
il choisit des conseils-types du catalogue de 90 phrases, dont la traduction ewé a été écrite et relue par un humain.
"""
import json
import re
import unicodedata
from pathlib import Path

import voix

FICHIER = Path(__file__).resolve().parent / "phrases_ewe.json"   # {"P012": {"fr": "...", "ee": "..."}}
FORMAT_ID = re.compile(r"^P\d{3}$")


def _norm(t):
    t = unicodedata.normalize("NFD", str(t).lower().replace("’", "'"))
    return " ".join("".join(c for c in t if unicodedata.category(c) != "Mn").split())


def charger():
    try:
        brut = json.loads(FICHIER.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {k: v for k, v in brut.items() if FORMAT_ID.match(k) and isinstance(v, dict)}


def texte_ewe(cle):
    return (charger().get(cle) or {}).get("ee", "")


def preparer(phrases_fr):
    """
    Pour chaque conseil français du catalogue, renvoie une entrée jouable si une version ewé existe
    (texte validé et/ou enregistrement humain). Sinon la phrase est simplement ignorée.
    """
    par_fr = {_norm(v.get("fr", "")): (k, v) for k, v in charger().items()}
    sortie = []
    for fr in phrases_fr:
        trouve = par_fr.get(_norm(fr))
        if not trouve:
            continue
        cle, v = trouve
        ee = (v.get("ee") or "").strip()
        if ee and (voix.audio_humain(cle) or voix.synthese_activee()) or voix.audio_humain(cle):
            sortie.append({"id": cle, "fr": v["fr"], "ee": ee, "src": f"/api/voix/{cle}"})
    return sortie


def etat():
    p = charger()
    return {"phrases_ewe_validees": sum(1 for v in p.values() if (v.get("ee") or "").strip()),
            "audios_humains": voix.nb_audio_humains(), "synthese_modele": voix.synthese_activee()}
