const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database(
  "./iot.db",
  (err) => {
    if (err) {
      console.error("SQLite error:", err.message);
    } else {
      console.log("SQLite connected");
    }
  }
);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          changes: this.changes
        });
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const defaultUsername = String(process.env.DEFAULT_USERNAME || "").trim();
  const defaultPassword = String(process.env.DEFAULT_PASSWORD || "");

  if (defaultUsername && defaultPassword) {
    const existingUser = await get(
      `SELECT id FROM users WHERE username = ?`,
      [defaultUsername]
    );

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      await run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        [defaultUsername, passwordHash]
      );
      console.log(`Default user created: ${defaultUsername}`);
    }
  } else {
    console.warn(
      "DEFAULT_USERNAME and DEFAULT_PASSWORD are not configured; no default user was created"
    );
  }

  await run(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      temperature REAL NOT NULL,

      humidity REAL NOT NULL,

      light REAL NOT NULL,

      time TEXT NOT NULL
        DEFAULT (datetime('now', 'localtime'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_code TEXT UNIQUE NOT NULL,
      sensor_name TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      unit TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    INSERT OR IGNORE INTO sensors
      (sensor_code, sensor_name, sensor_type, unit)
    VALUES
      ('TEMP_01', 'Cảm biến nhiệt độ DHT22', 'temperature', '°C'),
      ('HUM_01', 'Cảm biến độ ẩm DHT22', 'humidity', '%'),
      ('LIGHT_01', 'Cảm biến quang trở LDR', 'light', 'lux')
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id INTEGER NOT NULL,
      value REAL NOT NULL,
      time DATETIME NOT NULL,
      legacy_sensor_data_id INTEGER,
      FOREIGN KEY(sensor_id) REFERENCES sensors(id)
    )
  `);

  const readingColumns = await all(`PRAGMA table_info(sensor_readings)`);
  const hasLegacySensorDataId = readingColumns.some(
    (column) => column.name === "legacy_sensor_data_id"
  );

  if (!hasLegacySensorDataId) {
    await run(`
      ALTER TABLE sensor_readings
      ADD COLUMN legacy_sensor_data_id INTEGER
    `);
  }

  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sensor_readings_legacy
    ON sensor_readings (legacy_sensor_data_id, sensor_id)
    WHERE legacy_sensor_data_id IS NOT NULL
  `);

  // Convert each legacy wide row into one reading per sensor. The unique
  // partial index makes this migration safe to run on every backend restart.
  await run(`
    INSERT OR IGNORE INTO sensor_readings
      (sensor_id, value, time, legacy_sensor_data_id)
    SELECT s.id, sd.temperature, sd.time, sd.id
    FROM sensor_data sd
    JOIN sensors s ON s.sensor_type = 'temperature'
    UNION ALL
    SELECT s.id, sd.humidity, sd.time, sd.id
    FROM sensor_data sd
    JOIN sensors s ON s.sensor_type = 'humidity'
    UNION ALL
    SELECT s.id, sd.light, sd.time, sd.id
    FROM sensor_data sd
    JOIN sensors s ON s.sensor_type = 'light'
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_code TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Normalize legacy device codes in place so existing device IDs and
  // action_history.device_id references remain valid.
  await run(`
    UPDATE devices
    SET device_code = 'LIGHT_01',
        device_name = 'Light',
        device_type = 'light'
    WHERE device_type = 'light'
      AND device_code IN ('light', 'LIGHT_01')
  `);

  await run(`
    UPDATE devices
    SET device_code = 'FAN_01',
        device_name = 'Fan',
        device_type = 'fan'
    WHERE device_type = 'fan'
      AND device_code IN ('fan', 'FAN_01')
  `);

  await run(`
    UPDATE devices
    SET device_code = 'AIR_01',
        device_name = 'Air Conditioner',
        device_type = 'air_conditioner'
    WHERE device_type = 'air_conditioner'
      AND device_code IN ('air_conditioner', 'AIR_01')
  `);

  await run(`
    INSERT OR IGNORE INTO devices
      (device_code, device_name, device_type)
    VALUES
      ('LIGHT_01', 'Light', 'light'),
      ('FAN_01', 'Fan', 'fan'),
      ('AIR_01', 'Air Conditioner', 'air_conditioner')
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS action_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      request_id TEXT UNIQUE NOT NULL,

      device TEXT NOT NULL,

      device_id INTEGER REFERENCES devices(id),

      action TEXT NOT NULL,

      status TEXT NOT NULL,

      time TEXT NOT NULL
        DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // Add the actor column without recreating the table or losing history.
  // PRAGMA is checked first so restarting the backend is safe.
  const actionColumns = await all(`PRAGMA table_info(action_history)`);
  const hasUserColumn = actionColumns.some(
    (column) => column.name === "user"
  );

  if (!hasUserColumn) {
    await run(`
      ALTER TABLE action_history
      ADD COLUMN "user" TEXT NOT NULL DEFAULT 'admin'
    `);
  }

  const hasDeviceIdColumn = actionColumns.some(
    (column) => column.name === "device_id"
  );

  if (!hasDeviceIdColumn) {
    await run(`
      ALTER TABLE action_history
      ADD COLUMN device_id INTEGER REFERENCES devices(id)
    `);
  }

  await run(`
    UPDATE action_history
    SET device_id = (
      SELECT id
      FROM devices
      WHERE devices.device_code = action_history.device
         OR devices.device_type = action_history.device
    )
    WHERE device_id IS NULL
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS device_states (
      device TEXT PRIMARY KEY,
      state INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  await run(`
    INSERT OR IGNORE INTO device_states (device, state)
    VALUES ('light', 0)
  `);

  await run(`
    INSERT OR IGNORE INTO device_states (device, state)
    VALUES ('fan', 0)
  `);

  await run(`
    INSERT OR IGNORE INTO device_states (device, state)
    VALUES ('air_conditioner', 0)
  `);
  console.log("Database ready");
}

module.exports = {
  db,
  run,
  get,
  all,
  initDatabase
};
async function saveDeviceState(device, isOn) {
  await run(
    `
    UPDATE device_states
    SET state = ?,
        updated_at = datetime('now', 'localtime')
    WHERE device = ?
    `,
    [isOn ? 1 : 0, device]
  );
}

async function loadDeviceStates() {
  return await all(`
    SELECT device, state, updated_at
    FROM device_states
  `);
}

async function saveSensorReadings(sensorData) {
  return run(
    `
    INSERT OR IGNORE INTO sensor_readings
      (sensor_id, value, time, legacy_sensor_data_id)
    SELECT id, ?, ?, ?
    FROM sensors
    WHERE sensor_type = ?
    `,
    [sensorData.temperature, sensorData.time, sensorData.id, "temperature"]
  ).then(async (temperatureResult) => {
    const humidityResult = await run(
      `
      INSERT OR IGNORE INTO sensor_readings
        (sensor_id, value, time, legacy_sensor_data_id)
      SELECT id, ?, ?, ?
      FROM sensors
      WHERE sensor_type = ?
      `,
      [sensorData.humidity, sensorData.time, sensorData.id, "humidity"]
    );
    const lightResult = await run(
      `
      INSERT OR IGNORE INTO sensor_readings
        (sensor_id, value, time, legacy_sensor_data_id)
      SELECT id, ?, ?, ?
      FROM sensors
      WHERE sensor_type = ?
      `,
      [sensorData.light, sensorData.time, sensorData.id, "light"]
    );

    return {
      changes:
        temperatureResult.changes +
        humidityResult.changes +
        lightResult.changes,
    };
  });
}
module.exports = {
  db,
  run,
  get,
  all,
  initDatabase,
  saveDeviceState,
  loadDeviceStates,
  saveSensorReadings
};
