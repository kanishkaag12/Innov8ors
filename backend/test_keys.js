require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

async function checkGemini() {
  console.log("Checking Gemini...");
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Gemini Success! Response:", result.response.text());
    return true;
  } catch (err) {
    console.log("Gemini failed:", err.message);
    return false;
  }
}

async function checkGroq() {
  console.log("Checking Groq...");
  try {
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Hello" }]
    });
    console.log("Groq Success! Response:", completion.choices[0].message.content);
    return true;
  } catch (err) {
    console.log("Groq failed:", err.message);
    return false;
  }
}

async function checkOpenAI() {
  console.log("Checking OpenAI...");
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }]
    });
    console.log("OpenAI Success! Response:", completion.choices[0].message.content);
    return true;
  } catch (err) {
    console.log("OpenAI failed:", err.message);
    return false;
  }
}

async function run() {
  await checkGemini();
  await checkGroq();
  await checkOpenAI();
}

run();
