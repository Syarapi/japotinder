// api/save.js
export default async function handler(req, res) {
  // CORS básico (ajusta origin si lo necesitas)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const {
    GH_TOKEN,
    GH_OWNER,
    GH_REPO,
    GH_BRANCH = 'main'
  } = process.env;

  if (!GH_TOKEN || !GH_OWNER || !GH_REPO) {
    return res.status(500).send('Server not configured: missing env vars');
  }

  const RESULTS_PATH = 'results/data.json';
  const { player, date, accepted = [], rejected = [] } = req.body || {};
  if (!player || !date || !Array.isArray(accepted) || !Array.isArray(rejected)) {
    return res.status(400).send('Invalid payload');
  }

  try {
    // 1) Get current file (sha + content)
    const getUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(RESULTS_PATH)}?ref=${encodeURIComponent(GH_BRANCH)}`;
    const fileRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' }
    });
    if (!fileRes.ok) {
      const t = await fileRes.text();
      throw new Error(`GET contents failed: ${fileRes.status} ${t}`);
    }
    const fileJson = await fileRes.json();
    const sha = fileJson.sha;
    const content = Buffer.from(fileJson.content, 'base64').toString('utf8');
    let data = { cards: [], games: [] };
    try { data = JSON.parse(content); } catch {}

    // 2) Build map for fast update
    const map = new Map();
    for (const c of data.cards || []) map.set(c.name, { yes: c.yes||0, no: c.no||0 });

    for (const name of accepted) {
      const row = map.get(name) || { yes:0, no:0 }; row.yes++; map.set(name, row);
    }
    for (const name of rejected) {
      const row = map.get(name) || { yes:0, no:0 }; row.no++; map.set(name, row);
    }

    // 3) Back to array sorted by name (optional)
    const cards = Array.from(map.entries()).map(([name, v]) => ({ name, yes: v.yes, no: v.no }))
      .sort((a,b) => a.name.localeCompare(b.name,'es'));

    // 4) Append game record (optional, puede crecer con el tiempo)
    const games = data.games || [];
    games.push({ player, date, accepted, rejected });

    const newJson = JSON.stringify({ cards, games }, null, 2);
    const newContentB64 = Buffer.from(newJson, 'utf8').toString('base64');

    // 5) Commit update
    const putUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(RESULTS_PATH)}`;
    const commitRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `chore(results): update stats by ${player} on ${date}`,
        content: newContentB64,
        branch: GH_BRANCH,
        sha,
        committer: { name: "Japontinder Bot", email: "no-reply@example.com" }
      })
    });

    if (!commitRes.ok) {
      const t = await commitRes.text();
      throw new Error(`PUT contents failed: ${commitRes.status} ${t}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send(String(err));
  }
}
