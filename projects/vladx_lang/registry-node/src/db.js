const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'registry.db');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS utenti (
    id        TEXT PRIMARY KEY,
    username  TEXT UNIQUE NOT NULL,
    email     TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    creato_il TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pacchetti (
    id          TEXT PRIMARY KEY,
    nome        TEXT UNIQUE NOT NULL,
    autore_id   TEXT NOT NULL,
    descrizione TEXT,
    creato_il   TEXT NOT NULL,
    FOREIGN KEY (autore_id) REFERENCES utenti(id)
  );

  CREATE TABLE IF NOT EXISTS versioni (
    id            TEXT PRIMARY KEY,
    pacchetto     TEXT NOT NULL,
    versione      TEXT NOT NULL,
    descrizione   TEXT,
    dipendenze    TEXT NOT NULL DEFAULT '{}',
    pubblicato_il TEXT NOT NULL,
    UNIQUE(pacchetto, versione),
    FOREIGN KEY (pacchetto) REFERENCES pacchetti(nome)
  );
`);

module.exports = db;
