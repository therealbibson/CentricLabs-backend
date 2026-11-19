const express = require("express");
const { asyncHandler } = require("../middlewares/errorHandler");
const { requireAdmin } = require("../middlewares/adminAuth");
const {
  ORDER_STATUSES,
  getOrders,
  createOrder,
  updateOrderStatus,
} = require("../components/orders");

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { customer, items, paymentMethod } = req.body ?? {};
    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({
        error:
          "Invalid order. Send customer { name, phone, address } and a non-empty items array.",
      });
      return;
    }
    const order = await createOrder({ customer, items, paymentMethod });
    res.status(201).json(order);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getOrders());
  })
);

// Admin order status
router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};
    if (!ORDER_STATUSES.includes(status)) {
      res
        .status(400)
        .json({ error: `status must be one of: ${ORDER_STATUSES.join(", ")}` });
      return;
    }
    const updated = await updateOrderStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(updated);
  })
);

module.exports = router;
