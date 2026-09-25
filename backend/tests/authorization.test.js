'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccess } = require('../http/authorization');

const admin = { profile_name: 'Admin' };
const manager = { profile_name: 'Gerente' };
const viewer = { profile_name: 'Consulta' };

test('Admin tem acesso às operações administrativas', () => {
  assert.equal(canAccess(admin, 'POST', '/api/users'), true);
  assert.equal(canAccess(admin, 'PUT', '/api/system-settings'), true);
  assert.equal(canAccess(admin, 'DELETE', '/api/companies/1'), true);
});

test('Gerente pode administrar usuários, dashboards, conexões e fontes, mas não empresas', () => {
  assert.equal(canAccess(manager, 'POST', '/api/users'), true);
  assert.equal(canAccess(manager, 'PUT', '/api/users/1'), true);
  assert.equal(canAccess(manager, 'DELETE', '/api/users/1'), true);
  assert.equal(canAccess(manager, 'POST', '/api/dashboards'), true);
  assert.equal(canAccess(manager, 'PUT', '/api/widgets/1'), true);
  assert.equal(canAccess(manager, 'POST', '/api/connections'), true);
  assert.equal(canAccess(manager, 'PUT', '/api/data-sources/1/interpretation'), true);
  assert.equal(canAccess(manager, 'DELETE', '/api/companies/1'), false);
  assert.equal(canAccess(manager, 'GET', '/api/companies'), false);
  assert.equal(canAccess(manager, 'GET', '/api/profiles'), true);
});

test('Consulta tem somente leitura dos dados operacionais', () => {
  assert.equal(canAccess(viewer, 'GET', '/api/dashboards'), true);
  assert.equal(canAccess(viewer, 'GET', '/api/measurements'), true);
  assert.equal(canAccess(viewer, 'GET', '/api/raw-messages'), true);
  assert.equal(canAccess(viewer, 'GET', '/api/connections'), true);
  assert.equal(canAccess(viewer, 'GET', '/api/data-sources'), true);
  assert.equal(canAccess(viewer, 'GET', '/api/interpretation'), true);
  assert.equal(canAccess(viewer, 'GET', '/api/users'), false);
  assert.equal(canAccess(viewer, 'GET', '/api/profiles'), false);
  assert.equal(canAccess(viewer, 'GET', '/api/companies'), false);
  assert.equal(canAccess(viewer, 'POST', '/api/dashboards'), false);
  assert.equal(canAccess(viewer, 'PUT', '/api/connections/1'), false);
  assert.equal(canAccess(viewer, 'DELETE', '/api/widgets/1'), false);
});
