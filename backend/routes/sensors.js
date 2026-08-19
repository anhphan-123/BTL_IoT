const express = require("express");

const router = express.Router();

const {
  get,
  all
} = require("../database");


// =========================================
// GET /api/sensors
// =========================================

router.get("/", async (req, res) => {
  try {

    // ==============================
    // PAGINATION
    // ==============================

    const page =
      Math.max(
        parseInt(req.query.page) || 1,
        1
      );

    const limit = 15;

    const offset =
      (page - 1) * limit;


    // ==============================
    // SEARCH
    // ==============================

    const searchBy =
      req.query.searchBy || "";

    const keyword =
      String(
        req.query.keyword || ""
      ).trim();


    // ==============================
    // SORT
    // ==============================

    const allowedSort = {
      id: "id",
      temperature: "temperature",
      humidity: "humidity",
      light: "light",
      time: "time"
    };

    const sortBy =
      allowedSort[req.query.sortBy]
      || "id";

    const sortOrder =
      String(
        req.query.sortOrder || "DESC"
      ).toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";


    // ==============================
    // WHERE
    // ==============================

    let where = "WHERE 1 = 1";

    const params = [];


    if (keyword !== "") {

      if (searchBy === "id") {

        where +=
          " AND CAST(id AS TEXT) = ?";

        params.push(keyword);

      }

      else if (
        searchBy === "temperature"
      ) {

        where +=
          " AND CAST(temperature AS TEXT) LIKE ?";

        params.push(
          `%${keyword}%`
        );

      }

      else if (
        searchBy === "humidity"
      ) {

        where +=
          " AND CAST(humidity AS TEXT) LIKE ?";

        params.push(
          `%${keyword}%`
        );

      }

      else if (
        searchBy === "light"
      ) {

        where +=
          " AND CAST(light AS TEXT) LIKE ?";

        params.push(
          `%${keyword}%`
        );

      }

      else if (
        searchBy === "time"
      ) {

        // Có thể nhập:
        // 2026-08-19
        // 15:03:16
        // 2026-08-19 15:03:16

        where +=
          " AND time LIKE ?";

        params.push(
          `%${keyword}%`
        );

      }

    }


    // ==============================
    // QUERY DATA
    // ==============================

    const rows =
      await all(
        `
        SELECT
          id,
          temperature,
          humidity,
          light,
          time
        FROM sensor_data
        ${where}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ?
        OFFSET ?
        `,
        [
          ...params,
          limit,
          offset
        ]
      );


    // ==============================
    // COUNT
    // ==============================

    const count =
      await get(
        `
        SELECT COUNT(*) AS total
        FROM sensor_data
        ${where}
        `,
        params
      );


    res.json({
      rows,

      page,

      limit,

      totalRecords:
        count.total,

      totalPages:
        Math.max(
          Math.ceil(
            count.total / limit
          ),
          1
        )
    });

  }
  catch (err) {

    console.error(
      "Sensor API error:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }
});


// =========================================
// LATEST
// =========================================

router.get(
  "/latest",
  async (req, res) => {

    try {

      const row =
        await get(`
          SELECT *
          FROM sensor_data
          ORDER BY id DESC
          LIMIT 1
        `);

      res.json(
        row || null
      );

    }
    catch (err) {

      res.status(500).json({
        error: err.message
      });

    }

  }
);


module.exports = router;