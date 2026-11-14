const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Données de secours (fallback) si la NASA est injoignable (503)
function genererDonneesSecours() {
  const datesSimulees = [];
  const t2mSimule = {};
  const pluieSimulee = {};
  const solSimule = {};

  const aujourdhui = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() - i - 3);
    const dateStr = formatDate(d);
    datesSimulees.push(dateStr);

    t2mSimule[dateStr] = +(28 + Math.random() * 3).toFixed(1);       
    pluieSimulee[dateStr] = +(Math.random() * 5).toFixed(1);          
    solSimule[dateStr] = +(0.4 + Math.random() * 0.2).toFixed(2);     
  }

  return {
    dates: datesSimulees,
    parameters: {
      T2M: t2mSimule,
      PRECTOTCORR: pluieSimulee,
      GWETTOP: solSimule
    }
  };
}

async function fetchNasaData() {
  const lat = 9.55;
  const lon = 3.98;
  
  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() - 10); 
  const startDateObj = new Date(endDateObj);
  startDateObj.setDate(startDateObj.getDate() - 13);

  const startDate = formatDate(startDateObj);
  const endDate = formatDate(endDateObj);
  const parameters = 'T2M,PRECTOTCORR,RH2M,GWETTOP';
  
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=AG&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur HTTP NASA : ${response.status}`);
  
  const data = await response.json();
  return {
    parameters: data.properties.parameter,
    dates: Object.keys(data.properties.parameter.T2M).sort()
  };
}

app.get('/api/nasa-data', async (req, res) => {
  try {
    console.log("📥 Requête reçue pour les données NASA POWER...");
    let nasaResult;
    let sourceInfo = "NASA POWER API (Live)";

    try {
      nasaResult = await fetchNasaData();
    } catch (nasaError) {
      console.warn("⚠️ API NASA indisponible, bascule sur les données de secours :", nasaError.message);
      nasaResult = genererDonneesSecours();
      sourceInfo = "Données de secours locales (Fallback)";
    }
    
    // Réponse HTTP 200 explicite avec confirmation d'injection réussie
    return res.status(200).json({
      success: true,
      status: 200,
      message: "Données récupérées et prêtes à être injectées avec succès.",
      source: sourceInfo,
      location: "Kara, Togo",
      dates: nasaResult.dates,
      data: nasaResult.parameters
    });

  } catch (error) {
    console.error("❌ Erreur critique serveur :", error.message);
    res.status(500).json({ 
      success: false, 
      status: 500, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
