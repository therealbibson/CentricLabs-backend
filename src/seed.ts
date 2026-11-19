import { connectDb, disconnectDb } from "./db";
import { products, services } from "./data";
import { ProductModel, ServiceModel } from "./models";

/**
 * Seed script — inserts the 16 sample products and the 4 services into
 * MongoDB, but only when the collections are empty (safe to run twice).
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/centriclabs npm run seed
 *
 * Requires MongoDB to be running. It does NOT touch orders or quotes.
 */
async function main() {
  const connected = await connectDb();
  if (!connected) {
    console.error(
      "Seed aborted: set MONGODB_URI and make sure MongoDB is running.",
    );
    process.exit(1);
  }

  const productCount = await ProductModel.countDocuments();
  if (productCount === 0) {
    await ProductModel.insertMany(products);
    console.log(`Seeded ${products.length} products.`);
  } else {
    console.log(`Products already present (${productCount}) — skipped.`);
  }

  const serviceCount = await ServiceModel.countDocuments();
  if (serviceCount === 0) {
    await ServiceModel.insertMany(services);
    console.log(`Seeded ${services.length} services.`);
  } else {
    console.log(`Services already present (${serviceCount}) — skipped.`);
  }

  await disconnectDb();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
