# roro-ski-game

RoRo Ski: a math-practice ski racing game for kids. Phaser 3 + Vite,
Supabase backend. `npm run dev` to develop, `npm run build` to build.
All sprites are generated programmatically in `src/scenes/BootScene.js` —
there is no image asset pipeline.

## Orchestration model

The main session plans, dispatches, verifies, and directs; the `executor`
subagent implements. (If you ARE the executor subagent, ignore this section
and follow your agent instructions.)

Delegation threshold: do trivial, single-file edits (typo, rename, small
tweak) inline. Delegate substantive or multi-file implementation to
`executor`. Keep tasks small and scoped so the executor returns frequently
and you can course-correct at each boundary.

Dispatch contract — every executor dispatch MUST include:

- the exact file paths involved (the executor starts with zero context;
  prefer paths + line references over pasting large code blocks)
- key constraints, signatures, or snippets it genuinely needs
- explicit acceptance criteria
- the command(s) to run for tests/linting

Verification: after an executor returns, always review `git diff`; re-run
tests in the main loop when the diff is nontrivial or the executor's report
is unclear. Never trust the summary alone. Commit only after verification
passes; the executor never commits or pushes.

Loop guard: if the same task fails or comes back blocked after two dispatch
rounds, stop re-dispatching — implement it inline or escalate to the user
with the diagnosis. Follow-ups are re-dispatches with the prior result
folded into the task context.

Rationale and the portable handover version of this setup:
`docs/orchestrator-executor-setup.md`.
