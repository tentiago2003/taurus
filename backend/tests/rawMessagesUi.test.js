'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.raw-ui.test.${process.pid}.db`);
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
const rawMessagesService = require('../services/rawMessages.service');

function createSource() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const company = repository.companies.create({ name: `Empresa Raw UI ${suffix}` });
  const connection = repository.connections.createWithDataSources({
    companyId: company.id,
    name: `Conexão Raw UI ${suffix}`,
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    dataSources: [{ name: 'LoRa UI', type: 'MQTT', topic: `raw/ui/${suffix}`, samplingIntervalSeconds: 600, storeHistory: 1 }],
  });
  return { connection, dataSource: connection.dataSources[0] };
}

initDatabase();

test('lista mensagens recentes com metadados e payload para diagnóstico', () => {
  const { connection, dataSource } = createSource();
  const payload = Buffer.from('{"temperature":20.6}', 'utf8');
  rawMessagesService.collect({ connectionId: connection.id, topic: dataSource.topic, payload, receivedAt: '2026-09-16T19:00:00.000Z' });

  const rows = rawMessagesService.listRecent({ dataSourceId: dataSource.id, limit: 10 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data_source_id, dataSource.id);
  assert.equal(rows[0].data_source_name, dataSource.name);
  assert.equal(rows[0].connection_name, connection.name);
  assert.equal(rows[0].topic, dataSource.topic);
  assert.equal(rows[0].payload_text, payload.toString('utf8'));
  assert.equal(rows[0].payload_base64, payload.toString('base64'));
  assert.equal(rows[0].payload_size_bytes, payload.length);
});

test('lista mensagens de todas as fontes quando nenhum filtro é informado', () => {
  const first = createSource();
  const second = createSource();
  rawMessagesService.collect({ connectionId: first.connection.id, topic: first.dataSource.topic, payload: Buffer.from('one') });
  rawMessagesService.collect({ connectionId: second.connection.id, topic: second.dataSource.topic, payload: Buffer.from('two') });

  const rows = rawMessagesService.listRecent({ limit: 10 });
  assert.ok(rows.length >= 2);
  assert.ok(rows.some((row) => row.data_source_id === first.dataSource.id));
  assert.ok(rows.some((row) => row.data_source_id === second.dataSource.id));
});

test('preserva payload bruto mesmo quando não é JSON válido', () => {
  const { connection, dataSource } = createSource();
  const payload = Buffer.from([0, 255, 1, 2, 3, 10, 13], 'binary');
  rawMessagesService.collect({
    connectionId: connection.id,
    topic: dataSource.topic,
    payload,
    receivedAt: '2026-09-16T19:01:00.000Z',
  });

  const row = repository.rawMessages.listRecent({ dataSourceId: dataSource.id, limit: 1 })[0];
  assert.deepEqual(Buffer.from(row.payload), payload);
});

test('pagina e filtra mensagens por tópico e período', () => {
  const { connection, dataSource } = createSource();
  rawMessagesService.collect({ connectionId: connection.id, topic: dataSource.topic, payload: Buffer.from('a'), receivedAt: '2026-09-15T10:00:00.000Z' });
  rawMessagesService.collect({ connectionId: connection.id, topic: dataSource.topic, payload: Buffer.from('b'), receivedAt: '2026-09-16T10:00:00.000Z' });
  rawMessagesService.collect({ connectionId: connection.id, topic: 'other/topic', payload: Buffer.from('c'), receivedAt: '2026-09-16T11:00:00.000Z' });

  const result = rawMessagesService.listPaged({
    dataSourceId: dataSource.id,
    topic: 'raw/ui/',
    from: '2026-09-16T00:00:00.000Z',
    to: '2026-09-16T23:59:59.999Z',
    page: 1,
    pageSize: 1,
  });
  assert.equal(result.total, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].payload_text, 'b');
});

closeDatabase();
cleanDbFiles();
