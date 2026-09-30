'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.export.test.${process.pid}.db`);
process.env.TAURUS_DB_PATH = TEST_DB_PATH;

function cleanDbFiles() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

cleanDbFiles();
const { initDatabase, getDatabase, closeDatabase } = require('../db');
const repository = require('../db/repository');
const exportService = require('../services/export.service');
initDatabase();

const db = getDatabase();
const companyA = Number(db.prepare('INSERT INTO companies (name) VALUES (?)').run(`Export A ${process.pid}`).lastInsertRowid);
const companyB = Number(db.prepare('INSERT INTO companies (name) VALUES (?)').run(`Export B ${process.pid}`).lastInsertRowid);
const connectionA = Number(db.prepare(`INSERT INTO connections (company_id, name, type, configuration) VALUES (?, ?, 'mqtt', '{}')`).run(companyA, `Connection A ${process.pid}`).lastInsertRowid);
const connectionB = Number(db.prepare(`INSERT INTO connections (company_id, name, type, configuration) VALUES (?, ?, 'mqtt', '{}')`).run(companyB, `Connection B ${process.pid}`).lastInsertRowid);
const sourceA = Number(db.prepare(`INSERT INTO data_sources (connection_id, name, type, topic) VALUES (?, ?, 'mqtt', ?)`).run(connectionA, `Source A ${process.pid}`, 'export/a').lastInsertRowid);
const sourceB = Number(db.prepare(`INSERT INTO data_sources (connection_id, name, type, topic) VALUES (?, ?, 'mqtt', ?)`).run(connectionB, `Source B ${process.pid}`, 'export/b').lastInsertRowid);

repository.measurements.insert({ dataSourceId: sourceA, metric: 'temperature_1', timestamp: '2026-09-30T10:00:00.000Z', value: 24.5, payload: { source: 'A' } });
repository.measurements.insert({ dataSourceId: sourceA, metric: 'humidity', timestamp: '2026-09-30T11:00:00.000Z', value: 60, payload: { source: 'A' } });
repository.measurements.insert({ dataSourceId: sourceB, metric: 'temperature_1', timestamp: '2026-09-30T12:00:00.000Z', value: 31, payload: { source: 'B' } });
repository.rawMessages.insert({ dataSourceId: sourceA, topic: 'export/a', receivedAt: '2026-09-30T10:00:00.000Z', payload: new TextEncoder().encode('{"value":1}') });
repository.rawMessages.insert({ dataSourceId: sourceB, topic: 'export/b', receivedAt: '2026-09-30T12:00:00.000Z', payload: new TextEncoder().encode('{"value":2}') });

function unzipFirst(buffer, wantedName) {
  let offset = 0;
  while (offset < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const compression = buffer.readUInt16LE(offset + 8);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    if (name === wantedName) {
      return compression === 8 ? zlib.inflateRawSync(data).toString('utf8') : data.toString('utf8');
    }
    offset = dataStart + compressedSize;
  }
  return null;
}

test('exporta medições respeitando filtros e escopo da empresa', () => {
  const buffer = exportService.measurements({ metric: 'temperature', from: '2026-09-30T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' }, { profile_name: 'Gerente', company_id: companyA });
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  const sheet = unzipFirst(buffer, 'xl/worksheets/sheet1.xml');
  assert.match(sheet, /temperature_1/);
  assert.doesNotMatch(sheet, /humidity/);
  assert.doesNotMatch(sheet, /31/);
});

test('exporta mensagens brutas respeitando filtro de tópico', () => {
  const buffer = exportService.rawMessages({ topic: 'export/a' }, { profile_name: 'Admin', company_id: null });
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  const sheet = unzipFirst(buffer, 'xl/worksheets/sheet1.xml');
  assert.match(sheet, /export\/a/);
  assert.doesNotMatch(sheet, /export\/b/);
});

test.after(() => {
  closeDatabase();
  cleanDbFiles();
});
