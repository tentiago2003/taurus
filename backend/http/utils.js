const { ApiError } = require('./errors');

const MAX_BODY_BYTES = 1024 * 1024; // 1MB: evita payloads excessivos (DoS)

/** Lê e faz parse do corpo JSON da requisição. Retorna {} se corpo vazio. */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new ApiError(413, 'Corpo da requisição excede o tamanho máximo permitido.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ApiError(400, 'JSON inválido no corpo da requisição.'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(body);
}

/** Traduz erros conhecidos (validação, constraints do SQLite) em respostas HTTP. */
function handleError(res, err) {
  if (err instanceof ApiError) {
    sendJson(res, err.status, { error: err.message });
    return;
  }
  if (typeof err?.message === 'string' && err.message.includes('UNIQUE constraint failed')) {
    sendJson(res, 409, { error: 'Registro duplicado.' });
    return;
  }
  if (typeof err?.message === 'string' && err.message.includes('FOREIGN KEY constraint failed')) {
    sendJson(res, 400, { error: 'Referência inválida a um registro relacionado.' });
    return;
  }
  console.error('Erro inesperado na API:', err);
  sendJson(res, 500, { error: 'Erro interno do servidor.' });
}

/** Envolve um handler assíncrono de rota, capturando erros e formatando a resposta. */
function asyncHandler(handler) {
  return async (req, res, params) => {
    try {
      await handler(req, res, params);
    } catch (err) {
      handleError(res, err);
    }
  };
}

module.exports = { readJsonBody, sendJson, handleError, asyncHandler };
