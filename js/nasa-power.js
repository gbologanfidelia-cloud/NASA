// js/nasa-power.js - Version finale corrigée et optimisée pour Récolte+

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://nasa-gus.onrender.com"; // Votre URL Render en production

/**
 * Fonction principale appelée par main.js pour charger les données de la NASA
 */
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
    if (!reponse.ok) {
      throw new Error(`Erreur HTTP : ${reponse.status}`);
    }

    const resultat = await reponse.json();

    if (resultat.success && resultat.data) {
      console.log("✅ Données 14j reçues du backend :", resultat);

      if (typeof etat !== "undefined") {
        etat.enDirect = true;
        // Mettre à jour les dates si fournies au format JJ/MM
        if (resultat.dates && Array.isArray(resultat.dates)) {
          etat.dates = resultat.dates.map(d => {
            const str = String(d);
            if (str.length === 8) {
              return `${str.substring(6, 8)}/${str.substring(4, 6)}`;
            }
            return str;
          });
        }
      }

      // Injecter et sécuriser les séries dans l'application
      injecterSeriesDansApp(resultat.data);

      // Indicateurs visuels de succès
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
    } else {
      throw new Error("Format de réponse invalide reçu du serveur.");
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

/**
 * Injecte et sécurise les séries de 14 jours dans les objets globaux
 */
function injecterSeriesDansApp(nasaParameters) {
  if (typeof DONNEES === "undefined") return;

  const N_local = typeof N !== "undefined" ? N : 14;

  // 1. Température (T2M) -> Séries de 14 jours
  if (nasaParameters.T2M) {
    const valeurs = Array.isArray(nasaParameters.T2M) 
      ? nasaParameters.T2M 
      : Object.values(nasaParameters.T2M);
      
    if (valeurs.length > 0) {
      DONNEES.temp.satellite = valeurs.slice(-N_local).map(v => Number(v) || 0);
    }
  }

  // 2. Précipitations (PRECTOTCORR) -> Séries de 14 jours
  if (nasaParameters.PRECTOTCORR) {
    const valeurs = Array.isArray(nasaParameters.PRECTOTCORR) 
      ? nasaParameters.PRECTOTCORR 
      : Object.values(nasaParameters.PRECTOTCORR);
      
    if (valeurs.length > 0) {
      DONNEES.rain.satellite = valeurs.slice(-N_local).map(v => Number(v) || 0);
    }
  }

  // 3. Humidité du sol (GWETTOP) -> Convertie en pourcentage (0-100)
  if (nasaParameters.GWETTOP) {
    const valeurs = Array.isArray(nasaParameters.GWETTOP) 
      ? nasaParameters.GWETTOP 
      : Object.values(nasaParameters.GWETTOP);
      
    if (valeurs.length > 0) {
      DONNEES.hum.satellite = valeurs.slice(-N_local).map(v => Math.round((Number(v) || 0) * 100));
    }
  }

  // Rafraîchir l'interface complète (cartes, graphiques, décisions)
  if (typeof afficherMesures === "function") afficherMesures();
  if (typeof afficherGraphiques === "function") afficherGraphiques();
  if (typeof afficherDecision === "function") afficherDecision();
}

// Écouteur pour le bouton de chargement manuel (#live)
document.addEventListener("DOMContentLoaded", () => {
  const boutonLive = document.getElementById("live");
  if (boutonLive) {
    boutonLive.addEventListener("click", () => {
      window.chargerNasa();
    });
  }
});
