import uuid
from io import BytesIO
from pypdf import PdfReader
from config import CHUNK_SIZE, CHUNK_OVERLAP


def extract_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def chunk_text(text: str, filename: str) -> list[dict]:
    """Split text into overlapping chunks of ~500 words each."""
    words = text.split()
    chunks = []
    idx = 0
    start = 0

    while start < len(words):
        end = start + CHUNK_SIZE
        chunk_words = words[start:end]
        chunk = " ".join(chunk_words).strip()

        if chunk:
            chunks.append({
                "id": f"{idx}_{uuid.uuid4().hex[:8]}",
                "text": chunk,
                "meta": {
                    "source": filename,
                    "chunk_index": idx,
                    "text": chunk,   # stored in Endee metadata for retrieval
                },
            })
            idx += 1

        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks
