const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGemini25() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent("Analyze this code snippet: console.log('hello world') and return status: Fully Completed.");
    const response = await result.response;
    console.log("Response:", response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}

testGemini25();
