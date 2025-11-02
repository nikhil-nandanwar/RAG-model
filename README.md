# RAG-model

This repository contains a simple RAG (retrieval-augmented generation) backend using Flask, SentenceTransformers and FAISS, plus a small Vite React frontend in `frontEnd/`.

## Quick facts

- Backend entrypoint: `app.py` (Flask app variable `app`)
- Uses Gunicorn for production (recommended)
- Frontend uses Vite and builds to `dist/` (Vite default)

## Deploying to Render (recommended minimal steps)

You can deploy the backend as a Render Web Service and the frontend as a Render Static Site. Below are the minimal steps to deploy both.

### Backend (Python web service)

1. Commit your repo to a Git provider (GitHub/GitLab/Bitbucket) and connect it to Render.
2. On Render create a new "Web Service" and connect to your repo/branch.
3. Environment: choose "Python" (or Render will detect Python).
4. Build command: leave blank (Render will run pip install using `requirements.txt`).
5. Start command: the app includes a `Procfile` which runs Gunicorn:

	web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1

	(Render will pick this up automatically). Alternatively set start command to:

	gunicorn app:app --bind 0.0.0.0:$PORT --workers 1

6. Add required environment variables (on the Render dashboard > Environment > Environment Variables):

	- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) — your Google/Gemini API key
	- `REQUIRE_GEMINI` — optionally `true` to make the app fail fast if the key is missing

	You can use the `.env.template` in the repository as a reference for which variables to set.

7. (Optional) Increase `workers` in the Procfile or Render settings for production traffic. For small apps 1 worker is fine.

### Frontend (Vite static site)

You can deploy the frontend separately as a Static Site on Render.

1. Create a new "Static Site" on Render and connect it to the same repo.
2. In the "Build Command" put:

	cd frontEnd && npm install && npm run build

3. In the "Publish Directory" set:

	frontEnd/dist

4. The static site will be served from Render's CDN. If you want the backend to serve the built frontend, you can instead run the frontend build during backend deploy and copy `frontEnd/dist` to a `static/` folder served by Flask — but deploying separately is simpler.

### Notes & tips

- `requirements.txt` already includes `gunicorn` so Render will install it.
- Ensure large models and heavy dependencies (sentence-transformers, faiss) fit within Render's service limits; consider using a server with more CPU/memory if needed.
- For local testing, copy `.env.template` to `.env` and set values. Do NOT commit secret keys.

### Example `render.yaml` (optional)

If you prefer to use Render's infrastructure-as-code, add a `render.yaml` with two services (backend and static site). The exact schema depends on your desired region and plan; here's a minimal example to adapt:

```yaml
# Example; adapt names, regions and plans before using
services:
  - type: web
	 name: rag-backend
	 env: python
	 plan: free
	 startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1

static_sites:
  - name: rag-frontend
	 repo: <your-repo>
	 branch: main
	 buildCommand: cd frontEnd && npm install && npm run build
	 publishPath: frontEnd/dist

```

Replace `<your-repo>` and other placeholders before applying.

## Local development

- Backend: `FLASK_DEBUG=1 python app.py` or use the included Procfile via foreman/overmind if you prefer.
- Frontend: `cd frontEnd && npm install && npm run dev`

## Security

- Never commit real API keys. Use Render's Environment > Secrets to store `GEMINI_API_KEY`.

