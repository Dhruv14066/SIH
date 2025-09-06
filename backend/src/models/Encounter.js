// models/Encounter.js
const mongoose = require("mongoose");

const ConditionSchema = new mongoose.Schema({
  code: {
    coding: [
      {
        system: String,
        code: String,
        display: String,
      },
    ],
    text: String,
  },
});

const EncounterSchema = new mongoose.Schema({
  resourceType: { type: String, default: "Encounter" },
  id: { type: String, unique: true },
  subject: {
    reference: String,
  },
  period: {
    start: Date,
    end: Date,
  },
  diagnosis: [ConditionSchema],
});

module.exports = mongoose.model("Encounter", EncounterSchema);
