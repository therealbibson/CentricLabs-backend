import cors from "cors";
import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { products, services, type Product, type Service } from "./data";
import { connectDb, dbConnected } from "./db";
import { OrderModel, ProductModel, QuoteModel, ServiceModel } from "./models";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({ origin: true }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Admin auth
// Password comes from ADMIN_PASSWORD (see backend/.env.example). The demo
// default is "admin123" — local development ONLY, change it before any
// real deployment. No real credential is stored in this repo.
// On a correct login the server issues a random token (kept in memory,
// changes on restart — log in again after a restart). Admin endpoints
// require it as `Authorization: Bearer <token>`.
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
let adminToken: string | null = null;

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!adminToken || token !== adminToken) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Storage: MongoDB when connected, otherwise in-memory sample data.
// Orders and quote requests live only while the server is running when
// MongoDB is not connected. Swap the in-memory arrays for the database by
// setting MONGODB_URI — the API shapes stay the same.
// ---------------------------------------------------------------------------
type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
type QuoteStatus = "new" | "contacted" | "done";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  customer: { name: string; phone: string; email?: string; address: string };
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
}

interface QuoteRequest {
  id: string;
  serviceId: string;
  name: string;
  phone: string;
  email?: string;
  details: string;
  status: QuoteStatus;
  createdAt: string;
}

const memoryOrders: Order[] = [];
const memoryQuotes: QuoteRequest[] = [];

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || `product-${Date.now().toString(36)}`;

const toProduct = (p: {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  description: string;
  stock: number;
  badge?: string;
  image: string;
}): Product => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.price,
  oldPrice: p.oldPrice,
  description: p.description,
  stock: p.stock,
  badge: p.badge,
  image: p.image,
});

async function getProducts(category?: string, search?: string): Promise<Product[]> {
  let list: Product[];
  if (dbConnected) {
    const docs = await ProductModel.find().lean();
    list = docs.map(toProduct);
    // If the DB is connected but empty (not seeded yet), fall back to samples.
    if (list.length === 0) list = [...products];
  } else {
    list = [...products];
  }
  if (category && category !== "All") {
    list = list.filter((p) => p.category === category);
  }
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }
  return list;
}

async function getServices(): Promise<Service[]> {
  if (dbConnected) {
    const docs = await ServiceModel.find().lean();
    if (docs.length > 0) {
      return docs.map((s) => ({
        id: s.id,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        startingFrom: s.startingFrom,
        features: s.features,
      }));
    }
  }
  return services;
}

async function getOrders(): Promise<Order[]> {
  if (dbConnected) {
    const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((d) => ({
      id: d.orderId,
      customer: d.customer,
      items: d.items,
      total: d.total,
      paymentMethod: d.paymentMethod,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    }));
  }
  return [...memoryOrders].reverse();
}

async function getQuotes(): Promise<QuoteRequest[]> {
  if (dbConnected) {
    const docs = await QuoteModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((d) => ({
      id: d.quoteId,
      serviceId: d.serviceId,
      name: d.name,
      phone: d.phone,
      email: d.email,
      details: d.details,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    }));
  }
  return [...memoryQuotes].reverse();
}

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const QUOTE_STATUSES: QuoteStatus[] = ["new", "contacted", "done"];

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/health", async (_req: Request, res: Response) => {
  const list = await getProducts();
  res.json({
    ok: true,
    service: "centriclabs-backend",
    database: dbConnected ? "mongodb" : "in-memory",
    products: list.length,
  });
});

// ---------------------------------------------------------------------------
// Catalogue (public)
// ---------------------------------------------------------------------------
app.get("/api/products", async (req: Request, res: Response) => {
  const { category, search } = req.query;
  const list = await getProducts(
    typeof category === "string" ? category : undefined,
    typeof search === "string" ? search : undefined,
  );
  res.json(list);
});

app.get("/api/products/:id", async (req: Request, res: Response) => {
  const list = await getProducts();
  const product = list.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  const list = await getProducts();
  res.json(Array.from(new Set(list.map((p) => p.category))));
});

app.get("/api/services", async (_req: Request, res: Response) => {
  res.json(await getServices());
});

