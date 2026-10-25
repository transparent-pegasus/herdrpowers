# Skills

Skills are structured reference guides — procedures, flowcharts, and anti-patterns — that extend an AI agent's capabilities without bloating the session context. Each skill lives in its own directory with a `SKILL.md` plus any supporting files.

## Where Skills Live

Skills live in a single tree at `skills/<name>/SKILL.md`. Claude Code, Codex, and Cursor discover this directory through the pack's plugin manifests, and the OpenCode plugin registers it at startup; other tools read the files directly.

## Herdr & Orchestration

- **`herdr`** — Loads the installed binary's operating instructions with `herdr --skill` after checking `HERDR_ENV=1`. The pack's original bootstrap needs no upstream repository clone or separate skill installation. Herdr must be installed and support that flag.
- **`orchestration`** — Routes every task that arrives directly from the user through the pane that received it. Owns task routing, the complex-coding boundary, the plan review gate, the delegation contract, and exhaustion fallbacks. Routing resolves from the repo's `.herdrpowers/config.yaml` over the shipped [`roles.yaml`](../skills/orchestration/roles.yaml) defaults: a role list plus a role assigned to every delegation task. Every task is reassignable, every review individually togglable, and any non-default assignment or disabled review is named in the final report.
- **`using-herdr-sibling-panes`** — The delegation transport: composer-safe submission via `composer-submit.sh`, the completion-marker task contract, report-file handoffs, failure handling, and a probe that verifies a new agent CLI can be driven at all.

## Strategic & Planning

- **`brainstorming`** — Draw out what the user actually wants, and why, before anything gets built. Opens by offering to skip the questions and asking one open question, plays each part back in 200-300 words with its guesses marked, and finds out which how-it-gets-made choices (platform, language, libraries) the user wants to own, stating any default it picks. Offers recon (codebase, the user's files, the web), a throwaway spike, and the **visual companion** (browser-based Node.js server in `brainstorming/scripts/`) whenever seeing beats reading. Then sizes the work in plain words — **a quick, clear task** (do it), **a small change** (agreed in chat), **a project with a written design** (a document at `<DESIGN_DOC_PATH_PATTERN>`, not committed, then `writing-plans`) — and steps up a size if the work grows. A written design gets a **builder check** before the user reads it: readers routed as the `plan-review` gate read it as the person who will build it and list what they would still need to ask; brainstorming answers what it can, makes the minor calls itself, and brings the user one round of questions. Nothing gets built until the user approves the full description; the pack's workflow commands say the size but never downgrade their own steps.
- **`writing-plans`** — Break the approved design into bite-sized, TDD-shaped tasks. Writes the plan to `<PLAN_PATH_PATTERN>` (do not commit). A plan records decisions, not a transcript of the code: each step carries the exact signature, test assertions, or command that makes it unambiguous, and the implementer writes the body. Includes File Structure, Task Right-Sizing, Global Constraints, a Review Focus list of spec-implied inputs no task tests yet, per-task Interfaces, and inline self-review with a proportion check. The user reviews the saved plan before anything runs; the handoff offers `pane-driven-development` or `executing-plans` and recommends one for this plan.

## Operational & Execution

- **`pane-driven-development`** — Primary implementation engine. Delegates a fresh pane per task, hands task briefs and review packages over as files, runs one task review with separate spec-compliance and code-quality verdicts, and finishes with a broad whole-branch review. Implementer status protocol: `DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT`. Includes config-driven delegation assignments, pre-flight plan review, a bounded five-round fix loop with scoped re-reviews and an adjudication breaker, and a plan-scoped workspace whose durable progress ledger survives compaction. Runs on rulings rather than stalls: conflicts, ambiguities, and plan defects are decided and recorded as `Ruling:` ledger lines — four classes still stop for the human — and every ruling is rolled up by name in the final report.
- **`executing-plans`** — Inline execution: this session implements every task itself under the same plan workspace, ledger, and rulings as `pane-driven-development`, with TDD as the per-task gate and `task-start` / `task-done` helpers keeping the ledger honest, then one whole-branch review through the `final-branch-review` gate and a single TDD-verified fix pass. The user's choice at the plan handoff, and the fallback when `HERDR_ENV` is unset or no idle agent pane is in scope.
- **`finishing-a-development-branch`** — Verify tests, then present four integration candidates (merge locally / push + PR / push only / keep) and execute only the chosen one; discarding is off-menu and happens only on an explicit request. Never merges on its own; cleans up the worktree only as the choice requires.

## Quality & Verification

- **`test-driven-development`** — RED-GREEN-REFACTOR reference. The resolved `test-authoring` assignment says which pane writes a task's tests — a pane that never sees the implementation, or the implementing pane itself. Either way assertions come from the requirements, never from the code, and the RED run is evidence the report must carry.
- **`verification-before-completion`** — Mandatory evidence check before claiming a task is done. Run the verification command, read the output, THEN make the claim.
- **`systematic-debugging`** — Four-phase root-cause process (Investigation → Pattern → Hypothesis → Implementation) so bugs don't get patched with symptom fixes.

## Review

- **`requesting-code-review`** — Delegates the review via a reset-backed submit to any idle pane of the resolved role's agent type(s). Provides the review contract at `review-brief.md`: unspecified behavior is judged by what a reasonable user would expect, and the reviewer lists what it declined to judge so the orchestrator rules on each line.
- **`receiving-code-review`** — How the implementer processes review feedback (verify → evaluate → respond → implement; no performative agreement).

## Infrastructure & Meta

- **`using-git-worktrees`** — Create isolated worktrees with safety verification (`.gitignore`, baseline tests). Detects existing isolation (`GIT_DIR != GIT_COMMON`), prefers harness-native worktree tools, asks consent before creating. Required before implementation starts.
- **`update-docs`** — Keep root-level `docs/*.md` aligned with the codebase according to the contract in `update-docs/ROOT_DOCS.md`.
- **`writing-skills`** — Meta-skill for creating new skills with TDD applied to documentation. Bundles `examples/` for reference SKILL patterns.

## How to Use a Skill

1. Read the skill's `SKILL.md` end-to-end before starting the work it describes.
2. Follow the skill's own process — flowcharts, checklists, and red flags are there for a reason.
3. If the skill references another skill as a required sub-skill, read that one first too.
4. Skills are reference guides, not checklists to blindly tick off. When the skill explicitly says "stop and ask", stop and ask.
