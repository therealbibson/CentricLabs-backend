import mongoose, { Schema, type Document } from "mongoose";

// ---------------------------------------------------------------------------
// Mongoose models. These are only used when MongoDB is connected (see
// db.ts). Without MongoDB the API falls back to the in-memory sample data
// in data.ts, so the shop still works.
// ---------------------------------------------------------------------------

export interface ProductDoc extends Document {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  description: string;
  stock: number;
  badge?: string;
  image: string;
}

const ProductSchema = new Schema<ProductDoc>(
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
  { timestamps: true },
);

export const ProductModel = mongoose.model<ProductDoc>("Product", ProductSchema);

export interface ServiceDoc extends Document {
  id: string;
  name: string;
  tagline: string;
  description: string;
  startingFrom: number;
  features: string[];
}

const ServiceSchema = new Schema<ServiceDoc>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    startingFrom: { type: Number, required: true, min: 0 },
    features: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const ServiceModel = mongoose.model<ServiceDoc>("Service", ServiceSchema);

export interface OrderItemDoc {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface OrderDoc extends Document {
  orderId: string;
  customer: { name: string; phone: string; email?: string; address: string };
  items: OrderItemDoc[];
  total: number;
  paymentMethod: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<OrderDoc>(
  {
    orderId: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
    },
    items: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        qty: { type: Number, required: true, default: 1 },
      },
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true, default: "Pay on delivery" },
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const OrderModel = mongoose.model<OrderDoc>("Order", OrderSchema);

export interface QuoteDoc extends Document {
  quoteId: string;
  serviceId: string;
  name: string;
  phone: string;
  email?: string;
  details: string;
  status: "new" | "contacted" | "done";
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<QuoteDoc>(
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
  { timestamps: true },
);

export const QuoteModel = mongoose.model<QuoteDoc>("Quote", QuoteSchema);
