// js/client-api.js (Côté Client / Navigateur)

// 1. Définir l'URL de votre serveur backend (en local pour tester, puis l'URL Render en ligne)
const API_BASE_URL = "http://localhost:3000"; // À remplacer par "https://votre-app.onrender.com" une fois déployé

/**
 * Fonction principale pour récupérer les données NASA depuis votre backend
 */
async function recupererDonneesNasaClient() {
  const netState = document.getElementById("net-state");
  const syncLabel = document.getElementById("sync-label");
  const srcStateTxt = document.getElementById("src-state-txt");

  try {
    if (netState) netState.textContent = "Connexion au serveur...";

    // Appel HTTP GET vers la route /api/nasa-data de votre serveur
    const reponse = await fetch(`${API_BASE_URL}/api/nasa-data`);

    if (!reponse.ok) {
      throw new Error(`Erreur serveur : ${reponse.status}`);
    }

    const resultat = await reponse.json();

    if (resultat.success && resultat.data) {
      console.log("✅ Données NASA reçues côté client :", resultat.data);

      // Mise à jour des badges d'état dans votre HTML
      if (netState) netState.textContent = "En direct (NASA)";
      if (syncLabel) syncLabel.textContent = `Satellite : données réelles (${resultat.location})`;
      if (srcStateTxt) srcStateTxt.textContent = "Valeurs affichées : données réelles NASA POWER en direct.";

      // Déclencher la mise à jour des cartes et graphiques de la page
      mettreAJourInterface(resultat.data);

      return resultat.data;
    }
  } catch (erreur) {
    console.warn("⚠️ Serveur injoignable, maintien du mode démonstration :", erreur.message);
    if (netState) netState.textContent = "Mode démonstration";
  }
}

/**
 * Injecte les valeurs reçues dans les éléments de votre tableau de bord
 */
function mettreAJourInterface(nasaData) {
  // Exemple d'extraction des valeurs reçues de votre serveur
  const temperature = nasaData.T2M?.value;          // Température (°C)
  const pluie = nasaData.PRECTOTCORR?.value;        // Précipitations (mm)
  const humiditeAir = nasaData.RH2M?.value;         // Humidité relative (%)
  const humiditeSol = nasaData.GWETTOP?.value;      // Humidité du sol (indice 0 à 1)

  // Vous pouvez ici passer ces variables aux fonctions existantes de vos fichiers mesures.js ou graphiques.js
  console.log(`Temp: ${temperature}°C | Pluie: ${pluie}mm | Sol: ${humiditeSol}`);
}

// 2. Exécuter au chargement de la page, puis actualiser régulièrement (ex: toutes les 30 secondes)
document.addEventListener("DOMContentLoaded", () => {
  recupererDonneesNasaClient();

  // Attacher aussi l'action au bouton "Charger les données NASA POWER en direct" déjà présent dans votre HTML (#live)
  const boutonLive = document.getElementById("live");
  if (boutonLive) {
    boutonLive.addEventListener("click", recupererDonneesNasaClient);
  }
});
