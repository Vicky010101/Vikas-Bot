from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model

def embed(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return [embeddings[i].tolist() for i in range(len(embeddings))]

def embed_one(text: str) -> list[float]:
    return embed([text])[0]
