/**
 * Products — business logic / data access.
 * Talks to MongoDB when connected, otherwise the in-memory store
 * (utils/store.js), which holds a mutable copy of the sample catalogue.
 */
const { isDbConnected } = require("../config/db");
const ProductModel = require("../models/Product");
const { store, slugify } = require("../utils/store");

function toProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    oldPrice: p.oldPrice,
    description: p.description,
    stock: p.stock,
    badge: p.badge,
    image: p.image,
  };
}

async function getProducts(category, search) {
  let list;
  if (isDbConnected()) {
    const docs = await ProductModel.find().lean();
    list = docs.map(toProduct);
    // If the DB is connected but empty (not seeded yet), fall back to samples.
    if (list.length === 0) list = [...store.products];
  } else {
    list = [...store.products];
  }
  if (category && category !== "All") {
    list = list.filter((p) => p.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }
  return list;
}

async function getProductById(id) {
  const list = await getProducts();
  return list.find((p) => p.id === id) || null;
}

async function getCategories() {
  const list = await getProducts();
  return Array.from(new Set(list.map((p) => p.category)));
}

async function createProduct(data) {
  const product = {
    id: slugify(String(data.name)),
    name: String(data.name),
    category: String(data.category),
    price: Number(data.price),
    oldPrice:
      data.oldPrice === undefined || data.oldPrice === null || data.oldPrice === ""
        ? undefined
        : Number(data.oldPrice),
    description: String(data.description),
    stock: Number(data.stock),
    badge: data.badge ? String(data.badge) : undefined,
    image: String(data.image),
  };
  if (isDbConnected()) {
    const existing = await ProductModel.findOne({ id: product.id });
    if (existing) product.id = `${product.id}-${Date.now().toString(36)}`;
    await ProductModel.create(product);
  } else {
    if (store.products.some((p) => p.id === product.id)) {
      product.id = `${product.id}-${Date.now().toString(36)}`;
    }
    store.products.push(product);
  }
  return product;
}

async function updateProduct(id, updates) {
  const allowed = [
    "name",
    "category",
    "price",
    "oldPrice",
    "description",
    "stock",
    "badge",
    "image",
  ];
  const patch = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) patch[key] = updates[key];
  }
  if (patch.price !== undefined) patch.price = Number(patch.price);
  if (patch.oldPrice !== undefined) {
    patch.oldPrice =
      patch.oldPrice === "" || patch.oldPrice === null
        ? undefined
        : Number(patch.oldPrice);
  }
  if (patch.stock !== undefined) patch.stock = Number(patch.stock);

  if (isDbConnected()) {
    const doc = await ProductModel.findOneAndUpdate({ id }, patch, {
      new: true,
    }).lean();
    return doc ? toProduct(doc) : null;
  }
  const product = store.products.find((p) => p.id === id);
  if (!product) return null;
  Object.assign(product, patch);
  return product;
}

async function deleteProduct(id) {
  if (isDbConnected()) {
    const doc = await ProductModel.findOneAndDelete({ id });
    return Boolean(doc);
  }
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  store.products.splice(idx, 1);
  return true;
}

module.exports = {
  toProduct,
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
};
