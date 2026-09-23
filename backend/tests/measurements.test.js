'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.measurements.test.${process.pid}.db`);
process.env.TAURUS_DB_PATH = TEST_DB_PATH;

function cleanDbFiles() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

cleanDbFiles();

const { initDatabase, closeDatabase } = require('../db');
const repository = require('../db/repository');

function createDataSource(name = `LoRa ${Date.now()}`) {
  const company = repository.companies.create({ name: `Empresa Measurements ${Date.now()}` });
  const connection = repository.connections.createWithDataSources({
    companyId: company.id,
    name: `MQTT Measurements ${Date.now()}`,
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    dataSources: [{ name, type: 'MQTT', topic: `raw/${Date.now()}`, samplingIntervalSeconds: 600, storeHistory: 1 }],
  });
  return connection.dataSources[0];
}

test.beforeEach(() => initDatabase());
test.after(() => { closeDatabase(); cleanDbFiles(); });

test('lista measurements paginadas com nome da fonte e filtros', () => {
  const dataSource = createDataSource();
  repository.measurements.insert({
    dataSourceId: dataSource.id,
    metric: 'temperature_1',
    timestamp: '2026-09-23T14:15:00.000Z',
    value: 18.7,
  });
  repository.measurements.insert({
    dataSourceId: dataSource.id,
    metric: 'temperature_2',
    timestamp: '2026-09-23T14:16:00.000Z',
    value: 18.3,
  });

  const result = repository.measurements.listPaged({
    dataSourceId: dataSource.id,
    metric: 'temperature_1',
    page: 1,
    pageSize: 50,
  });

  assert.equal(result.total, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].data_source_name, dataSource.name);
  assert.equal(result.rows[0].metric, 'temperature_1');
  assert.equal(result.rows[0].value, 18.7);
});
