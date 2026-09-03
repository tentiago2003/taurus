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

const profiles = {
  list() {
    return getDatabase().prepare('SELECT * FROM profiles ORDER BY id').all();
  },
  findByName(name) {
    return getDatabase().prepare('SELECT * FROM profiles WHERE name = ?').get(name);
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
};

const connections = {
  listByCompany(companyId) {
    return getDatabase()
      .prepare('SELECT * FROM connections WHERE company_id = ? ORDER BY name')
      .all(companyId)
      .map((row) => parseJson(row));
  },
};

const dashboards = {
  listByCompany(companyId) {
    return getDatabase()
      .prepare('SELECT * FROM dashboards WHERE company_id = ? ORDER BY name')
      .all(companyId);
  },
};

module.exports = {
  profiles,
  systemSettings,
  measurements,
  dataSources,
  connections,
  dashboards,
};
