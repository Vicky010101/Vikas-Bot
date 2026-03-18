# Vikas Bot — AI Knowledge Chatbot (RAG using Endee)

## Overview

A Retrieval-Augmented Generation (RAG) chatbot that lets users upload PDF documents and ask questions based on their content. It uses Endee vector database for semantic search and Hugging Face LLM for generating grounded answers.

## Features

- Upload multiple PDFs
- Semantic search using Endee vector database
- RAG-based question answering
- Context-aware responses
- Modern dark-theme chatbot UI
- Multi-document support with unique chunk IDs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | HTML, CSS, JavaScript |
| Vector DB | Endee |
| LLM | Hugging Face (chat completions API) |
| Embeddings | Sentence Transformers (`all-MiniLM-L6-v2`) |

## Architecture

```
User → Upload PDF → Text Extraction → Chunking → Embeddings → Endee Vector DB
User Query → Embedding → Endee Search → Retrieve Context → HuggingFace LLM → Response
```

## How Endee is Used

- Creates a cosine similarity index on startup
- Uses `index.upsert()` to store document chunk embeddings
- Uses `index.query()` for semantic similarity search
- Each chunk stored with UUID to support multiple documents without overwriting

## Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/Vicky010101/Vikas-Bot.git
cd Vikas-Bot/rag-chatbot
```

### 2. Set up backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

### 3. Configure environment

Create a `.env` file in the `rag-chatbot/` folder:

```env
HUGGINGFACE_API_KEY=your_hf_token_here
ENDEE_URL=http://localhost:8080/api/v1
ENDEE_AUTH_TOKEN=
```

Get a free HuggingFace token at: https://huggingface.co/settings/tokens

### 4. Run Endee vector database

```bash
docker run -p 8080:8080 endeeio/endee-server:latest
```

### 5. Run the backend

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 6. Open the frontend

Open `frontend/index.html` directly in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload a PDF file |
| POST | `/ask` | Send a question, get answer + context |
| GET | `/health` | Check backend status |

### Example `/ask` request

```json
POST /ask
{
  "question": "What is the main topic of the document?"
}
```

### Example `/ask` response

```json
{
  "answer": "The document covers...",
  "context": ["chunk 1 text...", "chunk 2 text..."]
}
```

## Project Structure

```
rag-chatbot/
├── backend/
│   ├── main.py           # FastAPI app, /upload and /ask endpoints
│   ├── config.py         # Environment config
│   ├── pdf_processor.py  # PDF text extraction and chunking
│   ├── embedder.py       # Sentence Transformers embeddings
│   ├── vector_store.py   # Endee integration
│   ├── llm.py            # HuggingFace LLM call
│   └── requirements.txt
├── frontend/
│   ├── index.html        # Main UI
│   ├── style.css         # Dark theme styles
│   └── app.js            # API integration
├── docker-compose.yml
└── README.md
```

## Future Improvements

- Source highlighting in responses
- Authentication and user sessions
- Cloud deployment (AWS / HuggingFace Spaces)
- Support for more file types (DOCX, TXT)

## Deployment

### Backend — Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repo → select the `rag-chatbot/backend` folder as root
3. Add environment variables in Railway dashboard:
   ```
   HUGGINGFACE_API_KEY=your_hf_token_here
   ENDEE_URL=your_endee_server_url
   ENDEE_AUTH_TOKEN=your_token_if_needed
   ```
4. Railway auto-detects `Procfile` and runs:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Copy the generated Railway URL (e.g. `https://vikas-bot.up.railway.app`)

### Frontend — Netlify

1. Open `frontend/app.js` and replace `BASE_URL`:
   ```js
   const BASE_URL = "https://your-railway-url.up.railway.app";
   ```
2. Go to [netlify.com](https://netlify.com) → drag and drop the `frontend/` folder
3. Your frontend is live instantly

### Environment Variables Summary

| Variable | Where | Description |
|----------|-------|-------------|
| `HUGGINGFACE_API_KEY` | Railway | HuggingFace API token |
| `ENDEE_URL` | Railway | Endee server URL |
| `ENDEE_AUTH_TOKEN` | Railway | Endee auth token (if needed) |

---

## Author

**Vikas Rathod**  
GitHub: https://github.com/Vicky010101
