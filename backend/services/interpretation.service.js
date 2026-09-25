'use strict';

const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const access = require('./access.service');

const CONFIG_VERSION = 1;
const SUPPORTED_FORMATS = new Set(['json']);
const SUPPORTED_TRANSFORMS = new Set(['none', 'divide', 'multiply', 'add', 'subtract']);

function defaultConfiguration() {
  return {
    version: CONFIG_VERSION,
    format: 'json',
    timestamp: { path: ['ts'] },
    mappings: [],
  };
}

function normalizePath(path, fieldName) {
  if (!Array.isArray(path) || path.length === 0) {
    throw new ApiError(400, `${fieldName} deve ser um caminho não vazio.`);
  }
  return path.map((segment, index) => {
    if ((typeof segment !== 'string' && !Number.isInteger(segment)) || (typeof segment === 'string' && segment.length === 0)) {
      throw new ApiError(400, `${fieldName}[${index}] é inválido.`);
    }
    return segment;
  });
}

function normalizeConfiguration(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Configuração de interpretação inválida.');
  }

  const version = input.version === undefined ? CONFIG_VERSION : Number(input.version);
  if (version !== CONFIG_VERSION) {
    throw new ApiError(400, `Versão de interpretação não suportada: ${input.version}.`);
  }

  const format = String(input.format || 'json').toLowerCase();
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new ApiError(400, `Formato de interpretação não suportado: ${format}.`);
  }

  const timestamp = input.timestamp === null ? null : input.timestamp || { path: ['ts'] };
  if (timestamp !== null) normalizePath(timestamp.path, 'timestamp.path');

  if (!Array.isArray(input.mappings)) {
    throw new ApiError(400, 'mappings deve ser um array.');
  }

  const metricNames = new Set();
  const mappings = input.mappings.map((mapping, index) => {
    if (!mapping || typeof mapping !== 'object') {
      throw new ApiError(400, `mappings[${index}] inválido.`);
    }
    const metric = String(mapping.metric || '').trim();
    if (!metric) throw new ApiError(400, `Métrica obrigatória em mappings[${index}].`);
    if (metricNames.has(metric)) throw new ApiError(400, `Métrica duplicada: ${metric}.`);
    metricNames.add(metric);

    const path = normalizePath(mapping.path, `mappings[${index}].path`);
    const transform = mapping.transform || { type: 'none' };
    const transformType = String(transform.type || 'none').toLowerCase();
    if (!SUPPORTED_TRANSFORMS.has(transformType)) {
      throw new ApiError(400, `Transformação não suportada: ${transform.type}.`);
    }
    if (transformType !== 'none') {
      const factor = Number(transform.value);
      if (!Number.isFinite(factor)) {
        throw new ApiError(400, `Valor da transformação inválido em mappings[${index}].`);
      }
    }

    return {
      metric,
      path,
      transform: transformType === 'none'
        ? { type: 'none' }
        : { type: transformType, value: Number(transform.value) },
    };
  });

  return {
    version: CONFIG_VERSION,
    format,
    timestamp: timestamp === null ? null : { path: [...timestamp.path] },
    mappings,
  };
}

function getAtPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    current = current[segment];
  }
  return current;
}

function transformValue(value, transform) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  switch (transform.type) {
    case 'none': return numeric;
    case 'divide':
      if (transform.value === 0) throw new Error('Divisão por zero na interpretação.');
      return numeric / transform.value;
    case 'multiply': return numeric * transform.value;
    case 'add': return numeric + transform.value;
    case 'subtract': return numeric - transform.value;
    default: throw new Error(`Transformação não suportada: ${transform.type}.`);
  }
}

function parsePayload(payload, format) {
  if (format !== 'json') throw new Error(`Formato não suportado: ${format}.`);
  const text = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Payload não é um JSON válido.');
  }
}

function interpret({ payload, configuration, receivedAt = new Date().toISOString() }) {
  const config = normalizeConfiguration(configuration);
  const parsed = parsePayload(payload, config.format);
  const timestampValue = config.timestamp ? getAtPath(parsed, config.timestamp.path) : receivedAt;
  const timestamp = timestampValue === undefined || timestampValue === null || timestampValue === ''
    ? receivedAt
    : String(timestampValue);

  const measurements = [];
  const errors = [];
  for (const mapping of config.mappings) {
    const rawValue = getAtPath(parsed, mapping.path);
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      errors.push({ metric: mapping.metric, reason: 'Campo não encontrado.' });
      continue;
    }
    try {
      const value = transformValue(rawValue, mapping.transform);
      if (value === null) {
        errors.push({ metric: mapping.metric, reason: 'Valor não numérico.' });
        continue;
      }
      measurements.push({ metric: mapping.metric, timestamp, value });
    } catch (error) {
      errors.push({ metric: mapping.metric, reason: error.message });
    }
  }

  return { measurements, errors };
}

function get(dataSourceId, user) {
  const companyId = access.companyIdFromDataSource(dataSourceId);
  access.ensureCompanyAccess(user, companyId);
  const dataSource = repository.dataSources.findById(dataSourceId);
  if (!dataSource) throw new ApiError(404, 'Fonte de dados não encontrada.');
  return dataSource.configuration?.interpretation || null;
}

function save(dataSourceId, configuration, updatedBy = null, user = null) {
  const companyId = access.companyIdFromDataSource(dataSourceId);
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, companyId);
  const dataSource = repository.dataSources.findById(dataSourceId);
  if (!dataSource) throw new ApiError(404, 'Fonte de dados não encontrada.');
  const normalized = normalizeConfiguration(configuration);
  const current = dataSource.configuration && typeof dataSource.configuration === 'object'
    ? dataSource.configuration
    : {};
  const updated = { ...current, interpretation: normalized };
  return repository.dataSources.updateConfiguration({ id: dataSourceId, configuration: updated, updatedBy });
}

module.exports = {
  CONFIG_VERSION,
  defaultConfiguration,
  normalizeConfiguration,
  getAtPath,
  transformValue,
  interpret,
  get,
  save,
};
