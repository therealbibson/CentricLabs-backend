const express = require("express");
const { asyncHandler } = require("../middlewares/errorHandler");
const { requireAdmin } = require("../middlewares/adminAuth");
const {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../components/products");

const router = express.Router();

// Public catalogue
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const list = await getProducts(
      typeof category === "string" ? category : undefined,
      typeof search === "string" ? search : undefined
    );
    res.json(list);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  })
);

// Admin product CRUD
router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, category, price, oldPrice, description, stock, badge, image } =
      req.body ?? {};
    if (
      !name ||
      !category ||
      price === undefined ||
      !description ||
      stock === undefined ||
      !image
    ) {
      res.status(400).json({
        error:
          "Invalid product. Send name, category, price, description, stock and image (oldPrice and badge are optional).",
      });
      return;
    }
    const product = await createProduct({
      name,
      category,
      price,
      oldPrice,
      description,
      stock,
      badge,
      image,
    });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await updateProduct(req.params.id, req.body ?? {});
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  })
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ deleted: req.params.id });
  })
);

module.exports = router;
