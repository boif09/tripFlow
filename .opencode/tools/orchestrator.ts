// generated-by: dev-orchestrator
// integration-version: 2
//
// dev-orchestrator cockpit bridge for OpenCode. GENERATED — do not edit; `opencode check` reports any modification.
// Every export is one OpenCode custom tool that runs ONE command of the PROJECT-LOCAL dev-orchestrator CLI
// (.dev-orchestrator/runtime/dist/cli/main.js, the runtime that bootstrap install pinned) with a typed argv: no shell, no command string,
// no global dev-orchestrator, no npx, no npm, no source checkout, no git, no provider, no network.
// Read-only tools are allowed by the agent policy; state-changing tools ask through OpenCode before they run.
const RUNTIME_MANIFEST_SEGMENTS = [".dev-orchestrator","install.json"] as const;
const RUNTIME_ENTRY_SEGMENTS = [".dev-orchestrator","runtime","dist","cli","main.js"] as const;
const SPECS = {
  "status": {
    "id": "orchestrator_status",
    "kind": "read_only",
    "command": [
      "status"
    ],
    "params": [],
    "timeoutMs": 120000
  },
  "runs_list": {
    "id": "orchestrator_runs_list",
    "kind": "read_only",
    "command": [
      "runs",
      "list"
    ],
    "params": [
      {
        "name": "kind",
        "flag": "kind",
        "kind": "enum",
        "values": [
          "all",
          "planning",
          "delivery"
        ]
      }
    ],
    "timeoutMs": 120000
  },
  "runs_show": {
    "id": "orchestrator_runs_show",
    "kind": "read_only",
    "command": [
      "runs",
      "show"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "kind",
        "flag": "kind",
        "kind": "enum",
        "values": [
          "all",
          "planning",
          "delivery"
        ]
      }
    ],
    "timeoutMs": 120000
  },
  "planning_inspect": {
    "id": "orchestrator_planning_inspect",
    "kind": "read_only",
    "command": [
      "planning",
      "inspect"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      }
    ],
    "timeoutMs": 120000
  },
  "delivery_inspect": {
    "id": "orchestrator_delivery_inspect",
    "kind": "read_only",
    "command": [
      "delivery",
      "inspect"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      }
    ],
    "timeoutMs": 120000
  },
  "delivery_inspect_commit": {
    "id": "orchestrator_delivery_inspect_commit",
    "kind": "read_only",
    "command": [
      "delivery",
      "inspect-commit"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      }
    ],
    "timeoutMs": 120000
  },
  "propose_run_id": {
    "id": "orchestrator_propose_run_id",
    "kind": "read_only",
    "command": [
      "runs",
      "list"
    ],
    "params": [],
    "timeoutMs": 120000
  },
  "planning_start": {
    "id": "orchestrator_planning_start",
    "kind": "mutating",
    "command": [
      "planning",
      "start"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "taskId",
        "flag": "task-id",
        "kind": "identifier"
      },
      {
        "name": "objective",
        "flag": "objective",
        "kind": "text"
      }
    ],
    "timeoutMs": 3600000
  },
  "planning_resume": {
    "id": "orchestrator_planning_resume",
    "kind": "mutating",
    "command": [
      "planning",
      "resume"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "answers",
        "flag": "answer",
        "kind": "answers"
      }
    ],
    "timeoutMs": 3600000
  },
  "delivery_start": {
    "id": "orchestrator_delivery_start",
    "kind": "mutating",
    "command": [
      "delivery",
      "start"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "fromPlanning",
        "flag": "from-planning",
        "kind": "identifier"
      },
      {
        "name": "editable",
        "flag": "editable",
        "kind": "paths"
      }
    ],
    "timeoutMs": 3600000
  },
  "delivery_resume": {
    "id": "orchestrator_delivery_resume",
    "kind": "mutating",
    "command": [
      "delivery",
      "resume"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      }
    ],
    "timeoutMs": 3600000
  },
  "delivery_recover_review": {
    "id": "orchestrator_delivery_recover_review",
    "kind": "mutating",
    "command": [
      "delivery",
      "recover-review"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "expect",
        "flag": "expect",
        "kind": "identifier"
      }
    ],
    "timeoutMs": 3600000
  },
  "delivery_finalize": {
    "id": "orchestrator_delivery_finalize",
    "kind": "mutating",
    "command": [
      "delivery",
      "finalize"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "expect",
        "flag": "expect",
        "kind": "identifier"
      }
    ],
    "timeoutMs": 300000
  },
  "delivery_commit": {
    "id": "orchestrator_delivery_commit",
    "kind": "mutating",
    "command": [
      "delivery",
      "commit"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "expect",
        "flag": "expect",
        "kind": "identifier"
      },
      {
        "name": "message",
        "flag": "message",
        "kind": "text"
      }
    ],
    "timeoutMs": 300000
  },
  "delivery_clear_lock": {
    "id": "orchestrator_delivery_clear_lock",
    "kind": "mutating",
    "command": [
      "delivery",
      "clear-lock"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "fingerprint",
        "flag": "fingerprint",
        "kind": "hex"
      }
    ],
    "timeoutMs": 300000
  },
  "delivery_recover_commit": {
    "id": "orchestrator_delivery_recover_commit",
    "kind": "mutating",
    "command": [
      "delivery",
      "recover-commit"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "expect",
        "flag": "expect",
        "kind": "identifier"
      },
      {
        "name": "from",
        "flag": "from",
        "kind": "enum",
        "values": [
          "staged",
          "committed"
        ]
      },
      {
        "name": "message",
        "flag": "message",
        "kind": "text",
        "optional": true
      },
      {
        "name": "commit",
        "flag": "commit",
        "kind": "hex",
        "optional": true
      }
    ],
    "timeoutMs": 300000
  },
  "delivery_abandon": {
    "id": "orchestrator_delivery_abandon",
    "kind": "mutating",
    "command": [
      "delivery",
      "abandon"
    ],
    "params": [
      {
        "name": "runId",
        "flag": null,
        "kind": "identifier"
      },
      {
        "name": "expect",
        "flag": "expect",
        "kind": "identifier"
      },
      {
        "name": "workspaceFingerprint",
        "flag": "workspace-fingerprint",
        "kind": "hex"
      }
    ],
    "timeoutMs": 300000
  }
} as const;

