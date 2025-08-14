applyRandomTheme();

document.getElementById('btn-stats').addEventListener('click', () => {
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-stats').classList.remove('hidden');
  loadStats();
});

document.getElementById('btn-go-stats').addEventListener('click', () => {
  document.getElementById('screen-results').classList.add('hidden');
  document.getElementById('screen-stats').classList.remove('hidden');
  loadStats();
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('screen-results').classList.add('hidden');
  document.getElementById('screen-game').classList.remove('hidden');
  startGame();
});

document.getElementById('btn-back-game').addEventListener('click', () => {
  document.getElementById('screen-stats').classList.add('hidden');
  document.getElementById('screen-game').classList.remove('hidden');
});
  
startGame();
