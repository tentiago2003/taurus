-- Taurus - camada inicial de persistência (SQLite)
-- Datas armazenadas como UTC em formato ISO-8601 TEXT.
-- Campos "configuration" armazenam JSON serializado em TEXT.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  is_system   INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  profile_id    INTEGER NOT NULL REFERENCES profiles(id),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users(profile_id);

CREATE TABLE IF NOT EXISTS connections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  configuration TEXT NOT NULL, -- JSON
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_connections_company_id ON connections(company_id);

CREATE TABLE IF NOT EXISTS data_sources (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id              INTEGER NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  type                       TEXT NOT NULL,
  topic                      TEXT,
  sampling_interval_seconds  INTEGER NOT NULL DEFAULT 600 CHECK (sampling_interval_seconds > 0),
  store_history              INTEGER NOT NULL DEFAULT 1 CHECK (store_history IN (0, 1)),
  configuration              TEXT, -- JSON
  active                     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (connection_id, name),
  UNIQUE (connection_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_data_sources_connection_id ON data_sources(connection_id);

CREATE TABLE IF NOT EXISTS measurements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  timestamp      TEXT NOT NULL, -- UTC ISO-8601
  value          REAL NOT NULL,
  payload        TEXT, -- JSON bruto opcional
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_measurements_source_timestamp
  ON measurements(data_source_id, timestamp);

CREATE TABLE IF NOT EXISTS dashboards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dashboards_company_id ON dashboards(company_id);

CREATE TABLE IF NOT EXISTS widgets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  dashboard_id  INTEGER NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  configuration TEXT, -- JSON
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_widgets_dashboard_id ON widgets(dashboard_id);

CREATE TABLE IF NOT EXISTS widget_data_sources (
  widget_id      INTEGER NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (widget_id, data_source_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_data_sources_data_source_id
  ON widget_data_sources(data_source_id);

CREATE TABLE IF NOT EXISTS system_settings (
  id                         INTEGER PRIMARY KEY CHECK (id = 1),
  measurement_retention_days INTEGER NOT NULL DEFAULT 7 CHECK (measurement_retention_days > 0),
  updated_at                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL
);
