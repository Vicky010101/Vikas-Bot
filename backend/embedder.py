from sklearn.feature_extraction.text import TfidfVectorizer

_vectorizer = TfidfVectorizer()

def embed(texts: list[str]) -> list[list[float]]:
    vectors = _vectorizer.fit_transform(texts).toarray()
    return vectors.tolist()

def embed_one(text: str) -> list[float]:
    return embed([text])[0]
