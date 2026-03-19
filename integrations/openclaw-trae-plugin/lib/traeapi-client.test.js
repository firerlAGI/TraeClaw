const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const {
  TraeApiClient,
  formatDelegateToolResult,
  formatNewChatToolResult,
  formatOpenProjectToolResult,
  formatStatusToolResult,
  formatSwitchModeToolResult,
  getBundledQuickstartDefaults,
  resolveReplyText,
  resolveBundledRuntimeRoot,
  resolvePluginRuntimeConfig,
  stripDuplicateFinalText
} = require("./traeapi-client");

test("resolvePluginRuntimeConfig reads plugin config from api.config", () => {
  const config = resolvePluginRuntimeConfig({
    config: {
      plugins: {
        entries: {
          "trae-ide": {
            config: {
              baseUrl: "http://127.0.0.1:9999/",
              token: "abc",
              autoStart: true,
              readyTimeoutMs: 1234,
              requestTimeoutMs: 5678
            }
          }
        }
      }
    }
  });

  assert.equal(config.baseUrl, "http://127.0.0.1:9999");
  assert.equal(config.token, "abc");
  assert.equal(config.autoStart, true);
  assert.equal(config.readyTimeoutMs, 1234);
  assert.equal(config.requestTimeoutMs, 5678);
});

test("stripDuplicateFinalText removes final reply from process chunks", () => {
  assert.deepEqual(stripDuplicateFinalText(["step 1", "done", "done"], "done"), ["step 1"]);
});

test("formatters produce readable summaries", () => {
  const statusText = formatStatusToolResult({
    baseUrl: "http://127.0.0.1:8787",
    gatewayReachable: true,
    ready: true,
    autoStarted: false,
    healthSummary: "ok",
    readySummary: "cdp"
  });
  assert.equal(statusText.includes("Automation ready: yes"), true);

  const delegateText = formatDelegateToolResult({
    data: {
      sessionId: "s1",
      requestId: "r1",
      sessionCreated: true,
      result: {
        response: {
          text: "final answer"
        },
        chunks: ["step 1", "final answer"]
      }
    }
  });
  assert.equal(delegateText, "final answer");

  const verboseDelegateText = formatDelegateToolResult(
    {
      data: {
        sessionId: "s1",
        requestId: "r1",
        sessionCreated: true,
        result: {
          response: {
            text: "final answer"
          },
          chunks: ["step 1", "final answer"]
        }
      }
    },
    {
      includeProcessText: true
    }
  );
  assert.equal(verboseDelegateText.includes("Final reply"), true);
  assert.equal(verboseDelegateText.includes("step 1"), true);
  assert.equal(verboseDelegateText.includes("1. final answer"), false);

  const newChatText = formatNewChatToolResult({
    data: {
      session: {
        sessionId: "session-new"
      },
      prepared: true,
      preparation: {
        requestId: "prepare-1",
        preparation: {
          trigger: "new_chat"
        }
      }
    }
  });
  assert.equal(newChatText.includes("New Trae chat created."), true);
  assert.equal(newChatText.includes("Session ID: session-new"), true);

  const openProjectText = formatOpenProjectToolResult({
    projectName: "my-project",
    projectPath: "/tmp/my-project",
    ready: true,
    autoStarted: true,
    alreadyOpen: false,
    windowTitle: "my-project - Trae"
  });
  assert.equal(openProjectText.includes("Trae project opened."), true);
  assert.equal(openProjectText.includes("Project: my-project"), true);
  assert.equal(openProjectText.includes("Quickstart triggered: yes"), true);

  const switchModeText = formatSwitchModeToolResult({
    autoStarted: true,
    data: {
      mode: "ide",
      previousMode: "solo",
      changed: true,
      target: {
        title: "my-project - Trae"
      }
    }
  });
  assert.equal(switchModeText.includes("Trae mode switched."), true);
  assert.equal(switchModeText.includes("Current mode: ide"), true);
  assert.equal(switchModeText.includes("Quickstart triggered: yes"), true);
});

