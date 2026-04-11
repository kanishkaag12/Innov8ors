const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There isn't a direct listModels in the SDK easily available without more setup
    // but we can try a few common ones
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-2.0-flash-exp"];
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent("hello");
        console.log(`✅ ${m} is available`);
      } catch (e) {
        console.log(`❌ ${m} failed: ${e.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
