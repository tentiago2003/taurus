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


// Layout defaults are part of the dashboard demo configuration.
test('dashboard de demonstração define tamanhos predefinidos nos widgets', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../services/dashboards.service.js'), 'utf8');
  assert.match(source, /size: '1x1'/);
  assert.match(source, /size: '2x2'/);
});
