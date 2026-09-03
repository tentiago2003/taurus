const { ApiError } = require('../http/errors');

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `Campo obrigatório: ${fieldName}.`);
  }
  return value.trim();
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

module.exports = { requireString, optionalString, requireInt, optionalInt, ApiError };
