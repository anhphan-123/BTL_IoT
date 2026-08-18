import {
  useEffect,
  useState
} from "react";

const API =
  "http://localhost:3000";

function ActivityHistory({
  refreshKey
}) {

  const [rows, setRows] =
    useState([]);

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalRecords, setTotalRecords] =
    useState(0);


  const [filters, setFilters] =
    useState({
      id: "",
      device: "",
      action: "",
      status: "",
      time: ""
    });


  const [applied, setApplied] =
    useState({
      id: "",
      device: "",
      action: "",
      status: "",
      time: ""
    });


  const [sortBy, setSortBy] =
    useState("id");

  const [sortOrder, setSortOrder] =
    useState("DESC");


  useEffect(() => {
    loadData();
  }, [
    page,
    applied,
    sortBy,
    sortOrder,
    refreshKey
  ]);


  async function loadData() {

    const params =
      new URLSearchParams({
        page,
        ...applied,
        sortBy,
        sortOrder
      });

    try {

      const response =
        await fetch(
          `${API}/api/actions?${params}`
        );

      const data =
        await response.json();

      setRows(
        data.rows || []
      );

      setTotalPages(
        data.totalPages || 1
      );

      setTotalRecords(
        data.totalRecords || 0
      );

    }
    catch (error) {

      console.error(
        "Load history error:",
        error
      );

    }
  }


  function updateFilter(
    key,
    value
  ) {

    setFilters((old) => ({
      ...old,
      [key]: value
    }));

  }


  function search(e) {

    e.preventDefault();

    setPage(1);

    setApplied({
      ...filters
    });
  }


  function reset() {

    const empty = {
      id: "",
      device: "",
      action: "",
      status: "",
      time: ""
    };

    setFilters(empty);

    setApplied(empty);

    setPage(1);
  }


  function changeSort(column) {

    if (sortBy === column) {

      setSortOrder(
        sortOrder === "ASC"
          ? "DESC"
          : "ASC"
      );

    }
    else {

      setSortBy(column);

      setSortOrder("ASC");

    }

  }


  function sortIcon(column) {

    if (column !== sortBy) {
      return "";
    }

    return sortOrder === "ASC"
      ? " ▲"
      : " ▼";
  }


  return (
    <div>

      <div className="page-header">

        <div>

          <h1>
            Activity History
          </h1>

          <p>
            Tổng số bản ghi:
            {" "}
            {totalRecords}
          </p>

        </div>

      </div>


      <div className="panel">

        <form
          className="history-filter"
          onSubmit={search}
        >

          <input
            placeholder="ID"
            value={filters.id}
            onChange={(e) =>
              updateFilter(
                "id",
                e.target.value
              )
            }
          />


          <select
            value={filters.device}
            onChange={(e) =>
              updateFilter(
                "device",
                e.target.value
              )
            }
          >

            <option value="">
              Tất cả thiết bị
            </option>

            <option value="light">
              Đèn
            </option>

            <option value="fan">
              Quạt
            </option>

          </select>


          <select
            value={filters.action}
            onChange={(e) =>
              updateFilter(
                "action",
                e.target.value
              )
            }
          >

            <option value="">
              Tất cả action
            </option>

            <option value="ON">
              ON
            </option>

            <option value="OFF">
              OFF
            </option>

          </select>


          <select
            value={filters.status}
            onChange={(e) =>
              updateFilter(
                "status",
                e.target.value
              )
            }
          >

            <option value="">
              Tất cả status
            </option>

            <option value="PENDING">
              PENDING
            </option>

            <option value="SUCCESS">
              SUCCESS
            </option>

            <option value="FAILED">
              FAILED
            </option>

          </select>


          <input
            type="text"
            placeholder="Time: 15:03:16"
            value={filters.time}
            onChange={(e) =>
              updateFilter(
                "time",
                e.target.value
              )
            }
          />


          <button type="submit">
            Tìm kiếm
          </button>


          <button
            type="button"
            onClick={reset}
          >
            Reset
          </button>

        </form>

      </div>


      <div className="panel">

        <table>

          <thead>

            <tr>

              <th
                onClick={() =>
                  changeSort("id")
                }
              >
                ID
                {sortIcon("id")}
              </th>

              <th
                onClick={() =>
                  changeSort(
                    "device"
                  )
                }
              >
                Device
                {sortIcon(
                  "device"
                )}
              </th>

              <th
                onClick={() =>
                  changeSort(
                    "action"
                  )
                }
              >
                Action
                {sortIcon(
                  "action"
                )}
              </th>

              <th
                onClick={() =>
                  changeSort(
                    "status"
                  )
                }
              >
                Status
                {sortIcon(
                  "status"
                )}
              </th>

              <th
                onClick={() =>
                  changeSort(
                    "time"
                  )
                }
              >
                Time
                {sortIcon(
                  "time"
                )}
              </th>

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


        <div className="pagination">

          <button
            disabled={page <= 1}
            onClick={() =>
              setPage(
                page - 1
              )
            }
          >
            ← Previous
          </button>


          <span>
            Page {page}
            {" / "}
            {totalPages}
          </span>


          <button
            disabled={
              page >= totalPages
            }
            onClick={() =>
              setPage(
                page + 1
              )
            }
          >
            Next →
          </button>

        </div>

      </div>

    </div>
  );
}

export default ActivityHistory;