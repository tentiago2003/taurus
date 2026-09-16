const repository = require('../db/repository');
const { ApiError } = require('./validation');

function requirePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(400, `${fieldName} deve ser um número inteiro maior que zero.`);
  }
  return number;
}

function get() {
  return repository.systemSettings.get();
}

function update(payload = {}, updatedBy = null) {
  const measurementRetentionDays = requirePositiveInteger(
    payload.measurementRetentionDays,
    'Retenção das medições'
  );
  const defaultSamplingIntervalSeconds = requirePositiveInteger(
    payload.defaultSamplingIntervalSeconds,
    'Intervalo padrão de medição'
  );

  return repository.systemSettings.update({
    measurementRetentionDays,
    defaultSamplingIntervalSeconds,
    updatedBy,
  });
}

module.exports = { get, update };
