const repository = require('../db/repository');
const access = require('./access.service');

/**
 * Recebe a mensagem MQTT sem interpretar o payload.
 * A mensagem é persistida exatamente como bytes recebidos do broker.
 */
function collect({ connectionId, topic, payload, receivedAt = new Date().toISOString() }) {
  const dataSource = repository.dataSources.findByConnectionAndTopic(connectionId, topic);

  if (!dataSource || !dataSource.active) {
    return null;
  }

  return repository.rawMessages.insert({
    dataSourceId: dataSource.id,
    topic,
    receivedAt,
    payload,
  });
}

function listByDataSource(dataSourceId, options = {}, user) {
  access.ensureCompanyAccess(user, access.companyIdFromDataSource(dataSourceId));
  return repository.rawMessages.listByDataSource(dataSourceId, options);
}

function mapRows(rows) {
  return rows.map((row) => {
    const payload = Buffer.from(row.payload);
    let payloadText = null;
    try {
      payloadText = payload.toString('utf8');
    } catch {
      payloadText = null;
    }
    return {
      id: row.id,
      data_source_id: row.data_source_id,
      data_source_name: row.data_source_name,
      connection_id: row.connection_id,
      connection_name: row.connection_name,
      topic: row.topic,
      received_at: row.received_at,
      payload_size_bytes: row.payload_size_bytes,
      payload_text: payloadText,
      payload_base64: payload.toString('base64'),
    };
  });
}

function listRecent(options = {}, user) {
  if (!user || access.isAdmin(user)) return mapRows(repository.rawMessages.listRecent(options));
  return mapRows(repository.rawMessages.listRecentPagedByCompany(Number(user.company_id), options).rows);
}

function listPaged(options = {}, user) {
  if (options.dataSourceId !== null && options.dataSourceId !== undefined && options.dataSourceId !== '') {
    access.ensureCompanyAccess(user, access.companyIdFromDataSource(Number(options.dataSourceId)));
  }
  const result = (!user || access.isAdmin(user))
    ? repository.rawMessages.listRecentPaged(options)
    : repository.rawMessages.listRecentPagedByCompany(Number(user.company_id), options);
  return { ...result, rows: mapRows(result.rows) };
}

module.exports = { collect, listByDataSource, listRecent, listPaged };
