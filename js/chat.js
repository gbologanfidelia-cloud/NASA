/* Réact+ : assistant IA (interface)
 *
 *  Ce fichier gère TOUTE l'interface du chat. Le backend se branche à un seul endroit :
 *  la fonction appelerBackend() (section 2). Voir docs/CHAT_API.md pour le contrat.
 */
"use strict";

/* ========== 1. CONFIGURATION ========== */

const CHAT = {
  // Passer à false dès que le backend est prêt : plus aucune réponse de démonstration.
  MODE_DEMO: true,
  ENDPOINT: "/api/chat", // POST JSON, voir docs/CHAT_API.md
  TIMEOUT_MS: 30000,
  MAX_HISTORIQUE: 10, // nombre de messages envoyés au backend (les plus récents)
  STOCKAGE: "reactplus-chat", // sessionStorage : la conversation survit à un rechargement
};

/* ========== 2. BACKEND (seule partie à brancher) ========== */

// Contexte de la parcelle envoyé avec chaque question, lu sur les contrôles de la page.
function lireContexte() {
  const val = (sel) => document.querySelector(sel);
  const sol = val("#in-sol") ? +val("#in-sol").value : null;
  const temp = val("#in-t") ? +val("#in-t").value : null;
  const pluie = val("#in-pl") ? val("#in-pl").checked : null;
  return {
    parcelle: "Parcelle Alpha",
    culture: "Riz",
    region: "Kara, Togo",
    stade: "J+42",
    humidite_sol_pct: sol,
    temperature_c: temp,
    pluie_demain: pluie,
    donnees_satellite_reelles: typeof etat !== "undefined" ? !!etat.enDirect : false,
  };
}

/**
 * Envoie la conversation au backend et renvoie le texte de la réponse.
 * @param {{role: "user"|"assistant", content: string}[]} messages
 * @param {object} contexte
 * @param {AbortSignal} signal
 * @returns {Promise<string>} le texte de la réponse (lève une erreur en cas d'échec)
 */
async function appelerBackend(messages, contexte, signal) {
  if (CHAT.MODE_DEMO) {
    await new Promise((ok) => setTimeout(ok, 900));
    return (
      "L’assistant n’est pas encore connecté : ceci est une réponse de démonstration, pas une réponse de l’IA.\n\n" +
      `Votre question a bien été reçue. Contexte transmis : sol ${contexte.humidite_sol_pct} %, ` +
      `${contexte.temperature_c} °C, pluie demain : ${contexte.pluie_demain ? "oui" : "non"}.`
    );
  }
  const r = await fetch(CHAT.ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, contexte, langue: "fr" }),
    signal,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  if (typeof json.reponse !== "string" || !json.reponse) throw new Error("réponse vide");
  return json.reponse;
}

/* ========== 3. ÉTAT ET UTILITAIRES ========== */

const $c = (sel) => document.querySelector(sel);
const chat = {
  messages: [], // { role, content, demo?, erreur? }
  attente: false,
  controleur: null,
};

const el = {
  fab: $c("#chat-open"),
  panneau: $c("#chat-panel"),
  journal: $c("#chat-log"),
  accueil: $c("#chat-welcome"),
  formulaire: $c("#chat-form"),
  saisie: $c("#chat-input"),
  envoyer: $c("#chat-send"),
  contexte: $c("#chat-ctx"),
  statut: $c("#chat-status-txt"),
};

const heure = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function sauvegarder() {
  try {
    sessionStorage.setItem(CHAT.STOCKAGE, JSON.stringify(chat.messages.filter((m) => !m.erreur)));
  } catch {}
}

function charger() {
  try {
    const brut = sessionStorage.getItem(CHAT.STOCKAGE);
    if (brut) chat.messages = JSON.parse(brut);
  } catch {}
}

/* ========== 4. AFFICHAGE ========== */

function creerMessage(m, index) {
  const bloc = document.createElement("div");
  bloc.className = `msg ${m.role === "user" ? "user" : "bot"}${m.erreur ? " error" : ""}`;
  const bulle = document.createElement("div");
  bulle.className = "bubble";
  bulle.textContent = m.content; // textContent : jamais de HTML injecté depuis la réponse
  bloc.appendChild(bulle);

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  if (m.demo) {
    const tag = document.createElement("span");
    tag.className = "msg-tag";
    tag.textContent = "Démonstration";
    meta.appendChild(tag);
  }
  if (m.erreur) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "retry";
    b.textContent = "Réessayer";
    b.addEventListener("click", () => reessayer(index));
    meta.appendChild(b);
  } else if (m.heure) {
    meta.appendChild(document.createTextNode(m.heure));
  }
  bloc.appendChild(meta);
  return bloc;
}