import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type ParamKind = 'identifier' | 'text' | 'hex' | 'enum' | 'paths' | 'answers';
interface Param { readonly name: string; readonly flag: string | null; readonly kind: ParamKind; readonly values?: readonly string[]; readonly optional?: boolean }
interface Spec { readonly id: string; readonly kind: 'read_only' | 'mutating'; readonly command: readonly string[]; readonly params: readonly Param[]; readonly timeoutMs: number }
interface Context { readonly abort?: AbortSignal; ask?(input: { permission: string; patterns: string[]; always: string[]; metadata: Record<string, unknown> }): Promise<void> }
interface Result { readonly title: string; readonly output: string; readonly metadata: Record<string, unknown> }

// This file lives at <project>/.opencode/tools/orchestrator.ts; the project root is three levels up.
const PROJECT_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const RUNTIME_MANIFEST = join(PROJECT_ROOT, ...RUNTIME_MANIFEST_SEGMENTS);
const RUNTIME_CLI = join(PROJECT_ROOT, ...RUNTIME_ENTRY_SEGMENTS);
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const HEX = /^[0-9a-f]{7,64}$/;
const QUESTION_REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;
const MAX_TEXT = 50_000;

function envelope(code: string, message: string, extra: Record<string, unknown> = {}): Result {
  return { title: 'dev-orchestrator: ' + code, output: JSON.stringify({ ok: false, command: null, error: { code, message, details: extra } }), metadata: { bridge: code } };
}

/** node on PATH, as the project-local launchers require it: node.exe on Windows, node elsewhere; no shell, no other name. */
function resolveNode(): string | null {
  const separator = process.platform === 'win32' ? ';' : ':';
  const names = process.platform === 'win32' ? ['node.exe'] : ['node'];
  const path = process.env['PATH'] ?? process.env['Path'] ?? '';
  for (const entry of path.split(separator)) {
    if (entry.length === 0) continue;
    for (const name of names) {
      const candidate = join(entry, name);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // not here
      }
    }
  }
  return null;
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new Error(name + ' must be a string');
  return value;
}

