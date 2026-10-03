const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { get } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
  };
}

router.post("/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  if (!secret) {
    console.error("JWT_SECRET is not configured");
    return res.status(500).json({ error: "Authentication is not configured" });
  }

  try {
    const user = await get(
      `SELECT id, username, password_hash FROM users WHERE username = ?`,
      [username]
    );

    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const safeUser = publicUser(user);
    const token = jwt.sign(safeUser, secret, { expiresIn: "8h" });

    return res.json({ token, user: safeUser });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Unable to login" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
