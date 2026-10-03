import { useEffect, useMemo, useState } from "react";
import { API, fetchWithAuth } from "../services/auth";

const PAGE_SIZES = [5, 10, 20, 50];

function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const ordered = [...pages]
    .filter((value) => value > 0 && value <= totalPages)
    .sort((a, b) => a - b);
  const result = [];

  ordered.forEach((value, index) => {
    if (index > 0 && value - ordered[index - 1] > 1) {
      result.push(`ellipsis-${value}`);
    }
    result.push(value);
  });

  return result;
}

function ActivityHistory({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [device, setDevice] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("id");
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
          search: appliedSearch,
          device,
          action,
          status,
          sortBy,
          sortOrder,
        });
        const response = await fetchWithAuth(`${API}/api/actions?${params}`);
        const data = await response.json();

        if (cancelled) return;

        setRows(data.rows || []);
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
        setTotalRecords(data.pagination?.total ?? data.totalRecords ?? 0);
      } catch (error) {
        console.error("Load history error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [page, limit, appliedSearch, device, action, status, sortBy, sortOrder, refreshKey]);

  const pageNumbers = useMemo(
    () => getPageNumbers(page, totalPages),
    [page, totalPages]
  );

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  function resetFilters() {
    setSearch("");
    setAppliedSearch("");
    setDevice("");
    setAction("");
    setStatus("");
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
    <div>
      <div className="page-header">
        <div>
          <h1>Activity History</h1>
          <p>Lịch sử điều khiển Light và Fan</p>
        </div>
      </div>

      <div className="panel search-panel">
        <form className="history-filter" onSubmit={submitSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm thời gian: 03/10/2026 09:20"
            aria-label="Tìm lịch sử theo thời gian"
          />

          <select value={device} onChange={(event) => { setDevice(event.target.value); setPage(1); }}>
            <option value="">All Devices</option>
            <option value="light">Light</option>
            <option value="fan">Fan</option>
          </select>

          <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
          </select>

          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="PENDING">PENDING</option>
          </select>

          <label className="page-size-control">
            Show
            <select
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
              aria-label="Số dòng mỗi trang"
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>

          <button type="submit">Search</button>
          <button type="button" className="secondary-button" onClick={resetFilters}>Reset</button>
        </form>
      </div>

      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th onClick={() => changeSort("id")}>STT{sortIcon("id")}</th>
                <th onClick={() => changeSort("device")}>Device{sortIcon("device")}</th>
                <th onClick={() => changeSort("action")}>Action{sortIcon("action")}</th>
                <th onClick={() => changeSort("status")}>Status{sortIcon("status")}</th>
                <th onClick={() => changeSort("user")}>User{sortIcon("user")}</th>
                <th onClick={() => changeSort("time")}>Time{sortIcon("time")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">Không có lịch sử phù hợp.</td></tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{(page - 1) * limit + index + 1}</td>
                    <td>{row.device === "light" ? "Light" : "Fan"}</td>
                    <td>{row.action}</td>
                    <td><span className={`history-status ${row.status}`}>{row.status}</span></td>
                    <td>{row.user || "-"}</td>
                    <td>{row.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="record-summary">
            Showing {firstRecord}-{lastRecord} of {totalRecords} records
          </span>
          <div className="pagination" aria-label="History pagination">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            {pageNumbers.map((value) =>
              typeof value === "string" ? (
                <span className="pagination-ellipsis" key={value}>…</span>
              ) : (
                <button className={value === page ? "current" : ""} key={value} onClick={() => setPage(value)}>
                  {value}
                </button>
              )
            )}
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityHistory;
