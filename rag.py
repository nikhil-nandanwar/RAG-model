# rag.py
import os
import math
from typing import List, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from tqdm import tqdm

DEFAULT_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

class RAGIndex:
    def __init__(self, embedding_model_name: str = DEFAULT_MODEL_NAME, dim: int = None, persist_path: str = None):
        # load local sentence-transformer model
        self.model = SentenceTransformer(embedding_model_name)
        self.dim = dim or self.model.get_sentence_embedding_dimension()
        self.index = faiss.IndexFlatIP(self.dim)  # inner-product (cosine when normalized)
        self.texts = []  # metadata: list of (doc_id, chunk_id, text)
        self.persist_path = persist_path

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
        tokens = text.split()
        chunks = []
        i = 0
        while i < len(tokens):
            chunk = tokens[i:i+chunk_size]
            chunks.append(" ".join(chunk))
            i += chunk_size - chunk_overlap
        return chunks

    def add_document(self, doc_id: str, text: str, chunk_size: int = 500, chunk_overlap: int = 50):
        chunks = self.chunk_text(text, chunk_size, chunk_overlap)
        embeddings = self.model.encode(chunks, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)

        # Ensure index has right dim
        if self.index.ntotal == 0 and self.dim is None:
            self.dim = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(self.dim)

        self.index.add(embeddings.astype('float32'))
        for i, c in enumerate(chunks):
            self.texts.append({
                "doc_id": doc_id,
                "chunk_id": i,
                "text": c
            })

    def search(self, query: str, top_k: int = 5) -> List[Tuple[dict, float]]:
        q_emb = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype('float32')
        if self.index.ntotal == 0:
            return []
        D, I = self.index.search(q_emb, top_k)
        results = []
        for idx, score in zip(I[0], D[0]):
            if idx < len(self.texts):
                results.append((self.texts[idx], float(score)))
        return results

    def rebuild_from(self, docs: List[Tuple[str, str]]):
        # docs: list of (doc_id, text)
        self.index.reset()
        self.texts = []
        for doc_id, text in docs:
            self.add_document(doc_id, text)

    # Optional: persistence helpers (save/load) can be added
