# Install Guide

## Recommended Path

For most users on Windows, the intended setup is:

1. Install Node.js 20 or newer.
2. Clone or download this repository.
3. Run `npm install`.
4. Double-click [start-traeapi.cmd](../start-traeapi.cmd).

On first launch, TraeAPI will try to:

- create `.env` from [`.env.example`](../.env.example)
- detect `Trae.exe`
- create a local workspace folder if none is configured
- attach to your existing Trae window first
- fall back to a dedicated Trae window when the current one is not automation-ready
- start the local HTTP gateway
- open the built-in chat page

## Before You Start

Make sure:

- Trae is installed on the machine.
- Trae supports `--remote-debugging-port=<port>`.
- You can sign in to Trae at least once.
- The machine can open a local browser page.

## Verify the Installation

After startup succeeds, open:

- Chat page: `http://127.0.0.1:8787/chat`
- Health check: `http://127.0.0.1:8787/health`
- Ready check: `http://127.0.0.1:8787/ready`

Minimal API test:

```bash
curl -X POST http://127.0.0.1:8787/v1/chat ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"Reply with exactly: OK\"}"
```

If the gateway is ready, you should receive a JSON response with Trae output.

## Manual Setup

If one-click startup is not enough:

1. Copy [`.env.example`](../.env.example) to `.env`.
2. Set `TRAE_BIN` to your local `Trae.exe`.
3. Optionally set a fixed `TRAE_PROJECT_DIR`.
4. Run:

```bash
npm run quickstart
```

## OpenClaw Users

If you want OpenClaw to call Trae as an IDE tool, use the native plugin integration guide:

- [OpenClaw Integration](openclaw-integration.md)

## Related Docs

- [API Reference](api.md)
- [FAQ](faq.md)
- [OpenAPI JSON](openapi.json)
- [OpenAPI YAML](openapi.yaml)
