import {
  useEffect,
  useState
} from "react";

const API =
  "http://localhost:3000";

function DataSensor({
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


  // =========================
  // SEARCH
  // =========================

  const [searchBy, setSearchBy] =
    useState("temperature");

  const [keyword, setKeyword] =
    useState("");

  const [searchKeyword, setSearchKeyword] =
    useState("");


  // =========================
  // SORT
  // =========================

  const [sortBy, setSortBy] =
    useState("id");

  const [sortOrder, setSortOrder] =
    useState("DESC");


  // =========================
  // LOAD
  // =========================

  useEffect(() => {
    loadData();
  }, [
    page,
    sortBy,
    sortOrder,
    searchBy,
    searchKeyword,
    refreshKey
  ]);


  async function loadData() {

    try {

      const params =
        new URLSearchParams({
          page,
          limit: 50,
          searchBy,
          keyword: searchKeyword,
          sortBy,
          sortOrder
        });

      const response =
        await fetch(
          `${API}/api/sensors?${params}`
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
        "Load sensor error:",
        error
      );

    }
  }


  function handleSearch(e) {

    e.preventDefault();

    setPage(1);

    setSearchKeyword(
      keyword.trim()
    );
  }


  function resetSearch() {

    setKeyword("");

    setSearchKeyword("");

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

    setPage(1);
  }


  function sortIcon(column) {

    if (sortBy !== column) {
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
          <h1>Data Sensor</h1>

          <p>
            Tổng số bản ghi:
            {" "}
            {totalRecords}
          </p>
        </div>

      </div>


      {/* =====================
          SEARCH
      ===================== */}

      <div className="panel search-panel">

        <form
          className="search-form"
          onSubmit={handleSearch}
        >

          <select
            value={searchBy}
            onChange={(e) => {
              setSearchBy(
                e.target.value
              );

              setKeyword("");
            }}
          >

            <option value="temperature">
              Nhiệt độ
            </option>

            <option value="humidity">
              Độ ẩm
            </option>

            <option value="light">
              Ánh sáng
            </option>

            <option value="time">
              Thời gian
            </option>

            <option value="id">
              ID
            </option>

          </select>


          {searchBy === "time" ? (

            <input
              type="text"
              value={keyword}
              onChange={(e) =>
                setKeyword(
                  e.target.value
                )
              }
              placeholder="VD: 15:03:16 hoặc 2026-08-19 15:03:16"
            />

          ) : (

            <input
              type="text"
              value={keyword}
              onChange={(e) =>
                setKeyword(
                  e.target.value
                )
              }
              placeholder="Nhập giá trị cần tìm..."
            />

          )}


          <button type="submit">
            Tìm kiếm
          </button>

          <button
            type="button"
            onClick={resetSearch}
          >
            Reset
          </button>

        </form>

      </div>


      {/* =====================
          TABLE
      ===================== */}

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
                    "temperature"
                  )
                }
              >
                Nhiệt độ
                {sortIcon(
                  "temperature"
                )}
              </th>

              <th
                onClick={() =>
                  changeSort(
                    "humidity"
                  )
                }
              >
                Độ ẩm
                {sortIcon(
                  "humidity"
                )}
              </th>

              <th
                onClick={() =>
                  changeSort("light")
                }
              >
                Ánh sáng
                {sortIcon("light")}
              </th>

              <th
                onClick={() =>
                  changeSort("time")
                }
              >
                Thời gian
                {sortIcon("time")}
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


        {/* PAGINATION */}

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

export default DataSensor;