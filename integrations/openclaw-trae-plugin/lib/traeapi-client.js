const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PLUGIN_ID = "trae-ide";
const DEFAULT_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_READY_TIMEOUT_MS = 45000;
const DEFAULT_REQUEST_TIMEOUT_MS = 180000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstObject(candidates) {
  for (const candidate of candidates) {
    if (isPlainObject(candidate)) {
      return candidate;
    }
  }
  return {};
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return !["0", "false", "no", "off"].includes(String(value).trim().toLowerCase());
}

function normalizeInteger(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : fallback;
}

function normalizeBaseUrl(value) {
  const normalized = String(value || DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;
  return normalized.replace(/\/+$/, "");
}

function quoteShellPath(value) {
  return `"${String(value || "").replaceAll("\\\"", "\\\\\\\"")}"`;
}

function resolveBundledRuntimeRoot(options = {}) {
  const packageRoot = path.resolve(options.packageRoot || path.join(__dirname, ".."));
  const bundledRuntimeRoot = path.join(packageRoot, "runtime", "traeapi");
  if (fs.existsSync(path.join(bundledRuntimeRoot, "scripts", "quickstart.js"))) {
    return bundledRuntimeRoot;
  }

  const sourceRepoRoot = path.resolve(packageRoot, "..", "..");
  if (
    fs.existsSync(path.join(sourceRepoRoot, "scripts", "quickstart.js")) &&
    fs.existsSync(path.join(sourceRepoRoot, "integrations", "openclaw-trae-plugin", "index.js"))
  ) {
    return sourceRepoRoot;
  }

  return "";
}

function getBundledQuickstartDefaults(options = {}) {
  const repoRoot = resolveBundledRuntimeRoot(options);
  const platform = options.platform || process.platform;
  const nodeExecPath = options.execPath || process.execPath;
  if (!repoRoot) {
    return {
      quickstartCommand: "",
      quickstartCwd: ""
    };
  }
  const windowsLauncher = path.join(repoRoot, "start-traeapi.cmd");
  const macLauncher = path.join(repoRoot, "start-traeapi.command");
  const posixLauncher = path.join(repoRoot, "start-traeapi.sh");

  if (platform === "win32" && fs.existsSync(windowsLauncher)) {
    return {
      quickstartCommand: quoteShellPath(windowsLauncher),
      quickstartCwd: repoRoot
    };
  }

  if (platform === "darwin" && fs.existsSync(macLauncher)) {
    return {
      quickstartCommand: quoteShellPath(macLauncher),
      quickstartCwd: repoRoot
    };
  }

  if (platform !== "win32" && fs.existsSync(posixLauncher)) {
    return {
      quickstartCommand: quoteShellPath(posixLauncher),
      quickstartCwd: repoRoot
    };
  }

  const quickstartScript = path.join(repoRoot, "scripts", "quickstart.js");
  if (fs.existsSync(quickstartScript)) {
    return {
      quickstartCommand: `${quoteShellPath(nodeExecPath)} ${quoteShellPath(quickstartScript)}`,
      quickstartCwd: repoRoot
    };
  }

  return {
    quickstartCommand: "",
    quickstartCwd: ""
  };
}

function readPluginConfig(api) {
  const directConfig = firstObject([api?.pluginConfig, api?.entry?.config, api?.plugin?.config]);
  const configFromRoot = firstObject([
    api?.config?.plugins?.entries?.[PLUGIN_ID]?.config,
    api?.config?.plugins?.entries?.["trae-ide"]?.config
  ]);
  return {
    ...configFromRoot,
    ...directConfig
  };
}

function resolvePluginRuntimeConfig(api) {
  const rawConfig = readPluginConfig(api);
  const defaultQuickstart = getBundledQuickstartDefaults();
  return {
    pluginId: PLUGIN_ID,
    baseUrl: normalizeBaseUrl(rawConfig.baseUrl || process.env.TRAE_API_BASE_URL || DEFAULT_BASE_URL),
    token: String(rawConfig.token || process.env.TRAE_API_TOKEN || "").trim(),
    autoStart: normalizeBoolean(rawConfig.autoStart ?? process.env.TRAE_API_AUTOSTART, false),
    quickstartCommand: String(rawConfig.quickstartCommand || process.env.TRAE_API_QUICKSTART_COMMAND || defaultQuickstart.quickstartCommand).trim(),
    quickstartCwd: String(rawConfig.quickstartCwd || process.env.TRAE_API_QUICKSTART_CWD || defaultQuickstart.quickstartCwd).trim(),
    readyTimeoutMs: normalizeInteger(rawConfig.readyTimeoutMs || process.env.TRAE_API_READY_TIMEOUT_MS, DEFAULT_READY_TIMEOUT_MS),
    requestTimeoutMs: normalizeInteger(rawConfig.requestTimeoutMs || process.env.TRAE_API_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS)
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildHeaders(config, extraHeaders = {}) {
  const headers = {
    Accept: "application/json",
    ...extraHeaders
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  return headers;
}

async function readJsonResponse(response) {
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    json: text ? JSON.parse(text) : null
  };
}

function normalizeChunks(result) {
  return Array.isArray(result?.data?.result?.chunks)
    ? result.data.result.chunks.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function uniqueNormalizedList(items = []) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const normalized = String(item || "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function stripDuplicateFinalText(chunks, finalText) {
  const normalizedFinal = String(finalText || "").trim();
  if (!normalizedFinal) {
    return uniqueNormalizedList(chunks);
  }
  return uniqueNormalizedList(chunks).filter((chunk) => chunk !== normalizedFinal);
}

function formatListSection(title, items) {
  if (!items.length) {
    return "";
  }
  return `${title}\n${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
}

function formatStatusToolResult(status) {
  const lines = [
    "TraeClaw status",
    `Base URL: ${status.baseUrl}`,
    `Gateway reachable: ${status.gatewayReachable ? "yes" : "no"}`,
    `Automation ready: ${status.ready ? "yes" : "no"}`
  ];

  if (status.autoStarted) {
    lines.push("Auto-start attempted: yes");
  }
  if (status.healthSummary) {
    lines.push(`Health: ${status.healthSummary}`);
  }
  if (status.readySummary) {
    lines.push(`Ready detail: ${status.readySummary}`);
  }
  if (status.errorMessage) {
    lines.push(`Error: ${status.errorMessage}`);
  }

  return lines.join("\n");
}

function formatNewChatToolResult(result) {
  const data = result?.data || {};
  const session = data.session || {};
  const preparation = data.preparation || {};
  const lines = [
    "New Trae chat created.",
    `Session ID: ${session.sessionId || "unknown"}`,
    `Prepared in Trae: ${data.prepared === true ? "yes" : "no"}`
  ];

  if (preparation.requestId) {
    lines.push(`Request ID: ${preparation.requestId}`);
  }
  if (preparation.preparation?.trigger) {
    lines.push(`Trigger: ${preparation.preparation.trigger}`);
  }

  return lines.join("\n");
}

function extractHealthWindowTitle(response) {
  const candidates = [
    response?.json?.data?.automation?.target?.title,
    response?.json?.data?.automation?.snapshot?.lastReadiness?.target?.title
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function matchesProjectWindowTitle(windowTitle, projectName) {
  const normalizedTitle = String(windowTitle || "").trim().toLowerCase();
  const normalizedProjectName = String(projectName || "").trim().toLowerCase();
  return Boolean(normalizedTitle && normalizedProjectName && normalizedTitle.includes(normalizedProjectName));
}

function readResponseErrorMessage(response, fallbackMessage) {
  return (
    response?.json?.message ||
    response?.json?.details?.message ||
    response?.error?.message ||
    fallbackMessage
  );
}

function resolveReplyText(result) {
  const responseText = String(result?.data?.result?.response?.text || "").trim();
  if (responseText) {
    return responseText;
  }

  const chunks = normalizeChunks(result);
  return chunks.length > 0 ? chunks[chunks.length - 1] : "";
}

function formatDelegateToolResult(result, options = {}) {
  const data = result?.data || {};
  const includeProcessText = options.includeProcessText === true;
  const replyText = resolveReplyText(result);
  const processItems = stripDuplicateFinalText(normalizeChunks(result), replyText);

  if (!includeProcessText) {
    return replyText || "Trae task completed.";
  }

  const sections = [
    "Trae task completed.",
    `Session ID: ${data.sessionId || "unknown"}`,
    `Request ID: ${data.requestId || "unknown"}`,
    `Session created: ${data.sessionCreated === true ? "yes" : "no"}`
  ];

  if (replyText) {
    sections.push(`Final reply\n${replyText}`);
  }

  const processSection = formatListSection("Process text", processItems);
  if (processSection) {
    sections.push(processSection);
  }

  return sections.join("\n\n");
}

function formatOpenProjectToolResult(result) {
  const lines = [
    result.alreadyOpen ? "Trae project is already open." : "Trae project opened.",
    `Project: ${result.projectName || "unknown"}`,
    `Path: ${result.projectPath || "unknown"}`,
    `Gateway ready: ${result.ready ? "yes" : "no"}`
  ];

  if (result.windowTitle) {
    lines.push(`Window title: ${result.windowTitle}`);
  }
  if (result.autoStarted) {
    lines.push("Quickstart triggered: yes");
  }

  return lines.join("\n");
}

function formatSwitchModeToolResult(result) {
  const data = result?.data || {};
  const changed = data.changed === true;
  const lines = [
    changed ? "Trae mode switched." : "Trae mode already active.",
    `Current mode: ${data.mode || "unknown"}`,
    `Previous mode: ${data.previousMode || "unknown"}`,
    `Changed: ${changed ? "yes" : "no"}`
  ];

  if (data.target?.title) {
    lines.push(`Window title: ${data.target.title}`);
  }
  if (result?.autoStarted) {
    lines.push("Quickstart triggered: yes");
  }

  return lines.join("\n");
}

class TraeApiClient {
  constructor(config) {
    this.config = config;
  }

  async request(pathname, options = {}) {
    const controller = new AbortController();
    const timeoutMs = normalizeInteger(options.timeoutMs, this.config.requestTimeoutMs);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${pathname}`, {
        method: options.method || "GET",
        headers: buildHeaders(this.config, options.headers),
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      return await readJsonResponse(response);
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`Timed out while requesting ${pathname} from ${this.config.baseUrl}`);
      }
      throw new Error(`Failed to reach TraeClaw at ${this.config.baseUrl}: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async startQuickstart(options = {}) {
    if (!this.config.quickstartCommand) {
      throw new Error(
        "TraeClaw is not ready and no quickstartCommand is configured. Start TraeClaw first or configure plugins.entries.trae-ide.config.quickstartCommand."
      );
    }

    const env = {
      ...process.env
    };
    for (const [key, value] of Object.entries(options.envOverrides || {})) {
      if (value === undefined || value === null || value === "") {
        delete env[key];
        continue;
      }
      env[key] = String(value);
    }

    const child = spawn(this.config.quickstartCommand, {
      cwd: this.config.quickstartCwd || process.cwd(),
      detached: true,
      stdio: "ignore",
      shell: true,
      windowsHide: process.platform === "win32",
      env
    });
    child.unref();
  }

  async getHealth() {
    return this.request("/health", {
      timeoutMs: 5000
    });
  }

  async waitForReady(deadlineMs) {
    const startedAt = Date.now();
    let lastReady = null;
    while (Date.now() - startedAt < deadlineMs) {
      lastReady = await this.request("/ready", {
        timeoutMs: 5000
      }).catch((error) => ({
        ok: false,
        status: 0,
        json: null,
        text: "",
        error
      }));

      if (lastReady.ok) {
        return lastReady;
      }

      await sleep(1000);
    }

    return lastReady;
  }

  async ensureReady({ allowAutoStart = false } = {}) {
    const readyResponse = await this.request("/ready", {
      timeoutMs: 5000
    }).catch((error) => ({
      ok: false,
      status: 0,
      json: null,
      text: "",
      error
    }));

    if (readyResponse.ok) {
      return {
        ready: true,
        autoStarted: false,
        readyResponse
      };
    }

    if (!allowAutoStart || !this.config.autoStart) {
      return {
        ready: false,
        autoStarted: false,
        readyResponse
      };
    }

    await this.startQuickstart();
    const waitedReady = await this.waitForReady(this.config.readyTimeoutMs);
    return {
      ready: Boolean(waitedReady?.ok),
      autoStarted: true,
      readyResponse: waitedReady
    };
  }

  async getStatus({ allowAutoStart = false } = {}) {
    const readiness = await this.ensureReady({ allowAutoStart });
    const healthResponse = await this.getHealth().catch(() => null);

    return {
      baseUrl: this.config.baseUrl,
      gatewayReachable: Boolean(healthResponse?.ok),
      ready: readiness.ready,
      autoStarted: readiness.autoStarted,
      healthSummary: healthResponse?.json?.data?.status || healthResponse?.json?.data?.service || "",
      readySummary:
        readiness.readyResponse?.json?.data?.automation?.mode ||
        readiness.readyResponse?.json?.message ||
        readiness.readyResponse?.json?.code ||
        "",
      errorMessage:
        readiness.readyResponse?.json?.message ||
        readiness.readyResponse?.json?.details?.message ||
        readiness.readyResponse?.error?.message ||
        ""
    };
  }

  async waitForProject(expectedProjectName, previousTitle = "", deadlineMs = this.config.readyTimeoutMs) {
    const startedAt = Date.now();
    const normalizedPreviousTitle = String(previousTitle || "").trim();
    let lastHealth = null;

    while (Date.now() - startedAt < deadlineMs) {
      lastHealth = await this.getHealth().catch((error) => ({
        ok: false,
        status: 0,
        json: null,
        text: "",
        error
      }));

      const currentTitle = extractHealthWindowTitle(lastHealth);
      const ready = Boolean(lastHealth?.ok && lastHealth?.json?.data?.automation?.ready === true);
      const titleMatchesProject = matchesProjectWindowTitle(currentTitle, expectedProjectName);
      const titleChanged = Boolean(currentTitle && normalizedPreviousTitle && currentTitle !== normalizedPreviousTitle);
      const titleInitialized = Boolean(currentTitle && !normalizedPreviousTitle);
      if (ready && (titleMatchesProject || titleChanged || titleInitialized)) {
        return lastHealth;
      }

      await sleep(1000);
    }

    return lastHealth;
  }

  async createSession({ metadata = {}, prepare = false, allowAutoStart = false } = {}) {
    if (prepare) {
      const readiness = await this.ensureReady({ allowAutoStart });
      if (!readiness.ready) {
        const errorMessage =
          readiness.readyResponse?.json?.message ||
          readiness.readyResponse?.json?.details?.message ||
          readiness.readyResponse?.error?.message ||
          `TraeClaw at ${this.config.baseUrl} is not ready`;
        throw new Error(errorMessage);
      }
    }

    const response = await this.request("/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        metadata,
        prepare
      }
    });

    if (!response.ok || !response.json?.success) {
      throw new Error(response.json?.message || `TraeClaw request failed with status ${response.status}`);
    }

    return response.json;
  }

  async createNewChat({ allowAutoStart = true } = {}) {
    return this.createSession({
      metadata: {
        client: "openclaw-trae-plugin",
        action: "trae_new_chat"
      },
      prepare: true,
      allowAutoStart
    });
  }

  async openProject({ projectPath } = {}) {
    const normalizedProjectPath = String(projectPath || "").trim();
    if (!normalizedProjectPath) {
      throw new Error("trae_open_project requires a non-empty projectPath");
    }

    const resolvedProjectPath = path.resolve(normalizedProjectPath);
    if (!fs.existsSync(resolvedProjectPath)) {
      throw new Error(`Project path does not exist: ${resolvedProjectPath}`);
    }
    if (!fs.statSync(resolvedProjectPath).isDirectory()) {
      throw new Error(`Project path must be a directory: ${resolvedProjectPath}`);
    }

    const projectName = path.basename(resolvedProjectPath);
    const currentHealth = await this.getHealth().catch(() => null);
    const previousTitle = extractHealthWindowTitle(currentHealth);
    const alreadyReady = Boolean(currentHealth?.ok && currentHealth?.json?.data?.automation?.ready === true);
    if (alreadyReady && matchesProjectWindowTitle(previousTitle, projectName)) {
      return {
        projectPath: resolvedProjectPath,
        projectName,
        baseUrl: this.config.baseUrl,
        ready: true,
        autoStarted: false,
        alreadyOpen: true,
        windowTitle: previousTitle
      };
    }

    await this.startQuickstart({
      envOverrides: {
        TRAE_QUICKSTART_PROJECT_PATH: resolvedProjectPath,
        TRAE_QUICKSTART_FORCE_FRESH_WINDOW: "1"
      }
    });

    const waitedHealth = await this.waitForProject(projectName, previousTitle, this.config.readyTimeoutMs);
    const windowTitle = extractHealthWindowTitle(waitedHealth);
    const ready = Boolean(waitedHealth?.ok && waitedHealth?.json?.data?.automation?.ready === true);
    const projectDetected =
      matchesProjectWindowTitle(windowTitle, projectName) ||
      Boolean(windowTitle && previousTitle && windowTitle !== previousTitle) ||
      Boolean(windowTitle && !previousTitle);

    if (!ready || !projectDetected) {
      throw new Error(
        readResponseErrorMessage(
          waitedHealth,
          `TraeClaw at ${this.config.baseUrl} did not switch to project ${projectName} in time`
        )
      );
    }

    return {
      projectPath: resolvedProjectPath,
      projectName,
      baseUrl: this.config.baseUrl,
      ready: true,
      autoStarted: true,
      alreadyOpen: false,
      windowTitle
    };
  }

  async switchMode({ mode, allowAutoStart = true } = {}) {
    const normalizedMode = String(mode || "").trim().toLowerCase();
    if (normalizedMode !== "solo" && normalizedMode !== "ide") {
      throw new Error('trae_switch_mode requires mode to be either "solo" or "ide"');
    }

    const readiness = await this.ensureReady({ allowAutoStart });
    if (!readiness.ready) {
      throw new Error(
        readResponseErrorMessage(readiness.readyResponse, `TraeClaw at ${this.config.baseUrl} is not ready`)
      );
    }

    const response = await this.request("/v1/mode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        mode: normalizedMode
      }
    });

    if (!response.ok || !response.json?.success) {
      throw new Error(response.json?.message || `TraeClaw request failed with status ${response.status}`);
    }

    return {
      ...response.json,
      autoStarted: readiness.autoStarted
    };
  }

  async delegateTask({ task, sessionId, allowAutoStart = true, projectPath } = {}) {
    if (typeof task !== "string" || !task.trim()) {
      throw new Error("trae_delegate requires a non-empty task string");
    }

    if (typeof projectPath === "string" && projectPath.trim()) {
      await this.openProject({
        projectPath
      });
    }

    const readiness = await this.ensureReady({ allowAutoStart });
    if (!readiness.ready) {
      const errorMessage =
        readiness.readyResponse?.json?.message ||
        readiness.readyResponse?.json?.details?.message ||
        readiness.readyResponse?.error?.message ||
        `TraeClaw at ${this.config.baseUrl} is not ready`;
      throw new Error(errorMessage);
    }

    const response = await this.request("/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        content: task,
        ...(sessionId ? { sessionId } : {}),
        sessionMetadata: {
          client: "openclaw-trae-plugin"
        },
        metadata: {
          caller: "openclaw-trae-plugin"
        }
      }
    });

    if (!response.ok || !response.json?.success) {
      throw new Error(response.json?.message || `TraeClaw request failed with status ${response.status}`);
    }

    return response.json;
  }
}

function createTraeApiClient(config) {
  return new TraeApiClient(config);
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_READY_TIMEOUT_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  PLUGIN_ID,
  TraeApiClient,
  createTraeApiClient,
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
};
