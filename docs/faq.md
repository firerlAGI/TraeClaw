# FAQ

## Is this an official Trae API?

No. TraeClaw is a local desktop bridge built on top of Trae's Electron UI.

## Does it run locally or in the cloud?

Locally. TraeClaw starts on your machine and talks to your local Trae window.

## Why does it need a remote debugging port?

Because TraeClaw uses the Chrome DevTools Protocol to automate the Trae renderer and read DOM content from the app window.

## Why can OpenClaw see the plugin but still fail to call `trae_delegate`?

OpenClaw may expose the tool in the catalog but still block agent use if the tool is not added to `tools.alsoAllow`. Use the plugin example config as the baseline.

## Why does TraeClaw open another Trae window?

If your current window is not automation-ready, TraeClaw can start a dedicated Trae window with its own profile so the API stays stable.

## Why does the dedicated window ask me to log in again?

Profile seeding is best-effort. If local profile files are locked or incomplete, the dedicated window may still need a fresh login.

## Why do some replies include prefixes like `SOLO Coder`?

Those prefixes come from Trae's own UI output. TraeClaw returns what the Trae interface renders, not an internal hidden response object.

## Why does an "exact output" prompt still return extra text sometimes?

Trae may wrap your requested output with its own assistant style or task framing. This is a UI-level automation bridge, not a raw model endpoint.

## Why can `/ready` be true even before I receive a useful answer?

`/ready` means the gateway can reach a usable Trae page and required selectors are available. It does not guarantee that the next task will be semantically correct.

## Can I use TraeClaw without OpenClaw?

Yes, but that is no longer the primary product path. The intended path is OpenClaw calling Trae through the native plugin.

## What usually breaks after a Trae update?

The main risk is selector drift. If Trae changes its DOM structure, input boxes, send buttons, or response containers may need selector updates.

## Does it support concurrency?

A single Trae window is effectively serialized. Multiple callers can use the API, but requests to the same automated window should be treated as sequential work.

## What is the fastest way to debug a broken setup?

Check in this order:

1. `/health`
2. `/ready`
3. `npm run inspect:trae`
4. selector values in `.env`
5. the built-in `/chat` page
