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
    return res.status(500).json({ error: 'Faltan variables de entorno GH_OWNER, GH_REPO o GH_TOKEN' });
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  async function getCurrent() {
    const r = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Cache-Control': 'no-store'
      }
    });

    if (r.status === 404) {
      return { sha: null, data: [] };
    }
    if (!r.ok) {
      throw new Error(`GET ${path} -> ${r.status}`);
    }

    const json = await r.json();
    let data = [];
    try {
      const decoded = Buffer.from(json.content || '', 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      data = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.games) ? parsed.games : []);
    } catch {
      // Si el archivo está corrupto, empezamos con array vacío
      data = [];
    }
    return { sha: json.sha, data };
  }

  async function putFile(contentBase64, sha) {
    const body = {
      message: `Guardar partida de ${player} - ${date}`,
      content: contentBase64,
      branch
    };
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

    // Manejo de conflicto por carreras de commits
    if (r.status === 409) return { conflict: true };

    if (!r.ok) {
      const err = await r.text().catch(() => '');
      throw new Error(`PUT ${path} -> ${r.status} ${err}`);
    }

    const json = await r.json();
    return { ok: true, json };
  }

  try {
    // 1) Leer versión actual (o crear desde vacío)
    let { sha, data } = await getCurrent();

    // 2) Agregar nueva partida
    data.push({ player, date, accepted, rejected });

    // 3) Subir
    let content64 = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
    let put = await putFile(content64, sha);

    // 4) Reintentar una vez si hubo conflicto
    if (put.conflict) {
      const again = await getCurrent();
      const merged = Array.isArray(again.data) ? again.data : [];
      merged.push({ player, date, accepted, rejected });
      const content64b = Buffer.from(JSON.stringify(merged, null, 2), 'utf8').toString('base64');
      put = await putFile(content64b, again.sha);
    }

    if (!put.ok) throw new Error('Error desconocido al subir a GitHub');

    return res.status(200).json({ ok: true, count: (JSON.parse(Buffer.from(content64, 'base64').toString()) || []).length });
  } catch (err) {
    console.error('save.js error:', err);
    return res.status(500).json({ error: 'Error al guardar en GitHub', details: String(err.message || err) });
  }
}
