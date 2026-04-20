const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is missing. Configure it in backend/.env.");
    error.code = "MISSING_GEMINI_API_KEY";
    throw error;
  }

  return new GoogleGenerativeAI(apiKey);
}

async function generateGemma4Answer({ systemPrompt, userPrompt }) {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: "gemma-4-26b-a4b-it",
    systemInstruction: systemPrompt
  });

  const result = await model.generateContent(userPrompt);
  const response = await result.response;
  return response.text()?.trim() || "I'm not sure based on the current SynapEscrow knowledge. Please rephrase your question or contact support.";
}

module.exports = {
  generateGemma4Answer
};
