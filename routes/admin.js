const express = require("express");
const { asyncHandler } = require("../middlewares/errorHandler");
const {
  issueAdminToken,
  checkAdminPassword,
  requireAdmin,
} = require("../middlewares/adminAuth");
const { getStats, getCustomers } = require("../components/admin");
const { getQuotes } = require("../components/quotes");

const router = express.Router();

router.post("/login", (req, res) => {
  const { password } = req.body ?? {};
  if (!checkAdminPassword(password)) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }
  res.json({ token: issueAdminToken() });
});

router.get(
  "/stats",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await getStats());
  })
);

router.get(
  "/customers",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await getCustomers());
  })
);

router.get(
  "/quotes",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await getQuotes());
  })
);

module.exports = router;
