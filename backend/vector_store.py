from endee import Endee
from config import ENDEE_URL, ENDEE_AUTH_TOKEN, INDEX_NAME, EMBEDDING_DIM, TOP_K

_client: Endee | None = None
_index_ready = False


def get_client() -> Endee:
    global _client
    if _client is None:
        _client = Endee(ENDEE_AUTH_TOKEN) if ENDEE_AUTH_TOKEN else Endee()
        _client.set_base_url(ENDEE_URL)
        print(f"[vector_store] Endee client connected → {ENDEE_URL}")
    return _client


def ensure_index():
    global _index_ready
    if not _index_ready:
        print(f"[vector_store] Creating index '{INDEX_NAME}' dim={EMBEDDING_DIM} space=cosine")
        try:
            get_client().create_index(
                name=INDEX_NAME,
                dimension=EMBEDDING_DIM,
                space_type="cosine",
            )
            print(f"[vector_store] Index '{INDEX_NAME}' created.")
        except Exception as e:
            # Index already exists — safe to continue
            print(f"[vector_store] Index note (likely exists): {e}")
        _index_ready = True


def upsert_chunks(chunks: list[dict]):
    """
    chunks: list of {"id": str, "vector": list[float], "meta": {"text": ..., ...}}

    Endee Index.upsert() expects:
        [{"id": str, "vector": list[float], "meta": dict}]
    """
    ensure_index()
    client = get_client()
    index  = client.get_index(name=INDEX_NAME)

    input_array = [
        {
            "id":     str(c["id"]),
            "vector": c["vector"],       # list[float] — .tolist() done in embedder
            "meta":   c.get("meta", {}), # {"text": chunk, "source": ..., ...}
        }
        for c in chunks
        if c.get("vector")
    ]

    print(f"[vector_store] Upserting {len(input_array)} vectors into '{INDEX_NAME}'...")
    index.upsert(input_array)
    print("[vector_store] Upsert complete.")


def search(vector: list[float], top_k: int = TOP_K) -> list[dict]:
    """
    Query Endee index and return list of {"text": str, "meta": dict}.

    Endee Index.query() returns:
        [{"id", "similarity", "distance", "meta", "norm"}, ...]
    Text is extracted via: match["meta"]["text"]
    """
    ensure_index()
    client = get_client()
    index  = client.get_index(name=INDEX_NAME)

    print(f"[vector_store] Querying '{INDEX_NAME}' top_k={top_k}...")
    results = index.query(
        vector=vector,
        top_k=top_k,
    )
    print(f"[vector_store] Got {len(results)} results.")

    return [
        {
            "text": match["meta"]["text"],
            "meta": match["meta"],
        }
        for match in results
        if match.get("meta", {}).get("text")
    ]
