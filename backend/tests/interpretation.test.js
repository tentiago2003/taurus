'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.interpretation.test.${process.pid}.db`);
process.env.TAURUS_DB_PATH = TEST_DB_PATH;

function cleanDbFiles() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

cleanDbFiles();

const { initDatabase, closeDatabase, getDatabase } = require('../db');
const repository = require('../db/repository');
const interpretation = require('../services/interpretation.service');

function createDataSource() {
  const company = repository.companies.create({ name: `Empresa Interpretation ${Date.now()}` });
  const connection = repository.connections.createWithDataSources({
    companyId: company.id,
    name: `MQTT Interpretation ${Date.now()}`,
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    dataSources: [{ name: 'LoRa 1', type: 'MQTT', topic: 'raw/1', samplingIntervalSeconds: 600, storeHistory: 1 }],
  });
  return connection.dataSources[0];
}

test.beforeEach(() => initDatabase());
test.after(() => { closeDatabase(); cleanDbFiles(); });

test('migração adiciona metric às measurements existentes', () => {
  const column = getDatabase().prepare('PRAGMA table_info(measurements)').all().find((item) => item.name === 'metric');
  assert.ok(column);
  assert.equal(column.notnull, 1);
  assert.equal(column.dflt_value, "'value'");
});

test('normaliza configuração de interpretação', () => {
  const config = interpretation.normalizeConfiguration({
    version: 1,
    format: 'json',
    timestamp: { path: ['ts'] },
    mappings: [
      { metric: 'temperature_1', path: ['values', 1], transform: { type: 'divide', value: 10 } },
    ],
  });

  assert.deepEqual(config.mappings[0], {
    metric: 'temperature_1',
    path: ['values', 1],
    transform: { type: 'divide', value: 10 },
  });
});

test('interpreta JSON e aplica transformação sem conhecer o formato do equipamento', () => {
  const payload = JSON.stringify({
    'Slave, T1, T2, ADC1, ADC2, Vcc, mA, mS, Ch, Ver': [1, 203, 197, 564, 571, 5, 11, 24880, 64, 4],
    ts: '2026-09-17T16:39:47.014883',
  });

  const result = interpretation.interpret({
    payload,
    receivedAt: '2026-09-17T19:39:48.000Z',
    configuration: {
      version: 1,
      format: 'json',
      timestamp: { path: ['ts'] },
      mappings: [
        { metric: 'temperature_1', path: ['Slave, T1, T2, ADC1, ADC2, Vcc, mA, mS, Ch, Ver', 1], transform: { type: 'divide', value: 10 } },
        { metric: 'temperature_2', path: ['Slave, T1, T2, ADC1, ADC2, Vcc, mA, mS, Ch, Ver', 2], transform: { type: 'divide', value: 10 } },
      ],
    },
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.measurements, [
    { metric: 'temperature_1', timestamp: '2026-09-17T16:39:47.014883', value: 20.3 },
    { metric: 'temperature_2', timestamp: '2026-09-17T16:39:47.014883', value: 19.7 },
  ]);
});

test('permite salvar a interpretação dentro da configuração da Data Source', () => {
  const dataSource = createDataSource();
  const config = {
    version: 1,
    format: 'json',
    timestamp: { path: ['ts'] },
    mappings: [{ metric: 'temperature_1', path: ['values', 1], transform: { type: 'divide', value: 10 } }],
  };

  const updated = interpretation.save(dataSource.id, config);
  assert.deepEqual(updated.configuration.interpretation, config);
  assert.deepEqual(interpretation.get(dataSource.id), config);
});

test('persiste uma measurement com métrica identificada', () => {
  const dataSource = createDataSource();
  repository.measurements.insert({
    dataSourceId: dataSource.id,
    metric: 'temperature_1',
    timestamp: '2026-09-17T16:40:00.000Z',
    value: 20.3,
  });

  const row = repository.measurements.listByDataSource(dataSource.id)[0];
  assert.equal(row.metric, 'temperature_1');
  assert.equal(row.value, 20.3);
});

test('retorna erro de interpretação por campo ausente sem derrubar as demais métricas', () => {
  const result = interpretation.interpret({
    payload: JSON.stringify({ values: [1, 25] }),
    configuration: {
      version: 1,
      format: 'json',
      timestamp: null,
      mappings: [
        { metric: 'temperature', path: ['values', 1] },
        { metric: 'humidity', path: ['missing'] },
      ],
    },
    receivedAt: '2026-09-17T19:40:00.000Z',
  });

  assert.deepEqual(result.measurements, [{ metric: 'temperature', timestamp: '2026-09-17T19:40:00.000Z', value: 25 }]);
  assert.deepEqual(result.errors, [{ metric: 'humidity', reason: 'Campo não encontrado.' }]);
});
