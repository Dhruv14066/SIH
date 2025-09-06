// models/ConceptMap.js
const mongoose = require("mongoose");

const TargetSchema = new mongoose.Schema({
  code: String,
  display: String,
});

const ElementSchema = new mongoose.Schema({
  code: String,
  target: [TargetSchema],
});

const GroupSchema = new mongoose.Schema({
  source: String,
  target: String,
  element: [ElementSchema],
});

const ConceptMapSchema = new mongoose.Schema({
  resourceType: { type: String, default: "ConceptMap" },
  id: { type: String, required: true, unique: true },
  url: String,
  status: { type: String, default: "active" },
  group: [GroupSchema],
});

module.exports = mongoose.model("ConceptMap", ConceptMapSchema);
