// Fonction pour injecter les données réelles de la NASA dans l'application
function injecterDonneesNasa(resultatData) {
  // 1. Activer le mode en direct
  etat.enDirect = true;

  // 2. Extraire et convertir les paramètres reçus du backend Render
  // Exemple de structure reçue : resultatData = { T2M: {date: '20251031', value: 31.5}, PRECTOTCORR: {...}, ... }
  if (resultatData.T2M) {
    DONNEES.temp.satellite[N - 1] = resultatData.T2M.value;
  }
  if (resultatData.PRECTOTCORR) {
    DONNEES.rain.satellite[N - 1] = resultatData.PRECTOTCORR.value;
  }
  if (resultatData.RH2M) {
    // Si vous souhaitez stocker l'humidité de l'air
    DONNEES.hum.satellite[N - 1] = resultatData.RH2M.value;
  }
  if (resultatData.GWETTOP) {
    // Humidité du sol de surface NASA (convertie en pourcentage 0-100 si nécessaire)
    DONNEES.hum.capteur[N - 1] = Math.round(resultatData.GWETTOP.value * 100);
  }

  // 3. Rafraîchir l'affichage des cartes et des indicateurs de la page
  afficherMesures();
  afficherIndicateurs();
  
  // Mettre à jour aussi les graphiques si la fonction existe
  if (typeof afficherGraphiques === 'function') {
    afficherGraphiques();
  }
}
