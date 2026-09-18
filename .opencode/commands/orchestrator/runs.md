---
description: "List every planning and delivery run of this project through the project-local dev-orchestrator launcher (read-only)."
agent: dev-orchestrator
generated-by: dev-orchestrator
integration-version: 1
---
Use the project-local dev-orchestrator launcher to run
`.dev-orchestrator/bin/dev-orchestrator runs list --json` (or, from cmd/PowerShell,
`.dev-orchestrator\bin\dev-orchestrator.cmd runs list --json`) — one shell tool call, that single
command, nothing chained. Never a bare `dev-orchestrator`.

Summarize the current planning and delivery runs: kind, run id, task id,
status, state class, whether a lock is held, who holds the workspace, and
the advisory next actions the CLI returned. Group them by kind.

Do not execute any next action. Do not run any other command.
