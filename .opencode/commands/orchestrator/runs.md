---
description: "List every planning and delivery run of this project through the dev-orchestrator tools (read-only)."
agent: dev-orchestrator
---
<!-- generated-by: dev-orchestrator -->
<!-- integration-version: 2 -->
Call `orchestrator_runs_list` with kind "all" — one tool call, nothing else.

Summarize the current planning and delivery runs: kind, run id, task id,
status, state class, whether a lock is held, who holds the workspace, and
the advisory next actions the tool returned. Group them by kind.

Do not execute any next action. Do not call any state-changing tool.
