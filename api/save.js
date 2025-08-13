// api/save.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { player, date, accepted, rejected } = req.body;

    // URL de tu repositorio y rama donde se guardará data.json
    const owner = process.env.GH_OWNER;
    const repo = process.env.GH_REPO;
    const branch = process.env.GH_BRANCH || 'main';
    const token = process.env.GH_TOKEN;

    const filePath = 'results/data.json';

    // 1️⃣ Leer el archivo actual de GitHub
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, {
      headers: { Authorization: `token ${token}` }
    });
    const getData = await getRes.json();

    let currentData = [];
    if (getData.content) {
      currentData = JSON.parse(Buffer.from(getData.content, 'base64').toString());
    }

    // 2️⃣ Agregar la nueva partida
    currentData.push({ player, date, accepted, rejected });

    // 3️⃣ Subir el archivo actualizado a GitHub
    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: { 
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Guardar partida de ${player} - ${date}`,
        content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
        sha: getData.sha,
        branch
      })
    });

    const updateData = await updateRes.json();
    if (updateData.content) {
      return res.status(200).json({ ok: true });
    } else {
      return res.status(500).json({ error: 'Error al guardar en GitHub', details: updateData });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno', details: err.message });
  }
}