// ---------------------------------------------------------------------------
// Orders (public create, public list for now — admin updates status)
// ---------------------------------------------------------------------------
app.post("/api/orders", async (req: Request, res: Response) => {
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
  const total = items.reduce(
    (sum: number, it: OrderItem) => sum + Number(it.price || 0) * Number(it.qty || 1),
    0,
  );
  const order: Order = {
    id: newId("CL"),
    customer: {
      name: String(customer.name),
      phone: String(customer.phone),
      email: customer.email ? String(customer.email) : undefined,
      address: String(customer.address),
    },
    items: items.map((it: OrderItem) => ({
      id: String(it.id),
      name: String(it.name),
      price: Number(it.price),
      qty: Number(it.qty || 1),
    })),
    total,
    paymentMethod: paymentMethod ? String(paymentMethod) : "Pay on delivery",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  if (dbConnected) {
    await OrderModel.create({
      orderId: order.id,
      customer: order.customer,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
    });
  } else {
    memoryOrders.push(order);
  }
  res.status(201).json(order);
});

app.get("/api/orders", async (_req: Request, res: Response) => {
  res.json(await getOrders());
});

// ---------------------------------------------------------------------------
// Quote requests (public create)
// ---------------------------------------------------------------------------
app.post("/api/quotes", async (req: Request, res: Response) => {
  const { serviceId, name, phone, email, details } = req.body ?? {};
  if (!serviceId || !name || !phone || !details) {
    res.status(400).json({
      error: "Invalid quote request. Send serviceId, name, phone and details.",
    });
    return;
  }
  const quote: QuoteRequest = {
    id: newId("Q"),
    serviceId: String(serviceId),
    name: String(name),
    phone: String(phone),
    email: email ? String(email) : undefined,
    details: String(details),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  if (dbConnected) {
    await QuoteModel.create({
      quoteId: quote.id,
      serviceId: quote.serviceId,
      name: quote.name,
      phone: quote.phone,
      email: quote.email,
      details: quote.details,
      status: quote.status,
    });
  } else {
    memoryQuotes.push(quote);
  }
  res.status(201).json({
    id: quote.id,
    message:
      "Quote request received. CentricLabs will contact you within 1 business day.",
  });
});

app.get("/api/quotes", async (_req: Request, res: Response) => {
  res.json(await getQuotes());
});

// ---------------------------------------------------------------------------
// Admin — login + protected endpoints
// ---------------------------------------------------------------------------
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }
  adminToken = crypto.randomBytes(24).toString("hex");
  res.json({ token: adminToken });
});

app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
  const [allProducts, allOrders, allQuotes] = await Promise.all([
    getProducts(),
    getOrders(),
    getQuotes(),
  ]);
  const revenue = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  res.json({
    totalProducts: allProducts.length,
    totalOrders: allOrders.length,
    revenue,
    pendingQuotes: allQuotes.filter((q) => q.status === "new").length,
    totalQuotes: allQuotes.length,
    lowStock: allProducts.filter((p) => p.stock <= 5),
    recentOrders: allOrders.slice(0, 5),
  });
});

app.get("/api/admin/customers", requireAdmin, async (_req: Request, res: Response) => {
  const [allOrders, allQuotes] = await Promise.all([getOrders(), getQuotes()]);
  const byPhone = new Map<
    string,
    {
      name: string;
      email?: string;
      phone: string;
      orders: number;
      totalSpent: number;
      quotes: number;
      lastSeen: string;
    }
  >();
  const touch = (
    name: string,
    phone: string,
    email: string | undefined,
    createdAt: string,
  ) => {
    const existing = byPhone.get(phone) ?? {
      name,
      email,
      phone,
      orders: 0,
      totalSpent: 0,
      quotes: 0,
      lastSeen: createdAt,
    };
    existing.name = name;
    if (email) existing.email = email;
    if (createdAt > existing.lastSeen) existing.lastSeen = createdAt;
    byPhone.set(phone, existing);
    return existing;
  };
  for (const o of allOrders) {
    const c = touch(o.customer.name, o.customer.phone, o.customer.email, o.createdAt);
    c.orders += 1;
    if (o.status !== "cancelled") c.totalSpent += o.total;
  }
  for (const q of allQuotes) {
    const c = touch(q.name, q.phone, q.email, q.createdAt);
    c.quotes += 1;
  }
  res.json(
    [...byPhone.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)),
  );
});

