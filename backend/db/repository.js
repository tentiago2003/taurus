const { getDatabase } = require('./index');

/**
 * Camada de repositório: único ponto da aplicação que conhece o SQLite.
 * O restante do código consome estas funções sem acessar SQL ou o
 * driver diretamente. CRUD completo e regras de negócio serão
 * adicionados em iterações futuras.
 *
 * Campos `configuration` são JSON serializado em TEXT: este módulo
 * faz o parse/stringify na fronteira.
 */

function parseJson(row, fields = ['configuration', 'payload']) {
  if (!row) {
    return row;
  }
  const parsed = { ...row };
  for (const field of fields) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        // mantém o valor bruto se não for JSON válido
      }
    }
  }
  return parsed;
}

const companies = {
  list() {
    return getDatabase().prepare('SELECT * FROM companies ORDER BY name').all();
  },
  findById(id) {
    return getDatabase().prepare('SELECT * FROM companies WHERE id = ?').get(id);
  },
  create({ name, createdBy = null }) {
    const result = getDatabase()
      .prepare('INSERT INTO companies (name, created_by, updated_by) VALUES (?, ?, ?)')
      .run(name, createdBy, createdBy);
    return this.findById(result.lastInsertRowid);
  },
};

const profiles = {
  list() {
    return getDatabase().prepare('SELECT * FROM profiles ORDER BY id').all();
  },
  findByName(name) {
    return getDatabase().prepare('SELECT * FROM profiles WHERE name = ?').get(name);
  },
  findById(id) {
    return getDatabase().prepare('SELECT * FROM profiles WHERE id = ?').get(id);
  },
  /** Perfis criados por aqui nunca são perfis de sistema (is_system = 0). */
  create({ name, description = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO profiles (name, description, active, is_system)
         VALUES (?, ?, 1, 0)`
      )
      .run(name, description);
    return this.findById(result.lastInsertRowid);
  },
};

const users = {
  list() {
    return getDatabase().prepare('SELECT * FROM users ORDER BY name').all();
  },
  findById(id) {
    return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  findByEmail(email) {
    return getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(email);
  },
  create({ companyId = null, profileId, name, email, passwordHash, createdBy = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO users (company_id, profile_id, name, email, password_hash, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(companyId, profileId, name, email, passwordHash, createdBy, createdBy);
    return this.findById(result.lastInsertRowid);
  },
};

const systemSettings = {
  get() {
    return getDatabase().prepare('SELECT * FROM system_settings WHERE id = 1').get();
  },
};

const measurements = {
  /** Insere uma medição vinda de uma fonte de dados. */
  insert({ dataSourceId, timestamp, value, payload = null }) {
    if (value === null || value === undefined) {
      throw new TypeError('measurements.value é obrigatório (REAL NOT NULL)');
    }
    return getDatabase()
      .prepare(
        `INSERT INTO measurements (data_source_id, timestamp, value, payload)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        dataSourceId,
        timestamp ?? new Date().toISOString(),
        value,
        payload === null ? null : JSON.stringify(payload)
      );
  },
  listByDataSource(dataSourceId, { limit = 100 } = {}) {
    return getDatabase()
      .prepare(
        `SELECT * FROM measurements
         WHERE data_source_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(dataSourceId, limit)
      .map((row) => parseJson(row));
  },
};

const dataSources = {
  list() {
    return getDatabase()
      .prepare('SELECT * FROM data_sources ORDER BY name')
      .all()
      .map((row) => parseJson(row));
  },
  listByConnection(connectionId) {
    return getDatabase()
      .prepare('SELECT * FROM data_sources WHERE connection_id = ? ORDER BY name')
      .all(connectionId)
      .map((row) => parseJson(row));
  },
  findById(id) {
    return parseJson(
      getDatabase().prepare('SELECT * FROM data_sources WHERE id = ?').get(id)
    );
  },
  create({
    connectionId,
    name,
    type,
    topic = null,
    samplingIntervalSeconds = 600,
    storeHistory = 1,
    configuration = null,
    createdBy = null,
  }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO data_sources
           (connection_id, name, type, topic, sampling_interval_seconds, store_history, configuration, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        connectionId,
        name,
        type,
        topic,
        samplingIntervalSeconds,
        storeHistory ? 1 : 0,
        configuration === null ? null : JSON.stringify(configuration),
        createdBy,
        createdBy
      );
    return this.findById(result.lastInsertRowid);
  },
};

const connections = {
  list() {
    return getDatabase()
      .prepare('SELECT * FROM connections ORDER BY name')
      .all()
      .map((row) => parseJson(row));
  },
  listByCompany(companyId) {
    return getDatabase()
      .prepare('SELECT * FROM connections WHERE company_id = ? ORDER BY name')
      .all(companyId)
      .map((row) => parseJson(row));
  },
  findById(id) {
    return parseJson(getDatabase().prepare('SELECT * FROM connections WHERE id = ?').get(id));
  },
  create({ companyId, name, type, configuration, createdBy = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO connections (company_id, name, type, configuration, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(companyId, name, type, JSON.stringify(configuration ?? {}), createdBy, createdBy);
    return this.findById(result.lastInsertRowid);
  },
};

const dashboards = {
  list() {
    return getDatabase().prepare('SELECT * FROM dashboards ORDER BY name').all();
  },
  listByCompany(companyId) {
    return getDatabase()
      .prepare('SELECT * FROM dashboards WHERE company_id = ? ORDER BY name')
      .all(companyId);
  },
  findById(id) {
    return getDatabase().prepare('SELECT * FROM dashboards WHERE id = ?').get(id);
  },
  create({ companyId, name, description = null, isDefault = 0, createdBy = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO dashboards (company_id, name, description, is_default, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(companyId, name, description, isDefault ? 1 : 0, createdBy, createdBy);
    return this.findById(result.lastInsertRowid);
  },
};

const widgets = {
  list() {
    return getDatabase()
      .prepare('SELECT * FROM widgets ORDER BY dashboard_id, position')
      .all()
      .map((row) => parseJson(row));
  },
  findById(id) {
    return parseJson(getDatabase().prepare('SELECT * FROM widgets WHERE id = ?').get(id));
  },
  create({ dashboardId, name, type, position = 0, configuration = null, createdBy = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO widgets (dashboard_id, name, type, position, configuration, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        dashboardId,
        name,
        type,
        position,
        configuration === null ? null : JSON.stringify(configuration),
        createdBy,
        createdBy
      );
    return this.findById(result.lastInsertRowid);
  },
};

module.exports = {
  companies,
  profiles,
  users,
  systemSettings,
  measurements,
  dataSources,
  connections,
  dashboards,
  widgets,
};
