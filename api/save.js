// api/save.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { player, date, mode, accepted = [], meh = [], rejected = [] } = req.body || {};

  if (!player || !date) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: player y date' });
  }

  const owner  = process.env.GH_OWNER;
  const repo   = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || 'main';
  const token  = process.env.GH_TOKEN;
  const filePath = 'results/data.json';

  if (!owner || !repo || !token) {
    return res.status(500).json({ error: 'Faltan variables de entorno GH_OWNER, GH_REPO o GH_TOKEN' });
  }

  const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    // 1) Leer el archivo actual (puede no existir)
    let sha = null;
    let currentData = [];

    const getRes = await fetch(`${ghUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    if (getRes.status === 200) {
      const getJson = await getRes.json();
      sha = getJson.sha || null;
      try {
        const decoded = Buffer.from(getJson.content || '', 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        currentData = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.games) ? parsed.games : []);
      } catch {
        currentData = [];
      }
    } else if (getRes.status === 404) {
      // no existe: lo crearemos sin sha
      sha = null;
      currentData = [];
    } else {
      const t = await getRes.text();
      return res.status(502).json({ error: 'No se pudo leer data.json', detail: t });
    }

    // 2) Agregar la nueva partida (con meh y mode)
    currentData.push({ player, date, mode, accepted, meh, rejected });

    const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64');

    // 3) Subir (crear o actualizar)
    const putBody = {
      message: `Guardar partida de ${player} - ${date}`,
      content: newContent,
      branch
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(ghUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    const putJson = await putRes.json();

    if (putRes.status === 201 || putRes.status === 200) {
      return res.status(200).json({ ok: true });
    }

    // Si hubo conflicto de SHA (ediciones concurrentes), intenta reintento simple 1 vez
    if (putRes.status === 409) {
      const retryGet = await fetch(`${ghUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      }).then(r => r.json());

      const retrySha = retryGet.sha;
      let retryArray = [];
      try {
        retryArray = JSON.parse(Buffer.from(retryGet.content || '', 'base64').toString('utf8'));
        if (!Array.isArray(retryArray)) retryArray = [];
      } catch { retryArray = []; }

      retryArray.push({ player, date, mode, accepted, meh, rejected });

      const retryRes = await fetch(ghUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Guardar partida de ${player} - ${date} (retry)`,
          content: Buffer.from(JSON.stringify(retryArray, null, 2)).toString('base64'),
          sha: retrySha,
          branch
        })
      });

      if (retryRes.status === 200) {
        return res.status(200).json({ ok: true, retry: true });
      }
      const retryTxt = await retryRes.text();
      return res.status(500).json({ error: 'Error al guardar en GitHub (retry)', detail: retryTxt });
    }

    return res.status(500).json({ error: 'Error al guardar en GitHub', detail: putJson });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno', detail: err?.message || String(err) });
  }
}
