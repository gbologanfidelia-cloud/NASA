/* Réact+ : module de rotation des cultures
 *
 *  1. Données des cultures (qualitatives, à faire valider par un agronome)
 *  2. Règles de notation (4 critères) et génération des 3 plans sur 3 ans
 *  3. Climat de la zone : historique NASA POWER (vraies données, chargées à la demande)
 *  4. Affichage
 *
 *  Tout est calculé dans le navigateur, sans IA : chaque note a une règle lisible (voir « Comment sont calculées les notes ? »).
 */
(function () {
  "use strict";

  const etat = {
    climat: { reel: false },
    plans: null,
  };

  /* ========== 2. RÈGLES ET PLANS ========== */

  const $ = (id) => document.getElementById(id);
  const fmt = (v, d = 0) => v.toFixed(d).replace(".", ",");
  const borne = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const moyenne = (t) => t.reduce((a, b) => a + b, 0) / t.length;

  function lireSaisie() {
    const prio = (id) => +$(id).value;
    return {
      precedente: $("rot-culture").value,
      sol: $("rot-sol").value,
      fertilite: $("rot-fertilite").value,
      repetition: +$("rot-repet").value,
      cultures: [...document.querySelectorAll("#rot-cultures input:checked")].map((i) => i.value),
      prio: { sol: prio("rot-p-sol"), eau: prio("rot-p-eau"), revenu: prio("rot-p-revenu"), res: prio("rot-p-res") },
    };
  }

  // Multiplicateur de la pénalité « eau » : sol qui retient mal l'eau, zone sèche, pluies irrégulières ou en baisse
  function facteurEau(ctx) {
    let f = 1 + SOLS[ctx.sol].eau;
    const c = etat.climat;
    if (c.reel) {
      if (c.pluieAnnuelle < 900) f += 0.4;
      else if (c.pluieAnnuelle < 1200) f += 0.2;
      if (c.cv > 0.2) f += 0.15;
      if (c.pentePluie < -5) f += 0.15;
    }
    return Math.max(0.7, f);
  }

  // Note une suite de cultures (une par année) sur 4 critères, de 0 à 100
  function evaluer(seq, ctx) {
    let brut = 0;
    seq.forEach((id, i) => {
      const c = CULTURES[id];
      const prevId = i === 0 ? ctx.precedente : seq[i - 1];
      const prev = prevId ? CULTURES[prevId] : null;
      brut += c.azote;
      if (prev) {
        if (prev.famille === "legumineuse" && c.famille !== "legumineuse") brut += 1; // reste d'azote laissé par la légumineuse
        if (prev.famille === c.famille) brut -= 1; // même famille : maladies et épuisement
        if (prevId === id) brut -= 0.5; // même culture deux fois de suite
        if (prev.azote <= -2 && c.azote <= -2) brut -= 1; // deux cultures très gourmandes
      }
    });
    const familles = new Set(seq.map((id) => CULTURES[id].famille));
    brut += 2 * (familles.size - 1);
    const sol = borne(FERTILITE[ctx.fertilite] + brut * 5);

    const besoinEau = moyenne(seq.map((id) => CULTURES[id].eau));
    const eau = borne(100 - (besoinEau - 1) * 22 * ctx.fEau);

    const revenu = borne(moyenne(seq.map((id) => CULTURES[id].revenu)) * 20);

    const tol = moyenne(seq.map((id) => CULTURES[id].tol));
    const distinctes = new Set(seq).size;
    const res = borne((65 * tol) / 5 + 10 * (familles.size - 1) + (distinctes === 3 ? 10 : 0) + (sol >= 70 ? 5 : 0));

    const poids = { sol: POIDS[ctx.prio.sol] * (ctx.fertilite === "appauvri" ? 1.5 : 1), eau: POIDS[ctx.prio.eau], revenu: POIDS[ctx.prio.revenu], res: POIDS[ctx.prio.res] };
    const somme = poids.sol + poids.eau + poids.revenu + poids.res;
    const total = borne((poids.sol * sol + poids.eau * eau + poids.revenu * revenu + poids.res * res) / somme);
    return { seq, sol, eau, revenu, res, total, besoinEau };
  }

  function enumerer(ctx) {
    const sorties = [];
    for (const a of ctx.cultures) {
      if (a === ctx.precedente) continue;
      for (const b of ctx.cultures) {
        if (b === a) continue;
        for (const c of ctx.cultures) {
          if (c === b) continue;
          sorties.push(evaluer([a, b, c], ctx));
        }
      }
    }
    return sorties;
  }

  function planifier(ctx) {
    ctx.fEau = facteurEau(ctx);
    const tous = enumerer(ctx);
    const cle = (e) => e.seq.join(">");
    const choisis = new Set();
    const prendre = (liste) => {
      const e = liste.find((x) => !choisis.has(cle(x))) || liste[0];
      choisis.add(cle(e));
      return e;
    };
    const parTotal = (a, b) => b.total - a.total;
    const A = prendre([...tous].sort((a, b) => b.sol - a.sol || parTotal(a, b)));
    const B = prendre([...tous].sort((a, b) => b.eau + b.res - (a.eau + a.res) || parTotal(a, b)));
    const viables = tous.filter((e) => e.sol >= 40);
    const C = prendre([...(viables.length ? viables : tous)].sort((a, b) => b.revenu - a.revenu || parTotal(a, b)));
    const plans = { A, B, C };
    const reco = Object.keys(plans).sort((x, y) => plans[y].total - plans[x].total)[0];
    const base = evaluer([ctx.precedente, ctx.precedente, ctx.precedente], ctx);
    return { plans, reco, base, ctx };
  }

  /* Phrases qui justifient un plan : chacune cite la donnée qui la fonde */
  function raisons(plan, type, ctx) {
    const seq = plan.seq;
    const nom = (id) => CULTURES[id].nom;
    const liste = (ids) => {
      const n = [...new Set(ids)].map(nom);
      return n.length > 1 ? `${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}` : n[0];
    };
    const R = {};

    const legs = seq.filter((id) => CULTURES[id].famille === "legumineuse");
    const suivi = seq.find((id, i) => {
      const prev = i === 0 ? ctx.precedente : seq[i - 1];
      return CULTURES[id].famille !== "legumineuse" && prev && CULTURES[prev].famille === "legumineuse";
    });
    if (legs.length) {
      R.sol = `${liste(legs)} rend${new Set(legs).size > 1 ? "ent" : ""} de l’azote à la terre.` +
        (suivi ? ` Le ${nom(suivi).toLowerCase()} qui suit en profite.` : "");
    } else {
      R.sol = "Aucune légumineuse dans ce plan : la terre ne reçoit pas d’azote.";
    }

    const niveau = plan.besoinEau < 2.4 ? "faible" : plan.besoinEau < 3.4 ? "moyen" : "élevé";
    R.eau = `Besoin en eau ${niveau} (${fmt(plan.besoinEau, 1)} sur 5 en moyenne).` +
      (ctx.fEau > 1.15 ? " Votre sol ou votre climat perd vite l’eau : cela compte." : "");

    const riches = [...new Set(seq.filter((id) => CULTURES[id].revenu >= 4))];
    R.revenu = riches.length
      ? `${liste(riches)} : revenu relatif élevé parmi vos cultures.`
      : "Revenu moyen : aucune culture à revenu élevé dans ce plan.";

    const fortes = [...new Set(seq.filter((id) => CULTURES[id].tol >= 4))];
    R.res = fortes.length
      ? `${liste(fortes)} supporte${fortes.length > 1 ? "nt" : ""} bien la sécheresse.`
      : "Aucune culture très résistante à la sécheresse dans ce plan.";

    const ordre = { A: ["sol", "res", "eau"], B: ["eau", "res", "sol"], C: ["revenu", "sol", "eau"] }[type];
    return ordre.map((k) => R[k]);
  }

  /* ========== 3. CLIMAT : HISTORIQUE NASA POWER ========== */

  function position() {
    // La position suit la carte de la parcelle (carte.js) quand elle existe
    if (typeof CARTE !== "undefined" && Array.isArray(CARTE.CAPTEUR)) return { lat: CARTE.CAPTEUR[0], lon: CARTE.CAPTEUR[1] };
    return { lat: 9.55, lon: 1.19 };
  }

  function urlHistorique(p) {
    const fin = new Date().getFullYear() - 1;
    return (
      "https://power.larc.nasa.gov/api/temporal/monthly/point" +
      `?parameters=PRECTOTCORR,T2M&community=AG&longitude=${p.lon}&latitude=${p.lat}&start=${fin - 19}&end=${fin}&format=JSON`
    );
  }

  const joursDuMois = (an, m) => new Date(an, m, 0).getDate();

  // Pente (unité par an) d'une série annuelle, par régression linéaire simple
  function pente(annees, valeurs) {
    const mx = moyenne(annees);
    const my = moyenne(valeurs);
    let num = 0;
    let den = 0;
    annees.forEach((x, i) => {
      num += (x - mx) * (valeurs[i] - my);
      den += (x - mx) ** 2;
    });
    return den ? num / den : 0;
  }

  // Transforme la réponse POWER (valeurs mensuelles) en totaux annuels ; ignore les années incomplètes
  function lireHistorique(json) {
    const pr = json.properties.parameter.PRECTOTCORR;
    const t2 = json.properties.parameter.T2M;
    const annees = [];
    const pluie = [];
    const temp = [];
    const premiere = Math.min(...Object.keys(pr).map((k) => +k.slice(0, 4)));
    const derniere = Math.max(...Object.keys(pr).map((k) => +k.slice(0, 4)));
    for (let an = premiere; an <= derniere; an++) {
      let total = 0;
      let tSomme = 0;
      let ok = true;
      for (let m = 1; m <= 12 && ok; m++) {
        const cle = `${an}${String(m).padStart(2, "0")}`;
        const p = pr[cle];
        const t = t2[cle];
        if (p === undefined || t === undefined || p < -900 || t < -900) ok = false;
        else {
          total += p * joursDuMois(an, m); // mm/jour -> mm sur le mois
          tSomme += t;
        }
      }
      if (ok) {
        annees.push(an);
        pluie.push(total);
        temp.push(tSomme / 12);
      }
    }
    if (annees.length < 8) throw new Error("historique POWER incomplet");
    const pluieMoy = moyenne(pluie);
    const ecart = Math.sqrt(moyenne(pluie.map((v) => (v - pluieMoy) ** 2)));
    return {
      reel: true,
      annees,
      pluie,
      pluieAnnuelle: pluieMoy,
      cv: ecart / pluieMoy,
      pentePluie: pente(annees, pluie),
      tempMoyenne: moyenne(temp),
      penteTemp: pente(annees, temp),
    };
  }

  async function chargerClimat() {
    const bouton = $("rot-load");
    const msg = $("rot-climat-msg");
    bouton.disabled = true;
    msg.textContent = "Chargement de l’historique NASA POWER…";
    try {
      const r = await fetch(urlHistorique(position()));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      etat.climat = lireHistorique(await r.json());
      msg.textContent = "Historique NASA POWER chargé. Il est pris en compte dans les notes.";
    } catch {
      msg.textContent = "NASA POWER indisponible pour le moment (réseau). Les notes ne tiennent pas compte du climat.";
    }
    bouton.disabled = false;
    afficherClimat();
    recalculer();
  }

  function svgPluie(c) {
    const L = 720, H = 190, g = 44, d = 12, h = 22, b = 26;
    const max = Math.ceil(Math.max(...c.pluie) / 200) * 200;
    const n = c.annees.length;
    const pas = (L - g - d) / n;
    const y = (v) => h + (H - h - b) * (1 - v / max);
    const barres = c.pluie
      .map((v, i) => `<rect class="rc-bar" x="${(g + i * pas + pas * 0.15).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(pas * 0.7).toFixed(1)}" height="${(H - b - y(v)).toFixed(1)}" rx="2"/>`)
      .join("");
    const etiquettes = c.annees
      .map((a, i) => (i === 0 || i === n - 1 || a % 5 === 0 ? `<text x="${(g + i * pas + pas / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${a}</text>` : ""))
      .join("");
    const grille = [0, max / 2, max]
      .map((v) => `<line class="rc-grid" x1="${g}" x2="${L - d}" y1="${y(v)}" y2="${y(v)}"/><text x="${g - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`)
      .join("");
    const ym = y(c.pluieAnnuelle);
    return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Pluie annuelle de ${c.annees[0]} à ${c.annees[n - 1]}, moyenne ${fmt(c.pluieAnnuelle)} millimètres">
      ${grille}${barres}
      <line class="rc-moy" x1="${g}" x2="${L - d}" y1="${ym}" y2="${ym}"/>
      ${etiquettes}
    </svg>`;
  }

  function afficherClimat() {
    const c = etat.climat;
    const zone = $("rot-climat");
    if (!c.reel) {
      zone.innerHTML = `<p class="note">Pas encore d’historique : les plans tiennent compte de votre sol, mais pas du climat de votre zone. Chargez les 20 dernières années de la NASA pour voir si les pluies baissent ou deviennent irrégulières.</p>`;
      return;
    }
    const tendance =
      Math.abs(c.pentePluie) < 3
        ? "stable"
        : c.pentePluie < 0
          ? `en baisse (${fmt(Math.abs(c.pentePluie), 1)} mm de moins par an)`
          : `en hausse (${fmt(c.pentePluie, 1)} mm de plus par an)`;
    const irreg = c.cv > 0.2 ? "très irrégulières" : c.cv > 0.12 ? "assez irrégulières" : "assez régulières";
    const chaud = c.penteTemp * 10;
    zone.innerHTML = `
      <div class="plot rot-chart">${svgPluie(c)}</div>
      <p class="note">Pluie annuelle (mm) de ${c.annees[0]} à ${c.annees[c.annees.length - 1]} : barres. Trait : moyenne.</p>
      <dl class="rot-facts">
        <div><dt>Pluie moyenne</dt><dd>${fmt(c.pluieAnnuelle)} mm par an</dd></div>
        <div><dt>Tendance de la pluie</dt><dd>${tendance}</dd></div>
        <div><dt>Régularité</dt><dd>${irreg} (±${fmt(c.cv * 100)} %)</dd></div>
        <div><dt>Température</dt><dd>${fmt(c.tempMoyenne, 1)} °C en moyenne, ${chaud >= 0 ? "+" : "−"}${fmt(Math.abs(chaud), 1)} °C par décennie</dd></div>
      </dl>`;
  }

  /* ========== 4. AFFICHAGE ========== */

  const niveauNote = (v) => (v >= 66 ? "high" : v >= 40 ? "mid" : "low");
  const noteIcone = (nom) => `<svg class="ic" aria-hidden="true"><use href="#i-${nom}"/></svg>`;
  const nomCulture = (id) => CULTURES[id].nom;

  function htmlNotes(e) {
    const lignes = [
      ["Santé du sol", e.sol],
      ["Économie d’eau", e.eau],
      ["Revenu (relatif)", e.revenu],
      ["Résilience", e.res],
    ];
    return `<div class="rot-scores">${lignes
      .map(
        ([nom, v]) => `<div class="rot-score ${niveauNote(v)}"><span class="rs-name">${nom}</span>
          <span class="rs-bar" role="img" aria-label="${nom} : ${v} sur 100"><i style="width:${v}%"></i></span><b>${v}</b></div>`,
      )
      .join("")}</div>`;
  }

  function htmlAnnees(e, ctx) {
    const cases = e.seq
      .map(
        (id, i) => `<div class="rot-year f-${CULTURES[id].famille}">
          <span class="ry-label">Année ${i + 1}</span><b>${nomCulture(id)}</b><span class="ry-fam">${FAMILLES[CULTURES[id].famille]}</span></div>`,
      )
      .join('<span class="rot-arrow" aria-hidden="true">›</span>');
    return `<div class="rot-years" aria-label="Plan sur 3 ans après ${nomCulture(ctx.precedente)}">${cases}</div>`;
  }

  function afficherPlans(res) {
    const { plans, reco, base, ctx } = res;
    $("rot-results").innerHTML = Object.entries(plans)
      .map(([lettre, e]) => {
        const m = PLANS[lettre];
        const r = raisons(e, lettre, ctx);
        return `<article class="rot-card${lettre === reco ? " best" : ""}" id="rot-plan-${lettre}">
          <div class="rot-main">
            <div class="rot-head">
              <span class="rot-letter">${lettre}</span>
              <div class="rot-title"><h3>${m.titre}</h3><p>${m.pour}</p></div>
              ${lettre === reco ? '<span class="rot-best">Le mieux pour vos priorités</span>' : ""}
            </div>
            ${htmlAnnees(e, ctx)}
            <ul class="rot-why">${r.map((t) => `<li>${t}</li>`).join("")}</ul>
          </div>
          <div class="rot-side">
            <div class="rot-total ${niveauNote(e.total)}"><b>${e.total}</b><span>/ 100<br>pour vos priorités</span></div>
            ${htmlNotes(e)}
          </div>
        </article>`;
      })
      .join("");

    $("rot-base").innerHTML = `<b>Pour comparer : refaire ${nomCulture(ctx.precedente)} chaque année.</b>
      Sol ${base.sol}, eau ${base.eau}, revenu ${base.revenu}, résilience ${base.res} (note ${base.total}/100).
      ${ctx.repetition >= 3 ? "Vous cultivez déjà la même chose depuis plusieurs saisons : la terre se fatigue, changer est la priorité." : ""}`;

    const p = plans[reco];
    $("rot-reco").innerHTML = `<b>Recommandation :</b> plan ${reco} « ${PLANS[reco].titre} », ${p.seq.map(nomCulture).join(" puis ")}. Note ${p.total} sur 100 pour vos priorités.`;

    // Résumé dans la carte « Rotation des cultures » des recommandations
    const act = $("rot-mini-action");
    const why = $("rot-mini-reason");
    if (act && why) {
      act.textContent = `${p.seq.map(nomCulture).join(", puis ")}.`;
      why.innerHTML = `<b>Plan ${reco} (${PLANS[reco].titre}) :</b> ${raisons(p, reco, ctx)[0]} <a href="#rotation">Voir les 3 plans sur 3 ans</a>`;
    }
    $("rot-erreur").hidden = true;
    $("rot-resultats-bloc").hidden = false;
  }

  function recalculer() {
    const ctx = lireSaisie();
    // textes des curseurs de priorité
    [["sol", "rot-p-sol"], ["eau", "rot-p-eau"], ["revenu", "rot-p-revenu"], ["res", "rot-p-res"]].forEach(([k, id]) => {
      $(`${id}-o`).textContent = NIVEAUX[ctx.prio[k]];
    });
    if (ctx.cultures.length < 3) {
      $("rot-erreur").hidden = false;
      $("rot-resultats-bloc").hidden = true;
      return;
    }
    etat.plans = planifier(ctx);
    afficherPlans(etat.plans);
  }

  function construireFormulaire() {
    const options = Object.entries(CULTURES)
      .map(([id, c]) => `<option value="${id}">${c.nom}</option>`)
      .join("");
    $("rot-culture").innerHTML = options;
    $("rot-culture").value = "riz";
    $("rot-sol").innerHTML = Object.entries(SOLS).map(([id, s]) => `<option value="${id}">${s.nom}</option>`).join("");
    $("rot-sol").value = "limoneux";
    $("rot-cultures").innerHTML = Object.entries(CULTURES)
      .map(
        ([id, c]) => `<label class="rot-chk"><input type="checkbox" value="${id}" ${CULTURES_PAR_DEFAUT.includes(id) ? "checked" : ""}><span>${c.nom}</span></label>`,
      )
      .join("");

    const point = (n) => "●".repeat(n) + "○".repeat(5 - n);
    const azote = (n) => (n > 0 ? `+${n} (enrichit)` : n === 0 ? "0" : `${n} (épuise)`);
    $("rot-table").innerHTML = `<thead><tr><th>Culture</th><th>Famille</th><th>Besoin en eau</th><th>Azote du sol</th><th>Résiste à la sécheresse</th><th>Revenu relatif</th></tr></thead><tbody>${Object.values(CULTURES)
      .map(
        (c) => `<tr><td>${c.nom}</td><td>${FAMILLES[c.famille]}</td><td aria-label="${c.eau} sur 5">${point(c.eau)}</td><td>${azote(c.azote)}</td><td aria-label="${c.tol} sur 5">${point(c.tol)}</td><td aria-label="${c.revenu} sur 5">${point(c.revenu)}</td></tr>`,
      )
      .join("")}</tbody>`;
  }

  function demarrer() {
    if (!$("rotation")) return;
    construireFormulaire();
    document.querySelectorAll("#rot-form select, #rot-form input").forEach((e) => e.addEventListener("input", recalculer));
    $("rot-load").addEventListener("click", chargerClimat);
    afficherClimat();
    recalculer();
  }

  // Petite interface pour les autres fichiers (ex. choix de la zone) et pour les tests
  window.Rotation = { recalculer, chargerClimat, CULTURES, evaluer, planifier, lireHistorique };

  demarrer();
})();
