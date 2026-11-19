const crypto = require("node:crypto");

// ---------------------------------------------------------------------------
// Admin auth
// Password comes from ADMIN_PASSWORD (see .env.example). The demo default
// is "admin123" — local development ONLY, change it before any real
// deployment. No real credential is stored in this repo.
// On a correct login the server issues a random token (kept in memory,
// changes on restart — log in again after a restart). Admin endpoints
// require it as `Authorization: Bearer <token>`.
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

let adminToken = null;

function issueAdminToken() {
  adminToken = crypto.randomBytes(24).toString("hex");
  return adminToken;
}

function checkAdminPassword(password) {
  return typeof password === "string" && password === ADMIN_PASSWORD;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!adminToken || token !== adminToken) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  next();
}

module.exports = { issueAdminToken, checkAdminPassword, requireAdmin };
