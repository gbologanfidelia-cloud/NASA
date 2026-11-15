"""
Voix en ewé : enregistrements HUMAINS d'abord, sinon synthèse par le modèle facebook/mms-tts-ewe.

- Enregistrement humain : serveur/audio_ewe/<ID>.wav   (ex. P012.wav, fait par ton locuteur : meilleure qualité)
- Sinon, si VOIX_EWE=1 : le modèle lit le texte ewé (licence CC-BY-NC : usage non commercial).
- Les audios générés sont gardés dans serveur/cache_audio/ : une phrase n'est synthétisée qu'une fois.
"""
import hashlib
import io
import os
import threading
import wave
from pathlib import Path

DOSSIER_AUDIO = Path(__file__).resolve().parent / "audio_ewe"
DOSSIER_CACHE = Path(__file__).resolve().parent / "cache_audio"
MODELE_TTS = "facebook/mms-tts-ewe"
MAX_CARACTERES = 300

_verrou = threading.Lock()
_modele = None          # (tokenizer, modèle, torch), chargé au premier besoin


def synthese_activee():
    return os.environ.get("VOIX_EWE", "0") == "1"


def audio_humain(cle):
    f = DOSSIER_AUDIO / f"{cle}.wav"
    return f if f.is_file() else None


def nb_audio_humains():
    return len(list(DOSSIER_AUDIO.glob("P*.wav"))) if DOSSIER_AUDIO.is_dir() else 0


def _charger():
    global _modele
    if _modele is None:
        import torch
        from transformers import AutoTokenizer, VitsModel
        _modele = (AutoTokenizer.from_pretrained(MODELE_TTS), VitsModel.from_pretrained(MODELE_TTS).eval(), torch)
    return _modele


def _vers_wav(signal, taux):
    """Signal décimal (-1 à 1) -> octets d'un fichier WAV 16 bits mono."""
    import numpy as np
    pcm = (np.clip(np.asarray(signal, dtype="float32"), -1.0, 1.0) * 32767).astype("<i2")
    tampon = io.BytesIO()
    with wave.open(tampon, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(taux))
        w.writeframes(pcm.tobytes())
    return tampon.getvalue()


def synthetiser(texte_ewe):
    """Texte ewé -> octets WAV (avec cache disque)."""
    texte = " ".join(texte_ewe.split())[:MAX_CARACTERES]
    if not texte:
        raise ValueError("texte vide")
    fichier = DOSSIER_CACHE / (hashlib.sha256(texte.encode("utf-8")).hexdigest()[:24] + ".wav")
    if fichier.is_file():
        return fichier.read_bytes()
    with _verrou:                                   # un seul calcul à la fois (le modèle est lourd)
        tok, modele, torch = _charger()
        entree = tok(texte, return_tensors="pt")
        with torch.no_grad():
            onde = modele(**entree).waveform[0].cpu().numpy()
        wav = _vers_wav(onde, modele.config.sampling_rate)
    DOSSIER_CACHE.mkdir(exist_ok=True)
    fichier.write_bytes(wav)
    return wav


def audio_pour(cle, texte_ewe):
    """Octets WAV pour la phrase <cle>, ou None si ni enregistrement humain ni synthèse possible."""
    humain = audio_humain(cle)
    if humain:
        return humain.read_bytes()
    if texte_ewe and synthese_activee():
        return synthetiser(texte_ewe)
    return None
