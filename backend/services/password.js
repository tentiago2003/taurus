const crypto = require('crypto');

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/** Gera um hash "salt:hash" (hex) usando scrypt. Nunca reversível. */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/** Compara uma senha em texto puro com um hash gerado por hashPassword. */
function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash ?? '').split(':');
  if (!salt || !key) {
    return false;
  }
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
