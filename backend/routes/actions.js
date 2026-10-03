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

router.get("/", async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const id = String(req.query.id || "").trim();
    const device = String(req.query.device || "").trim().toLowerCase();
    const action = String(req.query.action || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const search = String(req.query.search ?? req.query.time ?? "").trim();

    let where = "WHERE 1 = 1";
    const params = [];

    if (id) {
      where += " AND CAST(id AS TEXT) = ?";
      params.push(id);
    }

    if (["light", "fan"].includes(device)) {
      where += " AND device = ?";
      params.push(device);
    }

    if (["ON", "OFF"].includes(action)) {
      where += " AND action = ?";
      params.push(action);
    }

    if (["PENDING", "SUCCESS", "FAILED"].includes(status)) {
      where += " AND status = ?";
      params.push(status);
    }

    if (search) {
      where += " AND time LIKE ?";
      params.push(`%${normalizeTimeSearch(search)}%`);
    }

    const allowedSort = {
      id: "id",
      device: "device",
      action: "action",
      status: "status",
      user: '"user"',
      time: "time",
    };
    const sortBy = allowedSort[req.query.sortBy] || "id";
    const sortOrder =
      String(req.query.sortOrder || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const rows = await all(
      `
        SELECT
          id,
          device,
          action,
          status,
          "user" AS user,
          time
        FROM action_history
        ${where}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const count = await get(
      `SELECT COUNT(*) AS total FROM action_history ${where}`,
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