test("resolveReplyText falls back to the last chunk when response text is empty", () => {
  assert.equal(
    resolveReplyText({
      data: {
        result: {
          response: {
            text: ""
          },
          chunks: ["step 1", "delegate ok"]
        }
      }
    }),
    "delegate ok"
  );
});

test("TraeApiClient delegates tasks through /v1/chat", async () => {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/ready") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { automation: { mode: "cdp" } } }));
      return;
    }

    if (req.url === "/v1/chat") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        const parsed = JSON.parse(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              sessionId: "session-1",
              sessionCreated: true,
              requestId: "request-1",
              echo: parsed.content,
              result: {
                response: {
                  text: "delegate ok"
                },
                chunks: ["step 1", "delegate ok"]
              }
            }
          })
        );
      });
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { status: "ok" } }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const client = new TraeApiClient({
    baseUrl: `http://127.0.0.1:${port}`,
    token: "",
    autoStart: false,
    quickstartCommand: "",
    quickstartCwd: "",
    readyTimeoutMs: 5000,
    requestTimeoutMs: 5000
  });

  try {
    const response = await client.delegateTask({
      task: "Fix this bug"
    });
    assert.equal(response.data.result.response.text, "delegate ok");

    const status = await client.getStatus();
    assert.equal(status.gatewayReachable, true);
    assert.equal(status.ready, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("openProject returns early when the requested project is already open", async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "trae-open-project-ready-"));
  const projectName = path.basename(projectDir);
  const client = new TraeApiClient({
    baseUrl: "http://127.0.0.1:8787",
    token: "",
    autoStart: false,
    quickstartCommand: "",
    quickstartCwd: "",
    readyTimeoutMs: 200,
    requestTimeoutMs: 200
  });

  client.getHealth = async () => ({
    ok: true,
    status: 200,
    json: {
      data: {
        automation: {
          ready: true,
          target: {
            title: `${projectName} - Trae`
          }
        }
      }
    }
  });
  client.startQuickstart = async () => {
    throw new Error("startQuickstart should not be called when the project is already open");
  };

  try {
    const result = await client.openProject({
      projectPath: projectDir
    });
    assert.equal(result.alreadyOpen, true);
    assert.equal(result.autoStarted, false);
    assert.equal(result.windowTitle, `${projectName} - Trae`);
  } finally {
    fs.rmSync(projectDir, {
      recursive: true,
      force: true
    });
  }
});

test("openProject starts quickstart with project overrides and waits for the new title", async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "trae-open-project-launch-"));
  const projectName = path.basename(projectDir);
  const client = new TraeApiClient({
    baseUrl: "http://127.0.0.1:8787",
    token: "",
    autoStart: false,
    quickstartCommand: "\"/tmp/start-traeapi.command\"",
    quickstartCwd: "/tmp",
    readyTimeoutMs: 500,
    requestTimeoutMs: 500
  });

  let healthCallCount = 0;
  let quickstartOptions = null;
  client.getHealth = async () => {
    healthCallCount += 1;
    if (healthCallCount === 1) {
      return {
        ok: true,
        status: 200,
        json: {
          data: {
            automation: {
              ready: true,
              target: {
                title: "old-project - Trae"
              }
            }
          }
        }
      };
    }

    return {
      ok: true,
      status: 200,
      json: {
        data: {
          automation: {
            ready: true,
            target: {
              title: `${projectName} - Trae`
            }
          }
        }
      }
    };
  };
  client.startQuickstart = async (options = {}) => {
    quickstartOptions = options;
  };

  try {
    const result = await client.openProject({
      projectPath: projectDir
    });
    assert.equal(result.alreadyOpen, false);
    assert.equal(result.autoStarted, true);
    assert.equal(result.windowTitle, `${projectName} - Trae`);
    assert.deepEqual(quickstartOptions, {
      envOverrides: {
        TRAE_QUICKSTART_PROJECT_PATH: path.resolve(projectDir),
        TRAE_QUICKSTART_FORCE_FRESH_WINDOW: "1"
      }
    });
  } finally {
    fs.rmSync(projectDir, {
      recursive: true,
      force: true
    });
  }
});

