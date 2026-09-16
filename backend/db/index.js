const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.TAURUS_DB_PATH || path.join(__dirname, '..', '..', 'data', 'taurus.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const DEFAULT_PROFILES = [
  { name: 'Admin', description: 'Acesso total à plataforma' },
  { name: 'Gerente', description: 'Gerencia dashboards, conexões e fontes de dados' },
  { name: 'Consulta', description: 'Acesso somente leitura' },
];

let db = null;

/**
 * Abre (criando se necessário) o banco data/taurus.db,
 * aplica o schema e executa os seeds iniciais. Idempotente.
 * @returns {DatabaseSync}
 */
function initDatabase() {
  if (db) {
    return db;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

  migrateCompaniesActiveColumn(db);
  seedProfiles(db);
  migrateSystemSettings(db);
  seedSystemSettings(db);

  return db;
}

/** Migração idempotente: adiciona a coluna active a bancos criados antes dela existir. */
function migrateCompaniesActiveColumn(database) {
  const columns = database.prepare('PRAGMA table_info(companies)').all();
  const hasActive = columns.some((column) => column.name === 'active');
  if (!hasActive) {
    database.exec(
      'ALTER TABLE companies ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))'
    );
  }
}


/** Migração idempotente: adiciona parâmetros globais a bancos criados antes deles existirem. */
function migrateSystemSettings(database) {
  const columns = database.prepare('PRAGMA table_info(system_settings)').all();
  const hasDefaultSamplingInterval = columns.some(
    (column) => column.name === 'default_sampling_interval_seconds'
  );
  if (!hasDefaultSamplingInterval) {
    database.exec(
      'ALTER TABLE system_settings ADD COLUMN default_sampling_interval_seconds INTEGER NOT NULL DEFAULT 600 CHECK (default_sampling_interval_seconds > 0)'
    );
  }
}

/** Retorna a instância aberta do banco; inicializa se necessário. */
function getDatabase() {
  return db ?? initDatabase();
}

/** Fecha a conexão com o banco (uso em testes/encerramento). */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function seedProfiles(database) {
  const insert = database.prepare(
    'INSERT OR IGNORE INTO profiles (name, description, active, is_system) VALUES (?, ?, 1, 1)'
  );
  for (const profile of DEFAULT_PROFILES) {
    insert.run(profile.name, profile.description);
  }
}

function seedSystemSettings(database) {
  database
    .prepare(
      'INSERT OR IGNORE INTO system_settings (id, measurement_retention_days, default_sampling_interval_seconds) VALUES (1, 7, 600)'
    )
    .run();
}

module.exports = { initDatabase, getDatabase, closeDatabase, DB_PATH };
