const express = require("express");

const router = express.Router();

const {
  get,
  all
} = require("../database");


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
            parseInt(req.query.limit) || 20,
            1
          ),
          100
        );

      const offset =
        (page - 1) * limit;


      const rows =
        await all(
          `
          SELECT
            id,
            device,
            action,
            status,
            time

          FROM action_history

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
          FROM action_history
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