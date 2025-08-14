// api/save.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { player, date, accepted, rejected } = req.body || {};
    if (
      typeof player !== 'string' ||
      typeof date !== 'string' ||
      !Array.isArray(accepted) ||
      !Array.isArray(rejected)
    ) {
      return res.status(400).json({ error: 'Payload inválido' });
    }

    const owner  = process.env.GH_OWNER;
    const repo   = process.env.GH_REPO;
    const branch = process.env.GH_BRANCH || 'main';
    const token  = process.env.GH_TOKEN;
    const filePath = 'results/data.json';

    if (!owner || !repo || !token) {
      return res.status(500).json({ error: 'Faltan variables de entorno GH_OWNER, GH_REPO o GH_TOKEN' });
    }

    // 1) Leer el archivo actual (puede no existir todavía)
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });

    let currentData = [];
    let sha; // solo se envía al hacer PUT si el archivo existe

    if (getRes.status === 200) {
      const getData = await getRes.json();
      sha = getData.sha;

      if (getData && getData.content) {
        const decoded = Buffer.from(getData.content, 'base64').toString('utf8').trim();

        // Acepta array puro o { games: [...] } por compatibilidad con el HTML
        try {
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) {
            currentData = parsed;
          } else if (parsed && Array.isArray(parsed.games)) {
            currentData = parsed.games;
          } else {
            // Si es otra cosa, re-inicia como array para no romper estadísticas
            currentData = [];
          }
        } catch {
          // Si el contenido no es JSON válido, empezamos de cero
          currentData = [];
        }
      }
    } else if (getRes.status === 404) {
      // Archivo aún no existe en el repo
      currentData = [];
      sha = undefined;
    } else {
      const txt = await getRes.text();
      return res.status(502).json({ error: 'Error leyendo data.json en GitHub', details: txt });
    }

    // 2) Agregar la nueva partida (array plano, el HTML ya lo sabe leer)
    currentData.push({ player, date, accepted, rejected });

    // 3) Subir el archivo actualizado (con SHA si existe; sin SHA si es la primera vez)
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const body = {
      message: `Guardar partida de ${player} - ${date}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2), 'utf8').toString('base64'),
      branch
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const details = await putRes.text();
      return res.status(500).json({ error: 'Error al guardar en GitHub', details });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno', details: err.message });
  }
}
