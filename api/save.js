// api/save.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { player, date, accepted, rejected } = req.body;

  if (!player || !date || !Array.isArray(accepted) || !Array.isArray(rejected)) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  const GH_TOKEN = process.env.GH_TOKEN;
  const GH_OWNER = process.env.GH_OWNER;
  const GH_REPO = process.env.GH_REPO;
  const GH_BRANCH = process.env.GH_BRANCH || "main";
  const FILE_PATH = "results/data.json";

  try {
    // 1. Obtener el contenido actual de results/data.json
    const fileRes = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${FILE_PATH}?ref=${GH_BRANCH}`,
      {
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    let fileSha = null;
    let pastData = [];

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
      const content = Buffer.from(fileData.content, "base64").toString("utf8");
      pastData = JSON.parse(content);
    }

    // 2. Añadir la nueva partida
    const newEntry = { player, date, accepted, rejected };
    pastData.push(newEntry);

    // 3. Subir el archivo actualizado
    const updatedContent = Buffer.from(JSON.stringify(pastData, null, 2)).toString("base64");

    const commitRes = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Añadir resultados de ${player} (${date})`,
          content: updatedContent,
          sha: fileSha || undefined,
          branch: GH_BRANCH,
        }),
      }
    );

    if (!commitRes.ok) {
      const errData = await commitRes.json();
      throw new Error(JSON.stringify(errData));
    }

    res.status(200).json({ success: true, message: "Datos guardados en GitHub" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar los datos", details: err.message });
  }
}
