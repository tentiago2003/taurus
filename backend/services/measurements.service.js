const { measurements } = require('../db/repository');
const access = require('./access.service');

function listPaged(options = {}, user) {
  if (!user || access.isAdmin(user)) return measurements.listPaged(options);
  const scopedOptions = { ...options };
  if (scopedOptions.dataSourceId !== null && scopedOptions.dataSourceId !== undefined && scopedOptions.dataSourceId !== '') {
    access.ensureCompanyAccess(user, access.companyIdFromDataSource(Number(scopedOptions.dataSourceId)));
    return measurements.listPaged(scopedOptions);
  }
  return measurements.listPagedByCompany(Number(user.company_id), scopedOptions);
}

module.exports = { listPaged };
