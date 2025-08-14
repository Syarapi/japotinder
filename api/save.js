// /api/save.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { player, date, accepted, rejected } = req.body || {};
  if (!player || !Array.isArray(accepted) || !Array.isArray(rejected)) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  const owner  = process.env.GH_OWNER;   // p.ej. "Syarapi"
  const repo   = process.env.GH_REPO;    // p.ej. "japotinder"
  const branch = process.env.GH_BRANCH || 'main';
  const token  = process.env.GH_TOKEN;
  const path   = 'results/data.json';
  if (!owner || !repo || !token) {
    return res.status(500).json({ error: 'Faltan GH_OWNER / GH_REPO / GH_TOKEN' });
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  // Lee SIEMPRE el último contenido y su SHA
  async function fetchCurrent() {
    const r = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Cache-Control': 'no-store'
      }
    });

    if (r.status === 404) {
      // Si aún no existe, arrancamos desde array vacío
      return { sha: null, data: [] };
    }
    if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);

    const json = await r.json();
    let parsed = [];
    try {
      const text = Buffer.from(json.content || '', 'base64').toString('utf8');
      const obj = JSON.parse(text);
      parsed = Array.isArray(obj) ? obj : (Array.isArray(obj?.games) ? obj.games : []);
    } catch {
      parsed = [];
    }
    return { sha: json.sha, data: parsed };
  }

  async function putFile(contentBase64, sha, message) {
    const body = { message, content: contentBase64, branch };
    if (sha) body.sha = sha;

    const r = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (r.status === 409) return { conflict: true }; // SHA desactualizado
    if (!r.ok) {
      const err = await r.text().catch(() => '');
      throw new Error(`PUT ${path} -> ${r.status} ${err}`);
    }
    return { ok: true, json: await r.json() };
  }

  // Reintenta en caso de conflicto de SHA (carreras)
  try {
    let attempts = 0;
    let lastLen = 0;

    while (attempts < 3) {
      attempts++;

      // 1) lee la última versión
      const { sha, data } = await fetchCurrent();

      // 2) añade la nueva partida
      data.push({ player, date, accepted, rejected });
      lastLen = data.length;

      // 3) sube con el SHA actual
      const content64 = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
      const msg = `Guardar partida de ${player} - ${date} (${attempts})`;
      const result = await putFile(content64, sha, msg);

      if (result.conflict) {
        // alguien ha escrito entre el GET y el PUT -> reintenta
        continue;
      }

      if (result.ok) {
        return res.status(200).json({ ok: true, total: lastLen, attempt: attempts });
      }
      // fallback (por seguridad)
      break;
    }

    return res.status(409).json({ error: 'Conflicto al guardar tras varios intentos' });
  } catch (err) {
    console.error('save.js error:', err);
    return res.status(500).json({ error: 'Error al guardar en GitHub', details: String(err.message || err) });
  }
}