function afficherTout() {
  el.journal.querySelectorAll(".msg, .typing").forEach((n) => n.remove());
  chat.messages.forEach((m, i) => el.journal.appendChild(creerMessage(m, i)));
  el.accueil.hidden = chat.messages.length > 0;
  if (chat.attente) ajouterIndicateur();
  defiler();
}

function ajouterIndicateur() {
  const t = document.createElement("div");
  t.className = "typing";
  t.setAttribute("aria-label", "L’assistant écrit");
  t.innerHTML = "<i></i><i></i><i></i>";
  el.journal.appendChild(t);
}

function defiler() {
  el.journal.scrollTop = el.journal.scrollHeight;
}

function majContexte() {
  const c = lireContexte();
  el.contexte.textContent = `Contexte : ${c.parcelle} · ${c.culture} · sol ${c.humidite_sol_pct} % · ${c.temperature_c} °C`;
}

function majBouton() {
  el.envoyer.disabled = chat.attente || el.saisie.value.trim() === "";
}

function majStatut() {
  el.panneau.classList.toggle("online", !CHAT.MODE_DEMO);
  el.statut.textContent = CHAT.MODE_DEMO ? "Mode démonstration" : "En ligne";
}

/* ========== 5. ENVOI ========== */

async function demander() {
  chat.attente = true;
  majBouton();
  afficherTout();

  chat.controleur = new AbortController();
  const minuteur = setTimeout(() => chat.controleur.abort(), CHAT.TIMEOUT_MS);
  const historique = chat.messages
    .filter((m) => !m.erreur)
    .slice(-CHAT.MAX_HISTORIQUE)
    .map(({ role, content }) => ({ role, content }));

  try {
    const texte = await appelerBackend(historique, lireContexte(), chat.controleur.signal);
    chat.messages.push({ role: "assistant", content: texte, demo: CHAT.MODE_DEMO, heure: heure() });
  } catch (e) {
    const delai = e && e.name === "AbortError";
    chat.messages.push({
      role: "assistant",
      erreur: true,
      content: delai
        ? "L’assistant met trop de temps à répondre. Réessayez dans un instant."
        : "Impossible de joindre l’assistant pour le moment. Vérifiez votre connexion puis réessayez.",
    });
  } finally {
    clearTimeout(minuteur);
    chat.attente = false;
    sauvegarder();
    afficherTout();
    majBouton();
  }
}

function poserQuestion(texte) {
  const t = texte.trim();
  if (!t || chat.attente) return;
  chat.messages.push({ role: "user", content: t, heure: heure() });
  el.saisie.value = "";
  ajuster();
  sauvegarder();
  demander();
}

function reessayer(index) {
  if (chat.attente) return;
  chat.messages.splice(index, 1); // retire le message d'erreur, rejoue la dernière question
  demander();
}

/* ========== 6. OUVERTURE, FERMETURE, ÉVÉNEMENTS ========== */

function ouvrir() {
  el.panneau.hidden = false;
  el.fab.setAttribute("aria-expanded", "true");
  majContexte();
  afficherTout();
  el.saisie.focus();
}

function fermer() {
  el.panneau.hidden = true;
  el.fab.setAttribute("aria-expanded", "false");
  el.fab.focus();
}

function effacer() {
  if (chat.controleur) chat.controleur.abort();
  chat.messages = [];
  chat.attente = false;
  sauvegarder();
  afficherTout();
  majBouton();
}

// Le champ grandit avec le texte (jusqu'à 120 px)
function ajuster() {
  el.saisie.style.height = "auto";
  el.saisie.style.height = Math.min(el.saisie.scrollHeight, 120) + "px";
}

function demarrerChat() {
  charger();
  majStatut();
  el.fab.setAttribute("aria-expanded", "false");

  el.fab.addEventListener("click", ouvrir);
  $c("#chat-close").addEventListener("click", fermer);
  $c("#chat-clear").addEventListener("click", effacer);

  el.formulaire.addEventListener("submit", (e) => {
    e.preventDefault();
    poserQuestion(el.saisie.value);
  });
  el.saisie.addEventListener("input", () => {
    ajuster();
    majBouton();
  });
  // Entrée envoie, Maj+Entrée = nouvelle ligne
  el.saisie.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      poserQuestion(el.saisie.value);
    }
  });
  el.panneau.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fermer();
  });
  $c("#chat-suggest").addEventListener("click", (e) => {
    const b = e.target.closest(".chip-btn");
    if (b) poserQuestion(b.textContent);
  });
  // Le contexte suit les curseurs du simulateur
  ["#in-sol", "#in-t", "#in-pl"].forEach((s) => $c(s) && $c(s).addEventListener("input", majContexte));

  majBouton();
}

demarrerChat();
