"use strict";

/* ========== 6 ter. EN MOTS SIMPLES (mesure du jour) ========== */

// Phrases courtes, mots de tous les jours. Le niveau donne la couleur ET un mot (pas seulement la couleur).
function expliquerJour() {
  const sol = DONNEES.hum.capteur[N - 1];
  const temp = DONNEES.temp.capteur[N - 1];
  const pluie = DONNEES.rain.capteur[N - 1];
  const marge = SEUIL_CHALEUR - temp;

  const terre =
    sol > SEUIL_SOL
      ? { niveau: "good", icone: "drop", mot: "Bien", phrase: "La terre est assez mouillée. Le riz a assez d’eau." }
      : { niveau: "warning", icone: "drop", mot: "Attention", phrase: "La terre est trop sèche. Le riz a soif." };

  const chaleur =
    marge <= 0
      ? { niveau: "danger", icone: "thermo", mot: "Danger", phrase: "Il fait très chaud. Le riz souffre de la chaleur." }
      : marge <= MARGE_SURVEILLANCE
        ? { niveau: "warning", icone: "thermo", mot: "Attention", phrase: "Il fait chaud. Surveillez bien votre champ." }
        : { niveau: "good", icone: "thermo", mot: "Bien", phrase: "Il ne fait pas trop chaud. Le riz est tranquille." };

  const eau =
    pluie >= 10
      ? { niveau: "good", icone: "rain", mot: "Bien", phrase: "Il a bien plu. La terre a reçu de l’eau." }
      : pluie >= 1
        ? { niveau: "good", icone: "rain", mot: "Bien", phrase: "Il a plu un peu." }
        : { niveau: "info", icone: "rain", mot: "Rien", phrase: "Il n’a pas plu aujourd’hui." };

  const lignes = [
    { nom: "La terre", valeur: `${fmt(sol)} %`, ...terre },
    { nom: "La chaleur", valeur: `${fmt(temp, 1)} °C`, ...chaleur },
    { nom: "La pluie", valeur: `${fmt(pluie)} mm`, ...eau },
  ];

  // Ce qu'il faut faire : une ou deux phrases
  const faire = [sol > SEUIL_SOL ? "Vous n’avez pas besoin d’arroser aujourd’hui." : "Arrosez votre champ aujourd’hui."];
  if (marge <= MARGE_SURVEILLANCE) faire.push("Gardez de l’eau dans le champ aux heures chaudes de la journée.");
  const niveauFaire = marge <= 0 ? "danger" : sol <= SEUIL_SOL || marge <= MARGE_SURVEILLANCE ? "warning" : "good";

  return { lignes, faire, niveauFaire };
}

let lectureEnCours = false;

function lireTexte(texte) {
  if (!("speechSynthesis" in window)) return;
  if (lectureEnCours) {
    speechSynthesis.cancel();
    return;
  }
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = "fr-FR";
  u.rate = 0.85;
  const fin = () => {
    lectureEnCours = false;
    $("#simple-listen span").textContent = "Écouter";
  };
  u.onend = fin;
  u.onerror = fin;
  lectureEnCours = true;
  $("#simple-listen span").textContent = "Arrêter";
  speechSynthesis.speak(u);
}

function afficherSimple() {
  const e = expliquerJour();
  $("#simple-sub").textContent =
    `Dernière mesure du capteur : ${etat.dates[N - 1]} (données de démonstration). Le vert veut dire que tout va bien, l’orange demande de faire attention, le rouge est un danger.`;

  $("#simple-list").innerHTML = e.lignes
    .map(
      (l) => `<li class="simple-row ${l.niveau}">
        <span class="simple-ic">${icone(l.icone)}</span>
        <span class="simple-txt"><span class="simple-name">${l.nom} <small>${l.valeur}</small></span><span class="simple-phrase">${l.phrase}</span></span>
        <span class="simple-pill">${l.mot}</span>
      </li>`,
    )
    .join("");

  $("#simple-todo").className = `simple-todo ${e.niveauFaire}`;
  $("#simple-todo").innerHTML = `<b>Ce qu’il faut faire :</b> ${e.faire.join(" ")}`;

  const bouton = $("#simple-listen");
  if ("speechSynthesis" in window) {
    bouton.hidden = false;
    bouton.onclick = () => lireTexte(e.lignes.map((l) => `${l.nom}. ${l.phrase}`).join(" ") + " Ce qu’il faut faire. " + e.faire.join(" "));
  }
}
