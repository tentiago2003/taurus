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
  update({ id, name, updatedBy = null }) {
    getDatabase()
      .prepare(
        `UPDATE companies
         SET name = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
         WHERE id = ?`
      )
      .run(name, updatedBy, id);
    return this.findById(id);
  },
  setActive({ id, active, updatedBy = null }) {
    getDatabase()
      .prepare(
        `UPDATE companies
         SET active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
         WHERE id = ?`
      )
      .run(active ? 1 : 0, updatedBy, id);
    return this.findById(id);
  },
  remove(id) {
    return getDatabase().prepare('DELETE FROM companies WHERE id = ?').run(id).changes > 0;
  },
  /** Conta registros dependentes usados para bloquear exclusão definitiva. */
  countDependents(id) {
    const db = getDatabase();
    return {
      users: db.prepare('SELECT COUNT(*) AS count FROM users WHERE company_id = ?').get(id).count,
      connections: db
        .prepare('SELECT COUNT(*) AS count FROM connections WHERE company_id = ?')
        .get(id).count,
      dashboards: db
        .prepare('SELECT COUNT(*) AS count FROM dashboards WHERE company_id = ?')
        .get(id).count,
    };
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
  /** passwordHash nulo mantém a senha atual (troca é opcional na edição). */
  update({ id, companyId, profileId, name, email, passwordHash = null, updatedBy = null }) {
    if (passwordHash) {
      getDatabase()
        .prepare(
          `UPDATE users
           SET company_id = ?, profile_id = ?, name = ?, email = ?, password_hash = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
           WHERE id = ?`
        )
        .run(companyId, profileId, name, email, passwordHash, updatedBy, id);
    } else {
      getDatabase()
        .prepare(
          `UPDATE users
           SET company_id = ?, profile_id = ?, name = ?, email = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
           WHERE id = ?`
        )
        .run(companyId, profileId, name, email, updatedBy, id);
    }
    return this.findById(id);
  },
  setActive({ id, active, updatedBy = null }) {
    getDatabase()
      .prepare(
        `UPDATE users
         SET active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
         WHERE id = ?`
      )
      .run(active ? 1 : 0, updatedBy, id);
    return this.findById(id);
  },
  remove(id) {
    return getDatabase().prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
  },
};

const systemSettings = {
  get() {
    return getDatabase().prepare('SELECT * FROM system_settings WHERE id = 1').get();
  },
  update({ measurementRetentionDays, defaultSamplingIntervalSeconds, updatedBy = null }) {
    getDatabase()
      .prepare(
        `UPDATE system_settings
         SET measurement_retention_days = ?,
             default_sampling_interval_seconds = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_by = ?
         WHERE id = 1`
      )
      .run(measurementRetentionDays, defaultSamplingIntervalSeconds, updatedBy);
    return this.get();
  },
};

