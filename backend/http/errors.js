/** Erro de aplicação com status HTTP associado, usado pelos services/controllers. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

module.exports = { ApiError };
