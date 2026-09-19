const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 5000;

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());


// =========================
// HOME / BACKEND TEST
// =========================

app.get("/", (req, res) => {
  res.send("Smart Hostel Backend is Running!");
});
app.get("/test", (req, res) => {
    res.json({
        message: "Backend API is working"
    });
});

// =========================
// LOGIN
// =========================

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required"
    });
  }

  const sql = `
    SELECT id, name, username, role
    FROM users
    WHERE username = ? AND password = ?
  `;

  db.query(
    sql,
    [username, password],
    (err, result) => {

      if (err) {
        console.error("Login error:", err);

        return res.status(500).json({
          message: "Database error"
        });
      }

      if (result.length === 0) {
        return res.status(401).json({
          message: "Invalid username or password"
        });
      }

      res.json({
        message: "Login successful",
        user: result[0]
      });
    }
  );
});


// =========================
// ADMIN - GET STUDENTS
// =========================

app.get("/admin/students", (req, res) => {

  const sql = `
    SELECT id, name, username, role
    FROM users
    WHERE role = 'student'
    ORDER BY id
  `;

  db.query(
    sql,
    (err, result) => {

      if (err) {
        console.error(
          "Students error:",
          err
        );

        return res.status(500).json({
          message: "Cannot load students"
        });
      }

      res.json(result);
    }
  );
});


// =========================
// ADMIN - GET CLEANERS
// =========================

app.get("/admin/cleaners", (req, res) => {

  const sql = `
    SELECT id, name, username, role
    FROM users
    WHERE role = 'cleaner'
    ORDER BY id
  `;

  db.query(
    sql,
    (err, result) => {

      if (err) {
        console.error(
          "Cleaners error:",
          err
        );

        return res.status(500).json({
          message: "Cannot load cleaners"
        });
      }

      res.json(result);
    }
  );
});


// =========================
// GET ROOMS
// =========================

app.get("/rooms", (req, res) => {

  const sql = `
    SELECT
      id,
      room_number,
      floor
    FROM rooms
    ORDER BY id
  `;

  db.query(
    sql,
    (err, result) => {

      if (err) {
        console.error(
          "Rooms error:",
          err
        );

        return res.status(500).json({
          message: "Cannot load rooms"
        });
      }

      res.json(result);
    }
  );
});


// =========================
// ADD CLEANING
// =========================

app.post("/cleaning", (req, res) => {

  const {
    room_id,
    cleaner_id,
    cleaning_date,
    cleaning_time,
    cleaning_status
  } = req.body;

  if (
    !room_id ||
    !cleaner_id ||
    !cleaning_date ||
    !cleaning_time ||
    !cleaning_status
  ) {

    return res.status(400).json({
      message:
        "All cleaning fields are required"
    });
  }

  const sql = `
    INSERT INTO cleaning
    (
      room_id,
      cleaner_id,
      cleaning_date,
      cleaning_time,
      cleaning_status,
      student_confirmation,
      rector_verification
    )
    VALUES
    (
      ?,
      ?,
      ?,
      ?,
      ?,
      'Pending',
      'Pending'
    )
  `;

  db.query(
    sql,
    [
      room_id,
      cleaner_id,
      cleaning_date,
      cleaning_time,
      cleaning_status
    ],
    (err, result) => {

      if (err) {
        console.error(
          "Cleaning insert error:",
          err
        );

        return res.status(500).json({
          message:
            "Could not save cleaning record"
        });
      }

      res.json({
        message:
          "Cleaning submitted successfully!",
        id: result.insertId
      });
    }
  );
});


// =========================
// GET ALL CLEANING RECORDS
// =========================

app.get("/cleaning", (req, res) => {

  const sql = `
    SELECT
      c.id,

      u.name AS cleaner_name,
      c.cleaner_id,

      r.room_number,
      r.floor,

      c.cleaning_date,
      c.cleaning_time,

      c.cleaning_status,

      c.student_confirmation,
      c.rector_verification

    FROM cleaning c

    JOIN users u
      ON c.cleaner_id = u.id

    JOIN rooms r
      ON c.room_id = r.id

    ORDER BY c.id DESC
  `;

  db.query(
    sql,
    (err, result) => {

      if (err) {
        console.error(
          "Cleaning records error:",
          err
        );

        return res.status(500).json({
          message:
            "Cannot load cleaning records"
        });
      }

      res.json(result);
    }
  );
});


// =========================
// STUDENT - LATEST CLEANING
// =========================

app.get("/student/cleaning", (req, res) => {

  const sql = `
    SELECT

      r.room_number,
      r.floor,

      c.cleaning_date,
      c.cleaning_time,

      c.cleaning_status,

      c.student_confirmation,
      c.rector_verification

    FROM cleaning c

    JOIN rooms r
      ON c.room_id = r.id

    ORDER BY c.id DESC

    LIMIT 1
  `;

  db.query(
    sql,
    (err, result) => {

      if (err) {
        console.error(
          "Student cleaning error:",
          err
        );

        return res.status(500).json({
          message:
            "Cannot load student cleaning status"
        });
      }

      if (result.length === 0) {
        return res.json(null);
      }

      res.json(result[0]);
    }
  );
});


// =========================
// START SERVER
// =========================
// ===============================
// RECTOR - VIEW CLEANING RECORDS
// ===============================

app.get("/rector/cleaning", (req, res) => {

    const sql = `
        SELECT
            cleaning.id,
            rooms.room_number,
            rooms.floor,
            users.name AS cleaner_name,
            cleaning.cleaning_date,
            cleaning.cleaning_time,
            cleaning.cleaning_status,
            cleaning.student_confirmation,
            cleaning.rector_verification
        FROM cleaning
        JOIN rooms ON cleaning.room_id = rooms.id
        JOIN users ON cleaning.cleaner_id = users.id
        ORDER BY cleaning.id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});


// ===============================
// RECTOR - VERIFY CLEANING
// ===============================

app.put("/rector/cleaning/:id/verify", (req, res) => {

    const cleaningId = req.params.id;

    const sql = `
        UPDATE cleaning
        SET rector_verification = 'Verified'
        WHERE id = ?
    `;

    db.query(sql, [cleaningId], (err, result) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Cleaning record not found"
            });
        }

        res.json({
            message: "Cleaning verified successfully"
        });
    });
});
app.listen(
  PORT,
  () => {

    console.log(
      `Server running on http://localhost:${PORT}`
    );

  }
);