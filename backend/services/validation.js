const { ApiError } = require('../http/errors');

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `Campo obrigatório: ${fieldName}.`);
  }
  return value.trim();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida formato básico de e-mail (sem verificação de domínio/DNS). */
function requireEmail(value, fieldName = 'email') {
  const email = requireString(value, fieldName).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'E-mail inválido.');
  }
  return email;
}

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value);
}

function requireInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new ApiError(400, `Campo obrigatório e numérico: ${fieldName}.`);
  }
  return num;
}

function optionalInt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new ApiError(400, 'Valor inválido, esperado número inteiro.');
  }
  return num;
}

/** Converte um parâmetro de rota (string) em um id inteiro positivo. */
function parseIdParam(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'Identificador inválido.');
  }
  return id;
}

module.exports = {
  requireString,
  requireEmail,
  optionalString,
  requireInt,
  optionalInt,
  parseIdParam,
  ApiError,
};
