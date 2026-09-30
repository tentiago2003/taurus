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

function toUtcDayStart(value, fieldName) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new ApiError(400, `${fieldName} deve estar no formato AAAA-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, `${fieldName} é inválida.`);
  }

  return date;
}

function getCleanupStatus() {
  const settings = get();
  const latestAutomatic = repository.cleanupHistory.latestAutomatic();
  const now = new Date();
  const cutoffAt = new Date(now.getTime() - settings.measurement_retention_days * 24 * 60 * 60 * 1000);

  let nextAutomaticAt = null;
  let automaticDue = false;

  if (!latestAutomatic) {
    automaticDue = true;
    nextAutomaticAt = now.toISOString();
  } else {
    nextAutomaticAt = new Date(
      new Date(latestAutomatic.executed_at).getTime()
        + settings.measurement_retention_days * 24 * 60 * 60 * 1000
    ).toISOString();
    automaticDue = now.getTime() >= new Date(nextAutomaticAt).getTime();
  }

  return {
    retentionDays: settings.measurement_retention_days,
    latestAutomatic,
    nextAutomaticAt,
    automaticDue,
    automaticCandidates: repository.cleanupHistory.countBefore(cutoffAt.toISOString()),
  };
}

function getCleanupHistory(limit = 50) {
  return repository.cleanupHistory.list({ limit });
}

function previewManualCleanup({ startDate, endDate } = {}) {
  const start = toUtcDayStart(startDate, 'Data inicial');
  const end = toUtcDayStart(endDate, 'Data final');

  if (end.getTime() < start.getTime()) {
    throw new ApiError(400, 'A data final não pode ser anterior à data inicial.');
  }

  const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return {
    startDate,
    endDate,
    measurements: repository.cleanupHistory.countRange(start.toISOString(), endExclusive.toISOString()).measurements,
    rawMessages: repository.cleanupHistory.countRange(start.toISOString(), endExclusive.toISOString()).rawMessages,
  };
}

function executeManualCleanup({ startDate, endDate } = {}, executedBy = null) {
  const start = toUtcDayStart(startDate, 'Data inicial');
  const end = toUtcDayStart(endDate, 'Data final');

  if (end.getTime() < start.getTime()) {
    throw new ApiError(400, 'A data final não pode ser anterior à data inicial.');
  }

  const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const settings = get();

  return repository.cleanupHistory.executeManual({
    startAt: start.toISOString(),
    endAt: endExclusive.toISOString(),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    retentionDays: settings.measurement_retention_days,
    executedAt: new Date().toISOString(),
    executedBy,
  });
}

function executeAutomaticCleanupIfDue(now = new Date()) {
  const settings = get();
  const latestAutomatic = repository.cleanupHistory.latestAutomatic();

  if (latestAutomatic) {
    const nextDue = new Date(
      new Date(latestAutomatic.executed_at).getTime()
        + settings.measurement_retention_days * 24 * 60 * 60 * 1000
    );
    if (now.getTime() < nextDue.getTime()) {
      return null;
    }
  }

  const cutoffAt = new Date(
    now.getTime() - settings.measurement_retention_days * 24 * 60 * 60 * 1000
  );

  return repository.cleanupHistory.executeAutomatic({
    cutoffAt: cutoffAt.toISOString(),
    retentionDays: settings.measurement_retention_days,
    executedAt: now.toISOString(),
  });
}

module.exports = {
  get,
  update,
  getCleanupStatus,
  getCleanupHistory,
  previewManualCleanup,
  executeManualCleanup,
  executeAutomaticCleanupIfDue,
};
