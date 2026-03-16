# Trae CDP HTTP Bridge

This project exposes Trae through a local HTTP gateway by attaching to the Electron renderer with the Chrome DevTools Protocol, then driving the UI with JavaScript and DOM selectors.

## Requirements

- Node.js >= 22
- A Trae build that accepts `--remote-debugging-port=<port>`
- Stable selectors for:
  - the composer element
  - the send button or Enter-submit flow
  - the assistant response container

## Startup Flow

1. Configure the Trae executable:

```bash
set TRAE_BIN=C:\Path\To\Trae.exe
set TRAE_ARGS=--profile-directory=Default
```

2. Configure the selectors Trae should use:

```bash
set TRAE_COMPOSER_SELECTORS=textarea,[contenteditable='true']
set TRAE_SEND_BUTTON_SELECTORS=button[data-testid='send'],button[type='submit']
set TRAE_RESPONSE_SELECTORS=[data-message-author-role='assistant'],.assistant
```

3. Start Trae with remote debugging enabled:

```bash
npm run start:trae
```

4. Start the HTTP gateway:

```bash
npm run start:gateway
```

The gateway listens on `127.0.0.1:8787` by default and only accepts loopback requests.

You can also open a minimal browser chat client at `http://127.0.0.1:8787/chat`.
It talks to the same local API, can create sessions, send prompts, and consume streamed replies.

If you do not know the live selector set yet, inspect the attached Trae page first:

```bash
npm run inspect:trae
```

This prints the matched target, selector hit counts, and generic visible composer/button candidates so you can calibrate the environment variables before enabling message automation.

## Safe Attach Mode

If Trae is already running and you do not want the scripts to relaunch it:

```bash
set TRAE_SAFE_ATTACH_ONLY=1
npm run start:gateway
```

If the selectors or target window are not ready, `/ready` returns `AUTOMATION_NOT_READY`.

To keep the HTTP API available for local integration while Trae is offline, enable the mock driver:

```bash
set TRAE_SAFE_ATTACH_ONLY=1
set TRAE_ENABLE_MOCK_BRIDGE=1
npm run start:gateway
```

## Minimal API Usage

Create a session:

```bash
curl -X POST http://127.0.0.1:8787/v1/sessions ^
  -H "content-type: application/json" ^
  -d "{\"metadata\":{\"client\":\"demo\"}}"
```

Send a message:

```bash
curl -X POST http://127.0.0.1:8787/v1/sessions/<sessionId>/messages ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"hello\"}"
```

Open the built-in chat page:

```bash
start http://127.0.0.1:8787/chat
```

Stream a message:

```bash
curl -N -X POST http://127.0.0.1:8787/v1/sessions/<sessionId>/messages/stream ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"reply in stream mode\"}"
```

Check status:

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
```

If you enable debug endpoints, you can fetch live selector diagnostics over HTTP:

```bash
set TRAE_ENABLE_DEBUG_ENDPOINTS=1
curl http://127.0.0.1:8787/debug/automation
```

## Important Environment Variables

- `TRAE_BIN`: Trae executable path for `npm run start:trae`
- `TRAE_ARGS`: extra Trae launch arguments
- `TRAE_REMOTE_DEBUGGING_PORT`: remote debugging port, default `9222`
- `TRAE_CDP_TARGET_TITLE_CONTAINS`: optional target title filter
- `TRAE_CDP_TARGET_URL_CONTAINS`: optional target URL filter
- `TRAE_COMPOSER_SELECTORS`: comma-separated selectors for the input element
- `TRAE_SEND_BUTTON_SELECTORS`: comma-separated selectors for the submit button
- `TRAE_RESPONSE_SELECTORS`: comma-separated selectors for assistant output
- `TRAE_ACTIVITY_SELECTORS`: comma-separated fallback selectors for live chat/task container activity
- `TRAE_NEW_CHAT_SELECTORS`: optional selectors clicked once for a newly created HTTP session
- `TRAE_SEND_TRIGGER`: `button` or `enter`
- `TRAE_RESPONSE_POLL_INTERVAL_MS`: DOM polling interval, default `350`
- `TRAE_RESPONSE_IDLE_MS`: idle window before a response is considered complete, default `1200`
- `TRAE_RESPONSE_TIMEOUT_MS`: max wait for DOM output, default `30000`
- `TRAE_GATEWAY_TOKEN`: enables Bearer authentication
- `TRAE_ALLOWED_ORIGINS`: comma-separated allowed origins
- `TRAE_RATE_LIMIT_WINDOW_MS`: rate limit window, default `60000`
- `TRAE_RATE_LIMIT_MAX_REQUESTS`: requests allowed per window, default `60`
- `TRAE_ENABLE_DEBUG_ENDPOINTS`: enables `/debug/automation` for local selector diagnostics
- `TRAE_SELECTOR_INSPECT_LIMIT`: max matches returned per selector during diagnostics
- `TRAE_SELECTOR_TEXT_PREVIEW_LENGTH`: max text preview length in diagnostics
- `TRAE_SAFE_ATTACH_ONLY`: start gateway without relaunching Trae
- `TRAE_ENABLE_MOCK_BRIDGE`: use the mock driver when safe attach mode cannot find Trae

## Limitations

- DOM automation is selector-sensitive. A Trae UI update can break readiness or extraction.
- When Trae keeps assistant text hidden during task execution, the driver falls back to chat container activity text before returning a timeout.
- Requests are serialized inside the CDP driver to avoid overlapping UI operations in the same window.
- HTTP sessions are logical gateway sessions. Use `TRAE_NEW_CHAT_SELECTORS` if you want the driver to open a fresh Trae conversation per session.

## Validation

```bash
npm test
npm run lint
npm run typecheck
```
