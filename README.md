# A little corner / Personal Space

A private daily space for news, small games, journaling, weight and food logs, and conversations with a model of your choice. Version 2 centres on everyday use, with warm neutrals, a quiet illustrated desk, and day/evening themes.

The interface uses English and Canadian English date formatting. Existing journal text, messages, and custom assistant instructions keep their original language. Stored mood values remain compatible with earlier v2 backups and are displayed with English labels. Only the previous built-in Chinese assistant prompt is upgraded to the English default.

## Start

Requires **Node.js 22.18+** and npm. From a fresh clone:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4278**. The local Node service serves the frontend and provides news/model API routes. It binds to loopback only; it is intended to run on your own computer.

After modifying source:

```sh
npm run build
npm start
```

For development, `npm run dev` launches the API bridge and Vite together. Open http://127.0.0.1:4178. Keep the API bridge on port 4278 when using the provided development proxy.

**Quick visual preview:** after building, open `dist/preview.html` directly. Games, journaling, and settings work in this mode. News and model calls require the local service and intentionally show an unavailable state in a file preview. Browser data is scoped to an origin: preview, development, and production URLs keep separate records. Export/import a backup to move between them.

## Features

| Module   | Behaviour                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Today    | Time-based greeting, real record totals, personal notes, news categories                                           |
| News     | BBC World, CBC News, BBC Technology; source links, timestamps, daily cache, manual refresh, stale-cache indication |
| Play     | Bubble popping, a three-level toggle puzzle with hints/undo, and a pausable breathing animation                    |
| Journal  | Date navigation, mood, editable diary, weight, meal/calorie entries, text search, weight chart, CSV export         |
| Chat     | Saved conversations, model discovery/manual model IDs, provider switching, retry, cancellation, copy reply         |
| Settings | Display name, optional self-set calorie reference, connection configuration, JSON backup/import                    |

There are no seeded health measurements, invented news headlines, or simulated assistant replies.

## Connect a model

Open the settings control in the header, or **Chat → Connection settings**. Choose a provider, check its base URL, fetch the available models, and select a chat-capable model. Manual model IDs are also supported. A model is not installed or downloaded by this application.

### Ollama

Install [Ollama](https://ollama.com/) and run its local service. Download a model suitable for your machine using Ollama, then use:

```text
Provider: Ollama
Base URL: http://127.0.0.1:11434
Model: choose from the discovered list
```

The bridge uses [`GET /api/tags`](https://docs.ollama.com/api/tags) and [`POST /api/chat`](https://docs.ollama.com/api/chat), with non-streaming responses.

### LM Studio

Load a model and enable the local server in [LM Studio](https://lmstudio.ai/docs/developer/openai-compat). With its default example port:

```text
Provider: LM Studio
Base URL: http://127.0.0.1:1234/v1
Model: the model identifier reported by the server
```

The bridge uses `/models` and `/chat/completions`. If local authentication is enabled, enter the token for this visit or set `LOCAL_API_KEY` in `.env`.

### OpenAI

Choose OpenAI and supply your own API key. Models are fetched from your account; availability depends on that account. This adapter uses the [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) with `store: false`. It does not create a remote conversation resource. Provider-side processing and retention remain subject to your provider/account settings.

### Other compatible APIs

Choose the compatible API option, enter an HTTPS base URL, provide your key, and select or enter a model. This adapter expects OpenAI-style `/models` and `/chat/completions` endpoints. Native Anthropic/Gemini formats are not implemented; use a compatible endpoint if your service offers one. Model/tool-specific features such as files, images, tool execution, and streaming are outside this version.

### Persistent local configuration

Copy `.env.example` to `.env` and fill only the values you need, then restart the service. The example contains placeholders only.

```text
OPENAI_API_KEY=
CUSTOM_BASE_URL=
CUSTOM_API_KEY=
LOCAL_API_KEY=
```

Keys entered in the UI stay in React memory for that visit, travel to the same-origin local bridge when making a request, and are never written into browser records, backups, or a build. `.env` is ignored by Git and must remain outside shared archives. Cloud calls may incur provider charges.

## Data and daily refresh

Personal records and conversations are saved synchronously to browser `localStorage`, under `tao.daily-space.v2`. Each conversation is sent with its current message history when asking a model. Diaries, meal logs, and weight records are not automatically attached. Reply text is rendered as text, not executable HTML.

The JSON backup contains journal entries, health records, conversations, and preferences. It excludes API keys, the news cache, and puzzle best scores. An import is validated before replacing records and requires confirmation in the interface. The CSV export contains journal/weight/calorie fields and escapes spreadsheet-formula prefixes.

Browser data is local, not encrypted, not an account-backed database, and not synced between devices. Clearing site data removes it. If storage is blocked/full, the interface shows a failed-save message and offers export. If existing data cannot be read, automatic writes are blocked until a valid backup is restored. Export periodically.

The server caches news by calendar day in **America/Toronto**. While the local service runs, it checks the three feeds every 15 minutes and only refetches a feed when its cached day changes. The visible page checks once per minute and when it becomes visible. Manual refresh bypasses the daily cache. If a refresh fails, an existing cache keeps its original timestamp and is labelled stale. If no cache exists, an explicit empty/error state is shown. Shutting down the local service stops background refresh; its in-memory cache resets on restart.

## Architecture

- React 19 + TypeScript 5.9 for the UI and validated data model.
- Vite for development and a static frontend build.
- Plain CSS variables, responsive layouts, local SVG illustration, and Lucide icons.
- A small Node HTTP bridge using built-in `fetch` and Web Request/Response APIs; no server framework or extra runtime package is required.
- Pure game/data functions separated from UI components and upstream adapters.

```text
src/App.tsx                  Navigation, persistence, theme, connection state
src/features/News.tsx         News categories, refresh, browser cache
src/features/Play.tsx         Bubble and breathing interactions
src/features/Journal.tsx      Diary, meals, weight, chart, CSV
src/features/Chat.tsx         Threads, model selection, send/retry/cancel
src/features/Settings.tsx     Provider configuration and backup/import
src/lib/space.ts              Versioned data model, validation, export
src/lib/game.ts               Pure toggle-puzzle rules and solver
src/components/               Desk SVG, native modal, toggle puzzle
server/core.mjs               RSS/cache, provider adapters, request validation
server/index.mjs              Loopback HTTP adapter and static serving
scripts/                     Development launcher and standalone preview export
tests/                       Game, storage, backup, RSS, adapter tests
```

The local bridge avoids browser CORS restrictions on RSS and model services. It validates origin/host, only accepts JSON for model requests, limits request/response sizes, fixes the OpenAI endpoint, requires HTTPS for remote custom endpoints, and accepts loopback URLs for local model modes. It does not execute tools, log conversation bodies, or store API keys. The local service is not configured for an internet-facing multi-user deployment; that would require authentication, authorization, user data isolation, TLS, and a different persistence design.

Static hosting alone can display the frontend; news and model routes require the companion service. This repository contains a local application, with no hosted backend or public deployment claimed.

## Checks and maintenance

```sh
npm test
npm run typecheck
npm run build
npm run format
```

See [QA](docs/QA.md) for completed checks and limits, [maintenance](docs/MAINTENANCE.md) for edit locations, and [the Chinese guide](docs/OWNER_GUIDE.zh-CN.md) for setup/use. Tests for providers use controlled response fixtures; a passing test does not assert that a real model or paid API was contacted.

Google Fonts is optional and has local font fallbacks. System reduced-motion preferences disable animated effects. Native dialogs provide focus containment and Escape dismissal. AI tools assisted implementation and documentation; maintenance still relies on inspecting changes and running the checks.
