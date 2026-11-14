"use strict";

/* ========== 6. DÉCISIONS ========== */

/* --- Règles (sans accès à la page) --- */

function decisionIrrigation(sol, pluieDemain) {
  // Décide uniquement à partir du seuil d'humidité et de la pluie prévue, sans manipuler le DOM.
  if (sol > SEUIL_SOL) {
    return pluieDemain ? "Ne pas irriguer demain." : "Pas d’irrigation aujourd’hui, à revérifier demain.";
  }
  return pluieDemain ? "Irriguer peu : la pluie va compléter." : "Irriguer demain.";
}

function niveauChaleur(marge) {
  // Retourne le texte et la classe CSS de l'alerte selon la distance au seuil de chaleur.
  if (marge <= 0) return { titre: "Stress thermique : agir.", classe: " danger" };
  if (marge <= MARGE_SURVEILLANCE) return { titre: "Chaleur à surveiller.", classe: " warning" };
  return { titre: "Pas de stress thermique.", classe: "" };
}

/* --- Affichage --- */

function afficherDecision() {
  // Lit les contrôles HTML, recalcule les décisions et met à jour les éléments repérés par leurs ID.
  const sol = +$("#in-sol").value;
  const temp = +$("#in-t").value;
  const pluieDemain = $("#in-pl").checked;
  const tempSatellite = DONNEES.temp.satellite[N - 1];
  const pluieHier = DONNEES.rain.satellite[N - 2];
  const marge = SEUIL_CHALEUR - temp;
  const chaleur = niveauChaleur(marge);

  $("#o-sol").textContent = `${sol} %`;
  $("#o-t").textContent = `${fmt(temp, 1)} °C`;

  // Irrigation
  $("#a-irr").className = "alert-card" + (sol > SEUIL_SOL ? "" : " warning");
  $("#dd").textContent = decisionIrrigation(sol, pluieDemain);
  $("#g1").style.width = `${sol}%`;
  $("#why").innerHTML =
    `<li><b>Capteur :</b> le sol est à ${sol} %, ${sol > SEUIL_SOL ? "au-dessus du" : "sous le"} seuil de ${SEUIL_SOL} % pour le riz.</li>` +
    `<li><b>${DONNEES.rain.sat} :</b> ${fmt(pluieHier)} mm de pluie hier.</li>` +
    `<li><b>Prévision :</b> ${pluieDemain ? "de la pluie est annoncée demain." : "aucune pluie annoncée demain."}</li>`;
  $("#rule").textContent =
    `Règle : sol > ${SEUIL_SOL} % et pluie demain, donc pas d’irrigation. ` +
    `Sol à ${sol} % : ${sol > SEUIL_SOL ? "vrai" : "faux"}. Pluie demain : ${pluieDemain ? "vrai" : "faux"}. `;

  // Chaleur
  $("#a-st").className = "alert-card" + chaleur.classe;
  $("#h-st").textContent = chaleur.titre;
  $("#g2").style.width = Math.max(0, Math.min(100, (temp - 20) * 5)) + "%";
  $("#p-st").innerHTML =
    `<b>Capteur :</b> ${fmt(temp, 1)} °C, soit ${signe(temp - tempSatellite, 1)} °C par rapport à ${DONNEES.temp.sat} (${fmt(tempSatellite, 1)} °C). ` +
    (marge > 0 ? `Marge de ${fmt(marge, 1)} °C avant le` : `Dépassement de ${fmt(-marge, 1)} °C du`) +
    ` seuil indicatif de stress à la floraison (${SEUIL_CHALEUR} °C).`;
}
