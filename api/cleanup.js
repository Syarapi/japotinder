// api/cleanup.js
export default async function handler(req, res) {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER || "Syarapi";
  const repo = process.env.GH_REPO || "japotinder";
  const branch = process.env.GH_BRANCH || "main";

  if (!token) {
    return res.status(500).json({ error: "Falta GH_TOKEN en variables de entorno" });
  }

  // Archivos y carpetas que NO se borran
  const KEEP = [
    "index.html",
    "api/",
    "results/",
    "img/"
  ];

  try {
    // 1️⃣ Obtener lista de archivos del repositorio (recursivo)
    const getTree = async () => {
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: { Authorization: `token ${token}` } }
      );
      if (!r.ok) throw new Error(`Error obteniendo árbol: ${r.status} ${await r.text()}`);
      return (await r.json()).tree;
    };

    const files = await getTree();

    // 2️⃣ Filtrar archivos que se borrarán
    const toDelete = files
      .filter(f => f.type === "blob") // solo archivos
      .filter(f => !KEEP.some(k => f.path === k || f.path.startsWith(k)));

    if (toDelete.length === 0) {
      return res.status(200).json({ ok: true, message: "No hay archivos para borrar" });
    }

    // 3️⃣ Borrar uno a uno
    const deleteFile = async (path, sha) => {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Eliminar archivo ${path}`,
          sha,
          branch
        })
