const {
  PLUGIN_ID,
  createTraeApiClient,
  formatDelegateToolResult,
  formatNewChatToolResult,
  formatOpenProjectToolResult,
  formatStatusToolResult,
  formatSwitchModeToolResult,
  resolvePluginRuntimeConfig
} = require("./lib/traeapi-client");

function buildToolContent(text) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}

function buildTraeSlashUsage() {
  return [
    "Usage: /Trae <task>",
    "Usage: /Trae process <task>",
    "Example: /Trae analyze this repository and implement the missing feature.",
    "Example: /Trae process analyze this repository and include the process trace."
  ].join("\n");
}

function parseTraeSlashArgs(rawArgs) {
  const trimmed = String(rawArgs || "").trim();
  if (!trimmed) {
    return {
      task: "",
      includeProcessText: false
    };
  }

  const processPrefixMatch = /^(?:process|--process|-p|verbose)\b/i.exec(trimmed);
  if (!processPrefixMatch) {
    return {
      task: trimmed,
      includeProcessText: false
    };
  }

  return {
    task: trimmed.slice(processPrefixMatch[0].length).trim(),
    includeProcessText: true
  };
}

function buildTraeSlashResult(result, options = {}) {
  return formatDelegateToolResult(result, options);
}

function register(api) {
  const getClient = () => createTraeApiClient(resolvePluginRuntimeConfig(api));

  api.registerTool({
    name: "trae_status",
    description: "Check whether the local TraeClaw bridge is reachable and whether Trae automation is ready.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowAutoStart: {
          type: "boolean",
          default: false
        }
      }
    },
    async execute(_id, params = {}) {
      const client = getClient();
      const status = await client.getStatus({
        allowAutoStart: params.allowAutoStart === true
      });
      return buildToolContent(formatStatusToolResult(status));
    }
  });

  api.registerTool({
    name: "trae_new_chat",
    description: "Create a fresh Trae chat session and switch the Trae desktop UI to that new conversation.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowAutoStart: {
          type: "boolean",
          default: true
        }
      }
    },
    async execute(_id, params = {}) {
      const client = getClient();
      const result = await client.createNewChat({
        allowAutoStart: params.allowAutoStart !== false
      });
      return buildToolContent(formatNewChatToolResult(result));
    }
  });

  api.registerTool({
    name: "trae_open_project",
    description: "Open a specific local project folder in Trae so later Trae tasks run against the intended workspace.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        projectPath: {
          type: "string",
          minLength: 1
        }
      },
      required: ["projectPath"]
    },
    async execute(_id, params = {}) {
      const client = getClient();
      const result = await client.openProject({
        projectPath: params.projectPath
      });
      return buildToolContent(formatOpenProjectToolResult(result));
    }
  });

  api.registerTool({
    name: "trae_switch_mode",
    description: "Switch Trae between SOLO and IDE modes while keeping the current project window attached.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: {
          type: "string",
          enum: ["solo", "ide"]
        },
        allowAutoStart: {
          type: "boolean",
          default: true
        }
      },
      required: ["mode"]
    },
    async execute(_id, params = {}) {
      const client = getClient();
      const result = await client.switchMode({
        mode: params.mode,
        allowAutoStart: params.allowAutoStart !== false
      });
      return buildToolContent(formatSwitchModeToolResult(result));
    }
  });

  api.registerTool(
    {
      name: "trae_delegate",
      description:
        "Delegate an IDE task to the local Trae desktop app through TraeClaw. If projectPath is provided, Trae will switch to that local project before running the task.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          task: {
            type: "string",
            minLength: 1
          },
          projectPath: {
            type: "string",
            minLength: 1
          },
          sessionId: {
            type: "string"
          },
          allowAutoStart: {
            type: "boolean",
            default: true
          },
          includeProcessText: {
            type: "boolean",
            default: false
          }
        },
        required: ["task"]
      },
      async execute(_id, params = {}) {
        const client = getClient();
        const result = await client.delegateTask({
          task: params.task,
          projectPath: params.projectPath,
          sessionId: params.sessionId,
          allowAutoStart: params.allowAutoStart !== false
        });
        return buildToolContent(
          formatDelegateToolResult(result, {
            includeProcessText: params.includeProcessText === true
          })
        );
      }
    },
    {
      optional: true
    }
  );

  if (typeof api.registerCommand === "function") {
    api.registerCommand({
      name: "trae",
      description: "Create a fresh Trae chat and delegate a coding task directly to Trae.",
      acceptsArgs: true,
      async handler(ctx = {}) {
        const parsed = parseTraeSlashArgs(ctx.args);
        if (!parsed.task) {
          return {
            text: buildTraeSlashUsage()
          };
        }

        const client = getClient();
        try {
          const created = await client.createNewChat({
            allowAutoStart: true
          });
          const sessionId = String(created?.data?.session?.sessionId || "").trim();
          const result = await client.delegateTask({
            task: parsed.task,
            sessionId: sessionId || undefined,
            allowAutoStart: true
          });
          return {
            text: buildTraeSlashResult(result, {
              includeProcessText: parsed.includeProcessText
            })
          };
        } catch (error) {
          return {
            text: `Trae slash command failed.\n\n${error.message || "Unknown error"}`
          };
        }
      }
    });
  }
}

module.exports = {
  id: PLUGIN_ID,
  name: "TraeClaw",
  buildTraeSlashUsage,
  parseTraeSlashArgs,
  register
};
module.exports.default = module.exports;
