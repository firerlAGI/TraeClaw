const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  buildTraeCandidates,
  deriveQuickstartTargetTitleContains,
  extractGatewayDebuggerPort,
  resolveDefaultTraeUserDataDir
} = require("./quickstart");

test("resolveDefaultTraeUserDataDir returns the macOS Trae profile path", () => {
  assert.equal(
    resolveDefaultTraeUserDataDir("darwin", { HOME: "/Users/example" }),
    path.join("/Users/example", "Library", "Application Support", "Trae")
  );
});

test("buildTraeCandidates includes macOS bundle and executable candidates", () => {
  const candidates = buildTraeCandidates("darwin", { HOME: "/Users/example", TRAE_BIN: "" });

  assert.equal(candidates.includes("/Applications/Trae.app/Contents/MacOS/Trae"), true);
  assert.equal(candidates.includes("/Applications/Trae.app"), true);
  assert.equal(
    candidates.includes(path.join("/Users/example", "Applications", "Trae.app", "Contents", "MacOS", "Trae")),
    true
  );
  assert.equal(candidates.includes(path.join("/Users/example", "Applications", "Trae.app")), true);
});

test("extractGatewayDebuggerPort reads the active debugger port from health snapshots", () => {
  assert.equal(
    extractGatewayDebuggerPort({
      data: {
        automation: {
          version: {
            port: 9333
          }
        }
      }
    }),
    9333
  );

  assert.equal(
    extractGatewayDebuggerPort({
      data: {
        automation: {
          snapshot: {
            lastReadiness: {
              version: {
                port: 9444
              }
            }
          }
        }
      }
    }),
    9444
  );
});

test("deriveQuickstartTargetTitleContains uses the project folder name", () => {
  assert.equal(
    deriveQuickstartTargetTitleContains("/Users/fire/Projects/TraeClaw-main/.runtime/manual-open-project-target"),
    "manual-open-project-target"
  );
});
