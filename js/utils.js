"use strict";

/* ========== 3. UTILITAIRES ========== */

const $ = (sel) => document.querySelector(sel);

// 31.9 -> "31,9"
const fmt = (v, dec = 0) => v.toFixed(dec).replace(".", ",");

// 3 -> "+3", -3 -> "−3", 0 -> "0"
const signe = (v, dec = 0) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), dec);
