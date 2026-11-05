# Skills

Skills are structured reference guides — procedures, flowcharts, and anti-patterns — that extend an AI agent's capabilities without bloating the session context. Each skill lives in its own directory with a `SKILL.md` plus any supporting files.

## Where Skills Live

Skills live in a single tree at `skills/<name>/SKILL.md`. Claude Code, Codex, and Cursor discover this directory through the pack's plugin manifests. The OpenCode plugin registers the directory through the v1 config hook or registers each skill through v2's skill transform, preserving its file path so supporting scripts and references resolve correctly; other tools read the files directly.

## Herdr & Orchestration

- **`herdr`** — Loads the installed guide with `herdr --skill` after checking `HERDR_ENV=1`. Reads the canonical lifecycle policy before agent start/exit/restart: false forbids these actions; true permits only guarded in-scope process management, preserving unrelated/working agents and topology.
- **`orchestration`** — Resolves repo config over shipped [roles.yaml](../skills/orchestration/roles.yaml), then only present selected-profile composition slots. Its [profiles contract](../skills/orchestration/references/profiles.md) owns nested model/effort targets, owner handoff, lifecycle permission, self-target routes, exact effort-free fallbacks, and reporting. Separate delegation uses reset-backed panes; profile self-target `delegate` requires fresh subagents; other owner-session modes permit reported self-review. No-profile independence and disabled gates remain intact; workers never re-delegate.
- **`using-herdr-sibling-panes`** — Transports separate targets through composer-safe `composer-submit.sh` with live footer model/effort verification before keys and after reset, completion markers, file reports, guarded recovery, and CLI probes. Profile self-target subagents use orchestration's route instead of pane transport.

## Strategic & Planning

- **`brainstorming`** — Read the existing project and supplied context before asking questions, then clarify what the user wants and why. Detailed requests get a grounded playback and one question about what remains open; an offer to skip the questions appears only when the user did not request brainstorming. Present the viable approaches, recommend one, and let the user choose. Small changes get a short design at `<DESIGN_DOC_PATH_PATTERN>` (not committed); projects get a full design and a **builder check** through `plan-review` before the user reads it. Both documents record the alternatives and choice and need approval before building. Then invoke `writing-plans`, except in an explicitly chosen `/quick`, which preserves its plan omission. Fully specified quick tasks, explicit opt-outs, and approved throwaway spikes retain their existing paths; workflow commands keep their own steps. Recon, the visual companion, and playback remain available when they help.
- **`writing-plans`** — Break the approved design into bite-sized, TDD-shaped tasks. Writes the plan to `<PLAN_PATH_PATTERN>` (do not commit). A plan records decisions, not a transcript of the code: each step carries the exact signature, test assertions, or command that makes it unambiguous, and the implementer writes the body. Includes File Structure, Task Right-Sizing, Global Constraints, a Review Focus list of spec-implied inputs no task tests yet, per-task Interfaces, and inline self-review with a proportion check. The handoff preserves prior execution choices and offers only methods eligible under the resolved profile/modes; required delegation cannot become inline work.

## Operational & Execution

- **`pane-driven-development`** — Runs per-task implementation, tests, and enabled reviews through resolved targets/modes, using file briefs, diff packages, and a durable plan-scoped ledger. Includes a five-round fix loop and scoped re-reviews; separate targets keep escalation while profile self-target fixes retain their mode. Reports test writer/transport, rulings, disabled gates, unavailable routes, and actual review independence. Workers never re-delegate.
- **`executing-plans`** — Runs eligible owner-session plan work inline with TDD, the shared ledger, task-start/task-done helpers, and one resolved whole-branch gate. Preserves legacy no-profile inline work overrides; selected-profile `delegate` routes cannot be inlined and use pane-driven-development instead. Final review may be independent or permitted reported self-review, followed by a single TDD-verified fix pass.
- **`finishing-a-development-branch`** — Verify tests, then present four integration candidates (merge locally / push + PR / push only / keep) and execute only the chosen one; discarding is off-menu and happens only on an explicit request. Never merges on its own; cleans up the worktree only as the choice requires.

## Quality & Verification

- **`test-driven-development`** — RED-GREEN-REFACTOR reference. The resolved test-authoring route chooses a fresh requirements-only worker (pane or required profile subagent) or the implementing session; report the writer and transport. Either way assertions come from the requirements, never from the code, and the RED run is evidence the report must carry.
- **`verification-before-completion`** — Mandatory evidence check before claiming a task is done. Run the verification command, read the output, THEN make the claim.
- **`systematic-debugging`** — Four-phase root-cause process (Investigation → Pattern → Hypothesis → Implementation) so bugs don't get patched with symptom fixes.

## Review

- **`requesting-code-review`** — Runs enabled reviews through resolved targets and modes: separate delegated panes reset, profile self-target `delegate` requires fresh subagents, other owner-session modes permit reported self-review, and no-profile independence stays. Supplies the same review contract, diff package, and written verdict for every route; missing mandatory capability is inability, never a passed gate.
- **`receiving-code-review`** — How the implementer processes review feedback (verify → evaluate → respond → implement; no performative agreement).

## Infrastructure & Meta

- **`using-git-worktrees`** — Create isolated worktrees with safety verification (`.gitignore`, baseline tests). Detects existing isolation (`GIT_DIR != GIT_COMMON`), prefers harness-native worktree tools, asks consent before creating. Required before implementation starts.
- **`update-docs`** — Keep root-level `docs/*.md` aligned with the codebase according to the contract in `update-docs/ROOT_DOCS.md`.
- **`writing-skills`** — Meta-skill applying TDD to skill authorship. Uses fresh API/reset-pane samples and pressure scenarios; development-profile self-review permissions do not allow in-session sampling. Loads discovery, flowchart, testing, and discipline references at the step that needs them.

## How to Use a Skill

1. Read the skill's `SKILL.md` end-to-end before starting the work it describes.
2. Follow the skill's own process. Read each linked reference from disk when the step requires it, including after compaction; the shorter SKILL.md is the entry point, not a substitute for those rules.
3. If the skill references another skill as a required sub-skill, read that one first too.
4. Skills are reference guides, not checklists to blindly tick off. When the skill explicitly says "stop and ask", stop and ask.
