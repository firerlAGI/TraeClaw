function getChatPageHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Trae Bridge Chat</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5efe4;
        --bg-accent: #d7e7e1;
        --panel: rgba(255, 250, 241, 0.92);
        --panel-strong: #fffaf1;
        --line: rgba(35, 53, 47, 0.12);
        --text: #1b2a28;
        --muted: #60726c;
        --brand: #0f766e;
        --brand-strong: #115e59;
        --warm: #b45309;
        --danger: #b42318;
        --shadow: 0 24px 60px rgba(33, 48, 44, 0.16);
        --radius: 22px;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        font-family: "Segoe UI Variable", "Bahnschrift", "Trebuchet MS", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(255, 212, 138, 0.55), transparent 28%),
          radial-gradient(circle at top right, rgba(82, 183, 136, 0.22), transparent 30%),
          linear-gradient(160deg, var(--bg) 0%, #efe4d4 48%, var(--bg-accent) 100%);
      }

      body {
        padding: 24px;
      }

      .shell {
        max-width: 1240px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 20px;
      }

      .panel {
        background: var(--panel);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
      }

      .sidebar {
        padding: 22px;
        display: grid;
        gap: 16px;
        align-self: start;
        position: sticky;
        top: 24px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.12);
        color: var(--brand-strong);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 31px;
        line-height: 1.05;
      }

      .lede {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
      }

      .status-card {
        padding: 16px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(255, 255, 255, 0.7));
        border: 1px solid rgba(15, 118, 110, 0.16);
        display: grid;
        gap: 10px;
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 14px;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        background: rgba(96, 114, 108, 0.12);
        color: var(--muted);
      }

      .status-pill[data-tone="ready"] {
        background: rgba(15, 118, 110, 0.14);
        color: var(--brand-strong);
      }

      .status-pill[data-tone="busy"] {
        background: rgba(180, 83, 9, 0.14);
        color: var(--warm);
      }

      .status-pill[data-tone="error"] {
        background: rgba(180, 35, 24, 0.14);
        color: var(--danger);
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field label {
        font-size: 13px;
        font-weight: 700;
        color: var(--muted);
      }

      input,
      textarea,
      button {
        font: inherit;
      }

      input,
      textarea {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.8);
        color: var(--text);
        padding: 13px 14px;
        transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: rgba(15, 118, 110, 0.42);
        box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.11);
        background: #fffdf9;
      }

      textarea {
        min-height: 104px;
        resize: vertical;
      }

      button {
        border: 0;
        border-radius: 16px;
        padding: 12px 16px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 140ms ease, opacity 140ms ease, background 140ms ease;
      }

      button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .primary {
        background: linear-gradient(135deg, var(--brand), var(--brand-strong));
        color: #f5fffd;
      }

      .secondary {
        background: rgba(15, 118, 110, 0.08);
        color: var(--brand-strong);
      }

      .ghost {
        background: rgba(27, 42, 40, 0.06);
        color: var(--text);
      }

      .stack {
        display: grid;
        gap: 10px;
      }

      .toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: var(--muted);
      }

      .toggle input {
        width: 18px;
        height: 18px;
        margin: 0;
        accent-color: var(--brand);
      }

      .session-box {
        padding: 14px;
        border-radius: 16px;
        background: rgba(27, 42, 40, 0.05);
        border: 1px dashed rgba(27, 42, 40, 0.12);
      }

      .session-value {
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.5;
        color: var(--muted);
        word-break: break-all;
      }

      .main {
        min-height: calc(100vh - 48px);
        display: grid;
        grid-template-rows: auto 1fr auto;
        overflow: hidden;
      }

      .main-header {
        padding: 22px 24px 18px;
        border-bottom: 1px solid var(--line);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .main-header h2 {
        margin: 0;
        font-size: 20px;
      }

      .subtitle {
        margin: 4px 0 0;
        font-size: 14px;
        color: var(--muted);
      }

      .log {
        padding: 24px;
        overflow: auto;
        display: grid;
        gap: 16px;
        align-content: start;
      }

      .empty {
        min-height: 100%;
        display: grid;
        place-items: center;
        color: var(--muted);
        border: 1px dashed rgba(27, 42, 40, 0.12);
        border-radius: 18px;
        padding: 28px;
        text-align: center;
        background: rgba(255, 255, 255, 0.35);
      }

      .message {
        max-width: min(720px, 100%);
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px solid rgba(27, 42, 40, 0.08);
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 10px 28px rgba(42, 53, 50, 0.06);
      }

      .message[data-role="user"] {
        margin-left: auto;
        background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(15, 118, 110, 0.04));
        border-color: rgba(15, 118, 110, 0.18);
      }

      .message[data-role="assistant"] {
        margin-right: auto;
      }

      .message[data-role="system"] {
        margin-right: auto;
        background: rgba(180, 83, 9, 0.08);
        border-color: rgba(180, 83, 9, 0.18);
      }

      .message[data-role="error"] {
        margin-right: auto;
        background: rgba(180, 35, 24, 0.08);
        border-color: rgba(180, 35, 24, 0.18);
      }

      .message-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .message-role {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 700;
      }

      .message-time {
        font-size: 12px;
        color: rgba(96, 114, 108, 0.82);
      }

      .message-body {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.58;
      }

      .composer {
        padding: 18px 24px 24px;
        border-top: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(255, 250, 241, 0.5), rgba(255, 255, 255, 0.72));
        display: grid;
        gap: 12px;
      }

      .composer-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .hint {
        font-size: 13px;
        color: var(--muted);
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      a.utility {
        color: var(--brand-strong);
        text-decoration: none;
        font-weight: 700;
      }

      @media (max-width: 980px) {
        body {
          padding: 14px;
        }

        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: static;
        }

        .main {
          min-height: 72vh;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <aside class="panel sidebar">
        <div class="eyebrow">Trae Bridge</div>
        <div class="stack">
          <h1>Local chat front end for the HTTP gateway.</h1>
          <p class="lede">This page talks to the same gateway that powers the API. Keep Trae open on a project, then send prompts here.</p>
        </div>

        <section class="status-card">
          <div class="status-row">
            <strong>Gateway status</strong>
            <span id="status-pill" class="status-pill" data-tone="busy">Checking</span>
          </div>
          <div id="status-detail" class="hint">Loading readiness information.</div>
        </section>

        <div class="field">
          <label for="token-input">Bearer token</label>
          <input id="token-input" type="password" placeholder="Optional if auth is enabled">
        </div>

        <div class="stack">
          <button id="save-token-button" class="secondary" type="button">Save token</button>
          <button id="refresh-button" class="ghost" type="button">Refresh status</button>
          <button id="new-session-button" class="primary" type="button">New session</button>
        </div>

        <label class="toggle" for="stream-toggle">
          <input id="stream-toggle" type="checkbox" checked>
          <span>Stream replies when possible</span>
        </label>

        <section class="session-box">
          <strong>Session</strong>
          <div id="session-value" class="session-value">No session yet.</div>
        </section>

        <a class="utility" href="/debug/automation" target="_blank" rel="noreferrer">Open automation diagnostics</a>
      </aside>

      <main class="panel main">
        <header class="main-header">
          <div>
            <h2>Conversation</h2>
            <p class="subtitle">Messages are sent through the local HTTP bridge, then forwarded into the Trae window.</p>
          </div>
        </header>

        <section id="message-log" class="log" aria-live="polite">
          <div class="empty">No messages yet. Start a session and send your first prompt.</div>
        </section>

        <section class="composer">
          <div class="field">
            <label for="composer-input">Prompt</label>
            <textarea id="composer-input" placeholder="Ask Trae something about the open project."></textarea>
          </div>
          <div class="composer-actions">
            <div class="hint">Press Ctrl+Enter to send.</div>
            <div class="actions">
              <button id="clear-button" class="ghost" type="button">Clear</button>
              <button id="send-button" class="primary" type="button">Send message</button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <script>
      (function () {
        var STORAGE_KEY = "trae_bridge_token";
        var state = {
          authToken: "",
          sessionId: "",
          sending: false,
          messages: [],
          nextMessageId: 1
        };

        var ui = {
          tokenInput: document.getElementById("token-input"),
          saveTokenButton: document.getElementById("save-token-button"),
          refreshButton: document.getElementById("refresh-button"),
          newSessionButton: document.getElementById("new-session-button"),
          streamToggle: document.getElementById("stream-toggle"),
          sessionValue: document.getElementById("session-value"),
          statusPill: document.getElementById("status-pill"),
          statusDetail: document.getElementById("status-detail"),
          messageLog: document.getElementById("message-log"),
          composerInput: document.getElementById("composer-input"),
          sendButton: document.getElementById("send-button"),
          clearButton: document.getElementById("clear-button")
        };

        function escapeHtml(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function formatClock(timestamp) {
          var date = timestamp instanceof Date ? timestamp : new Date(timestamp);
          return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          });
        }

        function setStatus(label, detail, tone) {
          ui.statusPill.textContent = label;
          ui.statusPill.dataset.tone = tone || "busy";
          ui.statusDetail.textContent = detail;
        }

        function setSession(sessionId) {
          state.sessionId = sessionId || "";
          ui.sessionValue.textContent = state.sessionId || "No session yet.";
        }

        function setSending(isSending) {
          state.sending = Boolean(isSending);
          ui.sendButton.disabled = state.sending;
          ui.newSessionButton.disabled = state.sending;
          ui.refreshButton.disabled = state.sending;
          ui.clearButton.disabled = state.sending;
          ui.composerInput.disabled = state.sending;
          if (state.sending) {
            setStatus("Running", "Waiting for Trae to answer the latest prompt.", "busy");
          }
        }

        function renderMessages() {
          if (!state.messages.length) {
            ui.messageLog.innerHTML = '<div class="empty">No messages yet. Start a session and send your first prompt.</div>';
            return;
          }

          ui.messageLog.innerHTML = state.messages
            .map(function (message) {
              return [
                '<article class="message" data-role="' + escapeHtml(message.role) + '">',
                '  <div class="message-head">',
                '    <span class="message-role">' + escapeHtml(message.role) + "</span>",
                '    <span class="message-time">' + escapeHtml(formatClock(message.timestamp)) + "</span>",
                "  </div>",
                '  <div class="message-body">' + escapeHtml(message.text) + "</div>",
                "</article>"
              ].join("");
            })
            .join("");

          ui.messageLog.scrollTop = ui.messageLog.scrollHeight;
        }

        function addMessage(role, text) {
          var message = {
            id: state.nextMessageId++,
            role: role,
            text: text || "",
            timestamp: new Date()
          };
          state.messages.push(message);
          renderMessages();
          return message;
        }

        function updateMessage(id, text) {
          var message = state.messages.find(function (entry) {
            return entry.id === id;
          });
          if (!message) {
            return;
          }
          message.text = text;
          message.timestamp = new Date();
          renderMessages();
        }

        function readStoredToken() {
          try {
            return window.localStorage.getItem(STORAGE_KEY) || "";
          } catch (error) {
            return "";
          }
        }

        function persistToken(token) {
          try {
            window.localStorage.setItem(STORAGE_KEY, token);
          } catch (error) {
            // Local storage is optional for this page.
          }
        }

        async function parseJsonResponse(response) {
          var text = await response.text();
          if (!text) {
            return null;
          }
          try {
            return JSON.parse(text);
          } catch (error) {
            throw new Error("The gateway returned non-JSON content.");
          }
        }

        async function apiJson(path, options) {
          var requestOptions = options || {};
          var headers = Object.assign({}, requestOptions.headers || {});
          headers.Accept = headers.Accept || "application/json";
          if (state.authToken) {
            headers.Authorization = "Bearer " + state.authToken;
          }

          if (requestOptions.body && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
          }

          var response = await fetch(path, Object.assign({}, requestOptions, { headers: headers }));
          var payload = await parseJsonResponse(response);
          if (!response.ok) {
            var error = new Error(
              payload && payload.message ? payload.message : "The request failed."
            );
            error.code = payload && payload.code ? payload.code : "HTTP_" + response.status;
            error.details = payload && payload.details ? payload.details : {};
            throw error;
          }
          return payload;
        }

        async function refreshStatus() {
          try {
            var payload = await apiJson("/ready", { method: "GET" });
            var targetTitle =
              payload &&
              payload.data &&
              payload.data.automation &&
              payload.data.automation.target &&
              payload.data.automation.target.title
                ? payload.data.automation.target.title
                : "Trae window";
            setStatus("Ready", "Connected to " + targetTitle + ".", "ready");
          } catch (error) {
            if (error.code === "UNAUTHORIZED") {
              setStatus("Locked", "Enter a token if gateway auth is enabled.", "error");
              return;
            }

            try {
              var healthPayload = await apiJson("/health", { method: "GET" });
              var detail = healthPayload && healthPayload.data && healthPayload.data.automation && healthPayload.data.automation.error
                ? healthPayload.data.automation.error.message || "Automation is not ready."
                : "Gateway is running, but readiness checks are still failing.";
              setStatus("Not ready", detail, "busy");
            } catch (healthError) {
              setStatus("Offline", healthError.message || "Unable to reach the gateway.", "error");
            }
          }
        }

        async function ensureSession() {
          if (state.sessionId) {
            return state.sessionId;
          }
          var payload = await apiJson("/v1/sessions", {
            method: "POST",
            body: JSON.stringify({
              metadata: {
                client: "chat-ui"
              }
            })
          });
          var sessionId = payload && payload.data && payload.data.session ? payload.data.session.sessionId : "";
          setSession(sessionId);
          addMessage("system", "Started a new session.");
          return sessionId;
        }

        async function createFreshSession() {
          setSession("");
          state.messages = [];
          renderMessages();
          await ensureSession();
          await refreshStatus();
        }

        function parseSseChunk(rawChunk) {
          var eventName = "message";
          var dataLines = [];
          rawChunk.split(/\\r?\\n/).forEach(function (line) {
            if (line.indexOf("event:") === 0) {
              eventName = line.slice(6).trim();
              return;
            }
            if (line.indexOf("data:") === 0) {
              dataLines.push(line.slice(5).trim());
            }
          });

          if (!dataLines.length) {
            return null;
          }

          var dataText = dataLines.join("\\n");
          try {
            return {
              event: eventName,
              data: JSON.parse(dataText)
            };
          } catch (error) {
            return {
              event: eventName,
              data: {
                raw: dataText
              }
            };
          }
        }

        function normalizeComparableText(value) {
          return String(value || "")
            .replace(/\\s+/g, " ")
            .trim();
        }

        function computeOverlapLength(left, right) {
          var source = String(left || "");
          var target = String(right || "");
          var maxLength = Math.min(source.length, target.length);
          for (var length = maxLength; length > 0; length -= 1) {
            if (source.slice(source.length - length) === target.slice(0, length)) {
              return length;
            }
          }
          return 0;
        }

        function computeCommonPrefixLength(left, right) {
          var source = String(left || "");
          var target = String(right || "");
          var maxLength = Math.min(source.length, target.length);
          var length = 0;
          while (length < maxLength && source.charAt(length) === target.charAt(length)) {
            length += 1;
          }
          return length;
        }

        function computeCommonSuffixLength(left, right) {
          var source = String(left || "");
          var target = String(right || "");
          var sourceIndex = source.length - 1;
          var targetIndex = target.length - 1;
          var length = 0;
          while (sourceIndex >= 0 && targetIndex >= 0 && source.charAt(sourceIndex) === target.charAt(targetIndex)) {
            sourceIndex -= 1;
            targetIndex -= 1;
            length += 1;
          }
          return length;
        }

        function mergeStreamingText(currentText, nextText, mode) {
          var current = String(currentText || "");
          var next = String(nextText || "");
          if (!next) {
            return current;
          }
          if (!current) {
            return next;
          }
          if (mode === "delta") {
            return current + next;
          }

          if (next === current) {
            return current;
          }
          if (next.indexOf(current) === 0) {
            return next;
          }

          var currentNormalized = normalizeComparableText(current);
          var nextNormalized = normalizeComparableText(next);
          if (!nextNormalized) {
            return current;
          }
          if (nextNormalized === currentNormalized) {
            return current;
          }
          if (nextNormalized.length < 8 && currentNormalized.length > nextNormalized.length) {
            return current;
          }
          if (currentNormalized && nextNormalized.indexOf(currentNormalized) === 0) {
            return next;
          }
          if (current.indexOf(next) === 0) {
            return current;
          }
          if (next.length + 24 < current.length && currentNormalized.indexOf(nextNormalized) >= 0) {
            return current;
          }

          var comparableLength = Math.min(currentNormalized.length, nextNormalized.length);
          var commonPrefixLength = computeCommonPrefixLength(currentNormalized, nextNormalized);
          var commonSuffixLength = computeCommonSuffixLength(currentNormalized, nextNormalized);
          if (
            comparableLength > 0 &&
            (commonPrefixLength >= Math.floor(comparableLength * 0.55) ||
              commonSuffixLength >= Math.floor(comparableLength * 0.55))
          ) {
            return next.length >= current.length ? next : current;
          }

          var overlapLength = computeOverlapLength(current, next);
          if (overlapLength >= Math.min(24, next.length)) {
            return current + next.slice(overlapLength);
          }
          if (currentNormalized && nextNormalized.indexOf(currentNormalized) >= 0) {
            return next;
          }
          return current + "\\n\\n" + next;
        }

        async function streamMessage(sessionId, content, messageId) {
          var headers = {
            Accept: "text/event-stream",
            "Content-Type": "application/json"
          };
          if (state.authToken) {
            headers.Authorization = "Bearer " + state.authToken;
          }

          var response = await fetch("/v1/sessions/" + encodeURIComponent(sessionId) + "/messages/stream", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ content: content })
          });

          if (!response.ok) {
            var failedPayload = await parseJsonResponse(response);
            var streamError = new Error(
              failedPayload && failedPayload.message ? failedPayload.message : "Streaming request failed."
            );
            streamError.code = failedPayload && failedPayload.code ? failedPayload.code : "HTTP_" + response.status;
            throw streamError;
          }

          if (!response.body || typeof response.body.getReader !== "function") {
            throw new Error("Streaming is not supported by this browser.");
          }

          var reader = response.body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";
          var assistantText = "";

          while (true) {
            var chunk = await reader.read();
            if (chunk.done) {
              break;
            }

            buffer += decoder.decode(chunk.value, { stream: true });
            var separatorIndex = buffer.indexOf("\\n\\n");
            while (separatorIndex >= 0) {
              var rawEvent = buffer.slice(0, separatorIndex);
              buffer = buffer.slice(separatorIndex + 2);
              separatorIndex = buffer.indexOf("\\n\\n");

              var parsed = parseSseChunk(rawEvent);
              if (!parsed) {
                continue;
              }

              if (parsed.event === "delta") {
                var payload = parsed.data || {};
                if (payload.type === "replace") {
                  assistantText = mergeStreamingText(assistantText, payload.chunk || "", "replace");
                } else if (payload.type === "delta") {
                  assistantText = mergeStreamingText(assistantText, payload.chunk || "", "delta");
                } else if (typeof payload.chunk === "string") {
                  assistantText = mergeStreamingText(assistantText, payload.chunk, "replace");
                }
                updateMessage(messageId, assistantText || "Waiting for streamed output...");
                continue;
              }

              if (parsed.event === "done") {
                var finalText =
                  parsed.data &&
                  parsed.data.result &&
                  parsed.data.result.response &&
                  parsed.data.result.response.text
                    ? parsed.data.result.response.text
                    : assistantText;
                assistantText = mergeStreamingText(assistantText, finalText || "", "replace");
                updateMessage(messageId, assistantText || finalText || "(empty reply)");
                return;
              }

              if (parsed.event === "error") {
                var streamMessageText = parsed.data && parsed.data.message ? parsed.data.message : "Streaming failed.";
                throw new Error(streamMessageText);
              }
            }
          }

          updateMessage(messageId, assistantText || "(stream closed with no reply)");
        }

        async function sendMessage() {
          var content = ui.composerInput.value.trim();
          if (!content || state.sending) {
            return;
          }

          setSending(true);
          addMessage("user", content);
          ui.composerInput.value = "";
          var assistantMessage = addMessage("assistant", "Waiting for Trae...");

          try {
            var sessionId = await ensureSession();
            if (ui.streamToggle.checked) {
              await streamMessage(sessionId, content, assistantMessage.id);
            } else {
              var payload = await apiJson("/v1/sessions/" + encodeURIComponent(sessionId) + "/messages", {
                method: "POST",
                body: JSON.stringify({ content: content })
              });
              var reply =
                payload &&
                payload.data &&
                payload.data.result &&
                payload.data.result.response &&
                payload.data.result.response.text
                  ? payload.data.result.response.text
                  : "(empty reply)";
              updateMessage(assistantMessage.id, reply);
            }
            await refreshStatus();
          } catch (error) {
            updateMessage(assistantMessage.id, error.message || "Request failed.");
            var lastMessage = state.messages.find(function (entry) {
              return entry.id === assistantMessage.id;
            });
            if (lastMessage) {
              lastMessage.role = "error";
            }
            renderMessages();
            setStatus("Error", error.message || "The gateway rejected the request.", "error");
          } finally {
            setSending(false);
          }
        }

        ui.saveTokenButton.addEventListener("click", function () {
          state.authToken = ui.tokenInput.value.trim();
          persistToken(state.authToken);
          addMessage("system", state.authToken ? "Saved bearer token for this browser." : "Cleared saved bearer token.");
          refreshStatus();
        });

        ui.refreshButton.addEventListener("click", function () {
          refreshStatus();
        });

        ui.newSessionButton.addEventListener("click", function () {
          if (state.sending) {
            return;
          }
          createFreshSession().catch(function (error) {
            addMessage("error", error.message || "Failed to create a session.");
            setStatus("Error", error.message || "Failed to create a session.", "error");
          });
        });

        ui.clearButton.addEventListener("click", function () {
          if (state.sending) {
            return;
          }
          ui.composerInput.value = "";
          ui.composerInput.focus();
        });

        ui.sendButton.addEventListener("click", function () {
          sendMessage();
        });

        ui.composerInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            sendMessage();
          }
        });

        state.authToken = readStoredToken();
        ui.tokenInput.value = state.authToken;
        refreshStatus().then(function () {
          return ensureSession();
        }).catch(function (error) {
          addMessage("system", error.message || "Start a session manually when the gateway is ready.");
        });
      })();
    </script>
  </body>
</html>`;
}

module.exports = {
  getChatPageHtml
};
