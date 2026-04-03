const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testFlash15() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Test");
    console.log("Success with gemini-1.5-flash");
  } catch (err) {
    console.error("Failed with gemini-1.5-flash:", err.message, err.status);
  }
}

testFlash15();
