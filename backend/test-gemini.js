const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testPro15() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  try {
    const result = await model.generateContent("Test request for Pro tier model.");
    const response = await result.response;
    console.log("Success with gemini-1.5-pro:", response.text());
  } catch (err) {
    console.error("Failed with gemini-1.5-pro:", err.message, err.status);
    if (err.errorDetails) {
       console.error("Error Details:", JSON.stringify(err.errorDetails, null, 2));
    }
  }
}

testPro15();
