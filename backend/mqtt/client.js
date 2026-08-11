require('dotenv').config();
const mqtt = require('mqtt');
const { parseMqttPayload } = require('./parser');

const host = process.env.MQTT_HOST;
const port = process.env.MQTT_PORT;
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;

if (!host || !port) {
  console.error('MQTT configuration is incomplete. Please set MQTT_HOST and MQTT_PORT.');
  process.exit(1);
}

const client = mqtt.connect({
  host,
  port: Number(port),
  username,
  password,
});

const topics = [
  'P2P-IoT/G001/LoRa1',
  'P2P-IoT/G001/LoRa2',
  'P2P-IoT/G001/LoRa3',
  'P2P-IoT/G001/LoRa4',
];

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
  } catch (error) {
    console.error(`Error parsing message from ${topic}: ${error.message}`);
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});
