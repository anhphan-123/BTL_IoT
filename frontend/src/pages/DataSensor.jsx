function DataSensor({ rows }) {
  return (
    <div>

      <div className="page-header">
        <div>
          <h1>
            Data Sensor
          </h1>

          <p>
            Dữ liệu cảm biến realtime
          </p>
        </div>
      </div>

      <div className="panel">

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Nhiệt độ</th>
              <th>Độ ẩm</th>
              <th>Ánh sáng</th>
              <th>Thời gian</th>
            </tr>
          </thead>

          <tbody>

            {rows.map(
              (row) => (
                <tr key={row.id}>

                  <td>
                    {row.id}
                  </td>

                  <td>
                    {row.temperature} °C
                  </td>

                  <td>
                    {row.humidity} %
                  </td>

                  <td>
                    {row.light} lux
                  </td>

                  <td>
                    {row.time}
                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default DataSensor;