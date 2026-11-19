const mongoose = require("mongoose");

/**
 * MongoDB connection (optional).
 *
 * The URI comes from the MONGODB_URI environment variable only — there is no
 * .env file in this repo and no secret is stored here. See .env.example.
 *
 * If MONGODB_URI is not set, or the connection fails (e.g. MongoDB is not
 * running), this resolves with `false` and the API keeps working on the
 * in-memory sample data in data/sampleData.js. Nothing crashes, the shop
 * still renders.
 */
let dbConnected = false;

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("MONGODB_URI not set — running with in-memory sample data.");
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    dbConnected = true;
    console.log("Connected to MongoDB.");
    return true;
  } catch (err) {
    console.warn(
      "Could not connect to MongoDB — running with in-memory sample data.",
      err instanceof Error ? err.message : err
    );
    dbConnected = false;
    return false;
  }
}

async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  dbConnected = false;
}

function isDbConnected() {
  return dbConnected;
}

module.exports = { connectDb, disconnectDb, isDbConnected };
