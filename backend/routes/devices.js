const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const {
  run,
  get,
  all
} = require("../database");

const {
  TOPICS,
  COMMAND_TIMEOUT
} = require("../config");

const {
  hardwareStatus,
  deviceStates,
  pendingCommands
} = require("../state");

const {
  getMqttClient
} = require("../mqtt");


// =======================================
// DEVICE STATES
// =======================================

router.get(
  "/",
  async (req, res) => {
    try {
      const devices = await all(
        `
        SELECT id, device_code, device_name, device_type, created_at
        FROM devices
        ORDER BY id
        `
      );

      res.json(devices);
    } catch (err) {
      console.error("Devices API error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/states",
  (req, res) => {

    res.json(deviceStates);
  }
);


// =======================================
// CONTROL
// =======================================

router.post(
  "/:device/control",
  async (req, res) => {

    try {

      const device =
        req.params.device;

      const action =
        String(
          req.body.action || ""
        ).toUpperCase();

      const allowedDevices = new Set([
        "light",
        "fan"
      ]);

      if (!allowedDevices.has(device)) {
        return res
          .status(400)
          .json({
            error:
              "Invalid device"
          });
      }


      const deviceRecord = await get(
        `
        SELECT id, device_code, device_name, device_type
        FROM devices
        WHERE device_type = ?
        `,
        [device]
      );

      if (!deviceRecord) {

        return res
          .status(400)
          .json({
            error:
              "Unknown device"
          });
      }


      if (
        action !== "ON" &&
        action !== "OFF"
      ) {

        return res
          .status(400)
          .json({
            error:
              "Action must be ON or OFF"
          });
      }


      const requestId =
        crypto.randomUUID();


      // =================================
      // ESP OFFLINE
      // =================================

      if (!hardwareStatus.isOnline) {

        const result =
          await run(
            `
            INSERT INTO action_history
            (
              request_id,
              device,
              device_id,
              action,
              status,
              "user"
            )

            VALUES (?, ?, ?, ?, 'FAILED', ?)
            `,
            [
              requestId,
              device,
              deviceRecord.id,
              action,
              req.user.username
            ]
          );


        return res
          .status(503)
          .json({

            success: false,

            message:
              "ESP8266 offline",

            id:
              result.id
          });
      }


      // =================================
      // PENDING
      // =================================

      await run(
        `
        INSERT INTO action_history
        (
          request_id,
          device,
          device_id,
          action,
          status,
          "user"
        )

        VALUES (?, ?, ?, ?, 'PENDING', ?)
        `,
        [
          requestId,
          device,
          deviceRecord.id,
          action,
          req.user.username
        ]
      );


      const mqttClient =
        getMqttClient();


      const payload =
        JSON.stringify({
          requestId,
          device,
          action
        });


      mqttClient.publish(
        TOPICS.DEVICE_CONTROL,
        payload
      );


      console.log(
        "Control:",
        payload
      );


      // =================================
      // TIMEOUT
      // =================================

const timer = setTimeout(async () => {
  try {
    const result = await run(
      `UPDATE action_history
       SET status = 'FAILED'
       WHERE request_id = ?
         AND status = 'PENDING'`,
      [requestId]
    );

    pendingCommands.delete(requestId);

    // Nếu vẫn còn PENDING và vừa đổi được thành FAILED
    if (result.changes > 0) {
      const row = await get(
        `SELECT *
         FROM action_history
         WHERE request_id = ?`,
        [requestId]
      );

      console.log(
        "Command timeout:",
        row
      );

      // Báo realtime về Frontend
      const io =
        req.app.get("io");

      io.emit(
        "device:response",
        row
      );
    }

  } catch (err) {
    console.error(
      "Command timeout error:",
      err.message
    );
  }
}, COMMAND_TIMEOUT);


      pendingCommands.set(
        requestId,
        timer
      );


      const row =
        await get(
          `
          SELECT *
          FROM action_history
          WHERE request_id = ?
          `,
          [requestId]
        );


      res.status(202).json({
        success: true,
        data: row
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });
    }
  }
);


module.exports = router;
