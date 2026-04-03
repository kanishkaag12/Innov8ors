const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const list = await genAI.listModels();
    console.log("AVAILABLE MODELS:");
    list.models.forEach(m => console.log(`- ${m.name}`));
  } catch (err) {
    console.error("List failed:", err.message);
  }
}

listModels();
