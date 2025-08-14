async function saveGameResult(entry) {
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return await res.json();
  } catch (err) {
    console.error('Error guardando partida', err);
    return { ok: false, error: err.message };
  }
}