app.get("/api/admin/quotes", requireAdmin, async (_req: Request, res: Response) => {
  res.json(await getQuotes());
});

app.put("/api/quotes/:id", requireAdmin, async (req: Request, res: Response) => {
  const { status } = req.body ?? {};
  if (!QUOTE_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${QUOTE_STATUSES.join(", ")}` });
    return;
  }
  if (dbConnected) {
    const doc = await QuoteModel.findOneAndUpdate(
      { quoteId: req.params.id },
      { status },
      { new: true },
    ).lean();
    if (!doc) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }
    res.json({ id: doc.quoteId, status: doc.status });
    return;
  }
  const quote = memoryQuotes.find((q) => q.id === req.params.id);
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  quote.status = status as QuoteStatus;
  res.json({ id: quote.id, status: quote.status });
});

// --- Admin product CRUD (also used by the admin dashboard) ---
app.post("/api/products", requireAdmin, async (req: Request, res: Response) => {
  const { name, category, price, oldPrice, description, stock, badge, image } =
    req.body ?? {};
  if (!name || !category || price === undefined || !description || stock === undefined || !image) {
    res.status(400).json({
      error:
        "Invalid product. Send name, category, price, description, stock and image (oldPrice and badge are optional).",
    });
    return;
  }
  const product: Product = {
    id: slugify(String(name)),
    name: String(name),
    category: String(category),
    price: Number(price),
    oldPrice: oldPrice === undefined || oldPrice === null || oldPrice === "" ? undefined : Number(oldPrice),
    description: String(description),
    stock: Number(stock),
    badge: badge ? String(badge) : undefined,
    image: String(image),
  };
  if (dbConnected) {
    const existing = await ProductModel.findOne({ id: product.id });
    if (existing) product.id = `${product.id}-${Date.now().toString(36)}`;
    await ProductModel.create(product);
  } else {
    if (products.some((p) => p.id === product.id)) {
      product.id = `${product.id}-${Date.now().toString(36)}`;
    }
    products.push(product);
  }
  res.status(201).json(product);
});

app.put("/api/products/:id", requireAdmin, async (req: Request, res: Response) => {
  const updates = req.body ?? {};
  const allowed = ["name", "category", "price", "oldPrice", "description", "stock", "badge", "image"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) patch[key] = updates[key];
  }
  if (patch.price !== undefined) patch.price = Number(patch.price);
  if (patch.oldPrice !== undefined) {
    patch.oldPrice = patch.oldPrice === "" || patch.oldPrice === null ? undefined : Number(patch.oldPrice);
  }
  if (patch.stock !== undefined) patch.stock = Number(patch.stock);

  if (dbConnected) {
    const doc = await ProductModel.findOneAndUpdate(
      { id: req.params.id },
      patch,
      { new: true },
    ).lean();
    if (!doc) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(toProduct(doc));
    return;
  }
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  Object.assign(product, patch);
  res.json(product);
});

app.delete("/api/products/:id", requireAdmin, async (req: Request, res: Response) => {
  if (dbConnected) {
    const doc = await ProductModel.findOneAndDelete({ id: req.params.id });
    if (!doc) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ deleted: req.params.id });
    return;
  }
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  products.splice(idx, 1);
  res.json({ deleted: req.params.id });
});

// --- Admin order status ---
app.put("/api/orders/:id", requireAdmin, async (req: Request, res: Response) => {
  const { status } = req.body ?? {};
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${ORDER_STATUSES.join(", ")}` });
    return;
  }
  if (dbConnected) {
    const doc = await OrderModel.findOneAndUpdate(
      { orderId: req.params.id },
      { status },
      { new: true },
    ).lean();
    if (!doc) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ id: doc.orderId, status: doc.status });
    return;
  }
  const order = memoryOrders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  order.status = status as OrderStatus;
  res.json({ id: order.id, status: order.status });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Connect to MongoDB if MONGODB_URI is set; if it fails (or is unset) the
// server still starts and serves the in-memory sample data.
void connectDb().then(() => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`CentricLabs API running on http://localhost:${PORT}`);
  });
});
