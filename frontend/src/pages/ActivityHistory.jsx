function ActivityHistory({
  rows,
}) {
  return (
    <div>

      <div className="page-header">

        <div>
          <h1>
            Activity History
          </h1>

          <p>
            Lịch sử điều khiển
          </p>
        </div>

      </div>

      <div className="panel">

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Device</th>
              <th>Action</th>
              <th>Status</th>
              <th>Time</th>
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
                    {row.device}
                  </td>

                  <td>
                    {row.action}
                  </td>

                  <td>
                    <span
                      className={
                        `history-status ${row.status}`
                      }
                    >
                      {row.status}
                    </span>
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

export default ActivityHistory;