require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { connectDb, isDbConnected } = require("./config/db");
const { getProducts } = require("./components/products");
const { errorHandler } = require("./middlewares/errorHandler");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const quotesRouter = require("./routes/quotes");
const servicesRouter = require("./routes/services");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({ origin: true }));
app.use(express.json());

// Health
app.get("/health", async (req, res, next) => {
  try {
    const list = await getProducts();
    res.json({
      ok: true,
      service: "centriclabs-backend",
      database: isDbConnected() ? "mongodb" : "in-memory",
      products: list.length,
    });
  } catch (err) {
    next(err);
  }
});

// API routes
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/admin", adminRouter);
app.use("/api", servicesRouter); // GET /api/categories, GET /api/services

// 404 for anything else
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

// Connect to MongoDB if MONGODB_URI is set; if it fails (or is unset) the
// server still starts and serves the in-memory sample data.
connectDb().then(() => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`CentricLabs API running on http://localhost:${PORT}`);
  });
});

module.exports = app;
