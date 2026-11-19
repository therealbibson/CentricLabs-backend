const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    startingFrom: { type: Number, required: true, min: 0 },
    features: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);
