// server.js
const path = require('path')
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const CodeSystem = require(path.join(__dirname,"models","CodeSystem"));
const ConceptMap = require(path.join(__dirname,"models","ConceptMap"));
const Encounter = require(path.join(__dirname,"models","Encounter"));

mongoose.connect("mongodb://localhost:27017/terminology");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------
// Get CodeSystem
// -------------------------
app.get("/fhir/CodeSystem/:id", async (req, res) => {
  const cs = await CodeSystem.findOne({ id: req.params.id });
  if (!cs) return res.status(404).send({ error: "Not found" });
  res.json(cs);
});

// -------------------------
// Get ConceptMap
// -------------------------
app.get("/fhir/ConceptMap/:id", async (req, res) => {
  const cm = await ConceptMap.findOne({ id: req.params.id });
  if (!cm) {
    return res.json({
      resourceType: "ConceptMap",
      id: "namaste-to-icd11",
      group: [
        {
          source: "NAMASTE",
          target: "ICD-11",
          element: [{ code: "AYU123", target: [{ code: "TM2-5678" }] }],
        },
      ],
    });
  }
  res.json(cm);
});

// -------------------------
// Autocomplete search
// -------------------------
app.get("/autocomplete", async (req, res) => {
  const q = req.query.q?.toLowerCase() || "";
  const cs = await CodeSystem.findOne({ id: "namaste" });
  if (!cs) return res.status(404).send({ error: "CodeSystem not loaded" });

  const matches = cs.concept.filter((c) =>
    c.display?.toLowerCase().includes(q)
  ).slice(0, 10);

  res.json(matches);
});

// -------------------------
// Encounter upload (prototype)
// -------------------------
app.post("/fhir/Encounter", async (req, res) => {
  try {
    const encounter = new Encounter(req.body);
    await encounter.save();
    res.status(201).json(encounter);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(3000, () =>
  console.log("✅ FHIR server running on http://localhost:3000")
);
