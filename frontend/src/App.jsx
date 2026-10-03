import { useEffect, useState } from "react";
import "./App.css";

import socket from "./services/socket";

import Dashboard from "./pages/Dashboard";
import DataSensor from "./pages/DataSensor";
import ActivityHistory from "./pages/ActivityHistory";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import {
  API,
  clearAuth,
  fetchWithAuth,
  getStoredUser,
  getToken,
  saveAuth,
} from "./services/auth";

function App() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  // =====================================================
  // PAGE
  // =====================================================

  const [page, setPage] =
    useState("dashboard");

  // =====================================================
  // SENSOR HIỆN TẠI
  // =====================================================

  const [sensor, setSensor] =
    useState({
      temperature: 0,
      humidity: 0,
      light: 0,
    });

  // Dùng cho chart Dashboard
  const [sensorRows, setSensorRows] =
    useState([]);

  // Mỗi khi có sensor mới
  // DataSensor sẽ tự query DB lại
  const [
    sensorRefreshKey,
    setSensorRefreshKey,
  ] = useState(0);

  // =====================================================
  // ESP STATUS
  // =====================================================

  const [online, setOnline] =
    useState(false);

  // =====================================================
  // DEVICE STATES
  // CHỈ CÒN ĐÈN + QUẠT
  // =====================================================

  const [devices, setDevices] =
    useState({
      light: false,
      fan: false,
    });

  // =====================================================
  // LOADING DEVICE
  // =====================================================

  const [loading, setLoading] =
    useState({
      light: false,
      fan: false,
    });

  // =====================================================
  // ACTIVITY HISTORY REFRESH
  // =====================================================

  const [
    actionRefreshKey,
    setActionRefreshKey,
  ] = useState(0);

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setAuthStatus("unauthenticated");
      return undefined;
    }

    let cancelled = false;

    fetchWithAuth(`${API}/api/auth/me`)
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Phiên đăng nhập không hợp lệ");
        }

        if (!cancelled) {
          setCurrentUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          setAuthStatus("authenticated");
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuth();
          setCurrentUser(null);
          setAuthStatus("unauthenticated");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // LOAD DỮ LIỆU BAN ĐẦU
  // =====================================================

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadInitialData();
    }
  }, [authStatus]);

  async function handleLogin(credentials) {
    const response = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Đăng nhập thất bại");
    }

    saveAuth(data.token, data.user);
    setCurrentUser(data.user);
    setPage("dashboard");
    setAuthStatus("authenticated");
    window.history.replaceState({}, "", "/");
  }

  function handleLogout() {
    clearAuth();
    setCurrentUser(null);
    setAuthStatus("unauthenticated");
    setPage("dashboard");
    socket.disconnect();
    window.history.replaceState({}, "", "/login");
  }

  async function loadInitialData() {
    try {
      // =========================
      // SENSOR MỚI NHẤT
      // =========================

      const latestResponse =
        await fetchWithAuth(
          `${API}/api/sensors/latest`
        );

      const latest =
        await latestResponse.json();

      if (latest) {
        setSensor(latest);
      }

      // =========================
      // 50 SENSOR CHO CHART
      // =========================

      const sensorResponse =
        await fetchWithAuth(
          `${API}/api/sensors?page=1&limit=50`
        );

      const sensorData =
        await sensorResponse.json();

      setSensorRows(
        sensorData.rows || []
      );

      // =========================
      // ESP ONLINE / OFFLINE
      // =========================

      const statusResponse =
        await fetchWithAuth(
          `${API}/api/system/status`
        );

      const statusData =
        await statusResponse.json();

      setOnline(
        statusData.isOnline
      );

      // =========================
      // DEVICE STATES
      // =========================

      const deviceResponse =
        await fetchWithAuth(
          `${API}/api/devices/states`
        );

      const deviceData =
        await deviceResponse.json();

      setDevices({
        light:
          deviceData.light || false,

        fan:
          deviceData.fan || false,
      });

    } catch (error) {
      console.error(
        "Load initial error:",
        error
      );
    }
  }

  // =====================================================
  // SOCKET.IO
  //
  // CHỈ ĐĂNG KÝ SOCKET 1 LẦN Ở APP
  // KHÔNG TẠO SOCKET RIÊNG TRONG CÁC PAGE
  // =====================================================

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return undefined;
    }

    socket.auth = {
      token: getToken(),
    };
    socket.connect();

    // =========================
    // SOCKET CONNECT
    // =========================

    function handleConnect() {
      console.log(
        "Socket connected:",
        socket.id
      );
    }

    // =========================
    // SOCKET DISCONNECT
    // =========================

    function handleDisconnect() {
      console.log(
        "Socket disconnected"
      );
    }

    // =========================
    // SENSOR REALTIME
    // =========================

    function handleSensor(data) {
      console.log(
        "Realtime sensor:",
        data
      );

      // Sensor hiện tại
      setSensor(data);

      // Cập nhật chart Dashboard
      setSensorRows((old) => {
        const updated = [
          data,

          ...old.filter(
            (item) =>
              item.id !== data.id
          ),
        ];

        // Dashboard chỉ cần
        // tối đa 50 bản ghi
        return updated.slice(
          0,
          50
        );
      });

      // Báo cho DataSensor:
      // DB vừa có record mới
      setSensorRefreshKey(
        (old) => old + 1
      );
    }

    // =========================
    // ESP ONLINE / OFFLINE
    // =========================

    function handleStatus(data) {
      console.log(
        "ESP status:",
        data.isOnline
      );

      setOnline(
        data.isOnline
      );
    }

    // =========================
    // DEVICE STATE
    // =========================

    function handleDeviceStates(
      data
    ) {
      console.log(
        "Device states:",
        data
      );

      setDevices({
        light:
          data.light || false,

        fan:
          data.fan || false,
      });
    }

    // =========================
    // DEVICE RESPONSE
    // SUCCESS / FAILED
    // =========================

    function handleDeviceResponse(
      data
    ) {
      console.log(
        "Device response:",
        data
      );

      // =================================
      // SUCCESS HOẶC FAILED
      // ĐỀU PHẢI TẮT LOADING
      // =================================

      setLoading((old) => ({
        ...old,

        [data.device]:
          false,
      }));

      // =================================
      // SUCCESS
      // MỚI ĐƯỢC ĐỔI TRẠNG THÁI
      // =================================

      if (
        data.status ===
        "SUCCESS"
      ) {
        setDevices((old) => ({
          ...old,

          [data.device]:
            data.action === "ON",
        }));
      }

      // =================================
      // FAILED
      // GIỮ NGUYÊN TRẠNG THÁI CŨ
      // =================================

      if (
        data.status ===
        "FAILED"
      ) {
        console.log(
          `${data.device} điều khiển thất bại`
        );
      }

      // =================================
      // REFRESH ACTIVITY HISTORY
      // =================================

      setActionRefreshKey(
        (old) => old + 1
      );
    }

    // =================================================
    // REGISTER EVENTS
    // =================================================

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

    // Socket có thể đã connect
    // trước khi useEffect chạy
    if (socket.connected) {
      console.log(
        "Socket already connected:",
        socket.id
      );
    }

    // =================================================
    // CLEANUP
    // =================================================

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
      socket.disconnect();
    };
  }, [authStatus]);

  // =====================================================
  // DEVICE CONTROL
  // =====================================================

  async function controlDevice(
    device
  ) {
    // =========================
    // ESP OFFLINE
    // =========================

    if (!online) {
      alert(
        "ESP8266 đang Offline"
      );

      return;
    }

    // =========================
    // ĐANG LOADING
    // KHÔNG CHO CLICK LẦN 2
    // =========================

    if (loading[device]) {
      return;
    }

    // =========================
    // XÁC ĐỊNH ACTION
    // =========================

    const action =
      devices[device]
        ? "OFF"
        : "ON";

    // =========================
    // HIỆN LOADING NGAY
    // =========================

    setLoading((old) => ({
      ...old,

      [device]: true,
    }));

    try {
      // =========================
      // GỬI API
      // =========================

      const response =
        await fetchWithAuth(
          `${API}/api/devices/${device}/control`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action,
              }),
          }
        );

      const result =
        await response.json();

      // =========================
      // BACKEND TỪ CHỐI
      // =========================

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

      // =========================
      // BACKEND ĐÃ TẠO PENDING
      // =========================

      console.log(
        "Backend PENDING:",
        result
      );

      // Activity History
      // phải hiện PENDING ngay
      setActionRefreshKey(
        (old) => old + 1
      );

      // KHÔNG TẮT LOADING Ở ĐÂY
      //
      // Chờ:
      //
      // ESP khoảng 2 giây
      //      ↓
      // SUCCESS
      //
      // hoặc
      //
      // Backend timeout khoảng 5 giây
      //      ↓
      // FAILED

    } catch (error) {
      console.error(
        "Control error:",
        error
      );

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
  // RENDER PAGE
  // =====================================================

  function renderPage() {
    // =========================
    // DASHBOARD
    // =========================

    if (
      page === "dashboard"
    ) {
      return (
        <Dashboard
          sensor={sensor}
          sensorRows={sensorRows}
          online={online}
          devices={devices}
          loading={loading}
          controlDevice={
            controlDevice
          }
        />
      );
    }

    // =========================
    // DATA SENSOR
    // =========================

    if (
      page === "sensor"
    ) {
      return (
        <DataSensor
          refreshKey={
            sensorRefreshKey
          }
        />
      );
    }

    // =========================
    // ACTIVITY HISTORY
    // =========================

    if (
      page === "history"
    ) {
      return (
        <ActivityHistory
          refreshKey={
            actionRefreshKey
          }
        />
      );
    }

    // =========================
    // PROFILE
    // =========================

    if (
      page === "profile"
    ) {
      return <Profile />;
    }

    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  if (authStatus === "checking") {
    return <main className="auth-loading">Đang kiểm tra phiên đăng nhập...</main>;
  }

  if (authStatus !== "authenticated") {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside className="sidebar">

        <div className="logo">
          IoT Monitor
        </div>

        <div className="sidebar-user">
          Logged in as <strong>{currentUser?.username}</strong>
        </div>

        {/* DASHBOARD */}

        <button
          className={
            page ===
            "dashboard"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage(
              "dashboard"
            )
          }
        >
          🏠 Dashboard
        </button>

        {/* DATA SENSOR */}

        <button
          className={
            page ===
            "sensor"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage(
              "sensor"
            )
          }
        >
          📊 Data Sensor
        </button>

        {/* ACTIVITY HISTORY */}

        <button
          className={
            page ===
            "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage(
              "history"
            )
          }
        >
          🕘 Activity History
        </button>

        {/* PROFILE */}

        <button
          className={
            page ===
            "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage(
              "profile"
            )
          }
        >
          👤 Profile
        </button>

        <button className="logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>

      </aside>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="content">
        {renderPage()}
      </main>

    </div>
  );
}

export default App;