/** Typed arguments → argv. Every value becomes its own element: positional (validated to never start with "-") or "--flag=value". */
function buildArgv(spec: Spec, args: Record<string, unknown>): string[] {
  const argv = [...spec.command];
  for (const param of spec.params) {
    const raw = args[param.name];
    if (param.kind === 'paths' || param.kind === 'answers') {
      if (!Array.isArray(raw) || raw.length === 0) throw new Error(param.name + ' must be a non-empty list');
      for (const item of raw) {
        if (param.kind === 'paths') {
          const value = text(item, param.name + '[]');
          if (value.length === 0 || value.length > 4096 || /[\0\r\n]/.test(value)) throw new Error(param.name + '[] must be a path without newlines');
          argv.push('--' + String(param.flag) + '=' + value);
        } else {
          const pair = item as { ref?: unknown; answer?: unknown };
          const ref = text(pair?.ref, param.name + '[].ref');
          const answer = text(pair?.answer, param.name + '[].answer');
          if (!QUESTION_REF.test(ref)) throw new Error(param.name + '[].ref must be a question ref as returned by planning inspect');
          if (answer.length === 0 || answer.length > MAX_TEXT) throw new Error(param.name + '[].answer must be non-empty text');
          argv.push('--' + String(param.flag) + '=' + ref + '=' + answer);
        }
      }
      continue;
    }
    const value = text(raw ?? '', param.name);
    if (value.length === 0) {
      if (param.optional === true) continue;
      throw new Error(param.name + ' is required');
    }
    switch (param.kind) {
      case 'identifier':
        if (!IDENTIFIER.test(value)) throw new Error(param.name + ' must be an identifier: letters, digits, ".", "_" or "-", not starting with "-"');
        break;
      case 'hex':
        if (!HEX.test(value)) throw new Error(param.name + ' must be lowercase hex exactly as the CLI returned it');
        break;
      case 'enum':
        if (!(param.values ?? []).includes(value)) throw new Error(param.name + ' must be one of ' + (param.values ?? []).join(', '));
        break;
      default:
        if (value.length > MAX_TEXT) throw new Error(param.name + ' is longer than ' + String(MAX_TEXT) + ' characters');
    }
    if (param.flag === null) argv.push(value);
    else if (!(param.kind === 'enum' && value === 'all')) argv.push('--' + param.flag + '=' + value);
  }
  argv.push('--json');
  return argv;
}

interface Ran { readonly code: number; readonly stdout: string; readonly stderr: string; readonly ended: 'exited' | 'timed_out' | 'aborted' | 'output_too_large' | 'spawn_failed'; readonly detail: string }

