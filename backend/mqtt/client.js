require('dotenv').config();
const mqtt = require('mqtt');
const { parseMqttPayload } = require('./parser');
const path = require('path');
const fs = require('fs');

const host = process.env.MQTT_HOST;
const port = process.env.MQTT_PORT;
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;

if (!host || !port) {
  console.error('MQTT configuration is incomplete. Please set MQTT_HOST and MQTT_PORT.');
  process.exit(1);
}

// Load MQTT topics from configuration file
const topicsConfigPath = path.join(__dirname, '../../config/mqtt-topics.json');
let topics;

try {
  const configContent = fs.readFileSync(topicsConfigPath, 'utf-8');
  topics = JSON.parse(configContent);

  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error('Topics configuration must be a non-empty array');
  }

  console.log(`Loaded ${topics.length} MQTT topics from configuration`);
} catch (error) {
  console.error(`Error loading MQTT topics configuration from ${topicsConfigPath}:`, error.message);
  process.exit(1);
}

function createMqttConnection(config) {
  let client;
  let onConnect;
  let onError;
  let onMessage;

  function connect() {
    client = mqtt.connect({
      host: config.host,
      port: Number(config.port),
      username: config.username,
      password: config.password,
      connectTimeout: config.connectTimeout,
    });

    client.on('connect', () => {
      if (typeof onConnect === 'function') {
        onConnect();
      }
    });

    client.on('message', (topic, payload) => {
      try {
        const parsedPayload = parseMqttPayload(payload.toString());
        console.log(`Parsed message from ${topic}:`, parsedPayload);
        if (parsedPayload && typeof onMessage === 'function') {
          onMessage(parsedPayload);
        }
      } catch (error) {
        console.error(`Error parsing message from ${topic}: ${error.message}`);
      }
    });

    client.on('error', (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
    });
  }

  function subscribe(subscribeTopics) {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      client.subscribe(subscribeTopics, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  function disconnect() {
    if (client) {
      client.removeAllListeners();
      client.end(true);
      client = undefined;
    }
  }

  return {
    connect,
    subscribe,
    disconnect,
    onConnect(callback) {
      onConnect = callback;
      return this;
    },
    onError(callback) {
      onError = callback;
      return this;
    },
    onMessage(callback) {
      onMessage = callback;
      return this;
    },
  };
}

function startMqtt(onMessage) {
  const connection = createMqttConnection({
    host,
    port,
    username,
    password,
  });

  connection
    .onConnect(async () => {
      console.log('MQTT connection established');
      try {
        await connection.subscribe(topics);
        topics.forEach((topic) => console.log(`Subscribed to ${topic}`));
      } catch (error) {
        console.error('Error subscribing to MQTT topics:', error);
      }
    })
    .onMessage(onMessage)
    .onError((error) => console.error('MQTT connection error:', error));

  connection.connect();
}

module.exports = {
  createMqttConnection,
  startMqtt,
};
