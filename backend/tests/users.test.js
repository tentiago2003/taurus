'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'taurus.test.db');

// Isola o banco de testes do banco de desenvolvimento (data/taurus.db).
process.env.TAURUS_DB_PATH = TEST_DB_PATH;

function cleanDbFiles() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (fs.existsSync(file)) {
      fs.rmSync(file);
    }
  }
}

cleanDbFiles();

const { initDatabase, closeDatabase } = require('../db');
const repository = require('../db/repository');
const usersService = require('../services/users.service');
const { ApiError } = require('../http/errors');

function getProfileId(name) {
  return repository.profiles.findByName(name).id;
}

function createCompany(name) {
  return repository.companies.create({ name });
}

test.beforeEach(() => {
  initDatabase();
});

test.after(() => {
  closeDatabase();
  cleanDbFiles();
});

test('cria usuário Admin sem empresa', () => {
  const adminId = getProfileId('Admin');
  const user = usersService.create({
    name: 'Admin User',
    email: 'admin.sem.empresa@taurus.local',
    password: 'senha123',
    profileId: adminId,
  });
  assert.equal(user.company_id, null);
  assert.equal(user.profile_id, adminId);
});

test('criação de Gerente sem empresa retorna 400', () => {
  const gerenteId = getProfileId('Gerente');
  assert.throws(
    () =>
      usersService.create({
        name: 'Gerente Sem Empresa',
        email: 'gerente.sem.empresa@taurus.local',
        password: 'senha123',
        profileId: gerenteId,
      }),
    (err) => err instanceof ApiError && err.status === 400
  );
});

test('criação de Consulta sem empresa retorna 400', () => {
  const consultaId = getProfileId('Consulta');
  assert.throws(
    () =>
      usersService.create({
        name: 'Consulta Sem Empresa',
        email: 'consulta.sem.empresa@taurus.local',
        password: 'senha123',
        profileId: consultaId,
      }),
    (err) => err instanceof ApiError && err.status === 400
  );
});

test('cria usuário com empresa', () => {
  const company = createCompany('Empresa Teste A');
  const gerenteId = getProfileId('Gerente');
  const user = usersService.create({
    name: 'Gerente Com Empresa',
    email: 'gerente.com.empresa@taurus.local',
    password: 'senha123',
    profileId: gerenteId,
    companyId: company.id,
  });
  assert.equal(user.company_id, company.id);
});

test('e-mail duplicado retorna 409', () => {
  const adminId = getProfileId('Admin');
  usersService.create({
    name: 'Duplicado 1',
    email: 'duplicado@taurus.local',
    password: 'senha123',
    profileId: adminId,
  });
  assert.throws(
    () =>
      usersService.create({
        name: 'Duplicado 2',
        email: 'duplicado@taurus.local',
        password: 'outraSenha',
        profileId: adminId,
      }),
    (err) => err instanceof ApiError && err.status === 409
  );
});

test('usuário criado possui password_hash no banco', () => {
  const adminId = getProfileId('Admin');
  const user = usersService.create({
    name: 'Com Hash',
    email: 'com.hash@taurus.local',
    password: 'senha123',
    profileId: adminId,
  });
  const stored = repository.users.findById(user.id);
  assert.ok(stored.password_hash);
  assert.notEqual(stored.password_hash, 'senha123');
});

test('resposta da API nunca contém password_hash', () => {
  const adminId = getProfileId('Admin');
  const user = usersService.create({
    name: 'Sem Hash Na Resposta',
    email: 'sem.hash@taurus.local',
    password: 'senha123',
    profileId: adminId,
  });
  assert.equal('password_hash' in user, false);

  const listed = usersService.list();
  for (const u of listed) {
    assert.equal('password_hash' in u, false);
  }

  const found = usersService.findById(user.id);
  assert.equal('password_hash' in found, false);
});

test('atualização de dados do usuário', () => {
  const company = createCompany('Empresa Teste B');
  const gerenteId = getProfileId('Gerente');
  const user = usersService.create({
    name: 'Nome Original',
    email: 'original@taurus.local',
    password: 'senha123',
    profileId: gerenteId,
    companyId: company.id,
  });

  const updated = usersService.update(user.id, {
    name: 'Nome Atualizado',
    email: 'atualizado@taurus.local',
    profileId: gerenteId,
    companyId: company.id,
  });

  assert.equal(updated.name, 'Nome Atualizado');
  assert.equal(updated.email, 'atualizado@taurus.local');
});

test('alteração de senha gera novo hash', () => {
  const adminId = getProfileId('Admin');
  const user = usersService.create({
    name: 'Troca Senha',
    email: 'troca.senha@taurus.local',
    password: 'senhaAntiga',
    profileId: adminId,
  });
  const hashBefore = repository.users.findById(user.id).password_hash;

  usersService.update(user.id, {
    name: user.name,
    email: user.email,
    profileId: adminId,
    companyId: null,
    password: 'senhaNova',
  });

  const hashAfter = repository.users.findById(user.id).password_hash;
  assert.notEqual(hashBefore, hashAfter);
});

test('desativação e reativação de usuário', () => {
  const adminId = getProfileId('Admin');
  const user = usersService.create({
    name: 'Ativa Desativa',
    email: 'ativa.desativa@taurus.local',
    password: 'senha123',
    profileId: adminId,
  });

  const deactivated = usersService.deactivate(user.id);
  assert.equal(deactivated.active, 0);

  const reactivated = usersService.reactivate(user.id);
  assert.equal(reactivated.active, 1);
});

test('persistência de usuário após reiniciar o backend (fechar e reabrir o banco)', () => {
  const adminId = getProfileId('Admin');
  const user = usersService.create({
    name: 'Persistente',
    email: 'persistente@taurus.local',
    password: 'senha123',
    profileId: adminId,
  });

  closeDatabase();
  initDatabase();

  const reloaded = repository.users.findById(user.id);
  assert.ok(reloaded);
  assert.equal(reloaded.email, 'persistente@taurus.local');
});

test('bootstrap do Admin cria somente se o usuário ainda não existir', () => {
  process.env.TAURUS_ADMIN_EMAIL = 'bootstrap@taurus.local';
  process.env.TAURUS_ADMIN_PASSWORD = 'senhaBootstrap';

  usersService.bootstrapAdmin();
  const created = repository.users.findByEmail('bootstrap@taurus.local');
  assert.ok(created);
  const hashAfterFirstBootstrap = created.password_hash;

  process.env.TAURUS_ADMIN_PASSWORD = 'senhaDiferente';
  usersService.bootstrapAdmin();

  const afterSecondBootstrap = repository.users.findByEmail('bootstrap@taurus.local');
  assert.equal(afterSecondBootstrap.password_hash, hashAfterFirstBootstrap);

  delete process.env.TAURUS_ADMIN_EMAIL;
  delete process.env.TAURUS_ADMIN_PASSWORD;
});
