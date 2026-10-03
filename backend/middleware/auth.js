const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authorization = String(req.get("Authorization") || "");
  const [scheme, token] = authorization.split(" ");
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (scheme !== "Bearer" || !token || !secret) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!payload.id || !payload.username) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    req.user = {
      id: payload.id,
      username: payload.username,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  requireAuth,
};
