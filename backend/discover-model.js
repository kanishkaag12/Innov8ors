const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function findActiveModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const candidates = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-2.0-flash-exp"
  ];

  console.log("TESTING MODEL CANDIDATES...");
  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      await model.generateContent("test");
      console.log(`[SUCCESS] Model '${name}' is ACTIVE and has quota.`);
      process.exit(0);
    } catch (err) {
      console.log(`[FAILED] Model '${name}': ${err.message.slice(0, 80)}...`);
    }
  }
  console.log("No common models found with active quota.");
}

findActiveModel();
