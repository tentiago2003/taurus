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

function startMqtt(onMessage) {
  const client = mqtt.connect({
    host,
    port: Number(port),
    username,
    password,
  });

  client.on('connect', () => {
    console.log('MQTT connection established');

    topics.forEach((topic) => {
      client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error subscribing to ${topic}:`, err);
          return;
        }
        console.log(`Subscribed to ${topic}`);
      });
    });
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

  client.on('error', (err) => {
    console.error('MQTT connection error:', err);
  });
}

module.exports = {
  startMqtt,
};
