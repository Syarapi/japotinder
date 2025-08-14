const LS_KEY = "japotinder_player_colors_v3";

function loadColorMap() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveColorMap(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

const COLOR_POOL = [
  "#2f7bdc", "#5aa6ff", "#8a5adf", "#6f49d4", "#b48ad6",
  "#ff6fa1", "#ff83b4", "#ffd666", "#56e0b5", "#68cba7",
  "#a3c9ff", "#f0a7d8"
];

const RESERVED = {
  "alba": "#2f7bdc",
  "sara": "#ff6fa1",
  "alicia": "#c95ced",
  "vaini": "#b082e8"
};

function hslColor(i) {
  const hue = (i * 47) % 360;
  return `hsl(${hue} 70% 55%)`;
}

function getPlayerColorUnique(name) {
  const key = (name || "").trim().toLowerCase();
  let map = loadColorMap();
  if (map[key]) return map[key];
  if (RESERVED[key]) {
    const reservedColor = RESERVED[key];
    for (const n in map) if (map[n] === reservedColor) delete map[n];
    map[key] = reservedColor; saveColorMap(map); return reservedColor;
  }
  const used = new Set(Object.values(map));
  Object.values(RESERVED).forEach(c => used.add(c));
  for (const c of COLOR_POOL) {
    if (!used.has(c)) {
      map[key] = c; saveColorMap(map); return c;
    }
  }
  let i = 0;
  while (true) {
    const c = hslColor(i++);
    if (!used.has(c)) { map[key] = c; saveColorMap(map); return c; }
  }
}

function applyRandomTheme() {
  const themes = [
    { light:"#fff7fb", mid:"#ffe3ef", dark:"#d38cb1", accent1:"#d7a6f1", accent2:"#b48ad6" },
    { light:"#f2f9ff", mid:"#e0f1ff", dark:"#8dbfe6", accent1:"#a3c9ff", accent2:"#7fb2f0" },
    { light:"#faf5ff", mid:"#efe3ff", dark:"#b48ad6", accent1:"#d7a6f1", accent2:"#b48ad6" },
    { light:"#fff7cc", mid:"#ffe89a", dark:"#e0c050", accent1:"#f0d46a", accent2:"#e1b84f" },
    { light:"#e9fff8", mid:"#d1fff0", dark:"#68cba7", accent1:"#9fe6cc", accent2:"#68cba7" }
  ];
  const pick = themes[Math.floor(Math.random() * themes.length)];
  const root = document.documentElement.style;
  root.setProperty('--bg-light', pick.light);
  root.setProperty('--bg-mid', pick.mid);
  root.setProperty('--bg-dark', pick.dark);
  root.setProperty('--accent-1', pick.accent1);
  root.setProperty('--accent-2', pick.accent2);
}
