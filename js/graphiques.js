"use strict";

// Les couleurs des graphiques suivent le thème (clair/sombre) : lues dans les variables CSS
function synchroniserCouleurs() {
  const s = getComputedStyle(document.documentElement);
  const v = (nom, defaut) => s.getPropertyValue(nom).trim() || defaut;
  COULEURS.capteur = v("--g", COULEURS.capteur);
  COULEURS.satellite = v("--sat", COULEURS.satellite);
  COULEURS.negatif = v("--crit", COULEURS.negatif);
  COULEURS.grille = v("--line", COULEURS.grille);
  COULEURS.zero = v("--mut", COULEURS.zero);
  COULEURS.texte = v("--ink", COULEURS.texte);
}
/* ========== 4. GRAPHIQUES ========== */

// Les fonctions suivantes calculent les positions SVG puis assemblent le HTML injecté dans #charts.

/* --- Géométrie --- */

const posX = (i) => GRAPHE.gauche + ((GRAPHE.largeur - GRAPHE.gauche - GRAPHE.droite) * i) / (N - 1);

const posY = (v, m) => GRAPHE.haut + (GRAPHE.hauteur - GRAPHE.haut - GRAPHE.bas) * (1 - (v - m.min) / (m.max - m.min));

const points = (serie, m) => serie.map((v, i) => `${posX(i)},${posY(v, m)}`).join(" ");

const etiquettesX = (y) =>
  JOURS_AFFICHES.map((i) => `<text x="${posX(i)}" y="${y}" text-anchor="middle">${etat.dates[i]}</text>`).join("");

/* --- Calculs --- */

// Fixe les bornes de l'axe vertical sur les deux séries
function calculerAxe(m) {
  const toutes = [...m.capteur, ...m.satellite];
  m.min = Math.floor(Math.min(...toutes) / m.pas) * m.pas;
  m.max = Math.ceil(Math.max(...toutes) / m.pas) * m.pas;
  if (m.max === m.min) m.max += m.pas;
}

// Écart capteur moins satellite, jour par jour
function analyserEcart(m) {
  const valeurs = m.capteur.map((v, i) => v - m.satellite[i]);
  return {
    valeurs,
    moyenne: valeurs.reduce((a, b) => a + b) / N,
    iMax: valeurs.reduce((best, v, i) => (Math.abs(v) > Math.abs(valeurs[best]) ? i : best), 0),
    joursAuDessus: valeurs.filter((v) => v > 0).length,
  };
}

/* --- Briques SVG du graphique principal --- */

function svgMotifEcart(id) {
  return `<defs>
    <pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="${COULEURS.satellite}" fill-opacity=".12"/>
      <line y2="6" stroke="${COULEURS.texte}" stroke-opacity=".35" stroke-width="1.6"/>
    </pattern>
  </defs>`;
}

function svgGrille(m) {
  let html = "";
  for (let v = m.min; v <= m.max + 1e-9; v += m.pas) {
    const y = posY(v, m);
    html += `<line x1="${GRAPHE.gauche}" x2="${GRAPHE.largeur - GRAPHE.droite}" y1="${y}" y2="${y}" stroke="${COULEURS.grille}"/>`;
    html += `<text x="${GRAPHE.gauche - 8}" y="${y + 4}" text-anchor="end">${Math.round(v * 10) / 10}</text>`;
  }
  return html;
}

// Zone hachurée entre les deux courbes : le contour suit le capteur, puis revient par le satellite
function svgZoneEcart(m, id) {
  const retour = m.satellite
    .map((v, i) => `${posX(i)},${posY(v, m)}`)
    .reverse()
    .join(" ");
  return `<polygon points="${points(m.capteur, m)} ${retour}" fill="url(#${id})"/>`;
}

function svgCourbes(m) {
  const trait = (serie, couleur) =>
    `<polyline points="${points(serie, m)}" fill="none" stroke="${couleur}" stroke-width="3" stroke-linejoin="round"/>`;
  const pastilles = m.capteur
    .map(
      (v, i) =>
        `<circle cx="${posX(i)}" cy="${posY(v, m)}" r="3.5" fill="${COULEURS.capteur}"/>` +
        `<circle cx="${posX(i)}" cy="${posY(m.satellite[i], m)}" r="3.5" fill="${COULEURS.satellite}"/>`,
    )
    .join("");
  return trait(m.satellite, COULEURS.satellite) + trait(m.capteur, COULEURS.capteur) + pastilles;
}

// Trait vertical et valeur sur le jour où l'écart est le plus grand
function svgMarqueurEcart(m, iMax, ecart) {
  const x = posX(iMax);
  const yHaut = posY(m.capteur[iMax], m);
  const yBas = posY(m.satellite[iMax], m);
  return (
    `<line x1="${x}" x2="${x}" y1="${yHaut}" y2="${yBas}" stroke="${COULEURS.texte}" stroke-width="2" stroke-dasharray="4 3"/>` +
    `<text x="${x}" y="${Math.min(yHaut, yBas) - 10}" text-anchor="middle" font-weight="700" fill="${COULEURS.texte}">${signe(ecart, m.dec)}</text>`
  );
}

function svgPrincipal(cle, m, a) {
  const id = `h-${cle}`;
  return `<svg class="main" viewBox="0 0 ${GRAPHE.largeur} ${GRAPHE.hauteur}" role="img" aria-label="Courbes capteur et ${m.sat}, ${m.nom}">
    ${svgMotifEcart(id)}
    ${svgGrille(m)}
    ${svgZoneEcart(m, id)}
    ${svgCourbes(m)}
    ${svgMarqueurEcart(m, a.iMax, a.valeurs[a.iMax])}
    <line class="cur" y1="${GRAPHE.haut}" y2="${GRAPHE.hauteur - GRAPHE.bas}" style="display:none"/>
    ${etiquettesX(GRAPHE.hauteur - 8)}
  </svg>`;
}

