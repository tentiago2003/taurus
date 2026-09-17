'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'taurus.raw-messages.test.db');
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
const rawMessagesService = require('../services/rawMessages.service');

function createConnectionWithSource() {
  const company = repository.companies.create({ name: `Empresa Raw ${Date.now()}` });
  const connection = repository.connections.createWithDataSources({
    companyId: company.id,
    name: `MQTT Raw ${Date.now()}`,
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    dataSources: [{ name: 'LoRa 1', type: 'MQTT', topic: 'raw/1', samplingIntervalSeconds: 600, storeHistory: 1 }],
  });
  return { connection, dataSource: connection.dataSources[0] };
}

test.beforeEach(() => initDatabase());
test.after(() => { closeDatabase(); cleanDbFiles(); });

test('cria a tabela de mensagens brutas', () => {
  const table = getDatabase()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'raw_messages'")
    .get();
  assert.equal(table.name, 'raw_messages');
});

test('armazena o payload bruto sem interpretar o conteúdo', () => {
  const { connection, dataSource } = createConnectionWithSource();
  const payload = Buffer.from([0, 255, 10, 20, 30, 200]);
  const receivedAt = '2026-09-16T18:00:00.000Z';

  const saved = rawMessagesService.collect({
    connectionId: connection.id,
    topic: 'raw/1',
    payload,
    receivedAt,
  });

  assert.equal(saved.data_source_id, dataSource.id);
  assert.equal(saved.topic, 'raw/1');
  assert.equal(saved.received_at, receivedAt);
  assert.deepEqual(Buffer.from(saved.payload), payload);
});

test('não armazena mensagem de tópico que não pertence à conexão', () => {
  const { connection } = createConnectionWithSource();

  const saved = rawMessagesService.collect({
    connectionId: connection.id,
    topic: 'raw/desconhecido',
    payload: Buffer.from('qualquer coisa'),
  });

  assert.equal(saved, null);
});

test('mensagem bruta continua sendo armazenada mesmo quando não é JSON válido', () => {
  const { connection } = createConnectionWithSource();
  const payload = Buffer.from('isto nao e json');

  const saved = rawMessagesService.collect({
    connectionId: connection.id,
    topic: 'raw/1',
    payload,
  });

  assert.deepEqual(Buffer.from(saved.payload), payload);
});

test('lista mensagens sem devolver o payload por padrão', () => {
  const { connection } = createConnectionWithSource();
  rawMessagesService.collect({
    connectionId: connection.id,
    topic: 'raw/1',
    payload: Buffer.from('abc'),
  });

  const rows = rawMessagesService.listByDataSource(connection.dataSources[0].id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].payload_size_bytes, 3);
  assert.equal(Object.hasOwn(rows[0], 'payload'), false);
});
