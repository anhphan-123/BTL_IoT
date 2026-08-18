import { useEffect, useState } from "react";
import "./App.css";

import socket from "./services/socket";

import Dashboard from "./pages/Dashboard";
import DataSensor from "./pages/DataSensor";
import ActivityHistory from "./pages/ActivityHistory";
import Profile from "./pages/Profile";

const API = "http://localhost:3000";

function App() {
  const [page, setPage] = useState("dashboard");

  const [sensor, setSensor] = useState({
    temperature: 0,
    humidity: 0,
    light: 0,
  });

  const [sensorRows, setSensorRows] = useState([]);

  const [online, setOnline] = useState(false);

  const [devices, setDevices] = useState({
    light: false,
    fan: false,
    air_conditioner: false,
  });

  const [loading, setLoading] = useState({
    light: false,
    fan: false,
    air_conditioner: false,
  });

  const [actionRows, setActionRows] = useState([]);

  // =====================================================
  // LOAD DỮ LIỆU BAN ĐẦU
  // =====================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const latestResponse = await fetch(
        `${API}/api/sensors/latest`
      );

      const latest = await latestResponse.json();

      if (latest) {
        setSensor(latest);
      }

      const sensorResponse = await fetch(
        `${API}/api/sensors?limit=50`
      );

      const sensorData = await sensorResponse.json();

      setSensorRows(sensorData.rows || []);

      const statusResponse = await fetch(
        `${API}/api/system/status`
      );

      const statusData = await statusResponse.json();

      setOnline(statusData.isOnline);

      const deviceResponse = await fetch(
        `${API}/api/devices/states`
      );

      const deviceData = await deviceResponse.json();

      setDevices(deviceData);

      await loadActions();
    } catch (error) {
      console.error("Load initial error:", error);
    }
  }

  async function loadActions() {
    try {
      const response = await fetch(
        `${API}/api/actions?limit=50`
      );

      const data = await response.json();

      setActionRows(data.rows || []);
    } catch (error) {
      console.error("Load actions error:", error);
    }
  }

  // =====================================================
  // SOCKET.IO
  // CHỈ ĐĂNG KÝ 1 LẦN Ở APP
  // =====================================================

  useEffect(() => {
    function handleConnect() {
      console.log(
        "Socket connected:",
        socket.id
      );
    }

    function handleDisconnect() {
      console.log("Socket disconnected");
    }

    function handleSensor(data) {
      console.log("Realtime sensor:", data);

      setSensor(data);

      setSensorRows((old) => {
        // newest ở trên
        const updated = [
          data,
          ...old.filter(
            (item) => item.id !== data.id
          ),
        ];

        return updated.slice(0, 50);
      });
    }

    function handleStatus(data) {
      console.log(
        "ESP status:",
        data.isOnline
      );

      setOnline(data.isOnline);
    }

    function handleDeviceStates(data) {
      console.log(
        "Device states:",
        data
      );

      setDevices(data);
    }

function handleDeviceResponse(data) {
  console.log(
    "Device response:",
    data
  );

  // Dù SUCCESS hay FAILED
  // đều phải kết thúc loading
  setLoading((old) => ({
    ...old,
    [data.device]: false,
  }));

  if (data.status === "SUCCESS") {
    setDevices((old) => ({
      ...old,
      [data.device]:
        data.action === "ON",
    }));
  }

  if (data.status === "FAILED") {
    console.log(
      `${data.device} điều khiển thất bại`
    );

    // KHÔNG đổi devices
    // → giữ trạng thái cũ
  }

  loadActions();
}

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "sensor:update",
      handleSensor
    );

    socket.on(
      "system:status",
      handleStatus
    );

    socket.on(
      "device:states",
      handleDeviceStates
    );

    socket.on(
      "device:response",
      handleDeviceResponse
    );

    // nếu socket đã connect trước useEffect
    if (socket.connected) {
      console.log(
        "Socket already connected:",
        socket.id
      );
    }

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "sensor:update",
        handleSensor
      );

      socket.off(
        "system:status",
        handleStatus
      );

      socket.off(
        "device:states",
        handleDeviceStates
      );

      socket.off(
        "device:response",
        handleDeviceResponse
      );
    };
  }, []);

  // =====================================================
  // DEVICE CONTROL
  // =====================================================

  async function controlDevice(device) {
    if (!online) {
      alert("ESP8266 đang Offline");
      return;
    }

    if (loading[device]) {
      return;
    }

    const action =
      devices[device]
        ? "OFF"
        : "ON";

    // hiện loading NGAY
    setLoading((old) => ({
      ...old,
      [device]: true,
    }));

    try {
      const response = await fetch(
        `${API}/api/devices/${device}/control`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setLoading((old) => ({
          ...old,
          [device]: false,
        }));

        alert(
          result.message ||
            "Điều khiển thất bại"
        );

        return;
      }

      console.log(
        "Backend PENDING:",
        result
      );

      // KHÔNG set loading false ở đây.
      // Chờ ESP device_response khoảng 2 giây.

    } catch (error) {
      console.error(error);

      setLoading((old) => ({
        ...old,
        [device]: false,
      }));

      alert(
        "Không kết nối được Backend"
      );
    }
  }

  // =====================================================
  // PAGE
  // =====================================================

  function renderPage() {
    if (page === "dashboard") {
      return (
        <Dashboard
          sensor={sensor}
          sensorRows={sensorRows}
          online={online}
          devices={devices}
          loading={loading}
          controlDevice={controlDevice}
        />
      );
    }

    if (page === "sensor") {
      return (
        <DataSensor
          rows={sensorRows}
        />
      );
    }

    if (page === "history") {
      return (
        <ActivityHistory
          rows={actionRows}
        />
      );
    }

    if (page === "profile") {
      return <Profile />;
    }

    return null;
  }

  return (
    <div className="app">

      <aside className="sidebar">

        <div className="logo">
          IoT Monitor
        </div>

        <button
          className={
            page === "dashboard"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("dashboard")
          }
        >
          🏠 Dashboard
        </button>

        <button
          className={
            page === "sensor"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("sensor")
          }
        >
          📊 Data Sensor
        </button>

        <button
          className={
            page === "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("history")
          }
        >
          🕘 Activity History
        </button>

        <button
          className={
            page === "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("profile")
          }
        >
          👤 Profile
        </button>

      </aside>

      <main className="content">
        {renderPage()}
      </main>

    </div>
  );
}

export default App;