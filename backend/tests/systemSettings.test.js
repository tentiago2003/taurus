'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.settings.test.${process.pid}.db`);
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
const settingsService = require('../services/systemSettings.service');
const { ApiError } = require('../http/errors');

initDatabase();

const adminProfile = repository.profiles.findByName('Admin');
const gerenteProfile = repository.profiles.findByName('Gerente');

const original = settingsService.get();


test('parâmetros do sistema são inicializados com os valores padrão', () => {
  assert.equal(original.measurement_retention_days, 7);
  assert.equal(original.default_sampling_interval_seconds, 600);
});

test('atualiza retenção e intervalo padrão', () => {
  const updated = settingsService.update({
    measurementRetentionDays: 15,
    defaultSamplingIntervalSeconds: 300,
  }, null);

  assert.equal(updated.measurement_retention_days, 15);
  assert.equal(updated.default_sampling_interval_seconds, 300);
  assert.equal(updated.updated_by, null);
});

test('rejeita retenção inválida', () => {
  assert.throws(
    () => settingsService.update({ measurementRetentionDays: 0, defaultSamplingIntervalSeconds: 600 }),
    (err) => err instanceof ApiError && err.status === 400
  );
});

test('rejeita intervalo padrão inválido', () => {
  assert.throws(
    () => settingsService.update({ measurementRetentionDays: 7, defaultSamplingIntervalSeconds: -1 }),
    (err) => err instanceof ApiError && err.status === 400
  );
});

test('migração mantém banco existente e adiciona o novo parâmetro', () => {
  const columns = repository.systemSettings.get();
  assert.ok(Object.hasOwn(columns, 'default_sampling_interval_seconds'));
});

test('perfis Admin e Gerente continuam disponíveis para autorização', () => {
  assert.equal(adminProfile.name, 'Admin');
  assert.equal(gerenteProfile.name, 'Gerente');
});

closeDatabase();
cleanDbFiles();
