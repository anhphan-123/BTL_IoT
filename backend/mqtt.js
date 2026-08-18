const mqtt = require("mqtt");
const crypto = require("crypto");

const {
  MQTT_URL,
  TOPICS,
  DEVICE_OFFLINE_TIMEOUT
} = require("./config");

const {
  run,
  get,
  saveDeviceState
} = require("./database");
const restoreRequests = new Set();
const {
  hardwareStatus,
  deviceStates,
  pendingCommands
} = require("./state");

let mqttClient;

function startMQTT(io) {

  mqttClient = mqtt.connect(
    MQTT_URL,
    {
      clientId:
        "backend-" +
        Math.random().toString(16).slice(2),

      reconnectPeriod: 2000
    }
  );

  // =====================================
  // CONNECT
  // =====================================

  mqttClient.on("connect", () => {

    console.log(
      "MQTT connected:",
      MQTT_URL
    );

    mqttClient.subscribe([
      TOPICS.DATA_SENSOR,
      TOPICS.DEVICE_RESPONSE
    ]);

    console.log(
      "Subscribed:",
      TOPICS.DATA_SENSOR,
      TOPICS.DEVICE_RESPONSE
    );
  });


  // =====================================
  // MESSAGE
  // =====================================

  mqttClient.on(
    "message",
    async (topic, message) => {

      if (
        topic === TOPICS.DATA_SENSOR
      ) {
        await handleSensor(
          message,
          io
        );
      }

      if (
        topic === TOPICS.DEVICE_RESPONSE
      ) {
        await handleResponse(
          message,
          io
        );
      }
    }
  );


  // =====================================
  // OFFLINE CHECK
  // =====================================

  setInterval(() => {

    if (
      hardwareStatus.isOnline &&
      hardwareStatus.lastSeen &&
      Date.now() -
        hardwareStatus.lastSeen >
        DEVICE_OFFLINE_TIMEOUT
    ) {

      hardwareStatus.isOnline = false;

      console.log(
        "ESP8266 OFFLINE"
      );

      io.emit(
        "system:status",
        hardwareStatus
      );
    }

  }, 1000);

  return mqttClient;
}


// =======================================
// SENSOR
// =======================================

async function handleSensor(
  message,
  io
) {

  try {

    const data =
      JSON.parse(
        message.toString()
      );

    const temperature =
      Number(data.temperature);

    const humidity =
      Number(data.humidity);

    const light =
      Number(data.light);

    if (
      !Number.isFinite(temperature) ||
      !Number.isFinite(humidity) ||
      !Number.isFinite(light)
    ) {
      console.log(
        "Sensor data invalid"
      );

      return;
    }

    const result =
      await run(
        `
        INSERT INTO sensor_data
        (
          temperature,
          humidity,
          light
        )
        VALUES (?, ?, ?)
        `,
        [
          temperature,
          humidity,
          light
        ]
      );

    const row =
      await get(
        `
        SELECT *
        FROM sensor_data
        WHERE id = ?
        `,
        [result.id]
      );


    // ESP đang online
    const wasOffline =
      !hardwareStatus.isOnline;

    hardwareStatus.isOnline = true;

    hardwareStatus.lastSeen =
      Date.now();


if (wasOffline) {
  console.log("ESP8266 ONLINE");

  io.emit(
    "system:status",
    hardwareStatus
  );

  // ESP vừa online lại
  // gửi lại trạng thái cũ
  restoreDeviceStates();
}


    // Realtime → Web
    io.emit(
      "sensor:update",
      row
    );

    console.log(
      "Sensor:",
      temperature,
      humidity,
      light
    );

  } catch (err) {

    console.error(
      "Sensor MQTT error:",
      err.message
    );
  }
}


// =======================================
// DEVICE RESPONSE
// =======================================

async function handleResponse(
  message,
  io
) {

  try {

    const data =
      JSON.parse(
        message.toString()
      );

    const {
      requestId,
      device,
      action,
      status
    } = data;

if (
  restoreRequests.has(requestId)
) {
  restoreRequests.delete(
    requestId
  );

  if (
    status === "SUCCESS" &&
    device in deviceStates
  ) {
    deviceStates[device] =
      action === "ON";

    await saveDeviceState(
      device,
      action === "ON"
    );

    console.log(
      `Restore SUCCESS: ${device} -> ${action}`
    );

    io.emit(
      "device:states",
      deviceStates
    );
  }

  return;
}
    await run(
      `
      UPDATE action_history
      SET status = ?
      WHERE request_id = ?
      `,
      [
        status,
        requestId
      ]
    );


    // Hủy timeout command
    const timer =
      pendingCommands.get(
        requestId
      );

    if (timer) {

      clearTimeout(timer);

      pendingCommands.delete(
        requestId
      );
    }


    // ESP xác nhận thành công
    if (
  status === "SUCCESS" &&
  device in deviceStates
) {
  const isOn =
    action === "ON";

  // Cập nhật RAM
  deviceStates[device] =
    isOn;

  // Lưu vĩnh viễn vào SQLite
  await saveDeviceState(
    device,
    isOn
  );

  console.log(
    `Saved state: ${device} = ${action}`
  );
}

    const row =
      await get(
        `
        SELECT *
        FROM action_history
        WHERE request_id = ?
        `,
        [requestId]
      );


    console.log(
      "Response:",
      row
    );


    io.emit(
      "device:response",
      row
    );

    io.emit(
      "device:states",
      deviceStates
    );

  } catch (err) {

    console.error(
      "Response error:",
      err.message
    );
  }
}
function restoreDeviceStates() {
  if (
    !mqttClient ||
    !mqttClient.connected
  ) {
    return;
  }

  console.log(
    "Restoring device states to ESP8266..."
  );

  for (
    const [device, state]
    of Object.entries(deviceStates)
  ) {
    const requestId =
      "restore-" +
      crypto.randomUUID();

    restoreRequests.add(
      requestId
    );

    const payload =
      JSON.stringify({
        requestId,
        device,
        action:
          state ? "ON" : "OFF"
      });

    mqttClient.publish(
      TOPICS.DEVICE_CONTROL,
      payload
    );

    console.log(
      `Restore: ${device} -> ${
        state ? "ON" : "OFF"
      }`
    );
  }
}

function getMqttClient() {
  return mqttClient;
}


module.exports = {
  startMQTT,
  getMqttClient
};