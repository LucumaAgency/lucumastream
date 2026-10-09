// Lucuma Agency · Preguntas para TikTok Live
// API REST + SSE + panel admin + overlay transparente (OBS / TikTok Live Studio)
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

try { require('dotenv').config(); } catch (_) {
  // dotenv opcional: lee .env a mano
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const PORT = process.env.PORT || 3080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DATA_FILE = path.join(__dirname, 'data', 'preguntas.json');

// ---------- Persistencia ----------
let state = { preguntas: [], activaId: null };
function load() {
  try { state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { state = { preguntas: [], activaId: null }; }
  if (!Array.isArray(state.preguntas)) state.preguntas = [];
}
function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}
load();

// ---------- SSE ----------
const clients = new Set();
function activa() {
  return state.preguntas.find(p => p.id === state.activaId) || null;
}
function broadcast() {
  const payload = `data: ${JSON.stringify({ activa: activa(), total: state.preguntas.length })}\n\n`;
  for (const res of clients) res.write(payload);
}

// ---------- App ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  if (!ADMIN_TOKEN) return next();
  const t = req.get('x-admin-token') || req.query.token;
  if (t === ADMIN_TOKEN) return next();
  res.status(401).json({ error: 'Token inválido' });
}

const clean = s => String(s || '').trim().slice(0, 300);

// Lectura pública (el overlay la usa)
app.get('/api/preguntas', (req, res) => res.json({ preguntas: state.preguntas, activaId: state.activaId }));
app.get('/api/activa', (req, res) => res.json({ activa: activa() }));
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ activa: activa(), total: state.preguntas.length })}\n\n`);
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(res); });
});

// Escritura (requiere token si ADMIN_TOKEN está definido)
app.post('/api/preguntas', auth, (req, res) => {
  const texto = clean(req.body.texto);
  if (!texto) return res.status(400).json({ error: 'texto requerido' });
  const p = {
    id: crypto.randomBytes(5).toString('hex'),
    texto,
    autor: clean(req.body.autor) || 'Lucuma Agency',
    tema: clean(req.body.tema),
    usada: false,
    creada: new Date().toISOString()
  };
  state.preguntas.push(p); save();
  res.status(201).json(p);
});

app.post('/api/preguntas/bulk', auth, (req, res) => {
  const lineas = Array.isArray(req.body.textos) ? req.body.textos : String(req.body.texto || '').split('\n');
  const nuevas = lineas.map(clean).filter(Boolean).map(texto => ({
    id: crypto.randomBytes(5).toString('hex'), texto,
    autor: clean(req.body.autor) || 'Lucuma Agency', tema: clean(req.body.tema),
    usada: false, creada: new Date().toISOString()
  }));
  state.preguntas.push(...nuevas); save();
  res.status(201).json({ creadas: nuevas.length });
});

app.patch('/api/preguntas/:id', auth, (req, res) => {
  const p = state.preguntas.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'no existe' });
  for (const k of ['texto', 'autor', 'tema']) if (k in req.body) p[k] = clean(req.body[k]);
  if ('usada' in req.body) p.usada = !!req.body.usada;
  save(); if (p.id === state.activaId) broadcast();
  res.json(p);
});

app.delete('/api/preguntas/:id', auth, (req, res) => {
  const i = state.preguntas.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'no existe' });
  state.preguntas.splice(i, 1);
  if (state.activaId === req.params.id) state.activaId = null;
  save(); broadcast();
  res.json({ ok: true });
});

// Mostrar / ocultar en pantalla
app.post('/api/preguntas/:id/mostrar', auth, (req, res) => {
  const p = state.preguntas.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'no existe' });
  p.usada = true; state.activaId = p.id; save(); broadcast();
  res.json({ activa: p });
});
app.post('/api/siguiente', auth, (req, res) => {
  const p = state.preguntas.find(x => !x.usada);
  if (!p) { state.activaId = null; save(); broadcast(); return res.json({ activa: null }); }
  p.usada = true; state.activaId = p.id; save(); broadcast();
  res.json({ activa: p });
});
app.post('/api/ocultar', auth, (req, res) => { state.activaId = null; save(); broadcast(); res.json({ ok: true }); });
app.post('/api/reiniciar', auth, (req, res) => {
  state.preguntas.forEach(p => p.usada = false); state.activaId = null; save(); broadcast();
  res.json({ ok: true });
});

app.get('/', (req, res) => res.redirect('/admin.html'));
app.listen(PORT, () => console.log(`TikTok Live preguntas → http://localhost:${PORT}  (overlay: /overlay.html)`));