const rawMessages = {
  insert({ dataSourceId, topic, receivedAt = null, payload }) {
    if (!topic) throw new TypeError('raw_messages.topic é obrigatório');
    if (payload === null || payload === undefined) throw new TypeError('raw_messages.payload é obrigatório');
    const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    const result = getDatabase()
      .prepare(`INSERT INTO raw_messages (data_source_id, topic, received_at, payload)
                VALUES (?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), ?)`)
      .run(dataSourceId, topic, receivedAt, bytes);
    return this.findById(result.lastInsertRowid);
  },
  findById(id) {
    return getDatabase().prepare('SELECT * FROM raw_messages WHERE id = ?').get(id);
  },
  listByDataSource(dataSourceId, { limit = 100 } = {}) {
    return getDatabase()
      .prepare(`SELECT id, data_source_id, topic, received_at, length(payload) AS payload_size_bytes
                FROM raw_messages WHERE data_source_id = ?
                ORDER BY received_at DESC, id DESC LIMIT ?`)
      .all(dataSourceId, limit);
  },
  listRecentPaged({ dataSourceId = null, topic = null, from = null, to = null, page = 1, pageSize = 50 } = {}) {
    const safePageSize = Math.min(Math.max(Number.parseInt(pageSize, 10) || 50, 1), 100);
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const conditions = [];
    const params = [];

    if (dataSourceId !== null && dataSourceId !== undefined && dataSourceId !== '') {
      conditions.push('rm.data_source_id = ?');
      params.push(Number.parseInt(dataSourceId, 10));
    }
    if (topic !== null && topic !== undefined && String(topic).trim() !== '') {
      conditions.push('rm.topic LIKE ?');
      params.push(`%${String(topic).trim()}%`);
    }
    if (from) {
      conditions.push('rm.received_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('rm.received_at <= ?');
      params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = getDatabase()
      .prepare(`SELECT COUNT(*) AS total FROM raw_messages rm ${where}`)
      .get(...params).total;
    const rows = getDatabase()
      .prepare(`SELECT rm.id, rm.data_source_id, ds.name AS data_source_name,
                       c.id AS connection_id, c.name AS connection_name,
                       rm.topic, rm.received_at, length(rm.payload) AS payload_size_bytes, rm.payload
                FROM raw_messages rm
                JOIN data_sources ds ON ds.id = rm.data_source_id
                JOIN connections c ON c.id = ds.connection_id
                ${where}
                ORDER BY rm.received_at DESC, rm.id DESC
                LIMIT ? OFFSET ?`)
      .all(...params, safePageSize, (safePage - 1) * safePageSize);

    return {
      rows,
      total: Number(count),
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(Math.ceil(Number(count) / safePageSize), 1),
    };
  },
  listRecent(options = {}) {
    return this.listRecentPaged(options).rows;
  },
};

const measurements = {
  /** Insere uma medição vinda de uma fonte de dados. */
  insert({ dataSourceId, metric = 'value', timestamp, value, payload = null }) {
    if (value === null || value === undefined) {
      throw new TypeError('measurements.value é obrigatório (REAL NOT NULL)');
    }
    return getDatabase()
      .prepare(
        `INSERT INTO measurements (data_source_id, metric, timestamp, value, payload)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        dataSourceId,
        metric,
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
  findByConnectionAndTopic(connectionId, topic) {
    return parseJson(
      getDatabase()
        .prepare('SELECT * FROM data_sources WHERE connection_id = ? AND topic = ?')
        .get(connectionId, topic)
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
  update({ id, name, type, topic = null, samplingIntervalSeconds = 600, storeHistory = 1, active = 1, configuration, updatedBy = null }) {
    const fields = ['name = ?', 'type = ?', 'topic = ?', 'sampling_interval_seconds = ?', 'store_history = ?', 'active = ?'];
    const params = [name, type, topic, samplingIntervalSeconds, storeHistory ? 1 : 0, active ? 1 : 0];
    if (configuration !== undefined) {
      fields.push('configuration = ?');
      params.push(configuration === null ? null : JSON.stringify(configuration));
    }
    fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", 'updated_by = ?');
    params.push(updatedBy, id);
    getDatabase()
      .prepare(`UPDATE data_sources SET ${fields.join(', ')} WHERE id = ?`)
      .run(...params);
    return this.findById(id);
  },
  updateConfiguration({ id, configuration, updatedBy = null }) {
    getDatabase()
      .prepare(
        `UPDATE data_sources
         SET configuration = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
         WHERE id = ?`
      )
      .run(configuration === null ? null : JSON.stringify(configuration), updatedBy, id);
    return this.findById(id);
  },
  remove(id) {
    return getDatabase().prepare('DELETE FROM data_sources WHERE id = ?').run(id).changes > 0;
  },
};

const connectionEvents = {
  create({ connectionId, eventType, message = null, details = null, timestamp = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO connection_events (connection_id, event_type, timestamp, message, details)
         VALUES (?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), ?, ?)`
      )
      .run(
        connectionId,
        eventType,
        timestamp,
        message,
        details === null || details === undefined ? null : JSON.stringify(details)
      );
    return this.findById(result.lastInsertRowid);
  },
  findById(id) {
    return parseJson(getDatabase().prepare('SELECT * FROM connection_events WHERE id = ?').get(id), ['details']);
  },
  listByConnection(connectionId, { limit = 50 } = {}) {
    return getDatabase()
      .prepare(
        `SELECT * FROM connection_events
         WHERE connection_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(connectionId, limit)
      .map((row) => parseJson(row, ['details']));
  },
  listPagedByConnection(connectionId, { page = 1, pageSize = 50, eventType = null, from = null, to = null } = {}) {
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(10, Number.parseInt(pageSize, 10) || 50));
    const conditions = ['connection_id = ?'];
    const params = [connectionId];

    if (eventType) {
      conditions.push('event_type = ?');
      params.push(eventType);
    }
    if (from) {
      conditions.push('timestamp >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('timestamp <= ?');
      params.push(to);
    }

    const where = conditions.join(' AND ');
    const db = getDatabase();
    const total = db.prepare(`SELECT COUNT(*) AS total FROM connection_events WHERE ${where}`).get(...params).total;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const currentPage = Math.min(safePage, totalPages);
    const offset = (currentPage - 1) * safePageSize;
    const rows = db
      .prepare(`SELECT * FROM connection_events WHERE ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
      .all(...params, safePageSize, offset)
      .map((row) => parseJson(row, ['details']));

    return { rows, total, page: currentPage, pageSize: safePageSize, totalPages };
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
  listActive() {
    return getDatabase()
      .prepare('SELECT * FROM connections WHERE active = 1 ORDER BY name')
      .all()
      .map((row) => parseJson(row));
  },
  findById(id) {
    return parseJson(getDatabase().prepare('SELECT * FROM connections WHERE id = ?').get(id));
  },
  create({ companyId, name, type, configuration, createdBy = null }) {
    const result = getDatabase()
      .prepare(
        `INSERT INTO connections (company_id, name, type, configuration, active, created_by, updated_by)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      )
      .run(companyId, name, type, JSON.stringify(configuration ?? {}), createdBy, createdBy);
    return this.findById(result.lastInsertRowid);
  },
  createWithDataSources({ companyId, name, type, configuration, dataSources: sources, createdBy = null }) {
    const db = getDatabase();
    db.exec('BEGIN');
    try {
      const result = db
        .prepare(
          `INSERT INTO connections (company_id, name, type, configuration, active, created_by, updated_by)
           VALUES (?, ?, ?, ?, 0, ?, ?)`
        )
        .run(companyId, name, type, JSON.stringify(configuration ?? {}), createdBy, createdBy);
      const connectionId = Number(result.lastInsertRowid);
      for (const source of sources) {
        dataSources.create({
          connectionId,
          name: source.name,
          type,
          topic: source.topic,
          samplingIntervalSeconds: source.samplingIntervalSeconds,
          storeHistory: source.storeHistory,
          createdBy,
        });
      }
      db.exec('COMMIT');
      return {
        ...this.findById(connectionId),
        dataSources: dataSources.listByConnection(connectionId),
      };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  },
  updateWithDataSources({ id, companyId, name, type, configuration, dataSources: sources, updatedBy = null }) {
    const db = getDatabase();
    db.exec('BEGIN');
    try {
      db
        .prepare(
          `UPDATE connections
           SET company_id = ?, name = ?, type = ?, configuration = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
           WHERE id = ?`
        )
        .run(companyId, name, type, JSON.stringify(configuration ?? {}), updatedBy, id);

      const existing = dataSources.listByConnection(id);
      const incomingIds = new Set(sources.filter((source) => source.id !== null).map((source) => source.id));
      for (const current of existing) {
        if (!incomingIds.has(current.id)) {
          dataSources.remove(current.id);
        }
      }

      for (const source of sources) {
        if (source.id === null) {
          dataSources.create({
            connectionId: id,
            name: source.name,
            type,
            topic: source.topic,
            samplingIntervalSeconds: source.samplingIntervalSeconds,
            storeHistory: source.storeHistory,
            createdBy: updatedBy,
          });
        } else {
          const current = dataSources.findById(source.id);
          if (!current || current.connection_id !== id) {
            throw new Error(`Fonte de dados ${source.id} não pertence à conexão ${id}.`);
          }
          dataSources.update({
            id: source.id,
            name: source.name,
            type,
            topic: source.topic,
            samplingIntervalSeconds: source.samplingIntervalSeconds,
            storeHistory: source.storeHistory,
            active: source.active,
            updatedBy,
          });
        }
      }

      db.exec('COMMIT');
      return {
        ...this.findById(id),
        dataSources: dataSources.listByConnection(id),
      };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  },
  setActive({ id, active, updatedBy = null }) {
    getDatabase()
      .prepare(
        `UPDATE connections
         SET active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ?
         WHERE id = ?`
      )
      .run(active ? 1 : 0, updatedBy, id);
    return this.findById(id);
  },
  remove(id) {
    return getDatabase().prepare('DELETE FROM connections WHERE id = ?').run(id).changes > 0;
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
  connectionEvents,
  rawMessages,
  measurements,
  dataSources,
  connections,
  dashboards,
  widgets,
};
