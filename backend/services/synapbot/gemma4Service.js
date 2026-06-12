const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Groq = require("groq-sdk");

require("dotenv").config();

async function generateGemma4Answer({ systemPrompt, userPrompt }) {
  // 1. Try Gemini (using standard gemini-1.5-flash first)
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt
      });
      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text()?.trim();
      if (text) return text;
    } catch (geminiError) {
      console.warn("⚠️ Gemini generation failed, trying Groq fallback... Error:", geminiError.message);
    }
  }

  // 2. Try Groq (extremely fast and robust fallback)
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (groqError) {
      console.warn("⚠️ Groq generation failed, trying OpenAI fallback... Error:", groqError.message);
    }
  }

  // 3. Try OpenAI (GPT-4o-mini)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (openaiError) {
      console.warn("⚠️ OpenAI generation failed... Error:", openaiError.message);
    }
  }

  throw new Error("All AI providers (Gemini, Groq, OpenAI) failed or are unconfigured.");
}

module.exports = {
  generateGemma4Answer
};