/* --- Graphique de l'écart (barres) --- */

function svgBarresEcart(a) {
  const demi = (ECART.hauteur - ECART.haut - ECART.bas) / 2;
  const zero = ECART.haut + demi;
  const maxAbs = Math.ceil(Math.max(...a.valeurs.map(Math.abs))) || 1;

  const barres = a.valeurs
    .map((v, i) => {
      const h = Math.max((Math.abs(v) / maxAbs) * demi, 1);
      const y = v >= 0 ? zero - h : zero;
      const couleur = v >= 0 ? COULEURS.capteur : COULEURS.negatif;
      return `<rect x="${posX(i) - ECART.largeurBarre / 2}" y="${y}" width="${ECART.largeurBarre}" height="${h}" rx="2" fill="${couleur}"/>`;
    })
    .join("");

  const x = GRAPHE.gauche - 8;
  const echelle =
    `<text x="${x}" y="${ECART.haut + 4}" text-anchor="end">${signe(maxAbs)}</text>` +
    `<text x="${x}" y="${zero + 4}" text-anchor="end">0</text>` +
    `<text x="${x}" y="${ECART.hauteur - ECART.bas + 4}" text-anchor="end">${signe(-maxAbs)}</text>`;

  return `<svg viewBox="0 0 ${GRAPHE.largeur} ${ECART.hauteur}" role="img" aria-label="Écart capteur moins satellite">
    ${echelle}
    <line x1="${GRAPHE.gauche}" x2="${GRAPHE.largeur - GRAPHE.droite}" y1="${zero}" y2="${zero}" stroke="${COULEURS.zero}"/>
    ${barres}
    ${etiquettesX(ECART.hauteur - 6)}
  </svg>`;
}

/* --- Bloc complet d'une mesure --- */

const htmlLegende = (m) => `
  <div class="legend">
    <span class="k s">Capteur de la parcelle</span>
    <span class="k g">${m.sat} (satellite)</span>
    <span class="k h">Écart entre les deux</span>
  </div>`;

const htmlStatistiques = (m, a) => `
  <dl class="stats">
    <div><dt>Écart moyen</dt><dd>${signe(a.moyenne, m.dec)}${m.uniteEcart}</dd></div>
    <div><dt>Jour le plus éloigné</dt><dd>${etat.dates[a.iMax]} : ${signe(a.valeurs[a.iMax], m.dec)}${m.uniteEcart}</dd></div>
    <div><dt>Jours capteur au-dessus</dt><dd>${a.joursAuDessus} sur ${N}</dd></div>
  </dl>`;

function blocGraphique(cle) {
  const m = DONNEES[cle];
  calculerAxe(m);
  const a = analyserEcart(m);
  const sens = a.moyenne >= 0 ? "plus" : "moins";

  return `<div class="chart c-${cle}">
    ${htmlLegende(m)}
    <div class="plot">${svgPrincipal(cle, m, a)}<div class="tip"></div></div>
    <p class="cap">Écart : capteur moins satellite. En vert, le capteur mesure plus ; en rouge, moins.</p>
    <div class="plot">${svgBarresEcart(a)}</div>
    ${htmlStatistiques(m, a)}
    <p class="read">Le capteur mesure ${sens} que ${m.sat} en moyenne : il voit la parcelle, le satellite voit une maille entière.</p>
  </div>`;
}

/* --- Infobulle au survol --- */

function activerSurvol(svg, cle) {
  const curseur = svg.querySelector(".cur");
  const bulle = svg.parentNode.querySelector(".tip");

  svg.addEventListener("pointermove", (e) => {
    const m = DONNEES[cle];
    const rect = svg.getBoundingClientRect();
    const xSvg = ((e.clientX - rect.left) / rect.width) * GRAPHE.largeur;
    const i = Math.max(
      0,
      Math.min(
        N - 1,
        Math.round(((xSvg - GRAPHE.gauche) / (GRAPHE.largeur - GRAPHE.gauche - GRAPHE.droite)) * (N - 1)),
      ),
    );
    const ecart = m.capteur[i] - m.satellite[i];

    curseur.setAttribute("x1", posX(i));
    curseur.setAttribute("x2", posX(i));
    curseur.style.display = "";

    bulle.innerHTML =
      `<b>${etat.dates[i]}</b><br>Capteur ${fmt(m.capteur[i], m.dec)}${m.unite}` +
      `<br>${m.sat} ${fmt(m.satellite[i], m.dec)}${m.unite}` +
      `<br>Écart ${signe(ecart, m.dec)}${m.uniteEcart}`;
    bulle.style.display = "block";
    bulle.style.left = Math.min(Math.max((posX(i) / GRAPHE.largeur) * rect.width, 60), rect.width - 60) + "px";
  });

  svg.addEventListener("pointerleave", () => {
    curseur.style.display = "none";
    bulle.style.display = "none";
  });
}

function afficherGraphiques() {
  synchroniserCouleurs();
  // Construit les trois mesures, puis n'affiche que celle choisie par les radios m-hum/m-temp/m-rain.
  const cles = Object.keys(DONNEES);
  $("#charts").innerHTML = cles.map(blocGraphique).join("");
  document.querySelectorAll(".plot svg.main").forEach((svg, i) => activerSurvol(svg, cles[i]));

  $("#sub").textContent = etat.enDirect
    ? `Parcelle de riz, Kara · satellite : NASA POWER en direct, du ${etat.dates[0]} au ${etat.dates[N - 1]} · capteur de démonstration`
    : "Parcelle de riz, Kara · du 18 au 31 octobre · données de démonstration";
}
