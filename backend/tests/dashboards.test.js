const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

process.env.TAURUS_DB_PATH = `/tmp/taurus-dashboard-${process.pid}.db`;

const { getDatabase, closeDatabase } = require('../db');

beforeEach(() => {
  closeDatabase();
});

test('dashboard service module exposes the MVP widget types', () => {
  const service = require('../services/dashboards.service');
  assert.deepEqual(service.WIDGET_TYPES, ['value', 'chart', 'table']);
});


test('cria dashboard de demonstração a partir de medições existentes', () => {
  const db = getDatabase();
  const company = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Empresa Demo');
  const companyId = Number(company.lastInsertRowid);
  const connection = db.prepare(
    `INSERT INTO connections (company_id, name, type, configuration) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Conexão Demo', 'mqtt', '{}');
  const connectionId = Number(connection.lastInsertRowid);
  const source = db.prepare(
    `INSERT INTO data_sources (connection_id, name, type, topic) VALUES (?, ?, ?, ?)`
  ).run(connectionId, 'LoRa1', 'lorawan', 'demo/topic');
  const sourceId = Number(source.lastInsertRowid);

  db.prepare(
    `INSERT INTO measurements (data_source_id, metric, timestamp, value) VALUES (?, ?, ?, ?)`
  ).run(sourceId, 'temperature_1', new Date().toISOString(), 21.5);
  db.prepare(
    `INSERT INTO measurements (data_source_id, metric, timestamp, value) VALUES (?, ?, ?, ?)`
  ).run(sourceId, 'temperature_2', new Date().toISOString(), 20.8);

  const service = require('../services/dashboards.service');
  const dashboards = service.list();

  assert.equal(dashboards.length, 1);
  assert.equal(dashboards[0].name, 'Monitoramento de Temperaturas');
  assert.equal(dashboards[0].description, 'Dashboard criado automaticamente com as medições existentes.');
  assert.equal(dashboards[0].is_default, 1);

  const dashboard = service.get(dashboards[0].id);
  assert.equal(dashboard.widgets.length, 3);
  assert.deepEqual(
    dashboard.widgets.map((widget) => widget.type),
    ['value', 'value', 'chart']
  );
  assert.equal(dashboard.widgets[0].data.sources[0].latest.value, 21.5);
  assert.equal(dashboard.widgets[1].data.sources[0].latest.value, 20.8);
  assert.equal(dashboard.widgets[0].data.size, '1x1');
  assert.equal(dashboard.widgets[2].data.size, '2x2');
});


test('atualiza a descrição antiga do dashboard automático sem alterar dashboards existentes', () => {
  const db = getDatabase();
  const company = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Empresa Demo Atualização');
  const companyId = Number(company.lastInsertRowid);
  const connection = db.prepare(
    `INSERT INTO connections (company_id, name, type, configuration) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Conexão Demo Atualização', 'mqtt', '{}');
  const connectionId = Number(connection.lastInsertRowid);
  const source = db.prepare(
    `INSERT INTO data_sources (connection_id, name, type, topic) VALUES (?, ?, ?, ?)`
  ).run(connectionId, 'LoRa1', 'lorawan', 'demo/topic');
  const sourceId = Number(source.lastInsertRowid);

  db.prepare(
    `INSERT INTO measurements (data_source_id, metric, timestamp, value) VALUES (?, ?, ?, ?)`
  ).run(sourceId, 'temperature_1', new Date().toISOString(), 21.5);

  const service = require('../services/dashboards.service');
  const dashboard = service.list()[0];

  db.prepare(
    `UPDATE dashboards SET description = ? WHERE id = ?`
  ).run('Dashboard de demonstração criado automaticamente com as medições existentes.', dashboard.id);

  const refreshed = service.list()[0];
  assert.equal(refreshed.description, 'Dashboard criado automaticamente com as medições existentes.');
});


// Layout defaults are part of the dashboard demo configuration.
test('dashboard de demonstração define tamanhos predefinidos nos widgets', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../services/dashboards.service.js'), 'utf8');
  assert.match(source, /size: '1x1'/);
  assert.match(source, /size: '2x2'/);
});


