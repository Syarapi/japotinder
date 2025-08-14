const originalData = [
  { name: "Disney Tokyo", img: "img/disney.jpg" },
  // ... resto de tus tarjetas
];

let currentIndex = 0;
let accepted = [], meh = [], rejected = [];

function startGame() {
  currentIndex = 0;
  accepted = [];
  meh = [];
  rejected = [];
  showNextCard();
}

function showNextCard() {
  const container = document.getElementById('card-container');
  container.innerHTML = '';
  if (currentIndex >= originalData.length) {
    showResults();
    return;
  }
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img src="${originalData[currentIndex].img}" alt="${originalData[currentIndex].name}">
    <h3>${originalData[currentIndex].name}</h3>
  `;
  container.appendChild(card);
}

document.getElementById('btn-yes').addEventListener('click', () => {
  accepted.push(originalData[currentIndex]);
  currentIndex++;
  showNextCard();
});

document.getElementById('btn-meh').addEventListener('click', () => {
  meh.push(originalData[currentIndex]);
  currentIndex++;
  showNextCard();
});

document.getElementById('btn-no').addEventListener('click', () => {
  rejected.push(originalData[currentIndex]);
  currentIndex++;
  showNextCard();
});

function showResults() {
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-results').classList.remove('hidden');
  document.getElementById('results-table').innerHTML = `
    <table>
      <tr><th>✅ Sí</th><td>${accepted.map(a => a.name).join(', ')}</td></tr>
      <tr><th>😐 Meh</th><td>${meh.map(a => a.name).join(', ')}</td></tr>
      <tr><th>❌ No</th><td>${rejected.map(a => a.name).join(', ')}</td></tr>
    </table>
  `;
  saveGameResult({
    player: prompt("Tu nombre:") || "Anónimo",
    date: new Date().toISOString(),
    mode: "default",
    accepted,
    meh,
    rejected
  });
}
