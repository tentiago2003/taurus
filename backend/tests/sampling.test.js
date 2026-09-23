'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.sampling.test.${process.pid}.db`);
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
const sampling = require('../services/sampling.service');

function createDataSource(interval = 600) {
  const company = repository.companies.create({ name: `Empresa Sampling ${Date.now()}` });
  const connection = repository.connections.createWithDataSources({
    companyId: company.id,
    name: `MQTT Sampling ${Date.now()}`,
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    dataSources: [{
      name: 'LoRa Sampling',
      type: 'MQTT',
      topic: `raw/sampling/${Date.now()}`,
      samplingIntervalSeconds: interval,
      storeHistory: 1,
    }],
  });

  const dataSource = connection.dataSources[0];
  repository.dataSources.updateConfiguration({
    id: dataSource.id,
    configuration: {
      interpretation: {
        version: 1,
        format: 'json',
        timestamp: { path: ['ts'] },
        mappings: [
          { metric: 'temperature', path: ['value'] },
        ],
      },
    },
  });
  return repository.dataSources.findById(dataSource.id);
}

function payload(value, ts) {
  return JSON.stringify({ value, ts });
}

test.beforeEach(() => {
  initDatabase();
  sampling.reset();
});

test.after(() => {
  sampling.reset();
  closeDatabase();
  cleanDbFiles();
});

test('mantém o último valor recebido dentro da janela de amostragem', () => {
  const dataSource = createDataSource(600);

  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(20, '2026-09-23T14:01:00.000Z'),
    receivedAt: '2026-09-23T14:01:00.000Z',
  });
  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(21, '2026-09-23T14:05:00.000Z'),
    receivedAt: '2026-09-23T14:05:00.000Z',
  });
  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(22, '2026-09-23T14:09:59.000Z'),
    receivedAt: '2026-09-23T14:09:59.000Z',
  });

  assert.equal(repository.measurements.listByDataSource(dataSource.id).length, 0);

  sampling.flushDataSource(dataSource.id);

  const rows = repository.measurements.listByDataSource(dataSource.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].metric, 'temperature');
  assert.equal(rows[0].value, 22);
  assert.equal(rows[0].timestamp, '2026-09-23T14:09:59.000Z');
});

test('ao entrar em uma nova janela, finaliza a janela anterior com seu último valor', () => {
  const dataSource = createDataSource(600);

  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(20, '2026-09-23T14:01:00.000Z'),
    receivedAt: '2026-09-23T14:01:00.000Z',
  });
  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(21, '2026-09-23T14:05:00.000Z'),
    receivedAt: '2026-09-23T14:05:00.000Z',
  });
  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(30, '2026-09-23T14:11:00.000Z'),
    receivedAt: '2026-09-23T14:11:00.000Z',
  });

  const rows = repository.measurements.listByDataSource(dataSource.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].value, 21);
  assert.equal(rows[0].timestamp, '2026-09-23T14:05:00.000Z');

  sampling.flushDataSource(dataSource.id);
  const allRows = repository.measurements.listByDataSource(dataSource.id);
  assert.equal(allRows.length, 2);
  assert.deepEqual(allRows.map((row) => row.value).sort((a, b) => a - b), [21, 30]);
});

test('não cria measurement quando store_history está desativado', () => {
  const dataSource = createDataSource(600);
  repository.dataSources.update({
    id: dataSource.id,
    name: dataSource.name,
    type: dataSource.type,
    topic: dataSource.topic,
    samplingIntervalSeconds: dataSource.sampling_interval_seconds,
    storeHistory: 0,
    active: 1,
  });

  sampling.process({
    dataSourceId: dataSource.id,
    payload: payload(20, '2026-09-23T14:01:00.000Z'),
    receivedAt: '2026-09-23T14:01:00.000Z',
  });
  sampling.flushDataSource(dataSource.id);

  assert.equal(repository.measurements.listByDataSource(dataSource.id).length, 0);
});
