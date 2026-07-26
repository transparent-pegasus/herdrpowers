# Skills

Skills are structured reference guides — procedures, flowcharts, and anti-patterns — that extend an AI agent's capabilities without bloating the session context. Each skill lives in its own directory with a `SKILL.md` plus any supporting files.

## Where Skills Live

Skills live in a single tree at `skills/<name>/SKILL.md`. Claude Code, Codex, and Cursor all discover this directory through the pack's plugin manifests; other tools read the files directly.

## Herdr & Orchestration

- **`herdr`** — Control herdr itself: workspaces, tabs, panes, agent lifecycle states, IDs, and caller context. The vendored official skill from the herdr project (Apache-2.0). Requires `HERDR_ENV=1`.
- **`orchestration`** — Routes every task that arrives directly from the user through the pane that received it. Owns task routing, the complex-coding boundary, plan double review, the delegation contract, and exhaustion fallbacks. Role assignments live in the swappable [`roles.yaml`](../skills/orchestration/roles.yaml).
- **`using-herdr-sibling-panes`** — The delegation transport: composer-safe submission via `composer-submit.sh`, the completion-marker task contract, report-file handoffs, failure handling, and a probe that verifies a new agent CLI can be driven at all.

## Strategic & Planning

- **`brainstorming`** — Turn an idea into an approved design through one-question-at-a-time dialogue. Writes the design to `<DESIGN_DOC_PATH_PATTERN>` (do not commit). Terminal state is invoking `writing-plans`. Includes an optional **visual companion** (browser-based Node.js server in `brainstorming/scripts/`) for mockups, diagrams, and visual comparisons. Inline spec self-review runs before the user-review gate.
- **`writing-plans`** — Break the approved design into bite-sized, TDD-shaped tasks. Writes the plan to `<PLAN_PATH_PATTERN>` (do not commit). Includes File Structure, Task Right-Sizing, Global Constraints, per-task Interfaces, "No Placeholders" guardrails, and inline self-review. Offers `pane-driven-development` or `executing-plans` as next steps.

## Operational & Execution

- **`pane-driven-development`** — Primary implementation engine. Delegates a fresh pane per task, hands task briefs and review packages over as files, runs one task review with separate spec-compliance and code-quality verdicts, and finishes with a broad whole-branch review. Implementer status protocol: `DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT`. Includes role selection, pre-flight plan review, a bounded five-round fix loop with scoped re-reviews and an adjudication breaker, and a plan-scoped workspace whose durable progress ledger survives compaction.
- **`executing-plans`** — Inline fallback for single-session sequential execution with checkpoints. Use when `HERDR_ENV` is unset or no idle agent pane exists.
- **`finishing-a-development-branch`** — Verify tests, then present four integration candidates (merge locally / push + PR / push only / keep) and execute only the chosen one; discarding is off-menu and happens only on an explicit request. Never merges on its own; cleans up the worktree only as the choice requires.

## Quality & Verification

- **`test-driven-development`** — RED-GREEN-REFACTOR reference. The pane implementing a task writes that task's tests: assertions come from the requirements, never from the code, and the RED run is evidence the report must carry.
- **`verification-before-completion`** — Mandatory evidence check before claiming a task is done. Run the verification command, read the output, THEN make the claim.
- **`systematic-debugging`** — Four-phase root-cause process (Investigation → Pattern → Hypothesis → Implementation) so bugs don't get patched with symptom fixes.

## Review

- **`requesting-code-review`** — Delegates the review to a fresh pane that did not write the code. Provides the review contract at `review-brief.md`.
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
