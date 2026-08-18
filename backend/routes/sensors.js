const express = require("express");

const router = express.Router();

const {
  get,
  all
} = require("../database");


// =======================================
// SENSOR MỚI NHẤT
// =======================================

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

      res.json(row || null);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// =======================================
// DANH SÁCH SENSOR
// =======================================

router.get(
  "/",
  async (req, res) => {

    try {

      const page =
        Math.max(
          parseInt(req.query.page) || 1,
          1
        );

      const limit =
        Math.min(
          Math.max(
            parseInt(req.query.limit) || 50,
            1
          ),
          100
        );

      const offset =
        (page - 1) * limit;


      const rows =
        await all(
          `
          SELECT *
          FROM sensor_data

          ORDER BY id DESC

          LIMIT ?
          OFFSET ?
          `,
          [
            limit,
            offset
          ]
        );


      const count =
        await get(`
          SELECT COUNT(*) AS total
          FROM sensor_data
        `);


      res.json({

        rows,

        page,

        limit,

        totalRecords:
          count.total,

        totalPages:
          Math.ceil(
            count.total / limit
          )
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });
    }
  }
);


module.exports = router;