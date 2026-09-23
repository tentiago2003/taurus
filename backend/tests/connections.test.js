'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'taurus.connections.test.db');
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
const connectionsService = require('../services/connections.service');
const { ApiError } = require('../http/errors');

function createCompany(name) {
  return repository.companies.create({ name });
}

test.beforeEach(() => initDatabase());
test.after(() => { closeDatabase(); cleanDbFiles(); });

test('cria conexão MQTT com seus tópicos', () => {
  const company = createCompany('Empresa Conexão 1');
  const connection = connectionsService.create({
    companyId: company.id,
    name: 'MQTT Produção',
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883, username: 'user', password: 'pass' },
    topics: [
      { name: 'LoRa 1', topic: 'a/1' },
      { name: 'LoRa 2', topic: 'a/2', samplingIntervalSeconds: 300, storeHistory: false },
    ],
  });

  assert.equal(connection.name, 'MQTT Produção');
  assert.equal(connection.configuration.host, 'broker.example.com');
  assert.equal(connection.dataSources.length, 2);
  assert.equal(connection.dataSources[1].sampling_interval_seconds, 300);
  assert.equal(connection.dataSources[1].store_history, 0);
});

test('usa o intervalo padrão do sistema ao criar fonte sem intervalo informado', () => {
  const company = createCompany('Empresa Conexão Default');
  repository.systemSettings.update({
    measurementRetentionDays: 7,
    defaultSamplingIntervalSeconds: 300,
  });

  const connection = connectionsService.create({
    companyId: company.id,
    name: 'MQTT Default',
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    topics: [{ name: 'LoRa Default', topic: 'a/default' }],
  });

  assert.equal(connection.dataSources[0].sampling_interval_seconds, 300);
});

test('não permite conexão sem tópico', () => {
  const company = createCompany('Empresa Conexão 2');
  assert.throws(
    () => connectionsService.create({
      companyId: company.id,
      name: 'Sem Tópicos',
      type: 'MQTT',
      configuration: { host: 'broker.example.com', port: 1883 },
      topics: [],
    }),
    (err) => err instanceof ApiError && err.status === 400
  );
});

test('edita conexão mantendo a fonte existente e adicionando outra', () => {
  const company = createCompany('Empresa Conexão 3');
  const created = connectionsService.create({
    companyId: company.id,
    name: 'MQTT Original',
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    topics: [{ name: 'LoRa 1', topic: 'a/1' }],
  });

  const updated = connectionsService.update(created.id, {
    companyId: company.id,
    name: 'MQTT Atualizado',
    type: 'MQTT',
    configuration: { host: 'broker2.example.com', port: 1884 },
    topics: [
      { id: created.dataSources[0].id, name: 'LoRa 1', topic: 'a/1' },
      { name: 'LoRa 2', topic: 'a/2' },
    ],
  });

  assert.equal(updated.name, 'MQTT Atualizado');
  assert.equal(updated.configuration.port, 1884);
  assert.equal(updated.dataSources.length, 2);
  assert.equal(updated.dataSources[0].id, created.dataSources[0].id);
});

test('desativa e reativa conexão', () => {
  const company = createCompany('Empresa Conexão 4');
  const created = connectionsService.create({
    companyId: company.id,
    name: 'MQTT Status',
    type: 'MQTT',
    configuration: { host: 'broker.example.com', port: 1883 },
    topics: [{ name: 'LoRa 1', topic: 'a/1' }],
  });

  assert.equal(connectionsService.deactivate(created.id).active, 0);
  assert.equal(connectionsService.reactivate(created.id).active, 1);
});
