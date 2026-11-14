/* Réact+ : données agronomiques de la rotation (à modifier ici : cultures, sols, plans, pondérations).
 * Valeurs qualitatives à faire valider par un agronome. Chargé avant rotation.js. */
"use strict";

  // Échelles de 1 (faible) à 5 (élevé). Ce sont des classes qualitatives issues de connaissances agronomiques
  // générales sur les cultures tropicales, pas des mesures. « azote » : effet sur l'azote du sol (−2 épuise … +2 enrichit).
  // « revenu » : intérêt économique RELATIF entre ces cultures, à ajuster avec les prix locaux.
  const CULTURES = {
    riz: { nom: "Riz", famille: "cereale", eau: 5, azote: -1, tol: 1, revenu: 3 },
    mais: { nom: "Maïs", famille: "cereale", eau: 3, azote: -2, tol: 2, revenu: 3 },
    sorgho: { nom: "Sorgho", famille: "cereale", eau: 2, azote: -1, tol: 5, revenu: 2 },
    mil: { nom: "Mil", famille: "cereale", eau: 1, azote: -1, tol: 5, revenu: 2 },
    soja: { nom: "Soja", famille: "legumineuse", eau: 3, azote: 2, tol: 3, revenu: 3 },
    niebe: { nom: "Niébé", famille: "legumineuse", eau: 2, azote: 2, tol: 4, revenu: 3 },
    arachide: { nom: "Arachide", famille: "legumineuse", eau: 2, azote: 1, tol: 3, revenu: 4 },
    manioc: { nom: "Manioc", famille: "tubercule", eau: 2, azote: -1, tol: 5, revenu: 3 },
    igname: { nom: "Igname", famille: "tubercule", eau: 3, azote: -1, tol: 2, revenu: 4 },
  };
  const FAMILLES = { cereale: "Céréale", legumineuse: "Légumineuse", tubercule: "Tubercule" };
  const CULTURES_PAR_DEFAUT = ["riz", "mais", "soja", "niebe", "arachide", "sorgho", "manioc"];

  const SOLS = {
    sableux: { nom: "Sableux (léger)", eau: 0.2 }, // retient mal l'eau
    limoneux: { nom: "Limoneux (moyen)", eau: 0 },
    argileux: { nom: "Argileux (lourd)", eau: -0.1 }, // retient bien l'eau
  };
  const FERTILITE = { bon: 55, moyen: 45, appauvri: 35 }; // point de départ de la note « santé du sol »
  const NIVEAUX = ["Peu important", "Important", "Très important"];
  const POIDS = [0.5, 1, 2];

  const PLANS = {
    A: { titre: "Sol d’abord", icone: "leaf", pour: "Redonner de la force à la terre" },
    B: { titre: "Économe en eau", icone: "drop", pour: "Résister aux pluies irrégulières" },
    C: { titre: "Revenu d’abord", icone: "up", pour: "Gagner le plus avec des cultures vendables" },
  };
