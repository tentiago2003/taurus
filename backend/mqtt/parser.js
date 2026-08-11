function parseMqttPayload(payload) {
  let parsed;

  try {
    parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Payload must be an object');
  }

  const dataProperty = parsed['Slave, T1, T2, ADC1, ADC2, Vcc, mA, mS, Ch, Ver'];

  if (!Array.isArray(dataProperty)) {
    throw new Error('Expected data property is missing or invalid');
  }

  if (dataProperty.length < 3) {
    throw new Error('Data array does not contain the required values');
  }

  const [slave, t1, t2] = dataProperty;

  if (slave === undefined || t1 === undefined || t2 === undefined) {
    throw new Error('Data array does not contain the required values');
  }

  if (parsed.ts === undefined) {
    throw new Error('Missing ts field');
  }

  return {
    slave,
    t1: Number(t1) / 10,
    t2: Number(t2) / 10,
    ts: parsed.ts,
  };
}

module.exports = {
  parseMqttPayload,
};
