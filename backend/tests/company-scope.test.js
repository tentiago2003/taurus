'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', `taurus.scope.test.${process.pid}.db`);
process.env.TAURUS_DB_PATH = TEST_DB_PATH;
function clean() { for (const suffix of ['', '-journal', '-wal', '-shm']) { const f = `${TEST_DB_PATH}${suffix}`; if (fs.existsSync(f)) fs.rmSync(f); } }
clean();
const { initDatabase, closeDatabase } = require('../db');
const repository = require('../db/repository');
const users = require('../services/users.service');
const connections = require('../services/connections.service');
const dashboards = require('../services/dashboards.service');
const measurements = require('../services/measurements.service');
const rawMessages = require('../services/rawMessages.service');
const interpretation = require('../services/interpretation.service');

initDatabase();
const adminProfile = repository.profiles.findByName('Admin');
const managerProfile = repository.profiles.findByName('Gerente');
const viewerProfile = repository.profiles.findByName('Consulta');
const companyA = repository.companies.create({ name: 'Empresa A' });
const companyB = repository.companies.create({ name: 'Empresa B' });
const managerA = repository.users.create({ companyId: companyA.id, profileId: managerProfile.id, name: 'Gerente A', email: 'manager-a@local.test', passwordHash: 'hash' });
const viewerA = repository.users.create({ companyId: companyA.id, profileId: viewerProfile.id, name: 'Consulta A', email: 'viewer-a@local.test', passwordHash: 'hash' });
const managerB = repository.users.create({ companyId: companyB.id, profileId: managerProfile.id, name: 'Gerente B', email: 'manager-b@local.test', passwordHash: 'hash' });
const admin = repository.users.create({ companyId: null, profileId: adminProfile.id, name: 'Admin', email: 'admin-scope@local.test', passwordHash: 'hash' });
function actor(row) { return { ...row, profile_name: repository.profiles.findById(row.profile_id).name }; }
const a = actor(managerA); const b = actor(managerB); const v = actor(viewerA); const ad = actor(admin);
const connA = connections.create({ companyId: companyA.id, name: 'MQTT A', type: 'MQTT', configuration: { host: 'a', port: 1883, password: 'secret' }, topics: [{ name: 'T1', topic: 'a/t1' }] }, a);
const connB = connections.create({ companyId: companyB.id, name: 'MQTT B', type: 'MQTT', configuration: { host: 'b', port: 1883, password: 'secret' }, topics: [{ name: 'T1', topic: 'b/t1' }] }, b);
const dsA = connA.dataSources[0]; const dsB = connB.dataSources[0];
repository.measurements.insert({ dataSourceId: dsA.id, metric: 'temperature_1', timestamp: new Date().toISOString(), value: 10 });
repository.measurements.insert({ dataSourceId: dsB.id, metric: 'temperature_1', timestamp: new Date().toISOString(), value: 20 });
rawMessages.collect({ connectionId: connA.id, topic: 'a/t1', payload: Buffer.from('{"v":10}') });
rawMessages.collect({ connectionId: connB.id, topic: 'b/t1', payload: Buffer.from('{"v":20}') });

test('Gerente e Consulta só listam conexões da própria empresa', () => {
  assert.deepEqual(connections.list(a).map((x) => x.id), [connA.id]);
  assert.deepEqual(connections.list(v).map((x) => x.id), [connA.id]);
  assert.deepEqual(connections.list(b).map((x) => x.id), [connB.id]);
  assert.throws(() => connections.get(connB.id, a), (err) => err.status === 403);
});

test('Medições e mensagens brutas respeitam a empresa', () => {
  assert.equal(measurements.listPaged({}, a).rows.every((row) => row.data_source_id === dsA.id), true);
  assert.equal(rawMessages.listPaged({ page: 1, pageSize: 50 }, v).rows.every((row) => row.data_source_id === dsA.id), true);
  assert.throws(() => measurements.listPaged({ dataSourceId: dsB.id }, a), (err) => err.status === 403);
});

test('Dashboard e widgets não cruzam empresa', () => {
  const dashA = dashboards.create({ companyId: companyA.id, name: 'Dash A' }, a.id, a);
  const dashB = dashboards.create({ companyId: companyB.id, name: 'Dash B' }, b.id, b);
  assert.equal(dashboards.list(a).every((d) => d.company_id === companyA.id), true);
  assert.throws(() => dashboards.get(dashB.id, a), (err) => err.status === 403);
  assert.throws(() => dashboards.createWidget({ dashboardId: dashA.id, name: 'cruzado', type: 'value', dataSourceIds: [dsB.id] }, a.id, a), (err) => err.status === 400);
  const widget = dashboards.createWidget({ dashboardId: dashA.id, name: 'ok', type: 'value', dataSourceIds: [dsA.id] }, a.id, a);
  assert.throws(() => dashboards.updateWidget(widget.id, { name: 'x', type: 'value', dataSourceIds: [dsB.id] }, a.id, a), (err) => err.status === 400);
});

test('Gerente administra usuários apenas da própria empresa', () => {
  const created = users.create({ name: 'Novo A', email: 'novo-a@local.test', password: 'senha', profileId: viewerProfile.id }, a);
  assert.equal(created.company_id, companyA.id);
  assert.throws(() => users.create({ name: 'Novo B', email: 'novo-b@local.test', password: 'senha', profileId: viewerProfile.id, companyId: companyB.id }, a), (err) => err.status === 403);
  assert.throws(() => users.update(managerB.id, { name: 'X', email: 'x@local', password: 'senha', profileId: managerProfile.id, companyId: companyB.id }, a), (err) => err.status === 403);
  assert.throws(() => users.create({ name: 'Admin indevido', email: 'bad-admin@local.test', password: 'senha', profileId: adminProfile.id, companyId: companyA.id }, a), (err) => err.status === 403);
  assert.equal(users.list(a).every((u) => u.company_id === companyA.id), true);
});

test('Admin pode consultar as duas empresas', () => {
  assert.equal(connections.list(ad).length, 2);
  assert.equal(dashboards.list(ad).length >= 2, true);
});

test.after(() => { closeDatabase(); clean(); });
