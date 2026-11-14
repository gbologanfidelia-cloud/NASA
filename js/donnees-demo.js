"use strict";

/* ========== 2. DONNÉES (démonstration) ========== */

// capteur = mesure sur la parcelle, satellite = mesure de la maille NASA
const DONNEES = {
  hum: {
    nom: "Humidité du sol",
    sat: "SMAP",
    unite: " %",
    uniteEcart: " pts",
    pas: 10,
    dec: 0,
    capteur: [74, 76, 79, 81, 80, 83, 82, 79, 77, 80, 84, 86, 84, 82],
    satellite: [58, 60, 63, 65, 64, 66, 66, 62, 60, 63, 67, 69, 67, 65],
  },
  temp: {
    nom: "Température",
    sat: "POWER",
    unite: " °C",
    uniteEcart: " °C",
    pas: 1,
    dec: 1,
    capteur: [29.1, 30.2, 31.0, 30.6, 29.8, 30.9, 32.1, 31.4, 30.2, 29.5, 30.8, 31.7, 32.4, 31.9],
    satellite: [28.2, 29.0, 29.8, 29.9, 29.1, 29.8, 30.7, 30.5, 29.4, 28.9, 29.6, 30.3, 31.0, 30.6],
  },
  rain: {
    nom: "Pluie",
    sat: "GPM",
    unite: " mm",
    uniteEcart: " mm",
    pas: 5,
    dec: 0,
    capteur: [0, 6, 14, 2, 0, 0, 8, 22, 4, 0, 0, 5, 12, 0],
    satellite: [1, 4, 11, 3, 0, 0, 6, 15, 5, 1, 0, 3, 9, 1],
  },
};

// Valeurs partagées par les graphiques et leur infobulle; les dates changent après le chargement NASA.
const etat = {
  dates: Array.from({ length: N }, (_, i) => `${18 + i} oct`),
  enDirect: false, // true une fois les données POWER chargées
};
