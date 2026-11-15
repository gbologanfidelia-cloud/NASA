"use strict";

/* ========== 8. DÉMARRAGE ========== */

function afficherTout() {
  // Point de rafraîchissement commun après l'initialisation et le chargement des données en direct.
  afficherGraphiques();
  afficherMesures();
  afficherDecision();
  afficherSemaine();
  afficherSimple();
  afficherIndicateurs();
}

// Apparition progressive des sections au défilement
function activerApparitions() {
  const blocs = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    blocs.forEach((b) => b.classList.add("in"));
    return;
  }
  const obs = new IntersectionObserver(
    (entrees) =>
      entrees.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          obs.unobserve(e.target);
        }
      }),
    { threshold: 0.08 },
  );
  blocs.forEach((b) => obs.observe(b));
}

// Met en évidence le lien de navigation de la section visible
function activerNavigation() {
  const liens = [...document.querySelectorAll(".nav a")];
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver(
    (entrees) =>
      entrees.forEach((e) => {
        if (!e.isIntersecting) return;
        liens.forEach((l) => l.classList.toggle("on", l.getAttribute("href") === `#${e.target.id}`));
      }),
    { rootMargin: "-30% 0px -60% 0px" },
  );
  liens.forEach((l) => {
    const section = document.querySelector(l.getAttribute("href"));
    if (section) obs.observe(section);
  });
}

/* --- Mode sombre --- */

function appliquerTheme(theme, memoriser) {
  document.documentElement.setAttribute("data-theme", theme);
  const sombre = theme === "dark";
  const bouton = $("#theme-toggle");
  bouton.setAttribute("aria-label", sombre ? "Passer en mode clair" : "Passer en mode sombre");
  bouton.title = sombre ? "Mode clair" : "Mode sombre";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = sombre ? "#0E1511" : "#16834A";
  if (memoriser) {
    try {
      localStorage.setItem("reactplus-theme", theme);
    } catch {}
  }
  afficherGraphiques(); // les graphiques SVG reprennent les couleurs du thème
}

function activerTheme() {
  const courant = () => document.documentElement.getAttribute("data-theme") || "light";
  $("#theme-toggle").addEventListener("click", () => appliquerTheme(courant() === "dark" ? "light" : "dark", true));
  // Suit le thème du téléphone tant que l'utilisateur n'a rien choisi
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let choisi = null;
    try {
      choisi = localStorage.getItem("reactplus-theme");
    } catch {}
    if (!choisi) appliquerTheme(e.matches ? "dark" : "light", false);
  });
  appliquerTheme(courant(), false);
}

function demarrer() {
  // Initialise les valeurs des commandes et relie leurs événements aux fonctions de mise à jour.
  // Les curseurs partent des dernières mesures du capteur
  $("#in-sol").value = DONNEES.hum.capteur[N - 1];
  $("#in-t").value = DONNEES.temp.capteur[N - 1];

  ["#in-sol", "#in-t", "#in-pl"].forEach((sel) => $(sel).addEventListener("input", afficherDecision));
  $("#live").addEventListener("click", chargerNasa);
  // Ouvre l'assistant (défini dans chat.js, chargé après ce fichier)
  $("#week-ask").addEventListener("click", () => {
    if (typeof ouvrir === "function") ouvrir();
  });

  $("#today").textContent = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  activerTheme();
  afficherTout();
  activerApparitions();
  activerNavigation();

  // Chargement automatique des données NASA au démarrage (le bouton #live permet de réessayer)
  if (typeof chargerNasa === "function") chargerNasa();
}

document.documentElement.classList.add("js");

demarrer();
