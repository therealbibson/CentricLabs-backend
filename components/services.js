/**
 * Services — business logic / data access.
 * MongoDB when connected, otherwise the sample services in
 * data/sampleData.js.
 */
const { isDbConnected } = require("../config/db");
const ServiceModel = require("../models/Service");
const { services } = require("../data/sampleData");

async function getServices() {
  if (isDbConnected()) {
    const docs = await ServiceModel.find().lean();
    if (docs.length > 0) {
      return docs.map((s) => ({
        id: s.id,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        startingFrom: s.startingFrom,
        features: s.features,
      }));
    }
  }
  return services;
}

module.exports = { getServices };
