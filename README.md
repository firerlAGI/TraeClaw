# TraeAPI

[English](README.md) | [简体中文](README.zh-CN.md)

TraeAPI is a local HTTP bridge for Trae desktop.

It attaches to the Trae Electron window through the Chrome DevTools Protocol, drives the rendered UI with DOM selectors, and exposes a stable local API that other tools can call.

This project is meant to be used as a local interface service.
It is not an official Trae API.

## What You Get

- Local HTTP API for sessions, messages, and streaming replies
- Built-in browser chat page at `/chat`
- Health and readiness probes
- Optional token auth and origin controls
- Selector diagnostics for maintaining the bridge across Trae UI changes

## Requirements

- Node.js `>= 22`
- A Trae build that supports `--remote-debugging-port=<port>`
- A Trae window with a project already open
- DOM selectors that match the current Trae UI

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Use [.env.example](.env.example) as a checklist and set the required environment variables in your shell:

```bash
set TRAE_BIN=C:\Path\To\Trae.exe
set TRAE_COMPOSER_SELECTORS=textarea,[contenteditable='true']
set TRAE_SEND_BUTTON_SELECTORS=button[data-testid='send'],button[type='submit']
set TRAE_RESPONSE_SELECTORS=[data-message-author-role='assistant'],.assistant
```

At minimum, set:

- `TRAE_BIN`
- `TRAE_COMPOSER_SELECTORS`
- `TRAE_SEND_BUTTON_SELECTORS`
- `TRAE_RESPONSE_SELECTORS`

TraeAPI does not auto-load `.env` files right now.
If you prefer an env file workflow, load it through your shell, process manager, or wrapper script before starting the commands below.

3. Start Trae with remote debugging enabled:

```bash
npm run start:trae
```

4. Start the local gateway:

```bash
npm run start:gateway
```

5. Verify readiness:

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
```

6. Call the API or open the built-in local UI:

```bash
start http://127.0.0.1:8787/chat
```

## Public API Surface

TraeAPI currently exposes these stable local endpoints:

- `GET /health`
- `GET /ready`
- `POST /v1/sessions`
- `GET /v1/sessions/{sessionId}`
- `POST /v1/sessions/{sessionId}/messages`
- `POST /v1/sessions/{sessionId}/messages/stream`

Full request and response details are documented in [docs/api.md](docs/api.md).

## Minimal Usage

Create a session:

```bash
curl -X POST http://127.0.0.1:8787/v1/sessions ^
  -H "content-type: application/json" ^
  -d "{\"metadata\":{\"client\":\"demo\"}}"
```

Send a blocking message:

```bash
curl -X POST http://127.0.0.1:8787/v1/sessions/<sessionId>/messages ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"Summarize this project in one paragraph.\"}"
```

Send a streaming message:

```bash
curl -N -X POST http://127.0.0.1:8787/v1/sessions/<sessionId>/messages/stream ^
  -H "accept: text/event-stream" ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"Explain what you are doing step by step.\"}"
```

## Example Clients

- Python: [examples/python/client.py](examples/python/client.py)
- Node.js: [examples/node/client.mjs](examples/node/client.mjs)

Both examples support:

- `TRAE_API_BASE_URL`
- `TRAE_API_TOKEN`
- `TRAE_API_PROMPT`
- `TRAE_API_STREAM`

## Configuration

See [.env.example](.env.example) for the full set.

Most important settings:

- `TRAE_BIN`: Trae executable path
- `TRAE_REMOTE_DEBUGGING_PORT`: remote debugging port, default `9222`
- `TRAE_COMPOSER_SELECTORS`: selectors for the input element
- `TRAE_SEND_BUTTON_SELECTORS`: selectors for the send button
- `TRAE_RESPONSE_SELECTORS`: selectors for assistant output
- `TRAE_ACTIVITY_SELECTORS`: selectors used to capture task/process text
- `TRAE_NEW_CHAT_SELECTORS`: selectors used to open a fresh Trae conversation for a new HTTP session
- `TRAE_GATEWAY_TOKEN`: enables Bearer auth on API routes
- `TRAE_ALLOWED_ORIGINS`: optional allowlist for browser callers
- `TRAE_ENABLE_DEBUG_ENDPOINTS`: enables `/debug/automation`

## Selector Discovery

If you do not know the correct selector set yet, inspect the live Trae window first:

```bash
npm run inspect:trae
```

That will print:

- matched target info
- selector hit counts
- generic visible composer/button candidates
- response and activity container diagnostics

## Safe Attach Mode

If Trae is already running and you do not want the scripts to relaunch it:

```bash
set TRAE_SAFE_ATTACH_ONLY=1
npm run start:gateway
```

If you want the local API to stay available while Trae is offline:

```bash
set TRAE_SAFE_ATTACH_ONLY=1
set TRAE_ENABLE_MOCK_BRIDGE=1
npm run start:gateway
```

## Operational Notes

- The gateway only listens on loopback addresses.
- Message extraction is DOM-based, not OCR-based and not backed by a private Trae API.
- Process text and final reply text both come from rendered UI containers.
- HTTP sessions are logical gateway sessions, not durable Trae-side session IDs.
- Requests are serialized in the automation driver so multiple callers do not click/type into the same Trae window at once.

## Debugging

Basic checks:

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
npm run inspect:trae
```

Optional detailed diagnostics:

```bash
set TRAE_ENABLE_DEBUG_ENDPOINTS=1
curl http://127.0.0.1:8787/debug/automation
```

## Limitations

- Trae UI updates can break selectors.
- Some Trae tasks expose richer process text than final assistant text, so both are collected from the DOM stream.
- Session state is in-memory only.
- This is a local desktop automation bridge, so it depends on the local Trae window staying available and stable.

## Validation

```bash
npm test
npm run lint
npm run typecheck
```
