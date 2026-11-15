// js/nasa-power.js : chargement des 14 jours NASA POWER via le backend (Render)

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://nasa-gus.onrender.com"; // URL du service Render : doit être exactement celle affichée sur Render

// Render (plan gratuit) met le service en veille : le premier appel peut durer ~1 minute.
const NASA_TIMEOUT_MS = 70000;

let chargementNasaEnCours = false;

function messageStatut(texte, live) {
  const netState = document.getElementById("net-state");
  const netPill = document.getElementById("net-pill");
  const syncLabel = document.getElementById("sync-label");
  const syncChip = document.getElementById("sync-chip");
  const srcState = document.getElementById("src-state");
  const srcStateTxt = document.getElementById("src-state-txt");
  if (netState) netState.textContent = texte;
  if (netPill) netPill.classList.toggle("live", !!live);
  if (syncChip) syncChip.classList.toggle("live", !!live);
  if (srcState) srcState.classList.toggle("live", !!live);
  return { syncLabel, srcStateTxt };
}

/**
 * Appelée au démarrage (main.js) et par le bouton #live.
 */
window.chargerNasa = async function chargerNasa() {
  if (chargementNasaEnCours) return; // évite les appels en double
  chargementNasaEnCours = true;

  const bouton = document.getElementById("live");
  if (bouton) bouton.disabled = true;
  messageStatut("Chargement NASA POWER… (jusqu'à 1 min si le serveur se réveille)", false);

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), NASA_TIMEOUT_MS);

  try {
    const reponse = await fetch(`${API_BASE_URL}/api/nasa-data`, { signal: controleur.signal });
    if (!reponse.ok) throw new Error(`Erreur HTTP : ${reponse.status}`);

    const resultat = await reponse.json();
    if (!resultat.success || !resultat.data || !resultat.data.T2M) {
      throw new Error("Format de réponse invalide reçu du serveur.");
    }

    // Le backend bascule sur des données simulées si la NASA est injoignable :
    // on les injecte quand même, mais on ne les présente pas comme réelles.
    const reel = !/secours|fallback/i.test(String(resultat.source || ""));
    console.log(`Données reçues du backend (${resultat.source}) :`, resultat);

    const injecte = injecterSeriesDansApp(resultat.data, resultat.dates);
    if (!injecte) throw new Error("Séries incomplètes (moins de 14 jours valides).");

    if (typeof etat !== "undefined") etat.enDirect = reel;

    // Tout re-dessiner, y compris la semaine et les mots simples
    if (typeof afficherTout === "function") afficherTout();

    const maintenant = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const { syncLabel, srcStateTxt } = messageStatut(
      reel ? "NASA POWER en direct" : "Données de secours (NASA injoignable)",
      reel,
    );
    if (syncLabel) {
      syncLabel.textContent = reel
        ? `NASA POWER synchronisé à ${maintenant}`
        : "Satellite : données de secours simulées";
    }
    if (srcStateTxt) {
      srcStateTxt.textContent = reel
        ? `Séries satellite : données réelles sur 14 jours (${resultat.location || "Kara, Togo"}). Le capteur reste fictif.`
        : "La NASA ne répond pas : valeurs simulées par le serveur. Réessayez plus tard.";
    }
    return resultat.data;
  } catch (erreur) {
    const delai = erreur && erreur.name === "AbortError";
    console.warn("Chargement NASA échoué :", delai ? "délai dépassé" : erreur.message);
    const { syncLabel, srcStateTxt } = messageStatut("Mode démonstration (serveur injoignable)", false);
    if (syncLabel) syncLabel.textContent = "Satellite : données de démonstration";
    if (srcStateTxt) {
      srcStateTxt.textContent = delai
        ? "Le serveur met trop de temps à répondre. Cliquez sur « Charger » pour réessayer."
        : "Serveur injoignable : valeurs de démonstration. Cliquez sur « Charger » pour réessayer.";
    }
  } finally {
    clearTimeout(minuteur);
    chargementNasaEnCours = false;
    if (bouton) bouton.disabled = false;
  }
};

// Transforme les séries { "20261030": valeur, ... } en tableaux de N jours.
// La NASA renvoie -999 quand une valeur manque : on la remplace par la dernière valeur valable.
function serie(parametre, dates) {
  if (!parametre) return null;
  const cles = Array.isArray(dates) && dates.length ? dates : Object.keys(parametre).sort();
  const brut = cles.map((d) => Number(parametre[d]));
  let precedent = null;
  const propre = brut.map((v) => {
    if (Number.isFinite(v) && v > -900) {
      precedent = v;
      return v;
    }
    return precedent;
  });
  const premier = propre.find((v) => v !== null);
  return propre.map((v) => (v === null ? premier : v));
}

// Injecte les séries dans DONNEES. Renvoie false si les données sont inutilisables.
function injecterSeriesDansApp(parametres, dates) {
  if (typeof DONNEES === "undefined") return false;
  const n = typeof N !== "undefined" ? N : 14;

  const temp = serie(parametres.T2M, dates);
  const pluie = serie(parametres.PRECTOTCORR, dates);
  const sol = serie(parametres.GWETTOP, dates);
  if (!temp || temp.length < n || temp[0] === undefined) return false;

  DONNEES.temp.satellite = temp.slice(-n);
  if (pluie && pluie.length >= n) DONNEES.rain.satellite = pluie.slice(-n);
  if (sol && sol.length >= n) DONNEES.hum.satellite = sol.slice(-n).map((v) => Math.round(v * 100));

  // Dates affichées sous les graphiques (JJ/MM)
  if (typeof etat !== "undefined" && Array.isArray(dates) && dates.length >= n) {
    etat.dates = dates.slice(-n).map((d) => {
      const s = String(d);
      return s.length === 8 ? `${s.substring(6, 8)}/${s.substring(4, 6)}` : s;
    });
  }
  return true;
}
