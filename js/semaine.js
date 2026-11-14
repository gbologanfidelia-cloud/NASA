"use strict";

/* ========== 6 bis. CONSEILS DE LA SEMAINE ========== */

const JOURS_SEMAINE = 7;

// Résume les 7 derniers jours de mesures du capteur et de leurs écarts avec le satellite
function resumerSemaine() {
  const debut = N - JOURS_SEMAINE;
  const tranche = (cle, src) => DONNEES[cle][src].slice(debut);
  const sol = tranche("hum", "capteur");
  const temp = tranche("temp", "capteur");
  const pluie = tranche("rain", "capteur");
  const somme = (t) => t.reduce((a, b) => a + b, 0);
  const moy = (t) => somme(t) / t.length;
  const ecartSol = moy(sol.map((v, i) => v - tranche("hum", "satellite")[i]));
  const jours = sol.map((v, i) => {
    const marge = SEUIL_CHALEUR - temp[i];
    let niveau = "ok";
    if (marge <= 0) niveau = "danger";
    else if (marge <= MARGE_SURVEILLANCE || v <= SEUIL_SOL) niveau = "warning";
    return { date: etat.dates[debut + i], sol: v, temp: temp[i], pluie: pluie[i], niveau };
  });
  return {
    jours,
    solMoyen: moy(sol),
    tempMoyenne: moy(temp),
    tempMax: Math.max(...temp),
    pluieTotale: somme(pluie),
    joursPluie: pluie.filter((p) => p >= 1).length,
    joursSecs: sol.filter((v) => v <= SEUIL_SOL).length,
    joursChauds: temp.filter((t) => SEUIL_CHALEUR - t <= MARGE_SURVEILLANCE).length,
    ecartSol,
  };
}

// Règles : chaque conseil indique son niveau, sa phrase et la donnée qui le justifie
function conseilsSemaine(s) {
  const c = [];

  // Irrigation
  if (s.joursSecs >= 3) {
    c.push({ niveau: "warning", icone: "drop", titre: "Irrigation", action: "Prévoir une irrigation dès que le sol passe sous 70 %.",
      pourquoi: `Le sol a été sous le seuil de ${SEUIL_SOL} % pendant ${s.joursSecs} jours sur ${JOURS_SEMAINE}.` });
  } else if (s.pluieTotale >= 30) {
    c.push({ niveau: "good", icone: "drop", titre: "Irrigation", action: "Pas d’irrigation nécessaire. Surveillez le drainage.",
      pourquoi: `${fmt(s.pluieTotale)} mm de pluie en ${JOURS_SEMAINE} jours et un sol à ${fmt(s.solMoyen)} % en moyenne.` });
  } else {
    c.push({ niveau: "good", icone: "drop", titre: "Irrigation", action: "Sol dans la zone favorable : pas d’irrigation systématique.",
      pourquoi: `Humidité moyenne de ${fmt(s.solMoyen)} %, au-dessus du seuil de ${SEUIL_SOL} % pour le riz.` });
  }

  // Chaleur
  if (s.tempMax >= SEUIL_CHALEUR) {
    c.push({ niveau: "danger", icone: "thermo", titre: "Chaleur", action: "Protéger la culture : garder le sol bien humide aux heures chaudes.",
      pourquoi: `Pic à ${fmt(s.tempMax, 1)} °C, au-dessus du seuil indicatif de ${SEUIL_CHALEUR} °C.` });
  } else if (s.joursChauds > 0) {
    c.push({ niveau: "warning", icone: "thermo", titre: "Chaleur", action: "Surveiller la chaleur, surtout à la floraison.",
      pourquoi: `${s.joursChauds} jour${s.joursChauds > 1 ? "s" : ""} à moins de ${MARGE_SURVEILLANCE} °C du seuil. Pic à ${fmt(s.tempMax, 1)} °C.` });
  } else {
    c.push({ niveau: "good", icone: "thermo", titre: "Chaleur", action: "Pas de risque de stress thermique cette semaine.",
      pourquoi: `Température moyenne de ${fmt(s.tempMoyenne, 1)} °C, pic à ${fmt(s.tempMax, 1)} °C.` });
  }

  // Pluie
  if (s.pluieTotale < 10) {
    c.push({ niveau: "warning", icone: "rain", titre: "Pluie", action: "Semaine sèche : anticipez vos besoins en eau.",
      pourquoi: `Seulement ${fmt(s.pluieTotale)} mm en ${JOURS_SEMAINE} jours.` });
  } else {
    c.push({ niveau: "good", icone: "rain", titre: "Pluie", action: "Les pluies couvrent une bonne partie des besoins en eau.",
      pourquoi: `${fmt(s.pluieTotale)} mm cumulés, ${s.joursPluie} jour${s.joursPluie > 1 ? "s" : ""} de pluie.` });
  }

  // Fiabilité des mesures
  if (Math.abs(s.ecartSol) > 10) {
    c.push({ niveau: "info", icone: "leaf", titre: "Lecture des données", action: "Le capteur et le satellite divergent : fiez-vous au capteur pour votre parcelle.",
      pourquoi: `Écart moyen d’humidité de ${signe(s.ecartSol)} pts : le capteur lit la parcelle, le satellite lit une maille entière. Vérifiez l’étalonnage une fois par mois.` });
  }
  return c;
}

function afficherSemaine() {
  const s = resumerSemaine();
  const premier = s.jours[0].date;
  const dernier = s.jours[JOURS_SEMAINE - 1].date;
  const etiquette = { ok: "Favorable", warning: "À surveiller", danger: "Alerte" };

  $("#week-sub").textContent =
    `Du ${premier} au ${dernier} · mesures du capteur (données de démonstration)` +
    (etat.enDirect ? ` · comparées à NASA POWER en direct` : "");

  $("#week-days").innerHTML = s.jours
    .map(
      (j) => `<div class="wd ${j.niveau}" role="listitem">
        <span class="wd-date">${j.date}</span>
        <span class="wd-state"><i class="wd-dot" aria-hidden="true"></i>${etiquette[j.niveau]}</span>
        <span class="wd-row"><b>${fmt(j.sol)}</b> % sol</span>
        <span class="wd-row"><b>${fmt(j.temp, 1)}</b> °C</span>
        <span class="wd-row"><b>${fmt(j.pluie)}</b> mm</span>
      </div>`,
    )
    .join("");

  $("#week-kpis").innerHTML = [
    ["Humidité moyenne", `${fmt(s.solMoyen)} %`],
    ["Température moyenne", `${fmt(s.tempMoyenne, 1)} °C`],
    ["Pluie cumulée", `${fmt(s.pluieTotale)} mm`],
    ["Jours de sol sec", `${s.joursSecs} sur ${JOURS_SEMAINE}`],
  ]
    .map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`)
    .join("");

  const prio = { danger: "Priorité haute", warning: "Priorité moyenne", info: "À noter", good: "Favorable" };
  $("#week-advice").innerHTML = conseilsSemaine(s)
    .map(
      (a) => `<article class="alert-card ${a.niveau}">
        <div class="alert-header">
          <span class="alert-ic">${icone(a.icone)}</span>
          <span class="alert-head-txt"><span class="alert-type">${a.titre}</span><span class="alert-time">Cette semaine</span></span>
          <span class="prio" data-label="${prio[a.niveau]}">${prio[a.niveau]}</span>
        </div>
        <div class="alert-action">${a.action}</div>
        <div class="alert-reason"><b>Pourquoi :</b> ${a.pourquoi}</div>
      </article>`,
    )
    .join("");
}
