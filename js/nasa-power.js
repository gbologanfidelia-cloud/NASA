// js/nasa-power.js - Version corrigée et sécurisée globalement

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://votre-backend-render.onrender.com";

// Déclaration explicite et globale de la fonction attendue par main.js
window.chargerNasa = async function chargerNasa() {
  const netState = document.getElementById("net-state");
  const netPill = document.getElementById("net-pill");
  const syncLabel = document.getElementById("sync-label");
  const syncChip = document.getElementById("sync-chip");
  const srcState = document.getElementById("src-state");
  const srcStateTxt = document.getElementById("src-state-txt");

  try {
    if (netState) netState.textContent = "Connexion au serveur NASA...";

    const reponse = await fetch(`${API_BASE_URL}/api/nasa-data`);

    if (!reponse.ok) {
      throw new Error(`Erreur HTTP : ${reponse.status}`);
    }

    const resultat = await reponse.json();

    if (resultat.success && resultat.data) {
      console.log("✅ Données NASA reçues côté client :", resultat.data);

      if (typeof etat !== "undefined") {
        etat.enDirect = true;
      }

      const maintenant = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      if (netState) netState.textContent = "NASA POWER en direct";
      if (netPill) netPill.classList.add("live");
      if (syncLabel) syncLabel.textContent = `NASA POWER synchronisé à ${maintenant}`;
      if (syncChip) syncChip.classList.add("live");
      if (srcState) srcState.classList.add("live");
      
      if (srcStateTxt) {
        srcStateTxt.textContent = `Séries satellite : données réelles NASA POWER (${resultat.location || "Kara, Togo"}).`;
      }

      injecterDonneesDansApp(resultat.data);
      return resultat.data;
    }
  } catch (erreur) {
    console.warn("⚠️ Serveur injoignable, maintien du mode démonstration :", erreur.message);
    
    if (netState) netState.textContent = "Mode démonstration";
    if (netPill) netPill.classList.remove("live");
    if (syncLabel) syncLabel.textContent = "Satellite : données de démonstration";
    if (syncChip) syncChip.classList.remove("live");
    if (srcState) srcState.classList.remove("live");
    if (srcStateTxt) {
      srcStateTxt.textContent = "Valeurs affichées : démonstration. Chargez NASA POWER pour des données réelles.";
    }
  }
};

function injecterDonneesDansApp(nasaData) {
  if (typeof DONNEES === "undefined") return;
  const N_local = typeof N !== "undefined" ? N : 14;

  if (nasaData.T2M) {
    DONNEES.temp.satellite[N_local - 1] = nasaData.T2M.value !== undefined ? nasaData.T2M.value : nasaData.T2M;
  }
  if (nasaData.PRECTOTCORR) {
    DONNEES.rain.satellite[N_local - 1] = nasaData.PRECTOTCORR.value !== undefined ? nasaData.PRECTOTCORR.value : nasaData.PRECTOTCORR;
  }
  if (nasaData.GWETTOP) {
    const valSol = nasaData.GWETTOP.value !== undefined ? nasaData.GWETTOP.value : nasaData.GWETTOP;
    DONNEES.hum.satellite[N_local - 1] = Math.round(valSol * 100);
  }

  if (typeof afficherMesures === "function") afficherMesures();
  if (typeof afficherGraphiques === "function") afficherGraphiques();
}

document.addEventListener("DOMContentLoaded", () => {
  const boutonLive = document.getElementById("live");
  if (boutonLive) {
    boutonLive.addEventListener("click", () => {
      window.chargerNasa();
    });
  }
});