function runCli(node: string, argv: readonly string[], timeoutMs: number, abort: AbortSignal | undefined): Promise<Ran> {
  return new Promise((resolvePromise) => {
    execFile(
      node,
      [RUNTIME_CLI, ...argv],
      { cwd: PROJECT_ROOT, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: MAX_OUTPUT_BYTES, timeout: timeoutMs, killSignal: 'SIGTERM', signal: abort, env: process.env },
      (error, stdout, stderr) => {
        const failure = error as (Error & { code?: number | string | null; killed?: boolean; signal?: string | null }) | null;
        const out = { stdout: String(stdout), stderr: String(stderr) };
        if (failure === null) { resolvePromise({ ...out, code: 0, ended: 'exited', detail: '' }); return; }
        if (failure.code === 'ABORT_ERR') { resolvePromise({ ...out, code: 1, ended: 'aborted', detail: 'cancelled' }); return; }
        if (failure.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') { resolvePromise({ ...out, code: 1, ended: 'output_too_large', detail: 'output exceeded ' + String(MAX_OUTPUT_BYTES) + ' bytes' }); return; }
        if (failure.killed === true) { resolvePromise({ ...out, code: 1, ended: 'timed_out', detail: 'terminated after ' + String(timeoutMs / 1000) + ' s' }); return; }
        if (typeof failure.code === 'number') { resolvePromise({ ...out, code: failure.code, ended: 'exited', detail: '' }); return; }
        resolvePromise({ ...out, code: 1, ended: 'spawn_failed', detail: failure.message });
      },
    );
  });
}

async function run(spec: Spec, args: Record<string, unknown>, context: Context): Promise<Result> {
  let argv: string[];
  try {
    argv = buildArgv(spec, args ?? {});
  } catch (error) {
    return envelope('bridge_invalid_arguments', error instanceof Error ? error.message : String(error));
  }
  if (!existsSync(RUNTIME_MANIFEST) || !existsSync(RUNTIME_CLI)) {
    return envelope('bridge_runtime_missing', 'The project-local dev-orchestrator runtime is not installed under .dev-orchestrator/. The operator must run bootstrap install (or install-github) from the dev-orchestrator source, outside this cockpit. Nothing else can be run.');
  }
  const node = resolveNode();
  if (node === null) return envelope('bridge_node_missing', 'node was not found on PATH; the project-local runtime needs Node.js >= 24.');
  const target = typeof args?.['runId'] === 'string' && (args['runId'] as string).length > 0 ? (args['runId'] as string) : '*';
  if (typeof context?.ask === 'function') {
    await context.ask({ permission: spec.id, patterns: [target], always: [], metadata: { command: spec.command.join(' '), kind: spec.kind, runId: target } });
  }
  const ran = await runCli(node, argv, spec.timeoutMs, context?.abort);
  if (ran.ended !== 'exited') return envelope('bridge_' + ran.ended, 'dev-orchestrator ' + spec.command.join(' ') + ': ' + ran.detail + '. Inspect the run before doing anything else; nothing is retried.', { command: spec.command.join(' ') });
  const output = ran.stdout.trim().length > 0 ? ran.stdout.trim() : JSON.stringify({ ok: false, command: spec.command.join(' '), error: { code: 'bridge_no_output', message: ran.stderr.trim().slice(0, 2000) || 'the CLI produced no output', details: { exitCode: ran.code } } });
  return { title: 'dev-orchestrator ' + spec.command.join(' ') + ' (exit ' + String(ran.code) + ')', output, metadata: { exitCode: ran.code, command: spec.command.join(' '), kind: spec.kind } };
}

/** Deterministic run-id proposal (D-639): slug the title, then suffix until no listed run carries the id. */
function slugForRunId(title: string): string {
  const words = title.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((word) => word.length > 0).slice(0, 5);
  const slug = words.join('-').slice(0, 40).replace(/-+$/, '');
  return slug.length > 0 ? slug : 'task';
}

async function proposeRunId(args: Record<string, unknown>, context: Context): Promise<Result> {
  const title = typeof args?.['title'] === 'string' ? (args['title'] as string) : '';
  const listed = await run(SPECS['propose_run_id'] as Spec, {}, context);
  let existing: string[] = [];
  try {
    const parsed = JSON.parse(listed.output) as { ok?: boolean; data?: { runs?: { runId?: unknown }[] } };
    if (parsed.ok !== true) return listed;
    existing = (parsed.data?.runs ?? []).map((entry) => String(entry.runId ?? ''));
  } catch {
    return listed;
  }
  const slug = slugForRunId(title);
  let runId = 'plan-' + slug;
  for (let suffix = 2; existing.includes(runId); suffix += 1) runId = 'plan-' + slug + '-' + String(suffix);
  const output = JSON.stringify({ ok: true, command: 'propose run id', data: { runId, taskId: slug, existingRuns: existing.length, note: 'Proposed, not created: planning_start creates the run. Tell the operator these ids.' } });
  return { title: 'dev-orchestrator: proposed run id ' + runId, output, metadata: { runId, taskId: slug } };
}

export const status = {
  description: "Read-only: the project configuration, its Git state as the orchestrator sees it, and the effective providers. No model call, no change.",
  args: {},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["status"] as Spec, args, context),
};

export const runs_list = {
  description: "Read-only: every persisted planning and delivery run of this project with status, state class, lock, ownership and advisory next actions. No model call, no change.",
  args: {"kind":{"type":"string","enum":["all","planning","delivery"],"description":"Which runs to list: all, planning or delivery."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["runs_list"] as Spec, args, context),
};

export const runs_show = {
  description: "Read-only: one run in detail — status, state class, lock, ownership, safe detail and the advisory next actions. No model call, no change.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"kind":{"type":"string","enum":["all","planning","delivery"],"description":"all unless the CLI answered run_id_ambiguous; then planning or delivery as the operator intends."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["runs_show"] as Spec, args, context),
};

export const planning_inspect = {
  description: "Read-only: the planning run record, its checkpoint and pending questions. No model call, no change.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["planning_inspect"] as Spec, args, context),
};

export const delivery_inspect = {
  description: "Read-only: the delivery run verdict, its workspace fingerprint and whether it can be finalized, committed or abandoned. No model call, no change.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_inspect"] as Spec, args, context),
};

export const delivery_inspect_commit = {
  description: "Read-only: where an interrupted commit handoff stopped and which recovery applies. No model call, no change.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_inspect_commit"] as Spec, args, context),
};

export const propose_run_id = {
  description: "Read-only: proposes a run id and a task id for NEW planning work from a short title — a deterministic ASCII slug, suffixed until it collides with no existing run. Tell the operator the ids you will use.",
  args: {"title":{"type":"string","description":"A short title of the work in the operator’s words; slugged deterministically into a free run id and task id."}},
  execute: (args: Record<string, unknown>, context: Context) => proposeRunId(args, context),
};

