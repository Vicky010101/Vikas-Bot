import os
from dotenv import load_dotenv

load_dotenv()

ENDEE_URL           = os.getenv("ENDEE_URL", "http://localhost:8080/api/v1")
ENDEE_AUTH_TOKEN    = os.getenv("ENDEE_AUTH_TOKEN", "")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")

INDEX_NAME      = "rag_knowledge_base"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"   # 384-dim
EMBEDDING_DIM   = 384
CHUNK_SIZE      = 500                   # words per chunk
CHUNK_OVERLAP   = 50                    # word overlap
TOP_K           = 5                     # chunks to retrieve
