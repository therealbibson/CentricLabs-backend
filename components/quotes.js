/**
 * Quote requests — business logic / data access.
 * MongoDB when connected, otherwise the in-memory store (utils/store.js).
 */
const { isDbConnected } = require("../config/db");
const QuoteModel = require("../models/Quote");
const { store, newId } = require("../utils/store");

const QUOTE_STATUSES = ["new", "contacted", "done"];

function toQuote(d) {
  return {
    id: d.quoteId,
    serviceId: d.serviceId,
    name: d.name,
    phone: d.phone,
    email: d.email,
    details: d.details,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  };
}

async function getQuotes() {
  if (isDbConnected()) {
    const docs = await QuoteModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(toQuote);
  }
  return [...store.quotes].reverse();
}

async function createQuote({ serviceId, name, phone, email, details }) {
  const quote = {
    id: newId("Q"),
    serviceId: String(serviceId),
    name: String(name),
    phone: String(phone),
    email: email ? String(email) : undefined,
    details: String(details),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  if (isDbConnected()) {
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
    store.quotes.push(quote);
  }
  return quote;
}

async function updateQuoteStatus(id, status) {
  if (isDbConnected()) {
    const doc = await QuoteModel.findOneAndUpdate(
      { quoteId: id },
      { status },
      { new: true }
    ).lean();
    return doc ? { id: doc.quoteId, status: doc.status } : null;
  }
  const quote = store.quotes.find((q) => q.id === id);
  if (!quote) return null;
  quote.status = status;
  return { id: quote.id, status: quote.status };
}

module.exports = { QUOTE_STATUSES, getQuotes, createQuote, updateQuoteStatus };
