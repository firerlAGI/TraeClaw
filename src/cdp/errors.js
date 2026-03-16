class TraeAutomationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TraeAutomationError";
    this.code = code;
    this.details = details;
  }
}

function normalizeAutomationError(
  error,
  fallbackCode = "AUTOMATION_ERROR",
  fallbackMessage = "Automation request failed"
) {
  if (!error) {
    return {
      code: fallbackCode,
      message: fallbackMessage,
      details: {},
      normalized: true
    };
  }

  if (error instanceof TraeAutomationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details || {},
      normalized: true
    };
  }

  const details = typeof error === "object" && error !== null ? { ...error } : {};
  const code = typeof error.code === "string" ? error.code : fallbackCode;
  const message = typeof error.message === "string" ? error.message : fallbackMessage;
  return {
    code,
    message,
    details,
    normalized: true
  };
}

module.exports = {
  TraeAutomationError,
  normalizeAutomationError
};
