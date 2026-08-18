const HTTP_PORT = 3000;

const MQTT_URL = "mqtt://localhost:1884";

const TOPICS = {
  DATA_SENSOR: "data_sensor",
  DEVICE_CONTROL: "device_control",
  DEVICE_RESPONSE: "device_response"
};

// ESP gửi 2 giây/lần.
// Quá 7 giây không thấy data → offline.
const DEVICE_OFFLINE_TIMEOUT = 7000;

// Gửi lệnh mà 5 giây không response → FAILED.
const COMMAND_TIMEOUT = 5000;

module.exports = {
  HTTP_PORT,
  MQTT_URL,
  TOPICS,
  DEVICE_OFFLINE_TIMEOUT,
  COMMAND_TIMEOUT
};