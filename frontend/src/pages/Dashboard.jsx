import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip
);

function Dashboard({
  sensor,
  sensorRows,
  online,
  devices,
  loading,
  controlDevice,
}) {

  const chartRows =
    [...sensorRows]
      .slice(0, 20)
      .reverse();

  const chartData = {
  labels: chartRows.map(
    (item) =>
      item.time?.split(" ")[1] || ""
  ),

  datasets: [
    {
      label: "Độ ẩm %",
      data: chartRows.map(
        (item) => item.humidity
      ),
      borderColor: "#22c55e",
      backgroundColor: "#22c55e",
      tension: 0.3,
    },

    {
      label: "Nhiệt độ °C",
      data: chartRows.map(
        (item) => item.temperature
      ),
      borderColor: "#ef4444",
      backgroundColor: "#ef4444",
      tension: 0.3,
    },

    {
      label: "Ánh sáng lux",
      data: chartRows.map(
        (item) => item.light
      ),
      borderColor: "#eab308",
      backgroundColor: "#eab308",
      tension: 0.3,
    },
  ],
};

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>Dashboard</h1>

          <p>
            Giám sát hệ thống IoT
          </p>
        </div>

        <div
          className={
            online
              ? "status online"
              : "status offline"
          }
        >
          ● ESP8266{" "}
          {online
            ? "Online"
            : "Offline"}
        </div>

      </div>

      <div className="sensor-grid">

        <SensorCard
          title="Nhiệt độ"
          value={sensor.temperature}
          unit="°C"
          icon="🌡️"
        />

        <SensorCard
          title="Độ ẩm"
          value={sensor.humidity}
          unit="%"
          icon="💧"
        />

        <SensorCard
          title="Ánh sáng"
          value={sensor.light}
          unit="lux"
          icon="☀️"
        />

      </div>

      <div className="dashboard-grid">

        <div className="panel">

          <h2>
            Sensor Monitor
          </h2>

          <div className="chart">

            <Line
              data={chartData}
            />

          </div>

        </div>

        <div className="panel">

          <h2>
            Device Control
          </h2>

          <Device
            name="Đèn"
            device="light"
            state={devices.light}
            loading={loading.light}
            online={online}
            onClick={
              controlDevice
            }
          />

          <Device
            name="Quạt"
            device="fan"
            state={devices.fan}
            loading={loading.fan}
            online={online}
            onClick={
              controlDevice
            }
          />

        </div>

      </div>

    </div>
  );
}

function SensorCard({
  title,
  value,
  unit,
  icon,
}) {
  return (
    <div className="sensor-card">

      <div className="sensor-icon">
        {icon}
      </div>

      <div>
        <p>{title}</p>

        <h2>
          {value ?? 0}

          <span>
            {unit}
          </span>
        </h2>
      </div>

    </div>
  );
}

function Device({
  name,
  device,
  state,
  loading,
  online,
  onClick,
}) {
  return (
    <div className="device">

      <div>
        <strong>
          {name}
        </strong>

        <small>
          {loading
            ? "Đang xử lý..."
            : state
            ? "Đang bật"
            : "Đang tắt"}
        </small>
      </div>

      <button
        className={
          state
            ? "device-button on"
            : "device-button"
        }
        disabled={
          loading ||
          !online
        }
        onClick={() =>
          onClick(device)
        }
      >
        {loading
          ? "⟳ Loading..."
          : state
          ? "ON"
          : "OFF"}
      </button>

    </div>
  );
}

export default Dashboard;