test("delegateTask opens the requested project before sending the task", async () => {
  const client = new TraeApiClient({
    baseUrl: "http://127.0.0.1:8787",
    token: "",
    autoStart: false,
    quickstartCommand: "",
    quickstartCwd: "",
    readyTimeoutMs: 500,
    requestTimeoutMs: 500
  });

  let openedProjectPath = "";
  let requestedBody = null;
  client.openProject = async ({ projectPath }) => {
    openedProjectPath = projectPath;
    return {
      projectPath,
      ready: true
    };
  };
  client.ensureReady = async () => ({
    ready: true,
    autoStarted: false,
    readyResponse: {
      ok: true,
      json: {
        success: true
      }
    }
  });
  client.request = async (_pathname, options = {}) => {
    requestedBody = options.body;
    return {
      ok: true,
      status: 200,
      json: {
        success: true,
        data: {
          result: {
            response: {
              text: "delegate ok"
            }
          }
        }
      }
    };
  };

  const result = await client.delegateTask({
    task: "Inspect this project",
    projectPath: "/tmp/sample-project"
  });

  assert.equal(openedProjectPath, "/tmp/sample-project");
  assert.equal(requestedBody.content, "Inspect this project");
  assert.equal(result.data.result.response.text, "delegate ok");
});

test("switchMode posts the requested mode to the gateway without a readiness preflight", async () => {
  const client = new TraeApiClient({
    baseUrl: "http://127.0.0.1:8787",
    token: "",
    autoStart: false,
    quickstartCommand: "",
    quickstartCwd: "",
    readyTimeoutMs: 500,
    requestTimeoutMs: 500
  });

  let requestedPath = "";
  let requestedBody = null;
  let ensureReadyCalled = false;
  client.ensureReady = async () => {
    ensureReadyCalled = true;
    return {
      ready: true,
      autoStarted: true,
      readyResponse: {
        ok: true,
        json: {
          success: true
        }
      }
    };
  };
  client.request = async (pathname, options = {}) => {
    requestedPath = pathname;
    requestedBody = options.body;
    return {
      ok: true,
      status: 200,
      json: {
        success: true,
        data: {
          mode: "ide",
          previousMode: "solo",
          changed: true
        }
      }
    };
  };

  const result = await client.switchMode({
    mode: "ide"
  });

  assert.equal(requestedPath, "/v1/mode");
  assert.deepEqual(requestedBody, {
    mode: "ide"
  });
  assert.equal(result.data.mode, "ide");
  assert.equal(result.autoStarted, false);
  assert.equal(ensureReadyCalled, false);
});

test("getBundledQuickstartDefaults picks the macOS launcher when available", () => {
  const defaults = getBundledQuickstartDefaults({
    platform: "darwin",
    execPath: "/usr/local/bin/node"
  });

  assert.equal(defaults.quickstartCommand.includes("start-traeapi.command"), true);
});

test("getBundledQuickstartDefaults prefers the bundled runtime when present", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trae-plugin-runtime-"));
  const packageRoot = path.join(tempRoot, "plugin");
  const bundledRuntimeRoot = path.join(packageRoot, "runtime", "traeapi");
  fs.mkdirSync(path.join(bundledRuntimeRoot, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(bundledRuntimeRoot, "scripts", "quickstart.js"), "console.log('ok');\n", "utf8");
  fs.writeFileSync(path.join(bundledRuntimeRoot, "start-traeapi.command"), "#!/bin/bash\n", "utf8");

  try {
    assert.equal(resolveBundledRuntimeRoot({ packageRoot }), bundledRuntimeRoot);
    const defaults = getBundledQuickstartDefaults({
      packageRoot,
      platform: "darwin",
      execPath: "/usr/local/bin/node"
    });
    assert.equal(defaults.quickstartCommand, `"${path.join(bundledRuntimeRoot, "start-traeapi.command")}"`);
    assert.equal(defaults.quickstartCwd, bundledRuntimeRoot);
  } finally {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true
    });
  }
});
