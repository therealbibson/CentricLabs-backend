const express = require("express");
const { asyncHandler } = require("../middlewares/errorHandler");
const { requireAdmin } = require("../middlewares/adminAuth");
const {
  QUOTE_STATUSES,
  getQuotes,
  createQuote,
  updateQuoteStatus,
} = require("../components/quotes");

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { serviceId, name, phone, email, details } = req.body ?? {};
    if (!serviceId || !name || !phone || !details) {
      res.status(400).json({
        error: "Invalid quote request. Send serviceId, name, phone and details.",
      });
      return;
    }
    const quote = await createQuote({ serviceId, name, phone, email, details });
    res.status(201).json({
      id: quote.id,
      message:
        "Quote request received. CentricLabs will contact you within 1 business day.",
    });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getQuotes());
  })
);

// Admin quote status
router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};
    if (!QUOTE_STATUSES.includes(status)) {
      res
        .status(400)
        .json({ error: `status must be one of: ${QUOTE_STATUSES.join(", ")}` });
      return;
    }
    const updated = await updateQuoteStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }
    res.json(updated);
  })
);

module.exports = router;
