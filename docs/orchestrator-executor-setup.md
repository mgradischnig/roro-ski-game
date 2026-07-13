# Orchestrator + Sonnet executor setup

This repo uses a committed orchestrator/executor split for Claude Code
sessions. This document is both the reference for how it works here and a
portable handover note: copy everything from "Goal" down into a fresh
Claude Code session in another repo to replicate the setup there.

Status in this repo: **implemented** — see `CLAUDE.md` (orchestration
section) and `.claude/agents/executor.md`.

---

## Goal

Commit a repo-level split: the main session (any model — see "Model choice")
plans, dispatches, verifies, and directs; a committed Sonnet `executor`
subagent implements substantive work. Committed config auto-loads in every
future session, including ephemeral Cloud/web sessions.

## Task for you (Claude), do this now

### 1. Add this section to `CLAUDE.md` (create the file if absent)

    ## Orchestration model
    The main session plans, dispatches, verifies, and directs; the
    `executor` subagent implements. (If you ARE the executor subagent,
    ignore this section and follow your agent instructions.)

    Delegation threshold: do trivial, single-file edits (typo, rename,
    small tweak) inline. Delegate substantive or multi-file implementation
    to `executor`. Keep tasks small and scoped so the executor returns
    frequently and you can course-correct at each boundary.

    Dispatch contract — every executor dispatch MUST include:
    - the exact file paths involved (the executor starts with zero context;
      prefer paths + line references over pasting large code blocks)
    - key constraints, signatures, or snippets it genuinely needs
    - explicit acceptance criteria
    - the command(s) to run for tests/linting

    Verification: after an executor returns, always review `git diff`;
    re-run tests in the main loop when the diff is nontrivial or the
    executor's report is unclear. Never trust the summary alone. Commit
    only after verification passes; the executor never commits or pushes.

    Loop guard: if the same task fails or comes back blocked after two
    dispatch rounds, stop re-dispatching — implement it inline or escalate
    to the user with the diagnosis. Follow-ups are re-dispatches with the
    prior result folded into the task context.

### 2. Create `.claude/agents/executor.md` with exactly this content:

    ---
    name: executor
    description: >
      Implements a fully-specified change: writes code, edits files, runs
      tests and linters. Use proactively for substantive implementation
      work once a plan or clear spec exists.
    tools: Read, Edit, Write, Bash, Grep, Glob
    model: sonnet
    ---

    You are an execution specialist. You receive a concrete, pre-planned
    task and carry it out precisely. Do not re-plan or expand scope —
    implement exactly what was specified, run the tests/linters named in
    the task, and report what you changed plus any blockers.

    If the spec is ambiguous, or a test fails in a way you can't confidently
    resolve, STOP and report back rather than guessing — returning early is
    correct behavior, not failure.

    Never run `git commit` or `git push`; the orchestrator owns version
    control.

Notes:

- `model: sonnet` is a floating alias (latest Sonnet; pin `claude-sonnet-5`
  for fixed behavior). Frontmatter model IS respected in Cloud sessions; a
  session-level `model` settings key is not — hence no settings key here.
- No `effort` is set — the executor inherits the session default. Tune only
  after observing it under- or over-thinking.
- The tool list exists to exclude `Agent`/`Task` (no subagent fan-out). It
  is not a security boundary — Bash can do anything — hence the explicit
  no-commit/no-push rule in the prompt.

### 3. Do NOT add these

- A `model` key in `.claude/settings.json` — not reliably enforced in Cloud.
- A `planner` subagent — the main session is the planner.
- A custom scout/search agent — use the built-in read-only `Explore` agent
  with a cheap per-invocation model (e.g. haiku) for triage.
- `CLAUDE_CODE_SUBAGENT_MODEL` — blanket override that silences per-agent
  `model:` frontmatter; only for a deliberate everything-is-Sonnet policy.

### 4. Commit and push

Commit both files (e.g. "Add orchestrator/executor split: Sonnet executor
subagent + CLAUDE.md policy") and push following this repo's normal
branch/PR workflow — in Cloud sessions, unpushed work is lost when the
container ends. Do not push to a protected branch without asking.

### 5. Smoke test

Dispatch the `executor` subagent with one task: "Run the project's test
suite (or linter if no tests) and report the results." The smoke test
PASSES if the executor loads, runs, and reports coherently — failing tests
are a finding to report, not a setup failure. If the agent fails to load
(frontmatter error) or can't run its tools, fix that before finishing.

Note: subagent definitions are loaded at session start, so a freshly
created `.claude/agents/executor.md` may not be dispatchable in the same
session that created it. In that case, verify the frontmatter parses and
run the smoke test at the start of the next session.

## Model choice (the human's dial)

The main-session model is picked per session (Cloud web UI picker, or
`/model` locally) and controls planning/verification quality only —
execution routes to Sonnet regardless, via the committed frontmatter:

- **Fable** for large, long-running autonomous work (the full orchestrator
  pattern — best planning, clean context, Sonnet-priced execution).
- **Any model** for everyday sessions: the delegation threshold keeps small
  edits inline and still routes big work to the executor.

This cannot be set from committed config in Cloud — it's always the picker.

## How the loop behaves (context, not rules)

The executor works autonomously in its own blank context and returns one
final summary — it cannot ask questions mid-run, so an early return on
ambiguity IS the check-in. All orchestrator↔executor contact happens at
task boundaries: smaller tasks = tighter control loop, and the dispatch
contract keeps each boundary's context-rebuild cost low.

## Cloud notes

- Everything committed above auto-loads in each new Cloud session (fresh
  repo clone). Only the model-picker step is manual.
- Cloud containers are ephemeral: plan state lives only in the running
  session. Commit and push at verified checkpoints so progress survives.
