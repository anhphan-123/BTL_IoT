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

function getLegacySensorSort(sortBy) {
  return {
    id: "id",
    temperature: "temperature",
    humidity: "humidity",
    light: "light",
    time: "time",
  }[sortBy] || "id";
}

// Dashboard compatibility endpoint. The realtime Dashboard still consumes
// the original wide shape while Data Sensor uses the normalized endpoint.
router.get("/summary", async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit, 50);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const params = [];
    let where = "WHERE 1 = 1";

    if (search) {
      where += " AND time LIKE ?";
      params.push(`%${normalizeTimeSearch(search)}%`);
    }

    const sortBy = getLegacySensorSort(req.query.sortBy);
    const sortOrder =
      String(req.query.sortOrder || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const rows = await all(
      `
        SELECT id, temperature, humidity, light, time
        FROM sensor_data
        ${where}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );
    const count = await get(
      `SELECT COUNT(*) AS total FROM sensor_data ${where}`,
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
    console.error("Sensor summary API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors?page=1&limit=10&search=19/08/2026&sensor=temperature
router.get("/", async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;
    const sensorType = String(
      req.query.sensor_type ?? req.query.sensor ?? ""
    ).trim().toLowerCase();
    const legacySearch =
      req.query.searchBy === "time" ? req.query.keyword : "";
    const search = String(req.query.search || "").trim();
    const timeSearch = normalizeTimeSearch(req.query.time || legacySearch);

    let where = "WHERE 1 = 1";
    const params = [];

    if (sensorType) {
      where += " AND s.sensor_type = ?";
      params.push(sensorType);
    }

    if (search) {
      const searchPattern = `%${normalizeTimeSearch(search)}%`;
      where += `
        AND (
          CAST(sr.id AS TEXT) LIKE ?
          OR s.sensor_code LIKE ?
          OR s.sensor_name LIKE ?
          OR CAST(sr.value AS TEXT) LIKE ?
        )
      `;
      params.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    if (timeSearch) {
      where += " AND sr.time LIKE ?";
      params.push(`%${timeSearch}%`);
    }

    const allowedSort = {
      id: "sr.id",
      sensor_code: "s.sensor_code",
      sensor_name: "s.sensor_name",
      value: "sr.value",
      time: "sr.time",
    };
    const sortBy = allowedSort[req.query.sortBy] || "sr.time";
    const sortOrder =
      String(req.query.sortOrder || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";
    const fromClause = `
      FROM sensor_readings sr
      JOIN sensors s ON s.id = sr.sensor_id
    `;

    const rows = await all(
      `
        SELECT
          sr.id,
          sr.sensor_id,
          s.sensor_code,
          s.sensor_name,
          s.sensor_type,
          sr.value,
          s.unit,
          sr.time
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
      data: rows,
      ...pagination,
      totalRecords: count.total,
      pagination,
    });
  } catch (err) {
    console.error("Sensor API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard's current cards still need the latest wide sensor snapshot.
router.get("/latest", async (req, res) => {
  try {
    const row = await get(`
      SELECT *
      FROM sensor_data
      ORDER BY id DESC
      LIMIT 1
    `);

    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
