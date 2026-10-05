import { useEffect, useMemo, useState } from "react";
import { API, fetchWithAuth } from "../services/auth";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  formatTableTime,
  getPageNumbers,
  normalizePageSize,
} from "../utils/table";

function DataSensor({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeSelection, setPageSizeSelection] = useState(
    String(DEFAULT_PAGE_SIZE)
  );
  const [customLimit, setCustomLimit] = useState("");
  const [customLimitError, setCustomLimitError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [timeSearch, setTimeSearch] = useState("");
  const [sensorType, setSensorType] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    timeSearch: "",
    sensorType: "",
  });
  const [sortBy, setSortBy] = useState("time");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          search: appliedFilters.search,
          time: appliedFilters.timeSearch,
          sensor_type: appliedFilters.sensorType,
          sortBy,
          sortOrder,
        });
        const response = await fetchWithAuth(`${API}/api/sensors?${params}`);
        const data = await response.json();

        if (cancelled) return;

        setRows(data.rows || data.data || []);
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
        setTotalRecords(data.pagination?.total ?? data.totalRecords ?? 0);
      } catch (error) {
        console.error("Load sensor error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [page, limit, appliedFilters, sortBy, sortOrder, refreshKey]);

  const pageNumbers = useMemo(
    () => getPageNumbers(page, totalPages),
    [page, totalPages]
  );

  function submitSearch(event) {
    event.preventDefault();
    applySearch();
  }

  function applySearch() {
    let nextLimit = limit;

    if (pageSizeSelection === "custom") {
      nextLimit = normalizePageSize(customLimit, null);
      if (nextLimit === null) {
        setCustomLimitError("Enter a number from 1 to 100.");
        return;
      }

      setLimit(nextLimit);
      setCustomLimitError("");
    }

    setPage(1);
    setAppliedFilters({
      search: search.trim(),
      timeSearch: timeSearch.trim(),
      sensorType,
    });
  }

  function changePageSize(event) {
    const value = event.target.value;
    setPageSizeSelection(value);
    setCustomLimitError("");

    if (value === "custom") {
      setCustomLimit(String(limit));
      return;
    }

    setCustomLimit("");
    const nextLimit = normalizePageSize(value, null);
    if (nextLimit !== null) {
      setLimit(nextLimit);
      setPage(1);
    }
  }

  function resetFilters() {
    setSearch("");
    setTimeSearch("");
    setSensorType("");
    setLimit(DEFAULT_PAGE_SIZE);
    setPageSizeSelection(String(DEFAULT_PAGE_SIZE));
    setCustomLimit("");
    setCustomLimitError("");
    setAppliedFilters({ search: "", timeSearch: "", sensorType: "" });
    setPage(1);
  }

  function changeSort(column) {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
  }

  function sortIcon(column) {
    return sortBy === column ? (sortOrder === "ASC" ? " ▲" : " ▼") : "";
  }

  const firstRecord = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const lastRecord = Math.min(page * limit, totalRecords);

  return (
    <div className="data-sensor-page">
      <div className="page-header">
        <div>
          <h1>Data Sensor</h1>
          <p>Sensor records from database</p>
        </div>
      </div>

      <div className="panel search-panel">
        <form className="search-form" onSubmit={submitSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo ID, mã cảm biến hoặc giá trị..."
            aria-label="Tìm theo ID, mã cảm biến hoặc giá trị"
          />

          <select
            value={sensorType}
            onChange={(event) => setSensorType(event.target.value)}
            aria-label="Filter sensor type"
          >
            <option value="">All Sensors</option>
            <option value="temperature">Temperature</option>
            <option value="humidity">Humidity</option>
            <option value="light">Light</option>
          </select>

          <input
            className="time-filter"
            type="text"
            value={timeSearch}
            onChange={(event) => setTimeSearch(event.target.value)}
            placeholder="Tìm theo thời gian, VD: 05/10/2026 21:23:00"
            aria-label="Tìm theo thời gian"
          />

          <label className="page-size-control">
            Show
            <select
              value={pageSizeSelection}
              onChange={changePageSize}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
              <option value="custom">Custom...</option>
            </select>
            {pageSizeSelection === "custom" && (
              <input
                className="custom-page-size"
                type="number"
                min={MIN_PAGE_SIZE}
                max={MAX_PAGE_SIZE}
                step="1"
                value={customLimit}
                onChange={(event) => {
                  setCustomLimit(event.target.value);
                  setCustomLimitError("");
                }}
                aria-label="Custom rows per page"
              />
            )}
            rows
          </label>
          {customLimitError && (
            <span className="page-size-error">{customLimitError}</span>
          )}

          <button type="submit">Search</button>
          <button type="button" className="secondary-button" onClick={resetFilters}>
            Reset
          </button>
        </form>
      </div>

      <div className="panel table-panel">
        <div className="table-scroll">
          <table className="sensor-data-table">
            <thead>
              <tr>
                <th onClick={() => changeSort("id")}>ID{sortIcon("id")}</th>
                <th onClick={() => changeSort("sensor_code")}>SENSOR CODE{sortIcon("sensor_code")}</th>
                <th onClick={() => changeSort("sensor_name")}>SENSOR NAME{sortIcon("sensor_name")}</th>
                <th onClick={() => changeSort("value")}>VALUE{sortIcon("value")}</th>
                <th>UNIT</th>
                <th onClick={() => changeSort("time")}>RECORDED TIME{sortIcon("time")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">Loading data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No matching records.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="sensor-id">{row.id}</td>
                    <td>{row.sensor_code}</td>
                    <td>{row.sensor_name || "-"}</td>
                    <td className="sensor-value">{row.value}</td>
                    <td>{row.unit || "-"}</td>
                    <td>{formatTableTime(row.time)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="record-summary">
            Showing {firstRecord} - {lastRecord} of {totalRecords} records
          </span>
          <div className="pagination" aria-label="Sensor pagination">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </button>
            {pageNumbers.map((value) =>
              typeof value === "string" ? (
                <span className="pagination-ellipsis" key={value}>…</span>
              ) : (
                <button
                  className={value === page ? "current" : ""}
                  key={value}
                  onClick={() => setPage(value)}
                >
                  {value}
                </button>
              )
            )}
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataSensor;
