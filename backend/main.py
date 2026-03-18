import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_processor import extract_text, chunk_text
from embedder import embed, embed_one
from vector_store import upsert_chunks, search
from llm import generate_answer

app = FastAPI(title="RAG Knowledge Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    answer: str
    context: list[str]


@app.post("/upload", summary="Upload a PDF and index its content")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        print(f"[upload] File received: {file.filename}")

        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Step 1: Extract text
        text = extract_text(raw)
        print(f"[upload] Text extracted: {len(text)} characters")

        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF. The file may be scanned or image-based.")

        # Step 2: Chunk text
        chunks = chunk_text(text, file.filename)
        print(f"[upload] Chunks created: {len(chunks)}")

        if not chunks:
            raise HTTPException(status_code=422, detail="Text was extracted but could not be chunked.")

        # Step 3: Generate embeddings
        texts = [c["text"] for c in chunks]
        vectors = embed(texts)
        print(f"[upload] Embeddings generated: {len(vectors)}, dim={len(vectors[0])}")

        # Step 4: Build records and upsert to Endee
        # Use uuid IDs to prevent overwriting across multiple PDFs
        records = [
            {
                "id":     str(uuid.uuid4()),
                "vector": vectors[i].tolist() if hasattr(vectors[i], "tolist") else vectors[i],
                "meta":   {"text": chunks[i]["text"], "source": file.filename, "chunk_index": i},
            }
            for i in range(len(chunks))
            if vectors[i]
        ]
        print(f"[upload] Storing {len(records)} records in Endee...")
        upsert_chunks(records)
        print(f"[upload] Done.")

        return {"message": f"Indexed {len(records)} chunks from '{file.filename}'."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[upload] ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/ask", response_model=QuestionResponse, summary="Ask a question")
async def ask(req: QuestionRequest):
    try:
        if not req.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        print(f"[ask] Question: {req.question}")

        query_vector = embed_one(req.question)
        results = search(query_vector)
        context_chunks = [r["text"] for r in results if r.get("text")]
        sources = list({r["meta"].get("source", "unknown") for r in results if r.get("meta")})
        print(f"[ask] Retrieved {len(context_chunks)} chunks from sources: {sources}")

        if not context_chunks:
            return QuestionResponse(
                answer="No relevant documents found. Please upload a PDF first.",
                context=[],
            )

        answer = generate_answer("\n\n".join(context_chunks), req.question)
        return QuestionResponse(answer=answer, context=context_chunks)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ask] ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Ask failed: {str(e)}")


@app.get("/")
def root():
    return {"message": "RAG Chatbot API is running. Use /upload, /ask, or /health."}

@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
