const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const utils = require("./utils");
const db = require("./db");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", function (req, res) {
  utils.formatDate({ date: new Date() }, function (err, formattedDate) {
    if (err) {
      res.status(500).json({ error: "Failed to format date" });
      return;
    }

    res.json({
      service: "test-project",
      status: "ok",
      now: formattedDate,
    });
  });
});

app.get("/users", function (req, res) {
  db.getUsers(function (err, users) {
    if (err) {
      res.status(500).json({ error: "Could not fetch users" });
      return;
    }

    utils.paginate(
      {
        items: users,
        page: req.query.page || 1,
        limit: req.query.limit || 10,
      },
      function (paginateErr, payload) {
        if (paginateErr) {
          res.status(500).json({ error: "Could not paginate users" });
          return;
        }

        res.json(payload);
      },
    );
  });
});

app.post("/users", function (req, res) {
  const body = req.body || {};

  utils.validateEmail({ email: body.email }, function (emailErr, isValid) {
    if (emailErr || !isValid) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }

    utils.generateId({ prefix: "usr" }, function (idErr, id) {
      if (idErr) {
        res.status(500).json({ error: "Failed to generate id" });
        return;
      }

      utils.hashPassword({ value: body.password || "" }, function (hashErr, hash) {
        if (hashErr) {
          res.status(500).json({ error: "Failed to hash password" });
          return;
        }

        const user = {
          id: id,
          name: body.name || "Unknown",
          email: body.email,
          passwordHash: hash,
        };

        db.createUser({ user: user }, function (createErr, created) {
          if (createErr) {
            res.status(500).json({ error: "Failed to create user" });
            return;
          }

          res.status(201).json(created);
        });
      });
    });
  });
});

app.listen(port, function () {
  console.log("Server listening on port " + port);
});
