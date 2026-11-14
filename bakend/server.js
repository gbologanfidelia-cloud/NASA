
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Activer CORS pour permettre à votre frontend React de communiquer avec le serveur
app.use(cors());

// Fonction pour formater la date au format YYYYMMDD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Fonction de récupération NASA POWER
async function fetchNasaData() {
  const lat = 9.55;
  const lon = 3.98;
  
  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() - 3);
  const startDateObj = new Date(endDateObj);
  startDateObj.setDate(startDateObj.getDate() - 7);

  const startDate = formatDate(startDateObj);
  const endDate = formatDate(endDateObj);
  const parameters = 'T2M,PRECTOTCORR,RH2M,GWETTOP';
  
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=AG&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
  
  const data = await response.json();
  return data.properties.parameter;
}

// Création de la route API accessible par votre frontend
app.get('/api/nasa-data', async (req, res) => {
  try {
    console.log("📥 Requête reçue du frontend Réact+...");
    const nasaParameters = await fetchNasaData();
    
    // Formater pour renvoyer la dernière valeur de chaque paramètre
    const latestResults = {};
    for (const [paramKey, dailyValues] of Object.entries(nasaParameters)) {
      const dates = Object.keys(dailyValues).sort();
      const latestDate = dates[dates.length - 1];
      latestResults[paramKey] = {
        date: latestDate,
        value: dailyValues[latestDate]
      };
    }

    res.json({
      success: true,
      location: "Kara, Togo",
      data: latestResults
    });

  } catch (error) {
    console.error("❌ Erreur API :", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
