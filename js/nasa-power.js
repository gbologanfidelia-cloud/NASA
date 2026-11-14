// js/nasa-power.js - Gestion des données NASA POWER pour Récolte+

// Définition de l'URL du backend (local pour le développement, URL Render en production)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
  ? "http://localhost:3000" 
  : "https://votre-backend-render.onrender.com"; // Remplacez par votre vraie URL Render le moment venu

/**
 * Fonction principale appelée par main.js pour charger les données de la NASA
 */
async function chargerNasa() {
  const netState = document.getElementById("net-state");
  const netPill = document.getElementById("net-pill");
  const syncLabel = document.getElementById("sync-label");
  const syncChip = document.getElementById("sync-chip");
  const srcState = document.getElementById("src-state");
  const srcStateTxt = document.getElementById("src-state-txt");

  try {
    if (netState) netState.textContent = "Connexion au serveur NASA...";

    // Requête vers votre API backend Node.js/Express
    const reponse = await fetch(`${API_BASE_URL}/api/nasa-data`);

    if (!reponse.ok) {
      throw new Error(`Erreur HTTP : ${reponse.status}`);
    }

    const resultat = await reponse.json();

    if (resultat.success && resultat.data) {
      console.log("✅ Données NASA reçues et synchronisées :", resultat.data);

      // 1. Activer l'état "en direct" dans l'application
      if (typeof etat !== "undefined") {
        etat.enDirect = true;
      }

      const maintenant = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      // 2. Mettre à jour les indicateurs visuels de l'en-tête et des sources
      if (netState) netState.textContent = "NASA POWER en direct";
      if (netPill) netPill.classList.add("live");
      if (syncLabel) syncLabel.textContent = `NASA POWER synchronisé à ${maintenant}`;
      if (syncChip) syncChip.classList.add("live");
      if (srcState) srcState.classList.add("live");
      
      if (srcStateTxt) {
        srcStateTxt.textContent = `Séries satellite : données réelles NASA POWER (${resultat.location || "Kara, Togo"}).`;
      }

      // 3. Injecter les valeurs dans l'objet global DONNEES (utilisé par mesures.js et graphiques.js)
      injecterDonneesDansApp(resultat.data);

      return resultat.data;
    } else {
      throw new Error("Format de réponse invalide reçu du serveur.");
    }

  } catch (erreur) {
    console.warn("⚠️ Serveur injoignable, maintien du mode démonstration :", erreur.message);
    
    // Basculer proprement en mode démo si échec
    if (netState) netState.textContent = "Mode démonstration";
    if (netPill) netPill.classList.remove("live");
    if (syncLabel) syncLabel.textContent = "Satellite : données de démonstration";
    if (syncChip) syncChip.classList.remove("live");
    if (srcState) srcState.classList.remove("live");
    if (srcStateTxt) {
      srcStateTxt.textContent = "Valeurs affichées : démonstration. Chargez NASA POWER pour des données réelles.";
    }
  }
}

/**
 * Injecte les données de la NASA dans les structures globales de l'application Récolte+
 */
function injecterDonneesDansApp(nasaData) {
  if (typeof DONNEES === "undefined") {
    console.warn("L'objet global DONNEES n'est pas encore initialisé.");
    return;
  }

  const N_local = typeof N !== "undefined" ? N : 14;

  // Si le backend renvoie des tableaux de valeurs (historique)
  if (nasaData.T2M && Array.isArray(nasaData.T2M)) {
    DONNEES.temp.satellite = nasaData.T2M.slice(-N_local);
  } else if (nasaData.T2M && nasaData.T2M.value !== undefined) {
    // Si c'est une valeur unique, on met à jour la dernière position
    DONNEES.temp.satellite[N_local - 1] = nasaData.T2M.value;
  }

  if (nasaData.PRECTOTCORR && Array.isArray(nasaData.PRECTOTCORR)) {
    DONNEES.rain.satellite = nasaData.PRECTOTCORR.slice(-N_local);
  } else if (nasaData.PRECTOTCORR && nasaData.PRECTOTCORR.value !== undefined) {
    DONNEES.rain.satellite[N_local - 1] = nasaData.PRECTOTCORR.value;
  }

  if (nasaData.GWETTOP && Array.isArray(nasaData.GWETTOP)) {
    // Conversion de l'indice sol (0-1) en pourcentage si nécessaire
    DONNEES.hum.satellite = nasaData.GWETTOP.slice(-N_local).map(v => Math.round(v * 100));
  } else if (nasaData.GWETTOP && nasaData.GWETTOP.value !== undefined) {
    DONNEES.hum.satellite[N_local - 1] = Math.round(nasaData.GWETTOP.value * 100);
  }

  // 4. Rafraîchir l'affichage des cartes et graphiques si les fonctions existent
  if (typeof afficherMesures === "function") {
    afficherMesures();
  }
  if (typeof afficherGraphiques === "function") {
    afficherGraphiques();
  }
}

// Écouteur pour le bouton de chargement manuel (#live) présent dans index.html
document.addEventListener("DOMContentLoaded", () => {
  const boutonLive = document.getElementById("live");
  if (boutonLive) {
    boutonLive.addEventListener("click", () => {
      chargerNasa();
    });
  }
});
