document.addEventListener("DOMContentLoaded", () => {
  fetch("results/data.json")
    .then(r => r.json())
    .then(data => {
      renderStats(data);
      renderRecent(data);
    });
});

function renderStats(data) {
  const total = {};
  data.forEach(entry => {
    const name = entry.player || "Anon";
    if (!total[name]) total[name] = {yes:0, meh:0, no:0};
    total[name].yes += entry.accepted.length;
    total[name].meh += entry.meh.length;
    total[name].no += entry.rejected.length;
  });

  const tbl = document.getElementById("stats-table");
  tbl.innerHTML = `<tr><th>Jugador</th><th>Sí</th><th>Meh</th><th>No</th></tr>` +
    Object.entries(total).map(([name, scores]) => 
      `<tr><td>${name}</td><td>${scores.yes}</td><td>${scores.meh}</td><td>${scores.no}</td></tr>`
    ).join("");
}

function renderRecent(data) {
  const recent = [...data].slice(-10).reverse(); // 10 últimos
  const tbl = document.getElementById("recent-table");
  tbl.innerHTML = `<tr><th>Jugador</th><th>Fecha</th><th>Sí</th><th>Meh</th><th>No</th></tr>` +
    recent.map(entry => `
      <tr>
        <td>${entry.player}</td>
        <td>${new Date(entry.date).toLocaleString()}</td>
        <td>${entry.accepted.length}</td>
        <td>${entry.meh.length}</td>
        <td>${entry.rejected.length}</td>
      </tr>
    `).join("");
}
