const express = require("express");

const router = express.Router();

const { get, all } = require("../database");

const PAGE_SIZES = [5, 10, 20, 50];

function parsePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseLimit(value, fallback = 10) {
  const limit = Number.parseInt(value, 10);
  return PAGE_SIZES.includes(limit) ? limit : fallback;
}

function normalizeTimeSearch(value) {
  const search = String(value || "").trim();
  const match = search.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/);

  if (!match) {
    return search;
  }

  const [, day, month, year, rest] = match;
  return `${year}-${month}-${day}${rest}`;
}

function getPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

// GET /api/sensors?page=1&limit=10&search=03/10/2026&sensor=temperature
router.get("/", async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    // `keyword/searchBy` remains supported for existing callers.
    const legacySearch =
      req.query.searchBy === "time" ? req.query.keyword : "";
    const search = String(req.query.search ?? legacySearch ?? "").trim();
    const sensor = String(req.query.sensor || "").toLowerCase();

    const allowedSensors = new Set(["", "temperature", "humidity", "light"]);
    const selectedSensor = allowedSensors.has(sensor) ? sensor : "";

    let where = "WHERE 1 = 1";
    const params = [];

    // Every sensor row contains the three measurements. Keeping this explicit
    // makes the sensor filter part of the SQL contract and remains compatible
    // with future rows where a measurement may be NULL.
    if (selectedSensor) {
      where += ` AND ${selectedSensor} IS NOT NULL`;
    }

    if (search) {
      where += " AND time LIKE ?";
      params.push(`%${normalizeTimeSearch(search)}%`);
    }

    const allowedSort = {
      id: "id",
      temperature: "temperature",
      humidity: "humidity",
      light: "light",
      time: "time",
    };
    const sortBy = allowedSort[req.query.sortBy] || "id";
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
    console.error("Sensor API error:", err);
    res.status(500).json({ error: err.message });
  }
});

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
