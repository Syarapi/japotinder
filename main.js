let mode = "full";
let cards = [];
let accepted = [];
let meh = [];
let rejected = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-mode-short").addEventListener("click", () => startGame("short"));
  document.getElementById("btn-mode-full").addEventListener("click", () => startGame("full"));
  document.getElementById("btn-stats").addEventListener("click", () => window.location.href = "stats.html");
  document.getElementById("btn-to-stats").addEventListener("click", () => window.location.href = "stats.html");
  document.getElementById("btn-home").addEventListener("click", showStart);
});

function showStart() {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById("screen-start").classList.remove("hidden");
}

function startGame(selectedMode) {
  mode = selectedMode;
  accepted = [];
  meh = [];
  rejected = [];
  // Cargar cartas (ejemplo)
  cards = loadCards();
  if (mode === "short") {
    cards = shuffle(cards).slice(0, 10); // modo corto aleatorio
  }
  showGame();
}

function loadCards() {
  // Aquí pondrías tus cartas reales
  return [
    {id:1, text:"Carta 1"},
    {id:2, text:"Carta 2"},
    {id:3, text:"Carta 3"},
    {id:4, text:"Carta 4"}
  ];
}

function showGame() {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById("screen-game").classList.remove("hidden");
  renderCard();
}

function renderCard() {
  if (cards.length === 0) {
    showResults();
    return;
  }
  const card = cards[0];
  document.getElementById("card-container").innerHTML = `<div class="card">${card.text}</div>`;
}

document.getElementById("btn-yes").addEventListener("click", () => handleChoice("yes"));
document.getElementById("btn-meh").addEventListener("click", () => handleChoice("meh"));
document.getElementById("btn-no").addEventListener("click", () => handleChoice("no"));

function handleChoice(choice) {
  const card = cards.shift();
  if (choice === "yes") accepted.push(card);
  if (choice === "meh") meh.push(card);
  if (choice === "no") rejected.push(card);
  renderCard();
}

function showResults() {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById("screen-results").classList.remove("hidden");

  // Mostrar tabla
  const tbl = document.getElementById("results-table");
  tbl.innerHTML = `
    <tr><th>Sí</th><th>Meh</th><th>No</th></tr>
    <tr>
      <td>${accepted.map(c=>c.text).join("<br>")}</td>
      <td>${meh.map(c=>c.text).join("<br>")}</td>
      <td>${rejected.map(c=>c.text).join("<br>")}</td>
    </tr>
  `;

  // Guardar en backend
  saveResults().then(() => {
    console.log("Resultados guardados y tabla de jugador actual actualizada");
  });
}

async function saveResults() {
  const payload = {
    player: prompt("Tu nombre:"),
    date: new Date().toISOString(),
    mode,
    accepted,
    meh,
    rejected
  };
  const res = await fetch("/api/save", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  return res.json();
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}
