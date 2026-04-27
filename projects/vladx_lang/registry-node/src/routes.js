const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { creaToken, middleware } = require('./auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PACKAGES_DIR = process.env.PACKAGES_DIR || path.join(__dirname, '..', 'packages');

const NOME_VALIDO = /^[a-z0-9][a-z0-9._-]{0,213}$/;
function validaNome(nome) {
  if (!NOME_VALIDO.test(nome)) return false;
  // blocca path traversal
  const resolved = path.resolve(PACKAGES_DIR, nome);
  return resolved.startsWith(path.resolve(PACKAGES_DIR) + path.sep);
}

fs.mkdirSync(PACKAGES_DIR, { recursive: true });

// POST /auth/register
router.post('/auth/register', async (req, res) => {
  const { utente, email, password } = req.body;
  if (!utente || !email || !password || password.length < 6) {
    return res.status(400).json({ errore: 'Dati non validi (password minimo 6 caratteri)' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    db.prepare(
      'INSERT INTO utenti (id, username, email, password, creato_il) VALUES (?,?,?,?,?)'
    ).run(id, utente, email, hash, new Date().toISOString());
    res.json({ token: creaToken(id, utente) });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ errore: 'Username o email già in uso' });
    res.status(500).json({ errore: 'Errore interno' });
  }
});

// POST /auth/login
router.post('/auth/login', async (req, res) => {
  const { utente, password } = req.body;
  const row = db.prepare('SELECT id, username, password FROM utenti WHERE username=?').get(utente);
  if (!row || !(await bcrypt.compare(password, row.password))) {
    return res.status(401).json({ errore: 'Credenziali non valide' });
  }
  res.json({ token: creaToken(row.id, row.username) });
});

// GET /search?q=...
router.get('/search', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const pacchetti = db.prepare(`
    SELECT p.nome, u.username AS autore, p.descrizione,
           (SELECT versione FROM versioni WHERE pacchetto=p.nome ORDER BY pubblicato_il DESC LIMIT 1) AS versione
    FROM pacchetti p JOIN utenti u ON u.id=p.autore_id
    WHERE p.nome LIKE ? OR p.descrizione LIKE ?
    LIMIT 20
  `).all(q, q).map(p => ({
    nome: p.nome,
    versione: p.versione || '0.0.0',
    descrizione: p.descrizione,
    autore: p.autore,
    url_download: `${BASE_URL}/packages/${p.nome}/latest/download`,
  }));
  res.json({ pacchetti });
});

// GET /packages/:nome/:versione
router.get('/packages/:nome/:versione', (req, res) => {
  const { nome, versione } = req.params;
  if (!validaNome(nome)) return res.status(400).json({ errore: 'Nome pacchetto non valido' });
  const query = versione === 'latest'
    ? 'SELECT v.versione, v.descrizione, v.dipendenze, u.username AS autore FROM versioni v JOIN pacchetti p ON p.nome=v.pacchetto JOIN utenti u ON u.id=p.autore_id WHERE v.pacchetto=? ORDER BY v.pubblicato_il DESC LIMIT 1'
    : 'SELECT v.versione, v.descrizione, v.dipendenze, u.username AS autore FROM versioni v JOIN pacchetti p ON p.nome=v.pacchetto JOIN utenti u ON u.id=p.autore_id WHERE v.pacchetto=? AND v.versione=? LIMIT 1';
  const row = versione === 'latest'
    ? db.prepare(query).get(nome)
    : db.prepare(query).get(nome, versione);
  if (!row) return res.status(404).json({ errore: 'Pacchetto non trovato' });
  res.json({
    nome,
    versione: row.versione,
    descrizione: row.descrizione,
    autore: row.autore,
    dipendenze: JSON.parse(row.dipendenze || '{}'),
    url_download: `${BASE_URL}/packages/${nome}/${row.versione}/download`,
  });
});

// GET /packages/:nome/:versione/download
router.get('/packages/:nome/:versione/download', (req, res) => {
  const { nome, versione } = req.params;
  if (!validaNome(nome)) return res.status(400).json({ errore: 'Nome pacchetto non valido' });
  const filePath = path.join(PACKAGES_DIR, nome, `${versione}.tar.gz`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ errore: 'Archivio non trovato' });
  res.set('Content-Type', 'application/gzip');
  res.sendFile(filePath);
});

// POST /publish  (multipart: manifest + archivio)
router.post('/publish', middleware, upload.fields([
  { name: 'manifest', maxCount: 1 },
  { name: 'archivio', maxCount: 1 },
]), (req, res) => {
  let manifest;
  try {
    const raw = req.files?.manifest?.[0]?.buffer?.toString() || req.body.manifest;
    manifest = JSON.parse(raw);
  } catch {
    return res.status(400).json({ errore: 'Manifest non valido' });
  }

  const { nome, versione, descrizione, dipendenze = {} } = manifest;
  if (!nome || !versione) return res.status(400).json({ errore: "Campi 'nome' e 'versione' obbligatori" });
  if (!validaNome(nome)) return res.status(400).json({ errore: 'Nome pacchetto non valido' });

  const archivio = req.files?.archivio?.[0]?.buffer || Buffer.alloc(0);

  // verifica autore
  const pkg = db.prepare('SELECT autore_id FROM pacchetti WHERE nome=?').get(nome);
  if (pkg && pkg.autore_id !== req.utente.sub) {
    return res.status(403).json({ errore: 'Non sei l\'autore di questo pacchetto' });
  }

  try {
    if (!pkg) {
      db.prepare('INSERT INTO pacchetti (id,nome,autore_id,descrizione,creato_il) VALUES (?,?,?,?,?)')
        .run(uuidv4(), nome, req.utente.sub, descrizione || null, new Date().toISOString());
    } else {
      db.prepare('UPDATE pacchetti SET descrizione=? WHERE nome=?').run(descrizione || null, nome);
    }

    db.prepare(`
      INSERT INTO versioni (id,pacchetto,versione,descrizione,dipendenze,pubblicato_il)
      VALUES (?,?,?,?,?,?)
    `).run(uuidv4(), nome, versione, descrizione || null, JSON.stringify(dipendenze), new Date().toISOString());

    // salva archivio su filesystem
    const dir = path.join(PACKAGES_DIR, nome);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${versione}.tar.gz`), archivio);

    res.json({ messaggio: `${nome} v${versione} pubblicato con successo` });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ errore: 'Questa versione esiste già' });
    res.status(500).json({ errore: 'Errore interno' });
  }
});

// DELETE /packages/:nome/:versione
router.delete('/packages/:nome/:versione', middleware, (req, res) => {
  const { nome, versione } = req.params;
  if (!validaNome(nome)) return res.status(400).json({ errore: 'Nome pacchetto non valido' });
  const pkg = db.prepare('SELECT autore_id FROM pacchetti WHERE nome=?').get(nome);
  if (!pkg) return res.status(404).json({ errore: 'Pacchetto non trovato' });
  if (pkg.autore_id !== req.utente.sub) return res.status(403).json({ errore: 'Non sei l\'autore' });

  const { changes } = db.prepare('DELETE FROM versioni WHERE pacchetto=? AND versione=?').run(nome, versione);
  if (!changes) return res.status(404).json({ errore: 'Versione non trovata' });

  // rimuovi file dal filesystem (sincrono)
  const filePath = path.join(PACKAGES_DIR, nome, `${versione}.tar.gz`);
  try { fs.rmSync(filePath, { force: true }); } catch {}

  res.json({ messaggio: 'Versione rimossa' });
});

module.exports = router;