test('atualiza nome e descrição de um dashboard existente', () => {
  const db = getDatabase();
  const company = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Empresa Demo Edição');
  const companyId = Number(company.lastInsertRowid);
  const dashboard = db.prepare(
    `INSERT INTO dashboards (company_id, name, description, is_default) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Dashboard Original', 'Descrição original', 1);

  const service = require('../services/dashboards.service');
  const updated = service.update(
    Number(dashboard.lastInsertRowid),
    { name: 'Dashboard Atualizado', description: 'Nova descrição', isDefault: true },
    null,
    { profile_name: 'Admin' }
  );

  assert.equal(updated.name, 'Dashboard Atualizado');
  assert.equal(updated.description, 'Nova descrição');
  assert.equal(updated.is_default, 1);
  assert.equal(updated.company_id, companyId);
});

test('gráfico usa período padrão de 10 dias e aceita 20, 30 ou tudo', () => {
  const db = getDatabase();
  const company = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Empresa Período');
  const companyId = Number(company.lastInsertRowid);
  const connection = db.prepare(
    `INSERT INTO connections (company_id, name, type, configuration) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Conexão Período', 'mqtt', '{}');
  const connectionId = Number(connection.lastInsertRowid);
  const source = db.prepare(
    `INSERT INTO data_sources (connection_id, name, type, topic) VALUES (?, ?, ?, ?)`
  ).run(connectionId, 'LoRa Período', 'lorawan', 'period/topic');
  const sourceId = Number(source.lastInsertRowid);
  const dashboard = db.prepare(
    `INSERT INTO dashboards (company_id, name, description, is_default) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Dashboard Período', 'Teste', 0);
  const widget = db.prepare(
    `INSERT INTO widgets (dashboard_id, name, type, position, configuration) VALUES (?, ?, ?, ?, ?)`
  ).run(Number(dashboard.lastInsertRowid), 'Gráfico Período', 'chart', 0, JSON.stringify({ metric: 'temperature_1', period_days: 10, unit: '°C' }));
  db.prepare('INSERT INTO widget_data_sources (widget_id, data_source_id) VALUES (?, ?)').run(Number(widget.lastInsertRowid), sourceId);

  const now = Date.now();
  const insert = db.prepare('INSERT INTO measurements (data_source_id, metric, timestamp, value) VALUES (?, ?, ?, ?)');
  insert.run(sourceId, 'temperature_1', new Date(now - 15 * 86400000).toISOString(), 15);
  insert.run(sourceId, 'temperature_1', new Date(now - 5 * 86400000).toISOString(), 20);
  insert.run(sourceId, 'temperature_1', new Date(now - 1 * 86400000).toISOString(), 21);

  const service = require('../services/dashboards.service');
  const widgetId = Number(widget.lastInsertRowid);
  const defaultData = service.getWidgetDataById(widgetId, { profile_name: 'Admin' });
  const twenty = service.getWidgetDataById(widgetId, { profile_name: 'Admin' }, { periodDays: 20 });
  const all = service.getWidgetDataById(widgetId, { profile_name: 'Admin' }, { periodDays: 'all' });

  assert.equal(defaultData.periodDays, 10);
  assert.equal(defaultData.sources[0].rows.length, 2);
  assert.equal(twenty.periodDays, 20);
  assert.equal(twenty.sources[0].rows.length, 3);
  assert.equal(all.periodDays, null);
  assert.equal(all.sources[0].rows.length, 3);
});

test('tabela de widget pagina no backend sem carregar todo o histórico', () => {
  const db = getDatabase();
  const company = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Empresa Tabela');
  const companyId = Number(company.lastInsertRowid);
  const connection = db.prepare(
    `INSERT INTO connections (company_id, name, type, configuration) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Conexão Tabela', 'mqtt', '{}');
  const connectionId = Number(connection.lastInsertRowid);
  const source = db.prepare(
    `INSERT INTO data_sources (connection_id, name, type, topic) VALUES (?, ?, ?, ?)`
  ).run(connectionId, 'LoRa Tabela', 'lorawan', 'table/topic');
  const sourceId = Number(source.lastInsertRowid);
  const dashboard = db.prepare(
    `INSERT INTO dashboards (company_id, name, description, is_default) VALUES (?, ?, ?, ?)`
  ).run(companyId, 'Dashboard Tabela', 'Teste', 0);
  const widget = db.prepare(
    `INSERT INTO widgets (dashboard_id, name, type, position, configuration) VALUES (?, ?, ?, ?, ?)`
  ).run(Number(dashboard.lastInsertRowid), 'Tabela', 'table', 0, JSON.stringify({ metric: 'temperature_1', unit: '°C' }));
  db.prepare('INSERT INTO widget_data_sources (widget_id, data_source_id) VALUES (?, ?)').run(Number(widget.lastInsertRowid), sourceId);

  const insert = db.prepare('INSERT INTO measurements (data_source_id, metric, timestamp, value) VALUES (?, ?, ?, ?)');
  for (let index = 1; index <= 25; index += 1) {
    insert.run(sourceId, 'temperature_1', new Date(Date.now() - index * 1000).toISOString(), index);
  }

  const service = require('../services/dashboards.service');
  const result = service.getWidgetDataById(Number(widget.lastInsertRowid), { profile_name: 'Admin' }, { page: 2, pageSize: 10 });

  assert.equal(result.table.total, 25);
  assert.equal(result.table.page, 2);
  assert.equal(result.table.pageSize, 10);
  assert.equal(result.table.totalPages, 3);
  assert.equal(result.sources[0].rows.length, 10);
  assert.equal(result.sources[0].rows[0].value, 11);
  assert.equal(result.sources[0].rows[9].value, 20);
});
