"use strict";

/* ========== 7. NASA POWER (données en direct) ========== */

// POWER publie avec quelques jours de retard : on s'arrête à J-4
function urlPower() {
  // Construit l'URL de l'API quotidienne NASA POWER pour Kara et les 14 derniers jours publiés.
  const jour = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const fin = new Date(Date.now() - 4 * 864e5);
  const debut = new Date(fin - (N - 1) * 864e5);
  return (
    "https://power.larc.nasa.gov/api/temporal/daily/point" +
    "?parameters=T2M,PRECTOTCORR,GWETTOP&community=AG" +
    `&longitude=${KARA.lon}&latitude=${KARA.lat}&start=${jour(debut)}&end=${jour(fin)}&format=JSON`
  );
}

// Vérifie la réponse et la convertit en séries ; lève une erreur si elle est incomplète
function lirePower(json) {
  const p = json.properties.parameter;
  const jours = Object.keys(p.T2M);
  const manquant = jours.some((j) => p.T2M[j] < -900 || p.PRECTOTCORR[j] < -900 || p.GWETTOP[j] < -900);
  if (jours.length !== N || manquant) throw new Error("données POWER incomplètes");

  return {
    dates: jours.map((j) => `${+j.slice(6)} ${MOIS[+j.slice(4, 6) - 1]}`),
    temp: jours.map((j) => p.T2M[j]),
    pluie: jours.map((j) => p.PRECTOTCORR[j]),
    humidite: jours.map((j) => p.GWETTOP[j] * 100),
  };
}

function appliquerPower(serie) {
  // Remplace les seules séries satellite; les mesures du capteur restent des données de démonstration.
  DONNEES.temp.satellite = serie.temp;
  DONNEES.rain.satellite = serie.pluie;
  DONNEES.hum.satellite = serie.humidite;
  for (const m of Object.values(DONNEES)) m.sat = "POWER";
  etat.dates = serie.dates;
  etat.enDirect = true;
}

async function chargerNasa() {
  // Gère l'état du bouton et du message HTML pendant la requête, puis rafraîchit l'interface en cas de succès.
  const bouton = $("#live");
  const message = $("#msg");
  const graphiques = $("#charts");
  const synchro = $("#sync-chip");
  bouton.disabled = true;
  graphiques.classList.add("is-loading");
  synchro.classList.add("loading");
  message.textContent = "Chargement des données NASA POWER…";

  try {
    const reponse = await fetch(urlPower());
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    appliquerPower(lirePower(await reponse.json()));
    message.textContent = "Données NASA POWER chargées. Le capteur reste fictif.";
    afficherTout();
  } catch {
    message.textContent =
      "NASA POWER indisponible (réseau ou données pas encore publiées). Les données de démonstration restent affichées.";
  }
  graphiques.classList.remove("is-loading");
  synchro.classList.remove("loading");
  bouton.disabled = false;
}
