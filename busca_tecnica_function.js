// Adicione ao functions/index.js (Firebase Functions v2) — busca PDFs de manuais/fichas via Google Custom Search.
// Antes: firebase functions:secrets:set CSE_KEY   e   firebase functions:secrets:set CSE_CX
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

exports.buscaTecnica = onRequest(
  {secrets: ["CSE_KEY", "CSE_CX"], cors: true, region: "us-central1"},
  async (req, res) => {
    try {
      const tk = (req.headers.authorization || "").replace("Bearer ", "");
      await admin.auth().verifyIdToken(tk); // só usuários logados
      const q = String(req.query.q || "").slice(0, 120);
      const modo = req.query.modo === "compressor" ? "compressor" : "manual";
      if (!q) return res.status(400).json({error: "q"});
      const termo = modo === "compressor" ?
        `${q} compressor datasheet ficha técnica filetype:pdf` :
        `${q} manual instalação serviço filetype:pdf`;
      const url = "https://www.googleapis.com/customsearch/v1?key=" +
        process.env.CSE_KEY + "&cx=" + process.env.CSE_CX +
        "&num=8&q=" + encodeURIComponent(termo);
      const r = await fetch(url);
      const j = await r.json();
      const items = (j.items || []).map((x) => ({
        title: x.title, link: x.link, snippet: x.snippet, displayLink: x.displayLink,
      }));
      res.json({items});
    } catch (e) {
      res.status(401).json({error: "auth_or_search"});
    }
  });
