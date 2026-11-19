const mongoose = require("mongoose");

const QuoteSchema = new mongoose.Schema(
  {
    quoteId: { type: String, required: true, unique: true },
    serviceId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    details: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["new", "contacted", "done"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quote", QuoteSchema);
