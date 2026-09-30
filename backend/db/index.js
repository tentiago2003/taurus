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
  migrateRawMessages(db);
  migrateMeasurements(db);
  migrateCleanupHistory(db);
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

/** Migração idempotente: cria a tabela de mensagens brutas em bancos existentes. */
function migrateRawMessages(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS raw_messages (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      topic          TEXT NOT NULL,
      received_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      payload        BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_raw_messages_source_received
      ON raw_messages(data_source_id, received_at);
  `);
}


/** Migração idempotente: adiciona a identificação da métrica a medições existentes. */
function migrateMeasurements(database) {
  const columns = database.prepare('PRAGMA table_info(measurements)').all();
  const hasMetric = columns.some((column) => column.name === 'metric');
  if (!hasMetric) {
    database.exec(
      "ALTER TABLE measurements ADD COLUMN metric TEXT NOT NULL DEFAULT 'value'"
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


function migrateCleanupHistory(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cleanup_history (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      executed_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      executed_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
      cleanup_type           TEXT NOT NULL CHECK (cleanup_type IN ('automatic', 'manual')),
      retention_days         INTEGER NOT NULL CHECK (retention_days > 0),
      period_start           TEXT,
      period_end             TEXT,
      cutoff_at              TEXT,
      measurements_deleted   INTEGER NOT NULL DEFAULT 0 CHECK (measurements_deleted >= 0),
      raw_messages_deleted   INTEGER NOT NULL DEFAULT 0 CHECK (raw_messages_deleted >= 0)
    );
    CREATE INDEX IF NOT EXISTS idx_cleanup_history_executed_at
      ON cleanup_history(executed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cleanup_history_type_executed_at
      ON cleanup_history(cleanup_type, executed_at DESC);
  `);

  const columns = database.prepare('PRAGMA table_info(cleanup_history)').all();
  const hasExecutedBy = columns.some((column) => column.name === 'executed_by');
  if (!hasExecutedBy) {
    database.exec(
      'ALTER TABLE cleanup_history ADD COLUMN executed_by INTEGER REFERENCES users(id) ON DELETE SET NULL'
    );
  }
}

function seedSystemSettings(database) {
  database
    .prepare(
      'INSERT OR IGNORE INTO system_settings (id, measurement_retention_days, default_sampling_interval_seconds) VALUES (1, 30, 600)'
    )
    .run();

  database
    .prepare(
      `UPDATE system_settings
       SET measurement_retention_days = 30
       WHERE id = 1 AND measurement_retention_days = 7`
    )
    .run();
}

module.exports = { initDatabase, getDatabase, closeDatabase, DB_PATH };