export const planning_start = {
  description: "Starts a NEW read-only planning run (analyst → architect → reviewer) with the configured providers. Consumes model quota. Requires the operator’s explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"taskId":{"type":"string","description":"The task id (from orchestrator_propose_run_id unless the operator named one)."},"objective":{"type":"string","description":"The operator’s objective, VERBATIM: every line, quote, bullet, JSON fragment and symbol exactly as written. Do not summarize, translate or reformat it."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["planning_start"] as Spec, args, context),
};

export const planning_resume = {
  description: "Resumes a paused planning run with the operator’s answers to its blocking questions. Consumes model quota. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"answers":{"type":"array","minItems":1,"items":{"type":"object","properties":{"ref":{"type":"string"},"answer":{"type":"string"}},"required":["ref","answer"]},"description":"One entry per pending question: its exact ref as returned by orchestrator_planning_inspect, and the operator’s answer verbatim."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["planning_resume"] as Spec, args, context),
};

export const delivery_start = {
  description: "Starts a delivery from a passed plan: the writer edits only the listed files, the project’s verification commands run, the reviewer reviews, at most one fix. Consumes model quota and modifies the listed files. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"fromPlanning":{"type":"string","description":"The completed planning run the delivery implements."},"editable":{"type":"array","items":{"type":"string"},"minItems":1,"description":"The tracked files the writer may edit, exactly as the operator approved them (repository-relative paths)."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_start"] as Spec, args, context),
};

export const delivery_resume = {
  description: "Resumes a delivery stopped at a safe boundary. Consumes model quota and may modify the approved files. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_resume"] as Spec, args, context),
};

export const delivery_recover_review = {
  description: "Retries an interrupted read-only review (one reviewer call). Consumes model quota. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"expect":{"type":"string","description":"The interrupted review phase. One of: reviewing, rereviewing. Use exactly the status the inspection returned."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_recover_review"] as Spec, args, context),
};

export const delivery_finalize = {
  description: "Releases a finished delivery’s workspace without committing; the files stay as they are. No model call. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"expect":{"type":"string","description":"The terminal status orchestrator_delivery_inspect returned. One of: completed_without_fix, completed_after_fix, changes_required_after_fix, abandoned. Use exactly the status the inspection returned."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_finalize"] as Spec, args, context),
};

export const delivery_commit = {
  description: "Creates exactly one Git commit from an audited, successful delivery and releases its workspace. Never pushes. No model call. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"expect":{"type":"string","description":"The successful terminal status orchestrator_delivery_inspect returned. One of: completed_without_fix, completed_after_fix. Use exactly the status the inspection returned."},"message":{"type":"string","description":"The commit subject, in the operator’s words."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_commit"] as Spec, args, context),
};

export const delivery_clear_lock = {
  description: "Removes an observed run lock by its exact fingerprint. Nothing follows. No model call. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"fingerprint":{"type":"string","description":"The lock fingerprint exactly as orchestrator_runs_show / orchestrator_delivery_inspect returned it."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_clear_lock"] as Spec, args, context),
};

export const delivery_recover_commit = {
  description: "Finishes an interrupted commit handoff exactly as inspected. No model call. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"expect":{"type":"string","description":"The successful terminal status the inspection returned. One of: completed_without_fix, completed_after_fix. Use exactly the status the inspection returned."},"from":{"type":"string","enum":["staged","committed"],"description":"staged when the index was staged but not committed; committed when the commit exists but the workspace was not released."},"message":{"type":"string","description":"Required with from=staged (the commit subject, again); pass an empty string with from=committed. Optional: pass \"\" when it does not apply."},"commit":{"type":"string","description":"Required with from=committed (the commit hash orchestrator_delivery_inspect_commit returned); pass an empty string with from=staged. Optional: pass \"\" when it does not apply."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_recover_commit"] as Spec, args, context),
};

export const delivery_abandon = {
  description: "Terminally abandons a delivery that holds its workspace, against the exact observed fingerprint; the files stay, the reservation goes. No model call. Requires explicit intent and approval.",
  args: {"runId":{"type":"string","description":"The exact run id, as discovered through orchestrator_runs_list / orchestrator_runs_show. Never guessed."},"expect":{"type":"string","description":"The status orchestrator_delivery_inspect returned. One of: any abandonable status. Use exactly the status the inspection returned."},"workspaceFingerprint":{"type":"string","description":"The workspaceFingerprint exactly as orchestrator_delivery_inspect returned it."}},
  execute: (args: Record<string, unknown>, context: Context) => run(SPECS["delivery_abandon"] as Spec, args, context),
};
