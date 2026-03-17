const { discoverTraeTarget } = require("../src/cdp/discovery");
const { createCDPSession } = require("../src/cdp/client");

const DEFAULT_DEBUG_PORT = Number(process.env.CHAT_UI_DEBUG_PORT || 9334);
const DEFAULT_TIMEOUT_MS = Number(process.env.CHAT_UI_TIMEOUT_MS || 120000);
const DEFAULT_POLL_MS = Number(process.env.CHAT_UI_POLL_MS || 1000);
const DEFAULT_TITLE_CONTAINS = String(process.env.CHAT_UI_TITLE_CONTAINS || "Trae Bridge Chat")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const DEFAULT_URL_CONTAINS = String(process.env.CHAT_UI_URL_CONTAINS || "127.0.0.1:8788/chat")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const DEFAULT_PROMPT =
  process.env.CHAT_UI_PROMPT ||
  "Create a file named CHAT_UI_TEST.txt containing exactly CHAT_UI_OK in the current project. After finishing, reply with exactly CHAT_UI_DONE.";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readUiState(session) {
  return session.evaluate(`(() => {
    const statusPill = document.querySelector("#status-pill");
    const sessionValue = document.querySelector("#session-value");
    const sendButton = document.querySelector("#send-button");
    const composerInput = document.querySelector("#composer-input");
    const messages = Array.from(document.querySelectorAll("#message-log .message")).map((node) => ({
      role: node.getAttribute("data-role") || "",
      text: node.querySelector(".message-body")?.textContent || ""
    }));
    return {
      title: document.title || "",
      status: statusPill ? statusPill.textContent || "" : "",
      sessionId: sessionValue ? sessionValue.textContent || "" : "",
      sending: Boolean(sendButton && sendButton.disabled),
      composerValue: composerInput ? composerInput.value || "" : "",
      messages
    };
  })()`);
}

async function waitForUiReady(session) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < DEFAULT_TIMEOUT_MS) {
    const state = await readUiState(session);
    console.log(
      JSON.stringify({
        phase: "warmup",
        elapsedMs: Date.now() - startedAt,
        status: state.status,
        sessionId: state.sessionId,
        messageCount: state.messages.length
      })
    );

    if (String(state.status || "").toLowerCase().includes("ready") && state.sessionId && !state.sessionId.includes("No session yet.")) {
      return state;
    }
    await sleep(DEFAULT_POLL_MS);
  }

  throw new Error("Timed out waiting for /chat to become ready");
}

async function createFreshSession(session) {
  const previousState = await readUiState(session);
  await session.evaluate(`(() => {
    const button = document.querySelector("#new-session-button");
    if (!button) {
      throw new Error("New session button is missing");
    }
    button.click();
    return true;
  })()`);

  const startedAt = Date.now();
  while (Date.now() - startedAt < DEFAULT_TIMEOUT_MS) {
    const state = await readUiState(session);
    const hasSystemMessage = state.messages.some((entry) => entry.role === "system" && entry.text.includes("Started a new session."));
    if (state.sessionId && state.sessionId !== previousState.sessionId && hasSystemMessage) {
      console.log(
        JSON.stringify({
          phase: "fresh-session",
          elapsedMs: Date.now() - startedAt,
          sessionId: state.sessionId,
          messageCount: state.messages.length
        })
      );
      return state;
    }
    await sleep(DEFAULT_POLL_MS);
  }

  throw new Error("Timed out waiting for the chat UI to create a fresh session");
}

async function sendPrompt(session, prompt) {
  return session.evaluate(`(() => {
    const composer = document.querySelector("#composer-input");
    const sendButton = document.querySelector("#send-button");
    if (!composer || !sendButton) {
      throw new Error("Chat UI controls are missing");
    }
    composer.value = ${JSON.stringify(prompt)};
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    sendButton.click();
    return true;
  })()`);
}

function findLatestAssistant(messages) {
  return [...messages].reverse().find((entry) => entry.role === "assistant" || entry.role === "error") || null;
}

async function run() {
  const discovered = await discoverTraeTarget({
    port: DEFAULT_DEBUG_PORT,
    titleContains: DEFAULT_TITLE_CONTAINS,
    urlContains: DEFAULT_URL_CONTAINS
  });
  const session = await createCDPSession({
    webSocketDebuggerUrl: discovered.target.webSocketDebuggerUrl
  });

  try {
    await waitForUiReady(session);
    await createFreshSession(session);
    await sendPrompt(session, DEFAULT_PROMPT);

    const startedAt = Date.now();
    let lastAssistantText = "";
    while (Date.now() - startedAt < DEFAULT_TIMEOUT_MS) {
      const state = await readUiState(session);
      const assistant = findLatestAssistant(state.messages);
      const assistantText = assistant ? assistant.text : "";

      if (assistantText !== lastAssistantText) {
        console.log(
          JSON.stringify({
            phase: "poll",
            elapsedMs: Date.now() - startedAt,
            sending: state.sending,
            role: assistant ? assistant.role : "",
            assistantText
          })
        );
        lastAssistantText = assistantText;
      }

      if (!state.sending && assistant && assistantText && assistantText !== "Waiting for Trae...") {
        console.log(
          JSON.stringify({
            phase: "completed",
            elapsedMs: Date.now() - startedAt,
            role: assistant.role,
            assistantText
          })
        );
        return;
      }

      await sleep(DEFAULT_POLL_MS);
    }

    throw new Error("Timed out waiting for the front-end to display a completed assistant message");
  } finally {
    await session.close();
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify({
      phase: "failed",
      message: error.message
    })
  );
  process.exit(1);
});
