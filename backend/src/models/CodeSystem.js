// models/CodeSystem.js
const mongoose = require("mongoose");

const ConceptSchema = new mongoose.Schema({
  code: { type: String, required: true },
  display: String,
  designation: [
    {
      language: String,
      value: String,
    },
  ],
});

const CodeSystemSchema = new mongoose.Schema({
  resourceType: { type: String, default: "CodeSystem" },
  id: { type: String, required: true, unique: true },
  url: String,
  status: { type: String, default: "active" },
  content: { type: String, default: "complete" },
  concept: [ConceptSchema],
});

module.exports = mongoose.model("CodeSystem", CodeSystemSchema);
