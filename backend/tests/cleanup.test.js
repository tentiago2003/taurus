'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.cleanup.test.${process.pid}.db`);
process.env.TAURUS_DB_PATH = TEST_DB_PATH;

function cleanDbFiles() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

cleanDbFiles();

const legacyDb = new DatabaseSync(TEST_DB_PATH);
legacyDb.exec(`
  CREATE TABLE cleanup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    executed_at TEXT NOT NULL,
    cleanup_type TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    period_start TEXT,
    period_end TEXT,
    cutoff_at TEXT,
    measurements_deleted INTEGER NOT NULL DEFAULT 0,
    raw_messages_deleted INTEGER NOT NULL DEFAULT 0
  );
`);
legacyDb.close();

const { initDatabase, getDatabase, closeDatabase } = require('../db');
const repository = require('../db/repository');
const settingsService = require('../services/systemSettings.service');

initDatabase();

repository.systemSettings.update({
  measurementRetentionDays: 30,
  defaultSamplingIntervalSeconds: 600,
  updatedBy: null,
});

const db = getDatabase();
const company = db.prepare('INSERT INTO companies (name) VALUES (?)').run(`Cleanup Test ${process.pid}`);
const connection = db.prepare(
  `INSERT INTO connections (company_id, name, type, configuration)
   VALUES (?, ?, 'mqtt', '{}')`
).run(company.lastInsertRowid, `Cleanup Connection ${process.pid}`);
const dataSource = db.prepare(
  `INSERT INTO data_sources (connection_id, name, type, topic)
   VALUES (?, ?, 'mqtt', 'cleanup/test')`
).run(connection.lastInsertRowid, `Cleanup Source ${process.pid}`);
const dataSourceId = Number(dataSource.lastInsertRowid);
const profile = db.prepare("SELECT id FROM profiles WHERE name = 'Admin' LIMIT 1").get();
const cleanupUser = db.prepare(
  `INSERT INTO users (company_id, profile_id, name, email, password_hash)
   VALUES (?, ?, ?, ?, ?)`
).run(company.lastInsertRowid, profile.id, `Cleanup Admin ${process.pid}`, `cleanup-${process.pid}@taurus.local`, 'test');
const cleanupUserId = Number(cleanupUser.lastInsertRowid);

function insertMeasurement(timestamp, value) {
  repository.measurements.insert({
    dataSourceId,
    metric: 'temperature',
    timestamp,
    value,
  });
}

function insertRaw(receivedAt, payload = '{"value":1}') {
  repository.rawMessages.insert({
    dataSourceId,
    topic: 'cleanup/test',
    receivedAt,
    payload: new TextEncoder().encode(payload),
  });
}

test('limpeza automática usa o histórico e não repete a execução antes do prazo', () => {
  insertMeasurement('2026-08-01T00:00:00.000Z', 10);
  insertMeasurement('2026-09-20T00:00:00.000Z', 20);
  insertRaw('2026-08-01T00:00:00.000Z');
  insertRaw('2026-09-20T00:00:00.000Z');

  const first = settingsService.executeAutomaticCleanupIfDue(new Date('2026-09-30T12:00:00.000Z'));
  assert.ok(first);
  assert.equal(first.cleanup_type, 'automatic');
  assert.equal(first.retention_days, 30);
  assert.equal(first.measurements_deleted, 1);
  assert.equal(first.raw_messages_deleted, 1);

  const second = settingsService.executeAutomaticCleanupIfDue(new Date('2026-10-10T12:00:00.000Z'));
  assert.equal(second, null);

  const third = settingsService.executeAutomaticCleanupIfDue(new Date('2026-10-31T12:00:00.000Z'));
  assert.ok(third);
  assert.equal(third.cleanup_type, 'automatic');
  assert.equal(third.measurements_deleted, 1);
  assert.equal(third.raw_messages_deleted, 1);

  const history = settingsService.getCleanupHistory();
  assert.equal(history.length, 2);
});

test('limpeza manual exclui período inclusivo e registra o histórico', () => {
  insertMeasurement('2026-07-10T10:00:00.000Z', 30);
  insertMeasurement('2026-07-15T10:00:00.000Z', 31);
  insertMeasurement('2026-07-16T10:00:00.000Z', 32);
  insertRaw('2026-07-10T10:00:00.000Z');
  insertRaw('2026-07-15T10:00:00.000Z');
  insertRaw('2026-07-16T10:00:00.000Z');

  const preview = settingsService.previewManualCleanup({
    startDate: '2026-07-10',
    endDate: '2026-07-15',
  });
  assert.equal(preview.measurements, 2);
  assert.equal(preview.rawMessages, 2);

  const result = settingsService.executeManualCleanup({
    startDate: '2026-07-10',
    endDate: '2026-07-15',
  }, cleanupUserId);

  assert.equal(result.cleanup_type, 'manual');
  assert.equal(result.executed_by, cleanupUserId);
  assert.equal(result.executed_by_name, `Cleanup Admin ${process.pid}`);
  assert.equal(result.retention_days, 30);
  assert.equal(result.period_start.slice(0, 10), '2026-07-10');
  assert.equal(result.period_end.slice(0, 10), '2026-07-15');
  assert.equal(result.measurements_deleted, 2);
  assert.equal(result.raw_messages_deleted, 2);

  const remaining = repository.cleanupHistory.countRange(
    '2026-07-16T00:00:00.000Z',
    '2026-07-17T00:00:00.000Z'
  );
  assert.equal(remaining.measurements, 1);
  assert.equal(remaining.rawMessages, 1);
});

test('migração cria o histórico com identificação do executor', () => {
  const columns = db.prepare('PRAGMA table_info(cleanup_history)').all();
  assert.ok(columns.some((column) => column.name === 'executed_by'));
});

test('status informa a próxima limpeza automática e os registros elegíveis', () => {
  const status = settingsService.getCleanupStatus();
  assert.equal(status.retentionDays, 30);
  assert.ok(status.latestAutomatic);
  assert.ok(status.nextAutomaticAt);
  assert.equal(typeof status.automaticCandidates.measurements, 'number');
  assert.equal(typeof status.automaticCandidates.rawMessages, 'number');
});

test.after(() => {
  closeDatabase();
  cleanDbFiles();
});
