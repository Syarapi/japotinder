async function loadStats() {
  const res = await fetch('results/data.json');
  const allGames = await res.json();
  renderStats(allGames);
}

function renderStats(games) {
  // Ignorar modos, contar todo
  const counts = {};
  games.forEach(g => {
    if (!counts[g.player]) counts[g.player] = { yes: 0, meh: 0, no: 0 };
    counts[g.player].yes += g.accepted.length;
    counts[g.player].meh += g.meh.length;
    counts[g.player].no += g.rejected.length;
  });

  let html = '<table><tr><th>Jugador</th><th>✅</th><th>😐</th><th>❌</th></tr>';
  for (const [player, c] of Object.entries(counts)) {
    html += `<tr><td>${player}</td><td>${c.yes}</td><td>${c.meh}</td><td>${c.no}</td></tr>`;
  }
  html += '</table>';

  document.getElementById('stats-tables').innerHTML = html;
}
