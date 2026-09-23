const { measurements } = require('../db/repository');

function listPaged(options = {}) {
  return measurements.listPaged(options);
}

module.exports = { listPaged };
