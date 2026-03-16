const test = require("node:test");
const assert = require("node:assert/strict");
const { discoverTraeTarget, selectDebuggerTarget } = require("./discovery");

test("selectDebuggerTarget prefers the page target matching configured filters", () => {
  const target = selectDebuggerTarget(
    [
      {
        id: "devtools",
        type: "page",
        title: "DevTools",
        url: "devtools://devtools/bundled/inspector.html"
      },
      {
        id: "other-page",
        type: "page",
        title: "Other App",
        url: "https://example.test"
      },
      {
        id: "trae-page",
        type: "page",
        title: "Trae Workspace",
        url: "https://trae.local/app",
        webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/page/trae-page"
      }
    ],
    {
      titleContains: ["Trae"],
      urlContains: ["trae.local"]
    }
  );

  assert.equal(target.id, "trae-page");
});

test("discoverTraeTarget returns the debugger version and selected page target", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).endsWith("/json/version")) {
      return {
        ok: true,
        async json() {
          return {
            Browser: "Chrome/123.0.0.0",
            webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/browser-id"
          };
        }
      };
    }

    if (String(url).endsWith("/json/list")) {
      return {
        ok: true,
        async json() {
          return [
            {
              id: "page-1",
              type: "page",
              title: "Trae",
              url: "https://trae.local",
              webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/page/page-1"
            }
          ];
        }
      };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const discovered = await discoverTraeTarget({
      host: "127.0.0.1",
      port: 9222,
      titleContains: ["Trae"]
    });

    assert.equal(discovered.version.Browser, "Chrome/123.0.0.0");
    assert.equal(discovered.target.id, "page-1");
    assert.equal(discovered.target.webSocketDebuggerUrl.includes("/page/page-1"), true);
  } finally {
    global.fetch = originalFetch;
  }
});
