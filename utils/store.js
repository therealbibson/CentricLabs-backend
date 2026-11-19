/**
 * In-memory store used when MongoDB is not connected.
 *
 * `products` is a live, mutable copy of the sample catalogue — admin CRUD
 * (add / edit / delete) changes this array, exactly as the old TypeScript
 * version mutated its imported `products` array. Orders and quotes live
 * only while the server is running in this mode. Everything resets on
 * restart; with MongoDB connected, the database is the source of truth
 * instead and this store is only the seed / fallback source.
 */
const { products: sampleProducts } = require("../data/sampleData");

const store = {
  // Deep-ish copy so admin edits never mutate the sample data itself.
  products: sampleProducts.map((p) => ({ ...p })),
  orders: [],
  quotes: [],
};

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || `product-${Date.now().toString(36)}`
  );
}

module.exports = { store, newId, slugify };
