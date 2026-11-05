# Roles

herdrpowers routes work by roles, effective targets, and assignment modes. Separate delegated targets use reset-backed Herdr panes. With a selected profile, `delegate` to the active owner requires a fresh in-process subagent for work and reviews; other owner-session modes permit inline work/self-review and optional subagents at the owner's judgment. Without a profile, retain legacy routing and fresh-subagent orchestrator-mode reviews. Roles do not reserve panes: any idle matching pane can serve a role after its previous task finishes.

Read the canonical [profiles contract](../skills/orchestration/references/profiles.md) before resolving ownership or routing. The base configuration comes from:

1. **`<repo-root>/.herdrpowers/config.yaml`** — the target repository's own configuration, written by `/init`. Wins key by key. This is where you change who does what and which reviews run.
2. **[`skills/orchestration/roles.yaml`](../skills/orchestration/roles.yaml)** — the pack's shipped defaults, supplying every key the repo file omits.

Both share one schema — a **role list**, a fallback map, and a **role assigned to every delegation task**:

- `roles:` — `agent`/`agents` bindings. New targets use nested settings, e.g. `{codex: {model: GPT-6.1-Sol, effort: max}}`; effort requires model. Bare `orchestrator` dynamically aliases the active owner. Legacy bare kinds remain readable; non-fallback `kind@model` is migration input normalized with a deprecation notice, and init writes nested targets.
- `fallbacks:` — exact string keys and ordered string substitutes (`kind` or `kind@model`), without effort constraints.
- `delegation:` — defaults applying to every task: `pane_scope` and `execution` (see [Delegation Scope and Execution Strategy](#delegation-scope-and-execution-strategy)).
- `assignments:` — every delegation task, each with the role that performs it and where it runs.
- `profile` — optional composition name; missing/null/literal `none` selects none.
- `allow_agent_lifecycle` — separate top-level strict boolean, false by default.

Customize the repo file, not `roles.yaml` — plugin installs are read-only, and editing a checked-in copy makes the pack diff-dirty against upstream. The skills speak in role and task names, never in tool names.

## Profile Composition and Ownership

After merging repo config over shipped roles, overlay only keys present in the
selected `.herdrpowers/profiles/<name>.yaml`, repo-local first and shipped only
if absent locally. Invalid names, files, or targets are explicit errors. Profiles
contain only `orchestrator`, `coder`, and `reviewers`; omitted slots keep resolved
roles. Explicit empty coder (`null`, `[]`, `none`) means solo; empty reviewers
(`[]`, null, `none`) select the owner without disabling a gate. Lists replace.
Preserve custom planning-design/generalist bindings, added roles, assignments,
modes, and gates. A concrete coder matching the owner is still a separate worker.

A mismatched reception pane always asks **unused or relay** before owner handoff
or startup, even if a matching owner exists. The explicit handoff transfers
decision authority, user instruction, paths, and frozen settings; workers never
re-delegate, while the newly selected owner may orchestrate. A relay only relays.

Lifecycle false forbids start/exit/restart, including recovery and fallback.
True requires installed Herdr/operation and CLI help, starts only in available
in-scope shell panes, verifies live model/effort, and ends only idle agents
actually started for this task with no pending work. It grants process
management, not topology destruction or interruption of working agents.

## Delegation Tasks

`assignments:` supplies `role`, `mode`, and (for reviews) `enabled`. `delegate`
uses a fresh reset-backed worker for separate targets; profile self-targets
require fresh subagents. `orchestrator` uses the active owner; selected-profile
reviews permit same-session self-review or an optional subagent, while
no-profile reviews require a fresh subagent. `implementer` continues in the
session owning the task. Apply gate enablement first, then target and mode.

**The YAML is the source of truth for who does what.** These tables say what each task covers; for the shipped role and mode, read [`roles.yaml`](../skills/orchestration/roles.yaml) — it changes across releases, and no prose copy of it is authoritative.

Work tasks — these always happen; the assignment decides who and where:

| Task | Covers |
|---|---|
| `plan-and-design` | Brainstorming, design docs, implementation plans |
| `complex-coding` | Implementation over the complex-coding boundary |
| `simple-coding` | Localized, pattern-following edits under that boundary |
| `chores` | Lookups, file moves, log gathering, mechanical edits, lint/format runs |
| `test-authoring` | A task's tests for the implementation round |
| `fix-round-test-authoring` | The covering tests for one fix round |
| `review-fixes` | Fixing review findings |
| `verification` | Running the repo's baseline and supplemental verification commands |

Review tasks — same knobs plus `enabled`, which removes the gate:

| Task | Runs in | Off means |
|---|---|---|
| `plan-review` | `/plan`, `/full_cycle`, and `brainstorming`'s builder check on a project's full design | Plans reach the user for approval unreviewed, and a project's full design reaches them without a builder check |
| `documentation-impact-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | No pre-implementation sweep for non-code files |
| `task-review` | `pane-driven-development` | A task completes on the implementing pane's own report |
| `fix-round-re-review` | the fix loop | Fix rounds close on the fixing pane's word; the five-round cap still applies |
| `final-branch-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | The branch reaches the integration decision unreviewed |

Work tasks are never disabled — `mode: orchestrator` is how one stops being delegated. A repo may also define a role beyond the shipped four and assign tasks to it.

One workflow overrides this column: `/strict_full_cycle` ignores `enabled` and runs every gate above, naming each one it forced on in its report. It changes nothing else — no `role`, no `mode`, no invariant — and never writes the configuration file.

### One delegation per listed agent type

A role declared with `agents:` runs **one delegation per entry**. A one-entry list is deliberate; a legacy empty role list disables its tasks unless a present profile composition key overrides it. Explicit empty profile reviewers instead select the owner, and an enabled delegated review still requires a fresh subagent.

Separate list targets need different kinds or distinct pinned models of one kind (case-insensitive, neither containing the other); effort alone is not another independent slot. Run available slots, wait for busy matching agents, and name reduced sets. Missing mandatory self-target subagent capability is inability, never inline substitution or a passed review.

### What no assignment changes

- **Separate delegated review independence comes from reset, not pane ID.** The implementing pane may review after reset. Profile owner-session self-review is the scoped alternative and is reported as self-review; no-profile independence remains unchanged.
- **Separate list slots require distinct kinds or pinned models.**
- **Separate targets and no-profile `review-fixes` keep rounds 4-5 escalation.** Profile self-targets retain their resolved mode, including mandatory fresh subagents for `delegate`; the five-round cap stays fixed.
- **The report names the test writer and transport**, whatever test-authoring assignments resolve to. Disabled gates remain off (except strict mode's enabled-only override).

**Every assignment the repo config changed away from the shipped default, and every disabled review, is named in the final report**, alongside any role that fell back and any review that degraded for lack of panes — so nobody later mistakes an unreviewed branch for a reviewed one. Configuration is input: it is read once before the first delegation and never written from inside a run.

## Delegation Scope and Execution Strategy

Two keys under `delegation:` apply to every task, ahead of any role or assignment.

**`pane_scope`** — which panes may receive a delegation at all, relative to the orchestrator pane:

| value | eligible panes |
|---|---|
| `tab` | only panes in the orchestrator's own tab — the shipped default |
| `workspace` | any pane in the orchestrator's workspace, in any tab |
| `session` | every agent pane herdr reports |

Cross-tab delegation is off by default because a tab is how a herdr user separates projects. Every pane reports its own `cwd`, and a pane one tab over is usually in a different repository with its own user mid-task — and every delegation resets the target session, so that work would be gone. An out-of-scope pane is not a candidate, not a fallback target, and not counted when deciding whether an agent type is available; a type with no in-scope pane is *unavailable*, which degrades the run and is named in the report.

**`execution`** — what `/full_cycle` and `/strict_full_cycle` attempt for implementation: `parallel` (the shipped default) extracts the plan's independent tracks and runs them concurrently in per-track worktrees off a coordination branch, per `/execute_parallel`; `serial` runs tasks one at a time, per `/execute`. It sets what is attempted, not what is forced — a plan with one track, or a session with one usable pane, still runs serially, and the report says how much parallelism was actually achieved. `/execute` and `/execute_parallel` are explicit user choices and ignore the key.

Under `parallel`, plans are written for it: `writing-plans` emits a `## Tracks` table with each track's goal, tasks, owned files, and dependencies, and tags every task with its track. Execution validates and runs that partition instead of re-deriving one from a document that never had ownership boundaries in mind. A single-track plan is a valid answer, stated as one `main` track with the reason the work does not partition.

## The Roles

### Orchestrator

Without a profile, the reception pane owns the task. A selected profile may name a verified different owner through the explicit handoff above. The active owner integrates results and makes decisions; a relay retains no decision authority. Ordinary workers execute delegated instructions directly and never re-delegate.

Its judgment is final: reviewers advise, the orchestrator decides.

### Reviewer

Reviews plans, designs, and code where assigned. A list binding supplies one review per entry with the same self-contained request. Separate delegated reviewers share no draft opinion. A profile may instead select the owner, whose mode decides fresh-subagent review versus permitted self-review. The active owner compares findings and resolves disagreements.

If fallback duplicates a separate slot's kind/model, leave that slot unavailable and report fewer reviews. Different effort on the same model does not create another independent review.

### Coder

The role for heavier implementation judgment. Actual tasks and modes come from the resolved assignments, not this description. The orchestration skill defines the complex/simple coding boundary. Explicit empty profile coder selects the active owner; a concrete coder target stays separate even when its kind/model equals the owner's.

Test authoring is its own task (`test-authoring`, and `fix-round-test-authoring` for a fix round), so whether a Coder pane writes tests for code it also wrote, or a second Coder pane writes them blind, is a `mode` — see "Where Independence Comes From" below.

### Generalist

Everything else: simple coding that follows an existing pattern, search, file inspection, running tests and lint, formatting, and other mechanical or routine operations.

## Where Independence Comes From

Separate delegated work gets independence from **fresh sessions**:

- Every reset-backed delegation clears the target session, so a reviewing agent never sees the implementing session's reasoning.
- The same physical pane may take that review after a reset. Routing follows the resolved assignment only (`agent:` / `agents:`); there is no prefer-different-type heuristic.
- RED evidence is a report artifact: the failing run before the code exists, quoted, with the reason the failure was expected. Missing or reconstructed RED evidence is a finding.

Test independence is a `mode`, and each setting pays for it differently:

- **`test-authoring: {mode: delegate}`** — a fresh worker (reset-backed pane or required profile self-target subagent) gets requirements alone in its own BASE worktree, without implementation. It reports expected RED; merged tests produce GREEN.
- **`test-authoring: {mode: implementer}`** — the implementing session owns RED-GREEN-REFACTOR. Enabled reviewers audit that test code; report whether that was independent or permitted profile self-review. This mode does not revive a disabled gate.
- **`fix-round-test-authoring`** answers the same question for a fix round. Delegated tests use a fresh author with findings rather than the fix diff, at FIX_BASE. Keep the separate-pane ownership restrictions on the legacy path.

Whichever runs, the report names the writer and transport. Profile self-review allowances do not relax fresh-sample requirements for skill-authorship testing.

## Exhaustion and Fallback

An agent target is exhausted when its output reports a usage limit, or two delegations to different idle panes of that target return no marker and no work. Exhaustion of one constrained model does not exhaust other models of its kind.

For a nested target, look up the exact `kind@model` fallback key using its preserved spelling; only an absent key permits bare-kind lookup. A matched `[]` is authoritative. Substitutes keep string syntax and have no effort constraint: discard primary effort and report that loss. Preserve `Calude` and the unequal `muse-1.0-wonder` / `muse-wonder-1.0` strings. No fuzzy aliases or list concatenation. Re-submit the same self-contained task to the first usable substitute.

Without a profile, safe inline degradation remains available for work. With a profile, a fallback to the owner obeys its mode: `delegate` requires a fresh subagent. Report unavailable mandatory capability instead of claiming inline delegation. Lifecycle permission still applies during fallback.

**Separate-target escalation selects a different eligible live target**, rather than changing an existing agent's model/effort. Apply it for lack-of-reasoning BLOCKED reports and rounds 4-5; profile self-target fixes retain their mode. Record the swap and lost constraints. All requested model/effort constraints need live footer evidence before keys and after reset; unknown effort fails closed, and Cursor's bare Max plan label is not reasoning evidence.

## Delegating

| Platform | How |
|---|---|
| Any agent inside herdr (`HERDR_ENV=1`) | `using-herdr-sibling-panes` → `scripts/composer-submit.sh`, then wait for the completion marker with `herdr pane wait-output`. |
| Profile self-target `delegate` | Fresh in-process subagent with the same self-contained brief and no re-delegation; missing capability is inability. |
| Profile owner-session modes | Inline/self-review permitted, optional subagent at active-owner judgment; report actual transport and independence. |
| Outside herdr | Herdr transport unavailable; legacy no-profile work may degrade inline. Selected-profile modes remain binding. |

Before an agent CLI is used as a delegation target for the first time — and again after that CLI is upgraded — run `bash skills/using-herdr-sibling-panes/scripts/probe-composer.sh "$PANE"` against one idle pane of that type. Composer key bindings differ per CLI and change across releases; any `FAIL` means that agent type is not delegatable yet.

Skills that wrap delegation:

- `orchestration` — routing, the complex-coding boundary, the plan review gate, fallbacks
- `using-herdr-sibling-panes` — the transport: composer-safe submission, markers, failure handling
- `pane-driven-development` — the per-task loop over panes
- `requesting-code-review` + `receiving-code-review` — the review request and how to process its findings
