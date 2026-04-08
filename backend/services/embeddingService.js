const axios = require('axios');

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

async function generateEmbedding(text) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    throw new Error('Text is required to generate an embedding.');
  }

  try {
    const response = await axios.post(
      `${EMBEDDING_SERVICE_URL}/embed`,
      { text: normalizedText },
      { timeout: 30000 }
    );

    if (!Array.isArray(response.data?.embedding) || response.data.embedding.length === 0) {
      throw new Error('Embedding service returned an invalid embedding payload.');
    }

    return response.data.embedding;
  } catch (error) {
    const details = error.response?.data?.detail || error.message;
    throw new Error(`Embedding service unavailable: ${details}`);
  }
}

module.exports = { generateEmbedding, EMBEDDING_SERVICE_URL };
