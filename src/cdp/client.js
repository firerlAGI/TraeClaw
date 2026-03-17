const { TraeAutomationError } = require("./errors");

const DEFAULT_COMMAND_TIMEOUT_MS = Number(process.env.TRAE_CDP_COMMAND_TIMEOUT_MS || 5000);

function rejectPendingRequests(pendingRequests, error) {
  for (const pending of pendingRequests.values()) {
    clearTimeout(pending.timeoutHandle);
    pending.reject(error);
  }
  pendingRequests.clear();
}

function buildSocketClosedError(webSocketDebuggerUrl, closeInfo = {}) {
  return new TraeAutomationError("CDP_SOCKET_CLOSED", "The CDP socket closed unexpectedly", {
    webSocketDebuggerUrl,
    ...closeInfo
  });
}

function readMessageData(data) {
  if (typeof data === "string") {
    return Promise.resolve(data);
  }
  if (Buffer.isBuffer(data)) {
    return Promise.resolve(data.toString("utf8"));
  }
  if (data instanceof ArrayBuffer) {
    return Promise.resolve(Buffer.from(data).toString("utf8"));
  }
  if (data && typeof data.text === "function") {
    return data.text();
  }
  return Promise.resolve(String(data));
}

async function createCDPSession(options = {}) {
  const webSocketDebuggerUrl = String(options.webSocketDebuggerUrl || "").trim();
  if (!webSocketDebuggerUrl) {
    throw new TraeAutomationError("CDP_URL_MISSING", "Missing webSocketDebuggerUrl for the CDP session");
  }

  const commandTimeoutMs = Number(options.commandTimeoutMs || DEFAULT_COMMAND_TIMEOUT_MS);
  const WebSocketImpl = options.WebSocket || globalThis.WebSocket;
  if (typeof WebSocketImpl !== "function") {
    throw new TraeAutomationError("CDP_WEBSOCKET_UNAVAILABLE", "This Node runtime does not expose a global WebSocket");
  }

  const socket = new WebSocketImpl(webSocketDebuggerUrl);
  const pendingRequests = new Map();
  let nextCommandId = 1;
  let isClosed = false;
  let closeInfo = null;
  let openResolved = false;

  const opened = new Promise((resolve, reject) => {
    const handleOpen = () => {
      openResolved = true;
      resolve();
    };

    const handleOpenError = () => {
      if (!openResolved) {
        reject(
          new TraeAutomationError("CDP_SOCKET_OPEN_FAILED", "Failed to open the CDP socket", {
            webSocketDebuggerUrl
          })
        );
      }
    };

    socket.addEventListener("open", handleOpen, { once: true });
    socket.addEventListener("error", handleOpenError, { once: true });
  });

  socket.addEventListener("close", (event) => {
    isClosed = true;
    closeInfo = {
      code: typeof event.code === "number" ? event.code : null,
      reason: event.reason || ""
    };
    rejectPendingRequests(pendingRequests, buildSocketClosedError(webSocketDebuggerUrl, closeInfo));
  });

  socket.addEventListener("message", (event) => {
    Promise.resolve(readMessageData(event.data))
      .then((text) => {
        const message = JSON.parse(text);
        if (!message || typeof message !== "object" || typeof message.id !== "number") {
          return;
        }
        const pending = pendingRequests.get(message.id);
        if (!pending) {
          return;
        }
        clearTimeout(pending.timeoutHandle);
        pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(
            new TraeAutomationError("CDP_COMMAND_FAILED", "The browser rejected a CDP command", {
              method: pending.method,
              responseError: message.error
            })
          );
          return;
        }
        pending.resolve(message.result);
      })
      .catch((error) => {
        rejectPendingRequests(
          pendingRequests,
          new TraeAutomationError("CDP_MESSAGE_PARSE_FAILED", "Failed to parse a CDP message", {
            message: error.message
          })
        );
      });
  });

  async function send(method, params = {}, timeoutMs = commandTimeoutMs) {
    await opened;
    if (isClosed || socket.readyState >= WebSocketImpl.CLOSING) {
      throw buildSocketClosedError(webSocketDebuggerUrl, closeInfo || {});
    }

    const id = nextCommandId++;
    const payload = JSON.stringify({
      id,
      method,
      params
    });

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        pendingRequests.delete(id);
        reject(
          new TraeAutomationError("CDP_COMMAND_TIMEOUT", "Timed out waiting for a CDP command response", {
            method,
            timeoutMs
          })
        );
      }, timeoutMs);

      pendingRequests.set(id, {
        method,
        resolve,
        reject,
        timeoutHandle
      });

      try {
        socket.send(payload);
      } catch (error) {
        clearTimeout(timeoutHandle);
        pendingRequests.delete(id);
        reject(
          new TraeAutomationError("CDP_COMMAND_SEND_FAILED", "Failed to send a CDP command", {
            method,
            message: error.message
          })
        );
      }
    });
  }

  async function evaluate(expression, options = {}) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: options.awaitPromise !== false,
      returnByValue: options.returnByValue !== false,
      userGesture: options.userGesture !== false
    });

    if (result && result.exceptionDetails) {
      throw new TraeAutomationError("CDP_EVALUATION_FAILED", "The browser rejected a Runtime.evaluate expression", {
        exceptionDetails: result.exceptionDetails
      });
    }

    if (!result || !result.result) {
      return undefined;
    }

    if (options.returnByValue === false) {
      return result.result;
    }

    return result.result.value;
  }

  async function close() {
    if (isClosed || socket.readyState === WebSocketImpl.CLOSED) {
      return;
    }

    const closed = new Promise((resolve) => {
      socket.addEventListener(
        "close",
        () => {
          resolve();
        },
        { once: true }
      );
    });

    socket.close();
    await closed;
  }

  await opened;
  await send("Runtime.enable");
  await send("Page.enable");
  try {
    await send("Page.bringToFront");
  } catch (error) {
    // Some targets refuse focus when the window is already active.
  }

  return {
    send,
    evaluate,
    close,
    getSnapshot() {
      return {
        webSocketDebuggerUrl,
        commandTimeoutMs,
        pendingRequestCount: pendingRequests.size
      };
    }
  };
}

module.exports = {
  DEFAULT_COMMAND_TIMEOUT_MS,
  createCDPSession
};
