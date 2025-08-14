// api/save.js
/**
 * API route para guardar partidas en results/data.json del repo de GitHub.
 * Requiere env:
 *  - GH_TOKEN  (PAT con permiso para escribir en el repo)
 *  - GH_OWNER  (por defecto 'Syarapi')
 *  - GH_REPO   (por defecto 'japotinder')
 *  - GH_BRANCH (por defecto 'main')
 */
export default async function handler(req, res) {
  // --- CORS básico ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ajusta si quieres restringir
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // --- Validación de entrada mínima ---
  const { player, date, mode, accepted, meh, rejected } = req.body || {};
  const entry = {
    player: typeof player === 'string' ? player.trim() : '¿anon?',
    date: typeof date === 'string' ? date : new Date().toISOString(),
    mode: typeof mode === 'string' ? mode : 'unknown',
    accepted: Array.isArray(accepted) ? accepted : [],
    meh: Array.isArray(meh) ? meh : [],
    rejected: Array.isArray(rejected) ? rejected : [],
  };

  try {
    const owner = process.env.GH_OWNER || 'Syarapi';
    const repo = process.env.GH_REPO || 'japotinder';
    const branch = process.env.GH_BRANCH || 'main';
    const token = process.env.GH_TOKEN;

    if (!token) {
      return res.status(500).json({ error: 'Falta GH_TOKEN en variables de entorno' });
    }

    const filePath = 'results/data.json';
    const contentsURL = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;

    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    // Helpers
    const fetchCurrent = async () => {
      const r = await fetch(`${contentsURL}?ref=${encodeURIComponent(branch)}`, { headers });
      if (r.status === 404) {
        // No existe aún: devolvemos vacío sin sha
        return { sha: null, data: [] };
      }
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`GET contents falló: ${r.status} ${t}`);
      }
      const j = await r.json();
      const content = Buffer.from(j.content || '', 'base64').toString('utf8');
      let parsed = [];
      try {
        parsed = JSON.parse(content);
      } catch {
        // Si el contenido no es un array válido, lo reseteamos a []
        parsed = [];
      }
      if (!Array.isArray(parsed)) parsed = [];
      return { sha: j.sha, data: parsed };
    };

    const putUpdate = async (dataArr, sha) => {
      const body = {
        message: `Guardar partida de ${entry.player} - ${entry.date}`,
        content: Buffer.from(JSON.stringify(dataArr, null, 2)).toString('base64'),
        branch,
      };
      if (sha) body.sha = sha;

      const r = await fetch(contentsURL, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        // 409 es conflicto de sha (race condition)
        const err = new Error(`PUT contents falló: ${r.status} ${t}`);
        err.status = r.status;
        throw err;
      }
      return r.json();
    };

    // --- Lectura, merge, escritura con reintentos de conflicto ---
    const maxRetries = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      const { sha, data: currentArr } = await fetchCurrent();
      currentArr.push(entry);

      try {
        const result = await putUpdate(currentArr, sha);
        return res.status(200).json({
          ok: true,
          saved: entry,
          commit: result.commit && result.commit.sha ? result.commit.sha : null,
          total: currentArr.length,
        });
      } catch (e) {
        // Si hay conflicto (409), reintentamos
        if (e.status === 409 && attempt < maxRetries) {
          continue; // vuelve al while y relée el SHA + reintenta
        }
        throw e;
      }
    }
  } catch (err) {
    console.error('save.js error:', err);
    return res.status(500).json({ error: 'Error interno', details: String(err.message || err) });
  }
}
