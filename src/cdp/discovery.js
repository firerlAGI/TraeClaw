const { TraeAutomationError } = require("./errors");

const DEFAULT_DEBUG_HOST = String(process.env.TRAE_CDP_HOST || "127.0.0.1").trim() || "127.0.0.1";
const DEFAULT_DEBUG_PORT = Number(process.env.TRAE_REMOTE_DEBUGGING_PORT || 9222);
const DEFAULT_DISCOVERY_TIMEOUT_MS = Number(process.env.TRAE_CDP_DISCOVERY_TIMEOUT_MS || 3000);
const DEFAULT_TARGET_TYPE = "page";

function parseContainsList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLoopbackHost(value) {
  const host = String(value || "").trim().toLowerCase();
  if (!host || host === "localhost") {
    return "127.0.0.1";
  }
  return host;
}

function buildDiscoveryConfig(options = {}) {
  return {
    host: normalizeLoopbackHost(options.host || process.env.TRAE_CDP_HOST || DEFAULT_DEBUG_HOST),
    port: Number(options.port || process.env.TRAE_REMOTE_DEBUGGING_PORT || DEFAULT_DEBUG_PORT),
    timeoutMs: Number(options.timeoutMs || process.env.TRAE_CDP_DISCOVERY_TIMEOUT_MS || DEFAULT_DISCOVERY_TIMEOUT_MS),
    targetType: String(options.targetType || process.env.TRAE_CDP_TARGET_TYPE || DEFAULT_TARGET_TYPE).trim() || DEFAULT_TARGET_TYPE,
    titleContains: parseContainsList(
      options.titleContains || process.env.TRAE_CDP_TARGET_TITLE_CONTAINS || process.env.TRAE_TARGET_TITLE_CONTAINS
    ),
    urlContains: parseContainsList(
      options.urlContains || process.env.TRAE_CDP_TARGET_URL_CONTAINS || process.env.TRAE_TARGET_URL_CONTAINS
    )
  };
}

function buildDebuggerBaseUrl(options = {}) {
  const config = buildDiscoveryConfig(options);
  return `http://${config.host}:${config.port}`;
}

async function fetchDebuggerJson(pathname, options = {}) {
  const config = buildDiscoveryConfig(options);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, config.timeoutMs);

  try {
    const response = await fetch(`${buildDebuggerBaseUrl(config)}${pathname}`, {
      signal: controller.signal
    });
    if (!response.ok) {
      throw new TraeAutomationError("CDP_DISCOVERY_HTTP_ERROR", "Debugger endpoint returned an HTTP error", {
        pathname,
        status: response.status
      });
    }
    return await response.json();
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new TraeAutomationError("CDP_DISCOVERY_TIMEOUT", "Timed out while querying the debugger endpoint", {
        pathname,
        timeoutMs: config.timeoutMs
      });
    }
    if (error instanceof TraeAutomationError) {
      throw error;
    }
    throw new TraeAutomationError("CDP_DISCOVERY_FAILED", "Failed to query the debugger endpoint", {
      pathname,
      message: error.message
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function isInspectablePageTarget(target) {
  if (!target || typeof target !== "object") {
    return false;
  }
  if (target.type !== "page") {
    return false;
  }
  const url = String(target.url || "");
  return !url.startsWith("devtools://");
}

function scoreTarget(target, config) {
  if (!isInspectablePageTarget(target)) {
    return Number.NEGATIVE_INFINITY;
  }
  if (config.targetType && target.type !== config.targetType) {
    return Number.NEGATIVE_INFINITY;
  }

  const title = String(target.title || "").toLowerCase();
  const url = String(target.url || "").toLowerCase();
  let score = 0;

  if (config.titleContains.length > 0) {
    const matchedTitles = config.titleContains.filter((needle) => title.includes(needle.toLowerCase()));
    if (matchedTitles.length === 0) {
      return Number.NEGATIVE_INFINITY;
    }
    score += matchedTitles.length * 20;
  } else if (title) {
    score += 5;
  }

  if (config.urlContains.length > 0) {
    const matchedUrls = config.urlContains.filter((needle) => url.includes(needle.toLowerCase()));
    if (matchedUrls.length === 0) {
      return Number.NEGATIVE_INFINITY;
    }
    score += matchedUrls.length * 10;
  } else if (url && url !== "about:blank") {
    score += 2;
  }

  if (String(target.title || "").toLowerCase().includes("trae")) {
    score += 4;
  }
  if (String(target.url || "").toLowerCase().includes("trae")) {
    score += 3;
  }

  return score;
}

function selectDebuggerTarget(targets = [], options = {}) {
  const config = buildDiscoveryConfig(options);
  const rankedTargets = targets
    .map((target) => ({
      target,
      score: scoreTarget(target, config)
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => right.score - left.score);

  if (rankedTargets.length === 0) {
    throw new TraeAutomationError("CDP_TARGET_NOT_FOUND", "No matching Trae page target was found", {
      inspectedTargetCount: Array.isArray(targets) ? targets.length : 0,
      titleContains: config.titleContains,
      urlContains: config.urlContains,
      targetType: config.targetType
    });
  }

  return rankedTargets[0].target;
}

async function getDebuggerVersion(options = {}) {
  const config = buildDiscoveryConfig(options);
  const version = await fetchDebuggerJson("/json/version", config);
  return {
    ...version,
    host: config.host,
    port: config.port,
    baseUrl: buildDebuggerBaseUrl(config)
  };
}

async function listDebuggerTargets(options = {}) {
  return fetchDebuggerJson("/json/list", options);
}

async function discoverTraeTarget(options = {}) {
  const config = buildDiscoveryConfig(options);
  const [version, targets] = await Promise.all([getDebuggerVersion(config), listDebuggerTargets(config)]);
  const target = selectDebuggerTarget(targets, config);
  return {
    config,
    version,
    target,
    targets
  };
}

module.exports = {
  DEFAULT_DEBUG_HOST,
  DEFAULT_DEBUG_PORT,
  DEFAULT_DISCOVERY_TIMEOUT_MS,
  buildDebuggerBaseUrl,
  buildDiscoveryConfig,
  discoverTraeTarget,
  fetchDebuggerJson,
  getDebuggerVersion,
  isInspectablePageTarget,
  listDebuggerTargets,
  normalizeLoopbackHost,
  selectDebuggerTarget
};
