// js/nasa-power.js - Gestion des 14 jours et du temps réel NASA POWER

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://nasa-gus.onrender.com";

window.chargerNasa = async function chargerNasa() {
  const netState = document.getElementById("net-state");
  const netPill = document.getElementById("net-pill");
  const syncLabel = document.getElementById("sync-label");
  const syncChip = document.getElementById("sync-chip");
  const srcState = document.getElementById("src-state");
  const srcStateTxt = document.getElementById("src-state-txt");

  try {
    if (netState) netState.textContent = "Chargement des 14 jours NASA...";

    const reponse = await fetch(`${API_BASE_URL}/api/nasa-data`);
    if (!reponse.ok) throw new Error(`Erreur HTTP : ${reponse.status}`);

    const resultat = await reponse.json();

    if (resultat.success && resultat.data) {
      console.log("✅ Données 14j reçues du backend :", resultat);

      if (typeof etat !== "undefined") {
        etat.enDirect = true;
        // Mettre à jour les dates si fournies par le backend
        if (resultat.dates) {
          etat.dates = resultat.dates.map(d => `${d.substring(6,8)}/${d.substring(4,6)}`);
        }
      }

      // Injecter les séries complètes et les dernières valeurs
      injecterSeriesDansApp(resultat.data);

      // Indicateurs visuels
      const maintenant = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (netState) netState.textContent = "NASA POWER en direct";
      if (netPill) netPill.classList.add("live");
      if (syncLabel) syncLabel.textContent = `NASA POWER synchronisé à ${maintenant}`;
      if (syncChip) syncChip.classList.add("live");
      if (srcState) srcState.classList.add("live");
      if (srcStateTxt) {
        srcStateTxt.textContent = `Séries satellite : données réelles sur 14 jours (${resultat.location || "Kara, Togo"}).`;
      }

      return resultat.data;
    }
  } catch (erreur) {
    console.warn("⚠️ Serveur injoignable, maintien du mode démonstration :", erreur.message);
    if (netState) netState.textContent = "Mode démonstration";
  }
};

function injecterSeriesDansApp(nasaParameters) {
  if (typeof DONNEES === "undefined") return;

  // 1. Température (T2M) -> Séries de 14 jours pour le satellite
  if (nasaParameters.T2M) {
    const seriesTemp = Object.values(nasaParameters.T2M);
    DONNEES.temp.satellite = seriesTemp; // Tout l'historique pour le graphique
  }

  // 2. Précipitations (PRECTOTCORR) -> Séries de 14 jours
  if (nasaParameters.PRECTOTCORR) {
    const seriesRain = Object.values(nasaParameters.PRECTOTCORR);
    DONNEES.rain.satellite = seriesRain;
  }

  // 3. Humidité du sol (GWETTOP) -> Convertie en pourcentage (0-100) pour l'humidité
  if (nasaParameters.GWETTOP) {
    const seriesSol = Object.values(nasaParameters.GWETTOP).map(v => Math.round(v * 100));
    DONNEES.hum.satellite = seriesSol;
  }

  // 4. Rafraîchir l'interface complète (cartes + graphiques)
  if (typeof afficherMesures === "function") afficherMesures();
  if (typeof afficherGraphiques === "function") afficherGraphiques();
  if (typeof afficherDecision === "function") afficherDecision();
}

document.addEventListener("DOMContentLoaded", () => {
  const boutonLive = document.getElementById("live");
  if (boutonLive) {
    boutonLive.addEventListener("click", () => {
      window.chargerNasa();
    });
  }
});
