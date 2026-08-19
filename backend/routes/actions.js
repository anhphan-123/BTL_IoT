const express =
  require("express");

const router =
  express.Router();

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
          parseInt(
            req.query.page
          ) || 1,
          1
        );

      const limit = 20;

      const offset =
        (page - 1) * limit;


      // ===========================
      // FILTER
      // ===========================

      const id =
        String(
          req.query.id || ""
        ).trim();

      const device =
        String(
          req.query.device || ""
        ).trim();

      const action =
        String(
          req.query.action || ""
        ).trim();

      const status =
        String(
          req.query.status || ""
        ).trim();

      const time =
        String(
          req.query.time || ""
        ).trim();


      let where =
        "WHERE 1 = 1";

      const params = [];


      if (id) {

        where +=
          " AND CAST(id AS TEXT) = ?";

        params.push(id);

      }


      if (device) {

        where +=
          " AND device = ?";

        params.push(device);

      }


      if (action) {

        where +=
          " AND action = ?";

        params.push(action);

      }


      if (status) {

        where +=
          " AND status = ?";

        params.push(status);

      }


      if (time) {

        where +=
          " AND time LIKE ?";

        params.push(
          `%${time}%`
        );

      }


      // ===========================
      // SORT
      // ===========================

      const allowedSort = {
        id: "id",
        device: "device",
        action: "action",
        status: "status",
        time: "time"
      };

      const sortBy =
        allowedSort[
          req.query.sortBy
        ] || "id";

      const sortOrder =
        String(
          req.query.sortOrder
          || "DESC"
        ).toUpperCase() === "ASC"
          ? "ASC"
          : "DESC";


      // ===========================
      // DATA
      // ===========================

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


      const count =
        await get(
          `
          SELECT
            COUNT(*) AS total
          FROM action_history
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
        "Actions API error:",
        err
      );

      res.status(500).json({
        error: err.message
      });

    }

  }
);


module.exports = router;