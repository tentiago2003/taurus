const repository = require('../db/repository');
const access = require('./access.service');
const { buildXlsx } = require('./xlsx.service');

function ensureDataSourceAccess(user, dataSourceId) {
  if (dataSourceId !== null && dataSourceId !== undefined && dataSourceId !== '') {
    access.ensureCompanyAccess(user, access.companyIdFromDataSource(Number(dataSourceId)));
  }
}

function companyIdForUser(user) {
  return user && !access.isAdmin(user) ? Number(user.company_id) : null;
}

function measurements(options, user) {
  ensureDataSourceAccess(user, options.dataSourceId);
  const rows = repository.listAllForExportMeasurements({ ...options, companyId: companyIdForUser(user) });
  const data = rows.map((row) => [
    row.timestamp,
    row.data_source_name,
    row.metric,
    Number.isFinite(Number(row.value)) ? Number(row.value) : row.value,
    row.payload === null || row.payload === undefined ? '' : JSON.stringify(row.payload),
  ]);
  return buildXlsx({
    sheetName: 'Medições',
    headers: ['Data/Hora', 'Fonte de dados', 'Métrica', 'Valor', 'Payload'],
    rows: data,
  });
}

function rawMessages(options, user) {
  ensureDataSourceAccess(user, options.dataSourceId);
  const rows = repository.listAllForExportRawMessages({ ...options, companyId: companyIdForUser(user) });
  const data = rows.map((row) => {
    const payload = Buffer.from(row.payload);
    let payloadText;
    try { payloadText = payload.toString('utf8'); } catch { payloadText = ''; }
    return [row.received_at, row.connection_name, row.data_source_name, row.topic, payloadText || `[binário] ${payload.toString('base64')}`];
  });
  return buildXlsx({
    sheetName: 'Mensagens Brutas',
    headers: ['Data/Hora', 'Conexão', 'Fonte de dados', 'Tópico', 'Payload'],
    rows: data,
  });
}

module.exports = { measurements, rawMessages };
