# Assistant IA Réact+ : contrat d'API (frontend → backend)

L'interface est terminée (`chat.js`, `chat.css`, bloc HTML en bas de `index.html`).
Le backend se branche à **un seul endroit** : la fonction `appelerBackend()` dans `chat.js`.

## Mise en route

1. Créer la route `POST /api/chat` (ou changer `CHAT.ENDPOINT` dans `chat.js`).
2. Passer `CHAT.MODE_DEMO` à `false` dans `chat.js`. Les réponses de démonstration disparaissent
   et le statut affiche « En ligne ».
3. Ne jamais mettre de clé d'API dans le frontend : l'appel au modèle d'IA se fait côté serveur.

## Requête

```json
{
  "messages": [
    { "role": "user", "content": "Dois-je irriguer demain ?" }
  ],
  "contexte": {
    "parcelle": "Parcelle Alpha",
    "culture": "Riz",
    "region": "Kara, Togo",
    "stade": "J+42",
    "humidite_sol_pct": 82,
    "temperature_c": 31.9,
    "pluie_demain": true,
    "donnees_satellite_reelles": false
  },
  "langue": "fr"
}
```

- `messages` : les 10 derniers messages (`CHAT.MAX_HISTORIQUE`), du plus ancien au plus récent,
  le dernier étant la question de l'agriculteur. `role` vaut `user` ou `assistant`.
- `contexte` : valeurs actuelles du simulateur et de la parcelle (lues dans la page).
  `donnees_satellite_reelles` vaut `false` tant que NASA POWER n'a pas été chargé : le
  prompt de l'IA doit alors présenter les mesures comme des données de démonstration.

## Réponse attendue

```json
{ "reponse": "Texte de la réponse en français." }
```

- Texte brut (affiché sans HTML, retours à la ligne conservés).
- Toute réponse HTTP non 2xx, ou sans `reponse`, affiche un message d'erreur avec le bouton « Réessayer ».
- Délai maximal : 30 s (`CHAT.TIMEOUT_MS`).

## Recommandations pour le backend

- Garder les seuils du moteur de règles (sol 70 %, chaleur 35 °C) comme référence : l'IA explique, les seuils décident.
- Limiter le débit par utilisateur et la taille des messages (le frontend plafonne à 1000 caractères).
- Réponses courtes et simples : le public cible est constitué d'agriculteurs, souvent sur mobile.

## Évolutions possibles

- Streaming de la réponse : adapter `appelerBackend()` et `creerMessage()` pour mettre à jour la bulle au fil de l'eau.
- Support de la langue locale (ewé, kabiyè) : le champ `langue` est déjà transmis.
