# Réact+ : guide de modification

Ouvrir `index.html` (ou lancer `python3 -m http.server`). Aucun outil de build : fichiers classiques, rechargement direct.

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Seuils (sol 70 %, chaleur 35 °C), coordonnées de Kara, nombre de jours | `js/config.js` |
| Données de démonstration capteur/satellite | `js/donnees-demo.js` |
| Cartes « dernières mesures » | `js/mesures.js` |
| Courbes et barres de comparaison | `js/graphiques.js` |
| Règles irrigation / chaleur | `js/decisions.js` |
| Conseils de la semaine | `js/semaine.js` |
| Section « en mots simples » | `js/simple.js` |
| Appel NASA POWER (paramètres, URL) | `js/nasa-power.js` |
| Carte de la parcelle | `js/carte.js` |
| Cultures, sols, plans de rotation | `js/rotation-donnees.js` |
| Calcul des notes de rotation, climat 20 ans | `js/rotation.js` |
| Assistant IA (branchement backend) | `js/chat.js` + `docs/CHAT_API.md` |
| Démarrage, thème, navigation | `js/main.js` |

CSS, un fichier par section dans `css/` (numérotés dans l'ordre de chargement ; ne pas changer l'ordre) :
`01-base` (variables, couleurs, mode sombre) · `02-navigation` · `03-accueil` · `04-mesures` · `05-parcelle-sources` · `06-analyses` · `07-rotation` · `08-simple` · `09-semaine` · `10-recommandations` · `11-animations-responsive` · `12-chat`.

Les couleurs se changent toutes dans `css/01-base.css` (`:root` et `:root[data-theme="dark"]`).

## Ordre des scripts (index.html)
`config → donnees-demo → utils → graphiques → mesures → decisions → semaine → simple → nasa-power → main → carte → rotation-donnees → rotation → chat`

## Images (domaine agricole)
Déposer de vraies photos dans `images/` (format JPG, ~1600 px de large, moins de 400 Ko chacune) :
`accueil.jpg` (grande image d'en-tête, optionnelle) · `champ-riz.jpg` · `irrigation.jpg` · `recolte.jpg`.
Une photo manquante est masquée automatiquement. Sources libres : Wikimedia Commons, FAO Photo Library, Unsplash. Vérifier la licence et citer l'auteur si elle l'exige.
