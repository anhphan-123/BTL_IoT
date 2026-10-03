const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const {
  Server
} = require("socket.io");

const {
  HTTP_PORT
} = require("./config");

const { requireAuth } = require("./middleware/auth");

const {
  initDatabase,
  loadDeviceStates
} = require("./database");

const {
  hardwareStatus,
  deviceStates
} = require("./state");

const {
  startMQTT
} = require("./mqtt");


// =======================================
// ROUTES
// =======================================

const sensorRoutes =
  require("./routes/sensors");

const actionRoutes =
  require("./routes/actions");

const deviceRoutes =
  require("./routes/devices");

const authRoutes =
  require("./routes/auth");


// =======================================
// EXPRESS
// =======================================

const app = express();

const server =
  http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!token || !secret) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!payload.id || !payload.username) {
      return next(new Error("Invalid authentication token"));
    }

    socket.user = {
      id: payload.id,
      username: payload.username,
    };

    return next();
  } catch (_error) {
    return next(new Error("Invalid or expired token"));
  }
});


app.set("io", io);

app.use(cors());

app.use(express.json());


// =======================================
// API
// =======================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/sensors",
  requireAuth,
  sensorRoutes
);

app.use(
  "/api/actions",
  requireAuth,
  actionRoutes
);

app.use(
  "/api/devices",
  requireAuth,
  deviceRoutes
);


// =======================================
// SYSTEM STATUS
// =======================================

app.get(
  "/api/system/status",
  requireAuth,
  (req, res) => {

    res.json(
      hardwareStatus
    );
  }
);


// =======================================
// SOCKET.IO
// =======================================

io.on(
  "connection",
  (socket) => {

    console.log(
      "Web connected:",
      socket.id
    );


    socket.emit(
      "system:status",
      hardwareStatus
    );


    socket.emit(
      "device:states",
      deviceStates
    );


    socket.on(
      "disconnect",
      () => {

        console.log(
          "Web disconnected"
        );

      }
    );
  }
);


// =======================================
// START
// =======================================

async function start() {
  await initDatabase();

  // ========================================
  // LOAD TRẠNG THÁI THIẾT BỊ TỪ SQLITE
  // ========================================

  const savedStates =
    await loadDeviceStates();

  for (const row of savedStates) {
    if (row.device in deviceStates) {
      deviceStates[row.device] =
        row.state === 1;
    }
  }

  console.log(
    "Device states loaded:",
    deviceStates
  );

  startMQTT(io);

  server.listen(
    HTTP_PORT,
    () => {
      console.log(
        `Backend: http://localhost:${HTTP_PORT}`
      );
    }
  );
}

start();
