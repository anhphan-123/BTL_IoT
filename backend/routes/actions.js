const express = require("express");

const router = express.Router();

const { get, all } = require("../database");

const { parsePage, parseLimit, getPagination } = require("../utils/pagination");

function normalizeTimeSearch(value) {
  const search = String(value || "").trim();
  const match = search.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/);

  if (!match) {
    return search;
  }

  const [, day, month, year, rest] = match;
  return `${year}-${month}-${day}${rest}`;
}

router.get("/", async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const id = String(req.query.id || "").trim();
    const device = String(req.query.device || "").trim();
    const deviceCode = device.toUpperCase();
    const deviceType = device.toLowerCase();
    const deviceId = Number.parseInt(req.query.device_id, 10);
    const action = String(req.query.action || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const legacyTimeSearch =
      req.query.searchBy === "time" ? req.query.keyword : "";
    const search = String(req.query.search || "").trim();
    const timeSearch = normalizeTimeSearch(req.query.time || legacyTimeSearch);

    const deviceCodeExpression = "COALESCE(d.device_code, ah.device)";
    const deviceNameExpression = "d.device_name";
    const deviceSearchNameExpression = "COALESCE(d.device_name, ah.device)";
    let where = "WHERE 1 = 1";
    const params = [];

    if (id) {
      where += " AND CAST(ah.id AS TEXT) = ?";
      params.push(id);
    }

    if (device) {
      where += `
        AND (
          ${deviceCodeExpression} = ?
          OR d.device_type = ?
          OR (d.id IS NULL AND ah.device = ?)
        )
      `;
      params.push(deviceCode, deviceType, deviceType);
    }

    if (Number.isInteger(deviceId) && deviceId > 0) {
      where += " AND ah.device_id = ?";
      params.push(deviceId);
    }

    if (["ON", "OFF"].includes(action)) {
      where += " AND ah.action = ?";
      params.push(action);
    }

    if (["PENDING", "SUCCESS", "FAILED"].includes(status)) {
      where += " AND ah.status = ?";
      params.push(status);
    }

    if (search) {
      const normalizedSearch = normalizeTimeSearch(search);
      where += `
        AND (
          CAST(ah.id AS TEXT) LIKE ?
          OR ${deviceCodeExpression} LIKE ?
          OR ${deviceSearchNameExpression} LIKE ?
          OR ah."user" LIKE ?
        )
      `;
      const searchPattern = `%${normalizedSearch}%`;
      params.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    if (timeSearch) {
      where += " AND ah.time LIKE ?";
      params.push(`%${timeSearch}%`);
    }

    const allowedSort = {
      id: "ah.id",
      request_id: "ah.request_id",
      device: deviceCodeExpression,
      device_code: deviceCodeExpression,
      device_name: deviceNameExpression,
      action: "ah.action",
      status: "ah.status",
      user: 'ah."user"',
      time: "ah.time",
    };
    const sortBy = allowedSort[req.query.sortBy] || "ah.id";
    const sortOrder =
      String(req.query.sortOrder || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const fromClause = `
      FROM action_history ah
      LEFT JOIN devices d
        ON d.id = ah.device_id
        OR (
          ah.device_id IS NULL
          AND (d.device_code = ah.device OR d.device_type = ah.device)
        )
    `;

    const rows = await all(
      `
        SELECT
          ah.id,
          ah.request_id,
          ah.device_id,
          ${deviceCodeExpression} AS device_code,
          ${deviceNameExpression} AS device_name,
          d.device_type,
          ah.action,
          ah.status,
          ah."user" AS user,
          ah.time
        ${fromClause}
        ${where}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const count = await get(
      `SELECT COUNT(*) AS total ${fromClause} ${where}`,
      params
    );
    const pagination = getPagination(page, limit, count.total);

    res.json({
      rows,
      ...pagination,
      totalRecords: count.total,
      pagination,
    });
  } catch (err) {
    console.error("Actions API error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
