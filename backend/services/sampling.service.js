'use strict';

const repository = require('../db/repository');
const interpretation = require('./interpretation.service');

/**
 * Amostragem histórica: para cada Data Source e janela, mantém somente o
 * último valor recebido de cada métrica. As mensagens brutas continuam sendo
 * armazenadas separadamente, sem amostragem.
 */
const runtime = new Map();

function parseReceivedAt(receivedAt) {
  const timestamp = Date.parse(receivedAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`receivedAt inválido: ${receivedAt}`);
  }
  return timestamp;
}

function getWindowStart(timestamp, intervalSeconds) {
  const intervalMs = intervalSeconds * 1000;
  return Math.floor(timestamp / intervalMs) * intervalMs;
}

function getOrCreateState(dataSource, windowStart, intervalMs) {
  const current = runtime.get(dataSource.id);
  if (current && current.windowStart === windowStart) return current;

  if (current) flushDataSource(dataSource.id);

  const state = {
    dataSourceId: dataSource.id,
    windowStart,
    windowEnd: windowStart + intervalMs,
    latestByMetric: new Map(),
    timer: null,
  };

  const delay = Math.max(state.windowEnd - Date.now(), 0);
  state.timer = setTimeout(() => {
    try {
      flushDataSource(dataSource.id, state.windowStart);
    } catch (error) {
      console.error(`Erro ao finalizar amostragem da Data Source ${dataSource.id}:`, error.message);
    }
  }, delay);

  // O timer não deve impedir o processo de encerrar.
  if (typeof state.timer.unref === 'function') state.timer.unref();

  runtime.set(dataSource.id, state);
  return state;
}

function flushDataSource(dataSourceId, expectedWindowStart = null) {
  const state = runtime.get(dataSourceId);
  if (!state) return 0;
  if (expectedWindowStart !== null && state.windowStart !== expectedWindowStart) return 0;

  if (state.timer) clearTimeout(state.timer);
  runtime.delete(dataSourceId);

  let inserted = 0;
  for (const measurement of state.latestByMetric.values()) {
    repository.measurements.insert({
      dataSourceId,
      metric: measurement.metric,
      timestamp: measurement.timestamp,
      value: measurement.value,
    });
    inserted += 1;
  }

  return inserted;
}

function process({ dataSourceId, payload, receivedAt = new Date().toISOString() }) {
  const dataSource = repository.dataSources.findById(dataSourceId);
  if (!dataSource || !dataSource.active || !dataSource.store_history) {
    return { measurements: [], errors: [], stored: 0 };
  }

  const config = dataSource.configuration?.interpretation;
  if (!config) {
    return { measurements: [], errors: [], stored: 0 };
  }

  const receivedTimestamp = parseReceivedAt(receivedAt);
  const intervalSeconds = Number(dataSource.sampling_interval_seconds);
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error(`Intervalo de amostragem inválido na Data Source ${dataSourceId}.`);
  }

  const intervalMs = intervalSeconds * 1000;
  const windowStart = getWindowStart(receivedTimestamp, intervalSeconds);
  const state = getOrCreateState(dataSource, windowStart, intervalMs);

  const result = interpretation.interpret({ payload, configuration: config, receivedAt });
  for (const measurement of result.measurements) {
    state.latestByMetric.set(measurement.metric, {
      ...measurement,
      receivedAt,
    });
  }

  return {
    measurements: result.measurements,
    errors: result.errors,
    stored: 0,
    windowStart: new Date(state.windowStart).toISOString(),
    windowEnd: new Date(state.windowEnd).toISOString(),
  };
}

function flushAll() {
  let inserted = 0;
  for (const dataSourceId of Array.from(runtime.keys())) {
    inserted += flushDataSource(dataSourceId);
  }
  return inserted;
}

function reset() {
  for (const state of runtime.values()) {
    if (state.timer) clearTimeout(state.timer);
  }
  runtime.clear();
}

module.exports = {
  process,
  flushDataSource,
  flushAll,
  reset,
  getWindowStart,
};
