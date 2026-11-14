/* Réact+ : carte de la parcelle (Leaflet)
 *
 *  Leaflet est fourni dans vendor/leaflet/. Les fonds de carte viennent d'Esri (satellite) et d'OpenStreetMap.
 *  Pour passer aux vraies coordonnées : modifier CARTE ci-dessous et mettre POSITION_REELLE à true.
 */
"use strict";

/* ========== 1. CONFIGURATION ========== */

const CARTE = {
  POSITION_REELLE: false, // false : affiche le badge « Position de démonstration »
  CAPTEUR: [9.5511, 1.1861], // [latitude, longitude] du capteur IoT (Kara, valeur approximative)
  // Coins du contour de la parcelle [latitude, longitude] (≈ 1,2 ha, démonstration)
  PARCELLE: [
    [9.55155, 1.18555],
    [9.55165, 1.1866],
    [9.5507, 1.1867],
    [9.5506, 1.18565],
  ],
  // Maille satellite : carré centré sur la parcelle, demi-côté en degrés (≈ 4,5 km, ordre de grandeur SMAP)
  MAILLE_DEMI_COTE: 0.0405,
  ZOOM_MAX_NATIF: 18,
};

const COULEURS_CARTE = { parcelle: "#16834A", contour: "#ffffff", maille: "#6AA5C9" };

/* ========== 2. CONSTRUCTION ========== */

function demarrerCarte() {
  const conteneur = document.getElementById("carte-parcelle");
  const secours = document.getElementById("carte-secours");
  const zone = document.getElementById("carte-zone");
  const barre = document.querySelector(".carte-bar");

  // Leaflet absent (fichier manquant, navigateur ancien) : on garde le schéma illustratif
  if (!conteneur || typeof L === "undefined") {
    if (zone) zone.hidden = true;
    if (secours) secours.hidden = false;
    if (barre) barre.hidden = true;
    return;
  }

  document.getElementById("carte-badge").hidden = CARTE.POSITION_REELLE;

  const carte = L.map(conteneur, {
    zoomControl: true,
    scrollWheelZoom: false, // la molette fait défiler la page, un clic sur la carte active le zoom
    dragging: !L.Browser.mobile, // sur téléphone, un doigt fait défiler la page ; deux doigts zooment
    tap: false,
  });
  carte.on("focus click", () => carte.scrollWheelZoom.enable());
  carte.on("blur mouseout", () => carte.scrollWheelZoom.disable());

  // Fonds de carte
  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      maxNativeZoom: CARTE.ZOOM_MAX_NATIF,
      attribution: "Imagerie © Esri, Maxar, Earthstar Geographics",
    },
  ).addTo(carte);
  const plan = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© contributeurs OpenStreetMap",
  });
  L.control.layers({ Satellite: satellite, Plan: plan }, null, { position: "topright" }).addTo(carte);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(carte);

  // Si aucune tuile ne s'affiche (hors-ligne), on le dit au lieu de laisser une carte vide
  let erreurs = 0;
  const signaler = () => {
    if (++erreurs === 3) {
      document.getElementById("carte-note").textContent =
        "Le fond de carte n’a pas pu être chargé (connexion). Le contour de la parcelle reste affiché.";
    }
  };
  satellite.on("tileerror", signaler);
  plan.on("tileerror", signaler);

  // Contour de la parcelle
  const parcelle = L.polygon(CARTE.PARCELLE, {
    color: COULEURS_CARTE.contour,
    weight: 3,
    fillColor: COULEURS_CARTE.parcelle,
    fillOpacity: 0.35,
  }).addTo(carte);
  parcelle.bindTooltip("Parcelle Alpha · 1,2 ha", { sticky: true });
  parcelle.bindPopup(
    "<b>Parcelle Alpha — Riz</b><br>Région de Kara, Togo<br>Superficie : 1,2 ha · Stade : J+42" +
      (CARTE.POSITION_REELLE ? "" : "<br><em>Contour de démonstration</em>"),
  );

  // Capteur IoT
  const icone = L.divIcon({
    className: "capteur-pin",
    html: '<span class="capteur-ping"></span><span class="capteur-dot"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  L.marker(CARTE.CAPTEUR, { icon: icone, title: "Capteur IoT", keyboard: true })
    .addTo(carte)
    .bindTooltip("Capteur IoT · mesures de démonstration", { direction: "top", offset: [0, -10] });

  // Maille satellite (affichée seulement dans la vue « Maille satellite »)
  const [lat, lng] = CARTE.CAPTEUR;
  const d = CARTE.MAILLE_DEMI_COTE;
  const maille = L.rectangle(
    [
      [lat - d, lng - d],
      [lat + d, lng + d],
    ],
    { color: COULEURS_CARTE.maille, weight: 2.5, dashArray: "8 7", fillColor: COULEURS_CARTE.maille, fillOpacity: 0.12 },
  );
  maille.bindTooltip("Maille satellite : une seule valeur pour toute cette zone", { sticky: true });

  /* ========== 3. VUES ========== */

  const boutons = {
    parcelle: document.getElementById("carte-vue-parcelle"),
    maille: document.getElementById("carte-vue-maille"),
  };

  function afficherVue(vue, animer) {
    const options = { animate: animer, duration: 0.8, maxZoom: CARTE.ZOOM_MAX_NATIF };
    if (vue === "maille") {
      maille.addTo(carte);
      carte.flyToBounds(maille.getBounds().pad(0.1), options);
    } else {
      carte.removeLayer(maille);
      carte.flyToBounds(parcelle.getBounds().pad(0.8), options);
    }
    for (const [nom, b] of Object.entries(boutons)) {
      b.classList.toggle("on", nom === vue);
      b.setAttribute("aria-pressed", String(nom === vue));
    }
  }

  boutons.parcelle.addEventListener("click", () => afficherVue("parcelle", true));
  boutons.maille.addEventListener("click", () => afficherVue("maille", true));

  carte.fitBounds(parcelle.getBounds().pad(0.8), { maxZoom: CARTE.ZOOM_MAX_NATIF });

  // La carte est dans une section qui apparaît au défilement : on recalcule sa taille quand elle est visible
  if ("ResizeObserver" in window) new ResizeObserver(() => carte.invalidateSize()).observe(conteneur);
  setTimeout(() => carte.invalidateSize(), 400);
}

demarrerCarte();
