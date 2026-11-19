/**
 * Orders — business logic / data access.
 * MongoDB when connected, otherwise the in-memory store (utils/store.js).
 * Orders live only while the server is running when MongoDB is not
 * connected.
 */
const { isDbConnected } = require("../config/db");
const OrderModel = require("../models/Order");
const { store, newId } = require("../utils/store");

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

function toOrder(d) {
  return {
    id: d.orderId,
    customer: d.customer,
    items: d.items,
    total: d.total,
    paymentMethod: d.paymentMethod,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  };
}

async function getOrders() {
  if (isDbConnected()) {
    const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(toOrder);
  }
  return [...store.orders].reverse();
}

async function createOrder({ customer, items, paymentMethod }) {
  const total = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1),
    0
  );
  const order = {
    id: newId("CL"),
    customer: {
      name: String(customer.name),
      phone: String(customer.phone),
      email: customer.email ? String(customer.email) : undefined,
      address: String(customer.address),
    },
    items: items.map((it) => ({
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
  if (isDbConnected()) {
    await OrderModel.create({
      orderId: order.id,
      customer: order.customer,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
    });
  } else {
    store.orders.push(order);
  }
  return order;
}

async function updateOrderStatus(id, status) {
  if (isDbConnected()) {
    const doc = await OrderModel.findOneAndUpdate(
      { orderId: id },
      { status },
      { new: true }
    ).lean();
    return doc ? { id: doc.orderId, status: doc.status } : null;
  }
  const order = store.orders.find((o) => o.id === id);
  if (!order) return null;
  order.status = status;
  return { id: order.id, status: order.status };
}

module.exports = { ORDER_STATUSES, getOrders, createOrder, updateOrderStatus };
