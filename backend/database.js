const sqlite3 = require("sqlite3").verbose();

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
    CREATE TABLE IF NOT EXISTS action_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      request_id TEXT UNIQUE NOT NULL,

      device TEXT NOT NULL,

      action TEXT NOT NULL,

      status TEXT NOT NULL,

      time TEXT NOT NULL
        DEFAULT (datetime('now', 'localtime'))
    )
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
module.exports = {
  db,
  run,
  get,
  all,
  initDatabase,
  saveDeviceState,
  loadDeviceStates
};