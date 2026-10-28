# Your personal corner

## Full experience

Install Node.js 22.18 or later. In the extracted project folder, run:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4278**. Build once after downloading the source, and rebuild after changing it.

News requires the local service and an internet connection. Chat requires a running local model or your own API key.

## Quick preview

After building, open **`dist/preview.html`** directly. Games, journaling, weight, and food records work offline. News and AI calls require the local service above. Preview and HTTP URLs have separate browser records; use Export full backup / Import backup to move them.

## AI connection

Open Settings → choose a provider → Fetch models → choose a chat model.

- **Ollama:** start the service and download a model first; default URL `http://127.0.0.1:11434`.
- **LM Studio:** load a model and enable its local server; example URL `http://127.0.0.1:1234/v1`.
- **OpenAI:** enter your own API key or configure it in the local `.env` file.
- **Other compatible API:** enter an HTTPS base URL, your key, and a model ID.

The interface and default assistant instructions use English. Your existing entries, conversations, and custom instructions keep their original language.

## Records and backup

Journal entries, health logs, settings, and chats stay in this browser. Export JSON backups in Settings; Journal also supports CSV export. Keys entered in the interface are kept for this visit only and are excluded from backups. Personal journal and health records are not automatically sent to a model.

## Documentation

- `README.md`: architecture and detailed setup.
- `docs/OWNER_GUIDE.zh-CN.md`: optional Chinese usage guide.
- `docs/MAINTENANCE.md`: edit locations and manual checks.
- `docs/QA.md`: verification results and limits.

The build and automated checks have passed. The authoring environment prevented local port binding; no live deployment or completed real-model/browser test is claimed. See the verification record before relying on network features.
