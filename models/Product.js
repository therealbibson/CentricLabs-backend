const mongoose = require("mongoose");

// Only used when MongoDB is connected (see config/db.js). Without MongoDB
// the API falls back to the in-memory sample data in data/sampleData.js.
const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number },
    description: { type: String, required: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    badge: { type: String },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
