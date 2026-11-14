"use strict";

/* ========== 5. MESURES ========== */

const icone = (nom) => `<svg class="ic" aria-hidden="true"><use href="#i-${nom}"/></svg>`;

// Variation entre l'avant-dernier et le dernier jour du capteur
function tendance(m) {
  const delta = m.capteur[N - 1] - m.capteur[N - 2];
  const stable = Math.abs(delta) < Math.pow(10, -m.dec) / 2;
  return { delta, sens: stable ? "flat" : delta > 0 ? "up" : "down" };
}

// Mini courbe de l'évolution du capteur sur la période
function sparkline(serie) {
  const w = 96;
  const h = 32;
  const min = Math.min(...serie);
  const etendue = Math.max(...serie) - min || 1;
  const pts = serie.map((v, i) => [(w * i) / (serie.length - 1), h - 3 - ((v - min) / etendue) * (h - 6)]);
  const ligne = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [xf, yf] = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <polygon class="area" points="0,${h} ${ligne} ${w},${h}"/>
    <polyline class="line" points="${ligne}"/>
    <circle class="end" cx="${xf.toFixed(1)}" cy="${yf.toFixed(1)}" r="3"/>
  </svg>`;
}

// État global de la parcelle, cohérent avec les seuils du moteur de décision
function etatParcelle() {
  const sol = DONNEES.hum.capteur[N - 1];
  const marge = SEUIL_CHALEUR - DONNEES.temp.capteur[N - 1];
  if (marge <= 0) {
    return { points: 1, classe: " danger", titre: "Alerte", detail: "Chaleur au-dessus du seuil du riz" };
  }
  if (marge <= MARGE_SURVEILLANCE) {
    return { points: 2, classe: " warning", titre: "À surveiller", detail: `Chaleur : marge de ${fmt(marge, 1)} °C avant le seuil` };
  }
  if (sol <= SEUIL_SOL) {
    return { points: 2, classe: " warning", titre: "À surveiller", detail: `Sol sous le seuil de ${SEUIL_SOL} % pour le riz` };
  }
  return { points: 3, classe: "", titre: "Favorable", detail: "Eau et chaleur dans les seuils du riz" };
}

function carteMesure(cle, titre, icon) {
  const m = DONNEES[cle];
  const capteur = m.capteur[N - 1];
  const satellite = m.satellite[N - 1];
  const t = tendance(m);
  const fleche = { up: "up", down: "down", flat: "flat" }[t.sens];
  return `<article class="stat-card">
    <div class="stat-top"><span class="stat-ic">${icone(icon)}</span>${titre}</div>
    <div class="stat-value"><span class="num" data-to="${capteur}" data-dec="${m.dec}">${fmt(capteur, m.dec)}</span><span class="stat-unit">${m.unite.trim()}</span></div>
    <div class="stat-foot">
      <span class="trend ${t.sens === "flat" ? "flat" : ""}">${icone(fleche)}${signe(t.delta, m.dec)}${m.uniteEcart} vs veille</span>
      ${sparkline(m.capteur)}
    </div>
    <div class="stat-source">${m.sat} ${fmt(satellite, m.dec)}${m.unite} · écart ${signe(capteur - satellite, m.dec)}${m.uniteEcart}</div>
  </article>`;
}

function carteEtat() {
  const e = etatParcelle();
  const segments = [1, 2, 3].map((i) => `<i class="${i <= e.points ? "on" : ""}"></i>`).join("");
  return `<article class="stat-card${e.classe}">
    <div class="stat-top"><span class="stat-ic">${icone("leaf")}</span>État de la parcelle</div>
    <div class="stat-value"><span class="stat-state">${e.titre}</span></div>
    <div class="stat-foot">
      <span class="trend flat">Selon les seuils du riz</span>
      <span class="level" role="img" aria-label="Niveau ${e.points} sur 3">${segments}</span>
    </div>
    <div class="stat-source">${e.detail}</div>
  </article>`;
}

// Fait « monter » les valeurs vers leur nombre final (une seule fois, au premier affichage)
function animerValeurs() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll("#reads .num").forEach((el) => {
    const cible = +el.dataset.to;
    const dec = +el.dataset.dec;
    const debut = performance.now();
    const duree = 800;
    const pas = (t) => {
      const p = Math.min(1, (t - debut) / duree);
      el.textContent = fmt(cible * (1 - Math.pow(1 - p, 3)), dec);
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  });
}

function afficherMesures() {
  // Produit les quatre cartes de résumé qui remplissent le conteneur #reads dans index.html.
  $("#reads").innerHTML =
    carteMesure("hum", "Humidité du sol", "drop") +
    carteMesure("temp", "Température", "thermo") +
    carteMesure("rain", "Précipitations", "rain") +
    carteEtat();
  if (!etat.mesuresAnimees) {
    etat.mesuresAnimees = true;
    animerValeurs();
  }
}

/* --- Indicateurs d'état (en-tête, source satellitaire) --- */

function afficherIndicateurs() {
  const live = etat.enDirect;
  const sync = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  $("#net-state").textContent = live ? "NASA POWER en direct" : "Mode démonstration";
  $("#net-pill").classList.toggle("live", live);
  $("#sync-label").textContent = live
    ? `NASA POWER synchronisé à ${sync}`
    : "Satellite : données de démonstration";
  $("#sync-chip").classList.toggle("live", live);
  $("#src-state").classList.toggle("live", live);
  $("#src-state-txt").textContent = live
    ? `Séries satellite : données réelles NASA POWER (${etat.dates[0]} au ${etat.dates[N - 1]}). Le capteur reste fictif.`
    : "Valeurs affichées : démonstration. Chargez NASA POWER pour des données réelles.";
}
