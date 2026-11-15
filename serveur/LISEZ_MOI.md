# Serveur de l'assistant Réact+ (NASA POWER + IA)

Ce dossier branche l'assistant du chat sur de **vraies données NASA POWER**.
Le site (`index.html`, `css/`, `js/`) est servi par ce même serveur : rien d'autre à lancer.

## Lancer (3 commandes, depuis le dossier du projet)

    pip install -r serveur/requirements.txt
    python serveur/app.py
    # puis ouvrir http://127.0.0.1:8000   (et PAS index.html en double-clic)

## Brancher le modèle d'IA (facultatif mais recommandé)

1. Copier `serveur/.env.example` en `serveur/.env` et y mettre la clé d'API (clé Anthropic : console.anthropic.com).
2. Relancer le serveur. Vérifier : http://127.0.0.1:8000/api/sante  ->  `"ia_configuree": true`.

Sans clé (ou si l'IA tombe en panne), l'assistant répond quand même avec les règles de l'équipe
(sol 70 %, chaleur 35 °C) et les données NASA ; la réponse le précise.
**Ne jamais publier `.env`** : il est dans `.gitignore`.

## Comment une question est traitée

1. Le navigateur envoie la conversation + le contexte + la position de la parcelle (`POST /api/chat`).
2. `nasa.py` récupère (cache 6 h) : 30 derniers jours publiés (température, pluie, humidité du sol) et 20 ans d'historique.
3. `assistant.py` calcule les décisions (irrigation, chaleur) avec les seuils, puis demande au modèle d'IA
   de répondre à la question **uniquement à partir de ces données** (ou répond par règles si pas d'IA).
4. Le serveur renvoie `{ "reponse": "...", "source": "ia" | "regles", "donnees_nasa_reelles": true | false }`.

## Ce qui est réel et ce qui ne l'est pas

| Donnée | Statut |
|---|---|
| Température, pluie, humidité du sol (NASA POWER) | **Réel** (humidité = modèle MERRA-2 de POWER, pas SMAP) |
| Climat sur 20 ans | **Réel** |
| Capteur de la parcelle | **Démonstration** (fictif) |
| « Pluie annoncée demain » | Réglage manuel : la NASA ne fait **aucune prévision** |

Si le capteur (démo) et la NASA donnent deux décisions différentes, l'assistant donne celle de la NASA et signale l'écart.

## Tester sans internet

    python serveur/test_serveur_simule.py

Simule la NASA et le modèle d'IA, et vérifie : réponses, repli en cas de panne, sécurité des fichiers, limite de débit.

## Pour la suite

- Fonctionnement sur Internet : héberger avec `gunicorn serveur.app:app` (ou un hébergeur Python) et mettre la clé en variable d'environnement.
- Langue ewé : le champ `langue` est déjà transmis ; la voix (MMS) et la traduction (NLLB) se branchent dans `assistant.py`.
- Ajouter gel, pluies extrêmes, évapotranspiration : même appel POWER (voir `docs/COUVERTURE_OBJECTIFS.md`).

## Voix en ewé (bouton « Écouter en éwé »)

L'assistant ne traduit PAS ses réponses à la volée (la traduction automatique se trompe). Il choisit des **conseils-types**
du catalogue de 90 phrases (`phrases_a_traduire_ewe.xlsx`) dont la traduction a été écrite par un locuteur ewé, puis les lit.

1. Le locuteur remplit la colonne jaune « Ewé (à remplir) » de l'Excel.
2. `pip install pandas openpyxl` puis `python serveur/importer_phrases_ewe.py chemin/phrases_a_traduire_ewe.xlsx` -> crée `serveur/phrases_ewe.json`.
3. Voix, deux possibilités (la 1re est prioritaire) :
   - **Enregistrements humains** : un fichier par phrase, nommé avec son identifiant : `serveur/audio_ewe/P012.wav`.
   - **Synthèse automatique** (modèle `facebook/mms-tts-ewe`, usage non commercial) : `pip install -r serveur/requirements-voix.txt`,
     puis lancer le serveur avec la variable `VOIX_EWE=1` (PowerShell : `$env:VOIX_EWE="1"; python serveur/app.py`).
4. Dans le chat, un bouton « Écouter en éwé » apparaît sous les réponses qui ont un conseil audio disponible.
   Tant qu'aucune traduction validée n'existe, aucun bouton n'apparaît : le chat fonctionne comme avant.

Vérifier : http://127.0.0.1:8000/api/sante  ->  `voix_ewe` (phrases validées, audios humains, synthèse active).
Tester sans internet : `python serveur/test_voix_simule.py`.
Obtenir l'accord écrit de chaque personne dont la voix est enregistrée.
