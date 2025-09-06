// import.js
const mongoose = require("mongoose");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const CodeSystem = require(path.join(__dirname,'models','CodeSystem'));

mongoose.connect("mongodb://localhost:27017/terminology");

async function importNamaste() {
  const rows = [];
  fs.createReadStream("./data/NAMASTE.csv")
    .pipe(csv())
    .on("data", (r) => rows.push(r))
    .on("end", async () => {
      const cs = {
        resourceType: "CodeSystem",
        id: "namaste",
        url: "http://localhost:3000/fhir/CodeSystem/namaste",
        status: "active",
        content: "complete",
        concept: rows.map((r) => ({
          code: r["NAMC_CODE"],
          display: r["NAMC_term"] || r["NAMC_term_diacritical"],
          designation: [
            { language: "sa", value: r["NAMC_term_DEVANAGARI"] },
            { language: "en", value: r["NAMC_term"] },
          ],
        })),
      };

      await CodeSystem.findOneAndUpdate({ id: "namaste" }, cs, { upsert: true });
      console.log("✅ Imported NAMASTE CodeSystem into MongoDB");
      process.exit();
    });
}

importNamaste();
