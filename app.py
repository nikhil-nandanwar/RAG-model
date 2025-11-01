# app.py
import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import RAGIndex
from google import genai  # google-genai client
import tempfile
from pypdf import PdfReader
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize RAG index (loads sentence-transformers model)
RAG = RAGIndex()  # uses default model 'all-MiniLM-L6-v2'

# Simple in-memory store of documents
DOC_STORE = {}  # doc_id -> original_text

# Initialize Gemini client (google-genai uses env var GOOGLE_API_KEY or GEMINI_API_KEY depending on config)
# According to Gemini docs, client picks API key from env var if set.
gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not gemini_api_key:
    print("WARNING: GEMINI_API_KEY (or GOOGLE_API_KEY) not set. Set it before calling generation endpoints.")
client = genai.Client(api_key=gemini_api_key) if gemini_api_key else None

@app.route("/upload", methods=["POST"])
def upload():
    """
    Accepts multipart form with files[] (text or PDF) or a 'text' field.
    Builds/updates the RAG index synchronously.
    """
    uploaded = []
    # text field
    text_body = request.form.get("text")
    if text_body:
        doc_id = str(uuid.uuid4())
        DOC_STORE[doc_id] = text_body
        RAG.add_document(doc_id, text_body)
        uploaded.append({"doc_id": doc_id, "source": "text_field"})

    # files
    files = request.files.getlist("files")
    for f in files:
        filename = f.filename or "uploaded"
        ext = filename.split(".")[-1].lower()
        raw_text = ""
        if ext in ["txt", "md", "text"]:
            raw_text = f.read().decode("utf-8")
        elif ext == "pdf":
            # extract text from pdf
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(f.read())
                tmp.flush()
                reader = PdfReader(tmp.name)
                pages = []
                for p in reader.pages:
                    pages.append(p.extract_text() or "")
                raw_text = "\n".join(pages)
            try:
                os.unlink(tmp.name)
            except:
                pass
        else:
            # attempt to read as text
            try:
                raw_text = f.read().decode("utf-8")
            except Exception as e:
                continue

        if raw_text.strip():
            doc_id = str(uuid.uuid4())
            DOC_STORE[doc_id] = raw_text
            RAG.add_document(doc_id, raw_text)
            uploaded.append({"doc_id": doc_id, "filename": filename})
    return jsonify({"status":"ok", "uploaded": uploaded, "total_docs": len(DOC_STORE)}), 200

@app.route("/query", methods=["POST"])
def query():
    """
    Body JSON: { "question": "...", "top_k": 5, "model": "gemini-2.0-flash-exp" }
    """
    payload = request.get_json(force=True)
    question = payload.get("question")
    top_k = int(payload.get("top_k", 5))
    gemini_model = payload.get("model", "gemini-2.0-flash-exp")

    if not question:
        return jsonify({"error":"question field required"}), 400

    # Retrieve relevant chunks
    results = RAG.search(question, top_k=top_k)
    contexts = [r[0]["text"] for r in results]
    sources = [{"doc_id": r[0]["doc_id"], "chunk_id": r[0]["chunk_id"], "score": r[1]} for r in results]

    # Build prompt for Gemini: system + user
    system_prompt = (
        "You are an assistant that answers questions strictly using the provided documents. "
        "If the answer is not present in the documents, say you don't know. Provide concise, accurate answers and cite which document chunk you used."
    )

    # Compose content: include instructions, retrieved context, and question
    retrieved_text = "\n\n---\n\n".join([f"Source[{i}]:\n{c}" for i, c in enumerate(contexts)])
    user_content = (
        f"Context retrieved from documents:\n{retrieved_text}\n\n"
        f"Question: {question}\n\n"
        "Answer the question using only the above context. If it's not present, say 'Answer not available in the provided documents.' Keep answer succinct and reference Source[index]."
    )

    if client is None:
        return jsonify({"error":"Gemini client not initialized. Set GEMINI_API_KEY environment variable."}), 500

    # Call Gemini (synchronous generate_content)
    try:
        # Combine system and user prompts into a single message
        full_prompt = f"{system_prompt}\n\n{user_content}"
        
        response = client.models.generate_content(
            model=gemini_model,
            contents=full_prompt
        )
        # Extract the text from response
        answer_text = response.text
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Gemini API Error: {str(e)}")
        print(f"Traceback: {error_details}")
        return jsonify({"error":"Gemini generation failed", "detail": str(e), "traceback": error_details}), 500

    return jsonify({
        "answer": answer_text,
        "sources": sources,
        "retrieved_count": len(sources)
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
