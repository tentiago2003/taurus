const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');

const dbPath = `/tmp/taurus-auth-test-${process.pid}-${crypto.randomBytes(6).toString('hex')}.db`;
process.env.TAURUS_DB_PATH = dbPath;

const { initDatabase, closeDatabase } = require('../db');
const repository = require('../db/repository');
const authService = require('../services/auth.service');
const { hashPassword } = require('../services/password');

initDatabase();
const adminProfile = repository.profiles.findByName('Admin');
const created = repository.users.create({
  companyId: null,
  profileId: adminProfile.id,
  name: 'Admin Teste',
  email: 'admin@test.local',
  passwordHash: hashPassword('senha123'),
});

function requestWithCookie(cookie) {
  return { headers: { cookie } };
}

test('login com credenciais válidas cria sessão', () => {
  const result = authService.login('ADMIN@Test.local', 'senha123');
  assert.equal(result.user.id, created.id);
  assert.ok(result.token);
  assert.equal(result.user.password_hash, undefined);
});

test('login com senha inválida retorna 401', () => {
  assert.throws(() => authService.login('admin@test.local', 'errada'), (err) => err.status === 401);
});

test('usuário inativo não consegue entrar', () => {
  repository.users.setActive({ id: created.id, active: 0 });
  assert.throws(() => authService.login('admin@test.local', 'senha123'), (err) => err.status === 401);
  repository.users.setActive({ id: created.id, active: 1 });
});

test('sessão recupera usuário pelo cookie', () => {
  const result = authService.login('admin@test.local', 'senha123');
  const user = authService.getUserFromRequest(requestWithCookie(`${authService.SESSION_COOKIE}=${result.token}`));
  assert.equal(user.id, created.id);
});

test('logout invalida sessão', () => {
  const result = authService.login('admin@test.local', 'senha123');
  const req = requestWithCookie(`${authService.SESSION_COOKIE}=${result.token}`);
  authService.logout(req);
  assert.equal(authService.getUserFromRequest(req), null);
});

closeDatabase();
