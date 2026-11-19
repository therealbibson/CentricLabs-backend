/**
 * Admin — dashboard stats and customers derived from orders + quotes.
 * No separate user registration system yet: customers are the people who
 * have ordered or requested a quote.
 */
const { getProducts } = require("./products");
const { getOrders } = require("./orders");
const { getQuotes } = require("./quotes");

async function getStats() {
  const [allProducts, allOrders, allQuotes] = await Promise.all([
    getProducts(),
    getOrders(),
    getQuotes(),
  ]);
  const revenue = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  return {
    totalProducts: allProducts.length,
    totalOrders: allOrders.length,
    revenue,
    pendingQuotes: allQuotes.filter((q) => q.status === "new").length,
    totalQuotes: allQuotes.length,
    lowStock: allProducts.filter((p) => p.stock <= 5),
    recentOrders: allOrders.slice(0, 5),
  };
}

async function getCustomers() {
  const [allOrders, allQuotes] = await Promise.all([getOrders(), getQuotes()]);
  const byPhone = new Map();

  const touch = (name, phone, email, createdAt) => {
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
  return [...byPhone.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

module.exports = { getStats, getCustomers };
