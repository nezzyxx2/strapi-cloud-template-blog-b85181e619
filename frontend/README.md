# FTR Digital Agency Site

Modern Svelte + Vite single page showcasing FTR Digital's services, portfolio and partnerships. Inspired by ScriptShare, Lexis and other references, with a desktop-first layout and subtle animations.

## Quick start

```bash
npm install
npm run dev
```

Visit http://localhost:5174 to preview.

Need a one-shot dependency install on Windows? Run:

```cmd
installreq.bat
```

### Full stack dev shortcut (Windows)

Use `run.bat` to launch every required service (Vite dev server, admin data API, Binx AI proxy) inside a single console session:

```cmd
run.bat
```

The script calls `installreq.bat` if `node_modules/` is missing, then streams all service logs into the same window. Press `Ctrl+C` to stop the whole stack at once.

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – production bundle in `dist/`
- `npm run preview` – preview production bundle
- `npm run check` – `svelte-check` diagnostics
- `npm run ai-proxy` – lightweight Binx AI relay (`server/ai-chat-proxy.js`)

## AI Copilot / Binx Proxy

The admin AI chat now tries a configurable list of endpoints before falling back to the remote Binx instance. To avoid CORS issues, run the local proxy and point the client at it:

1. Start the relay (in a second terminal):
	```bash
	npm run ai-proxy
	```
2. Expose the proxy URL to the Svelte app:
	```bash
	# Windows (cmd)
	set VITE_AI_PROXY=http://localhost:8787/api/ai/chat
	npm run dev
	```

Optional environment variables:

- `VITE_AI_KEY` – adds an `x-api-key` header per request (useful for third-party relays).
- `VITE_AI_BEARER` – injects an `Authorization: Bearer …` header when the upstream expects JWTs.
- `BINX_API_KEY` or `BINX_API_BEARER` – credentials consumed by `npm run ai-proxy` when forwarding to `https://binx.cc/api/ai-chat`.
- `BINX_API_URL` – override the upstream URL entirely.

The Svelte admin chat honors `VITE_AI_PROXY` alongside the optional key/bearer vars so the UI reaches your local relay before trying any upstream endpoint; headers are applied automatically when provided.

### Use a GitHub-hosted local model (Ollama)

Want to avoid third-party APIs altogether? Grab [Ollama](https://github.com/ollama/ollama) — an open-source, OpenAI-compatible server — and point the admin console at it:

1. Install and start Ollama:
	```cmd
	winget install Ollama.Ollama
	ollama serve
	ollama pull llama3
	```
2. In a new terminal, expose the OpenAI-compatible endpoint to the Svelte app:
	```cmd
	set VITE_OLLAMA_URL=http://localhost:11434/v1/chat/completions
	set VITE_OLLAMA_MODEL=llama3
	npm run dev
	```

With those env vars set, the admin AI panel will hit your local Ollama instance first, fall back to any configured remote providers, and only drop to the offline draft mode if everything else is unavailable.

Without credentials the proxy returns a sandboxed echo so the UI never hard-fails with “Failed to fetch”.

## Structure

```
frontend/
├── public/
│   └── site.json          # Editable site copy + data
├── src/
│   ├── App.svelte         # Page composition
│   ├── main.js            # Entry point
│   ├── index.css          # Tokens + shared styles
│   ├── data/theme.js      # Helpers for gradients + palettes
│   └── components/        # Section components
└── README.md
```

Update `public/site.json` to refresh services, portfolio, testimonials, etc. Colors update automatically via CSS custom properties.
