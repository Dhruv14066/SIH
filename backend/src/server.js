// server.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const https = require("https");

// -------------------------
// Mongo Models
// -------------------------
const CodeSystem = require(path.join(__dirname, "models/CodeSystem"));
const ConceptMap = require(path.join(__dirname, "models/ConceptMap"));
const Encounter = require(path.join(__dirname, "models/Encounter"));

// -------------------------
// MongoDB Connection
// -------------------------
mongoose.connect("mongodb://localhost:27017/terminology", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () =>
  console.log("✅ Connected to MongoDB: terminology")
);

// -------------------------
// Express Setup
// -------------------------
const app = express();
app.use(cors());
app.use(express.json());

// -------------------------
// WHO Certificates
// -------------------------
const caCert = fs.readFileSync(path.join(__dirname, "certs/who_chain.crt"), "utf-8");
const httpsAgent = new https.Agent({ ca: caCert });

// -------------------------
// Helpers
// -------------------------
function stripHtmlTags(s = "") {
  return s.replace(/<[^>]*>/g, "").trim();
}

function extractICD11Code(entity) {
  if (entity.theCode) return entity.theCode;  // direct code field
  return null;
}

async function getICD11Token() {
  const resp = await axios.post(
    "https://icdaccessmanagement.who.int/connect/token",
    new URLSearchParams({
      client_id: process.env.ICD11_CLIENT_ID,
      client_secret: process.env.ICD11_CLIENT_SECRET,
      scope: "icdapi_access",
      grant_type: "client_credentials",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return resp.data.access_token;
}

function parseEntities(data) {
  let entities = [];
  if (Array.isArray(data)) entities = data;
  else if (Array.isArray(data.results)) entities = data.results;
  else if (Array.isArray(data.entities)) entities = data.entities;
  else if (Array.isArray(data.destinationEntities)) entities = data.destinationEntities;
  else if (Array.isArray(data.hits)) entities = data.hits;
  else {
    const arr = Object.values(data).find((v) => Array.isArray(v));
    if (arr) entities = arr;
  }
  return entities;
}

// -------------------------
// ICD-11 Search Endpoint
// -------------------------

app.get("/fhir/icd11/search", async (req, res) => {
  try {
    const q = req.query.name;
    if (!q) return res.status(400).json({ error: "Missing 'name' query param" });

    const token = await getICD11Token();

    // 1️⃣ Get search results
    const icdResp = await axios.get("https://id.who.int/icd/entity/search", {
      httpsAgent,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "en",
        "API-Version": "v2",
      },
      params: { q },
    });

    const entities = parseEntities(icdResp.data);
    if (!entities.length) return res.json({ query: q, results: [] });

    // 2️⃣ Fetch full entity details to get theCode
    const results = await Promise.all(
      entities.slice(0, 10).map(async (e) => {
        try {
          const entityId = e.id.split("/").pop();
          const fullEntityResp = await axios.get(`https://id.who.int/icd/entity/${entityId}`, {
            httpsAgent,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "API-Version": "v2",
            },
          });

          const entityData = fullEntityResp.data;
          const id = e.id || e.stemId || e.foundationUri || "n/a";
          const title = stripHtmlTags(entityData.title || e.title || "");
          const score = e.score ?? (e.matchingPVs?.[0]?.score ?? null);
          const synonyms = (entityData.matchingPVs || []).slice(0, 3).map(p => stripHtmlTags(p.label)) || [];
          const icd11Code = entityData.theCode || null;

          return { id, icd11Code, title, score, synonyms };
        } catch (err) {
          // fallback if fetching full entity fails
          return {
            id: e.id,
            icd11Code: null,
            title: stripHtmlTags(e.title || ""),
            score: e.score ?? null,
            synonyms: e.matchingPVs?.slice(0, 3).map(p => stripHtmlTags(p.label)) || [],
          };
        }
      })
    );

    res.json({ query: q, count: entities.length, results });
  } catch (err) {
    console.error("❌ ICD-11 Search Error:", err.response?.data || err.message);
    res.status(500).json({ error: "ICD-11 API error", details: err.message });
  }
});



// -------------------------
// Get ICD-11 code by entity ID
// -------------------------

app.get("/fhir/icd11/code", async (req, res) => {
  try {
    const entityId = req.query.entityId;
    if (!entityId) return res.status(400).json({ error: "Missing 'entityId' query param" });

    // 1️⃣ Get ICD-11 token
    const token = getICD11Token()

    // 2️⃣ Fetch full entity data
    const fullEntityResp = await axios.get(`https://id.who.int/icd/release/11/2023-02/mms/entity/${entityId}`, {
      httpsAgent,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "API-Version": "v2",
      },
    });

    const entity = fullEntityResp.data;

    // 3️⃣ Extract code
    const icd11Code = entity.theCode || entity.code || null;

    res.json({
      entityId,
      icd11Code,
      title: entity.title?.en || entity.title || null,
    });
  } catch (err) {
    console.error("❌ ICD-11 Code Fetch Error:", err.response?.data || err.message);
    res.status(500).json({ error: "ICD-11 code fetch failed", details: err.message });
  }
});





// -------------------------
// NAMASTE Lookup Endpoint
// -------------------------


app.get("/fhir/disease/lookup", async (req, res) => {
  try {
    const q = req.query.name?.toLowerCase();
    if (!q) return res.status(400).json({ error: "Missing 'name' query param" });

    const cs = await CodeSystem.findOne({ id: "namaste" });
    if (!cs) return res.status(404).json({ error: "NAMASTE CodeSystem not found" });

    const match = cs.concept.find(
      (c) =>
        c.display?.toLowerCase() === q ||
        c.designation?.some((d) => d.value.toLowerCase() === q)
    );

    if (!match) return res.status(404).json({ error: "Disease not found in NAMASTE" });

    const token = await getICD11Token();

    const icdResp = await axios.get("https://id.who.int/icd/entity/search", {
      httpsAgent,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "en",
        "API-Version": "v2",
      },
      params: { q: match.display },
    });

    const entities = parseEntities(icdResp.data);
    const topEntity = entities[0];
    const icd11Code = topEntity?.theCode || topEntity?.code || null;
    const icd11Id = topEntity?.id || null;

    res.json({
      disease: match.display,
      namasteCode: match.code,
      icd11Id,
      icd11Code,
    });
  } catch (err) {
    console.error("❌ Disease Lookup Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Lookup failed", details: err.message });
  }
});

// -------------------------
// Start Server
// -------------------------
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 FHIR server running on http://localhost:${PORT}`)
);
