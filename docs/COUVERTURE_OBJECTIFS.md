# Couverture de l'objectif NASA Space Apps

État du code tel que reçu (vérifié en lisant les sources). « Réel » = données NASA chargées ; « démo » = valeurs fictives.

## Jeux de données

| Jeu de données | État |
|---|---|
| NASA POWER | **Réel** : T2M, PRECTOTCORR, GWETTOP sur 14 jours (`nasa-power.js`) et historique 20 ans pluie/température (`rotation.js`) |
| SMAP | Affiché comme nom de source, mais valeurs **démo** (POWER GWETTOP les remplace en direct) |
| GPM | Idem : **démo** (remplacé par POWER en direct) |
| ECOSTRESS, Landsat, MODIS, GRACE / GRACE-FO, SRTM | **Absents** |

## Analyses demandées

| Indicateur | État |
|---|---|
| Tendance de température | Oui (14 jours + tendance par décennie sur 20 ans) |
| Stress thermique | Oui (seuil 35 °C, marge de surveillance) |
| Précipitations, tendance et régularité | Oui |
| Humidité du sol | Oui (surface seulement ; pas de zone racinaire) |
| Évaporation / évapotranspiration | **Absent** (ECOSTRESS ou POWER EVLAND à ajouter) |
| Risque de gel | **Absent** (T2M_MIN de POWER suffirait) |
| Précipitations extrêmes | **Absent** (seuils sur PRECTOTCORR journalier à ajouter) |
| Stress de la végétation | **Absent** (NDVI MODIS/Landsat) |
| Tendances de l'eau à long terme | **Absent** (GRACE) ; seule la pluie 20 ans existe |
| Altitude / pente | **Absent** (SRTM) |

## Contexte local et priorités de l'agriculteur

| Élément | État |
|---|---|
| Type de sol | Partiel : 3 classes (sableux, limoneux, argileux) |
| Caractéristiques des cultures | Oui : 9 cultures (eau, azote, tolérance sécheresse, revenu), à valider par un agronome |
| Utilisation de l'eau | Oui |
| Fixation d'azote | Oui (légumineuses) |
| Matière organique | Indirect (note « santé du sol »), pas de critère dédié |
| Valeur fourragère | **Absent** |
| Réduction de l'érosion | **Absent** (nécessiterait pente SRTM + couverture du sol) |
| Adéquation au marché | Partiel : « revenu relatif » qualitatif, sans prix locaux |

## Priorités suggérées pour la suite
1. Passer SMAP/GPM en données réelles (Earthdata) ou retirer leurs noms tant qu'ils sont fictifs.
2. Ajouter gel, pluies extrêmes et évapotranspiration (tout est disponible via POWER, même appel).
3. Ajouter NDVI (MODIS) pour le stress de la végétation, GRACE pour l'eau à long terme, SRTM pour l'érosion.
4. Ajouter les critères fourrage, érosion, matière organique dans `rotation-donnees.js` et les curseurs de priorité.
