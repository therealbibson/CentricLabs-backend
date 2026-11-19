const express = require("express");
const { asyncHandler } = require("../middlewares/errorHandler");
const { getCategories } = require("../components/products");
const { getServices } = require("../components/services");

const router = express.Router();

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    res.json(await getCategories());
  })
);

router.get(
  "/services",
  asyncHandler(async (req, res) => {
    res.json(await getServices());
  })
);

module.exports = router;
