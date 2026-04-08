from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="SynapEscrow Embedding Service")

# Explicitly load the requested Hugging Face model for content-based matching.
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


class EmbedRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok", "model": "sentence-transformers/all-MiniLM-L6-v2"}


@app.post("/embed")
def embed(payload: EmbedRequest):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    embedding = model.encode(text, normalize_embeddings=True)
    return {"embedding": embedding.tolist()}
