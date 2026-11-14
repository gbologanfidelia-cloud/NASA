"use strict";

/* ========== 1. CONFIGURATION ========== */

const N = 14; // nombre de jours affichés
const SEUIL_SOL = 70; // % : humidité du sol au-dessus de laquelle le riz n'a pas besoin d'eau
const SEUIL_CHALEUR = 35; // °C : seuil indicatif de stress du riz à la floraison
const MARGE_SURVEILLANCE = 4; // °C : sous cette marge, la chaleur est à surveiller
// Coordonnées de Kara utilisées pour demander le point météo correspondant à la parcelle.
const KARA = { lat: 9.55, lon: 1.19 };

const MOIS = ["jan", "fév", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

const COULEURS = {
  capteur: "#16834A",
  satellite: "#3F6E8C",
  negatif: "#DC4C4C",
  grille: "#E1E8E3",
  zero: "#8A978E",
  texte: "#26352D",
};
// Dimensions des graphiques (unités du viewBox SVG)
const GRAPHE = { largeur: 720, hauteur: 290, gauche: 48, droite: 16, haut: 30, bas: 30 };
const ECART = { hauteur: 140, haut: 16, bas: 28, largeurBarre: 26 };
const JOURS_AFFICHES = [0, 3, 6, 9, 13]; // indices des dates écrites sous l'axe
