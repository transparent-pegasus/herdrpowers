# Roles

herdrpowers has no in-process subagents and no named agent personas. Work is delegated to **sibling agent panes inside herdr**, and roles bind to *agent types*, not to reserved panes or specific tools. Any idle pane of the right type can take any task; a pane that just finished a review can take a coding task next.

Routing resolves from two files, in order:

1. **`<repo-root>/.herdrpowers/config.yaml`** — the target repository's own configuration, written by `/init`. Wins key by key. This is where you change who does what and which reviews run.
2. **[`skills/orchestration/roles.yaml`](../skills/orchestration/roles.yaml)** — the pack's shipped defaults, supplying every key the repo file omits.

Both share one schema — a **role list**, a fallback map, and a **role assigned to every delegation task**:

- `roles:` — each role and the agent type(s) it binds to.
- `fallbacks:` — agent → ordered substitutes for when an agent cannot take work.
- `assignments:` — every delegation task, each with the role that performs it and where it runs.

Customize the repo file, not `roles.yaml` — plugin installs are read-only, and editing a checked-in copy makes the pack diff-dirty against upstream. The skills speak in role and task names, never in tool names.

## Delegation Tasks

`assignments:` is the routing table: every unit of work the pack hands out has an entry, so nothing is hard-coded to a role. Each entry takes the same knobs — `role` (from the role list), `mode` (`delegate` = a fresh pane of that role, `orchestrator` = the orchestrator pane itself, `implementer` = the pane that already owns the task), and for reviews `enabled`.

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
| `plan-double-review` | `/plan`, `/full_cycle` | Plans reach the user for approval unreviewed |
| `documentation-impact-review` | `/execute`, `/full_cycle`, `/quick` | No pre-implementation sweep for non-code files |
| `task-review` | `pane-driven-development` | A task completes on the implementing pane's own report |
| `fix-round-re-review` | the fix loop | Fix rounds close on the fixing pane's word; the five-round cap still applies |
| `final-branch-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | The branch reaches the integration decision unreviewed |

Work tasks are never disabled — `mode: orchestrator` is how one stops being delegated. A repo may also define a role beyond the shipped four and assign tasks to it.

### One delegation per listed agent type

A role declared with `agents:` (a list) rather than `agent:` runs **one delegation per entry**. That is where a double review comes from — the role, not the task — so assigning a review task to a list role multiplies its pane usage by the list length, and assigning it to a single-agent role makes it a single review. A one-entry list is a deliberate single delegation; an empty list is the same as disabling the task.

Wherever a list role is used: the delegations come from different agent types, an unavailable type degrades the set rather than blocking the run, and the report names whether the full set, a degraded set, or a single delegation ran.

### What no assignment changes

- **A pane never reviews work it wrote.** Disabling a review removes it; it never converts one into a self-review.
- **Reviews from a list role come from different agent types.**
- **`review-fixes` escalates at fix-loop rounds 4-5** to a fresh pane of an escalated agent type, whatever its mode says.
- **The report names which pane wrote the tests**, whatever `test-authoring` and `fix-round-test-authoring` resolve to.

**Every assignment the repo config changed away from the shipped default, and every disabled review, is named in the final report**, alongside any role that fell back and any review that degraded for lack of panes — so nobody later mistakes an unreviewed branch for a reviewed one. Configuration is input: it is read once before the first delegation and never written from inside a run.

## The Roles

### Orchestrator

Whichever pane the user typed the request into. It plans, designs, integrates results, and talks to the user. It never re-delegates a task that arrived from another pane — a delegated instruction is executed in place.

Its judgment is final: reviewers advise, the orchestrator decides.

### Reviewer

Independent review — of plans and designs before any code is touched, and of implemented code where a review task is assigned to it. It binds to a **list** of agent types, so each review task assigned to it runs once per entry: different agent types review the same self-contained request in separate panes, with no shared draft opinion. The orchestrator compares findings, resolves disagreements, and only then acts.

If applying a fallback would put the same agent type in two Reviewer slots, the slot stays empty and the workflow degrades to fewer reviews instead — two reviews from the same agent type are one review with extra steps.

### Coder

The heavier-judgment role: complex coding, **test authoring**, and the whole-branch **final review** — every one of those a reassignable delegation task. The boundary between `complex-coding` and `simple-coding` is spelled out in the orchestration skill: cross-cutting changes, design freedom, stateful/concurrent logic, non-obvious debugging, risky refactors, and algorithmic work are complex. When in doubt, treat it as complex.

Test authoring is its own task (`test-authoring`, and `fix-round-test-authoring` for a fix round), so whether a Coder pane writes tests for code it also wrote, or a second Coder pane writes them blind, is a `mode` — see "Where Independence Comes From" below.

### Generalist

Everything else: simple coding that follows an existing pattern, search, file inspection, running tests and lint, formatting, and other mechanical or routine operations.

## Where Independence Comes From

The older design separated a `test-engineer` from a `code-reviewer` so nobody graded their own homework. This pack gets the same property from **fresh pane context** instead:

- Every delegation resets the target session, so a reviewing pane never sees the implementing pane's reasoning.
- A change is never sent back for review to the pane that wrote it; where an idle pane of a different agent type exists, it is preferred for review.
- RED evidence is a report artifact: the failing run before the code exists, quoted, with the reason the failure was expected. Missing or reconstructed RED evidence is a finding.

Test independence is a `mode`, and each setting pays for it differently:

- **`test-authoring: {mode: delegate}`** — a second pane writes the tests from the same task brief, in its own worktree at the commit before the implementation, and is never shown the code. Its RED is structural: the implementation is genuinely absent, so a test that *passes* there is a defect to report. The cost is an extra pane and a throwaway worktree per task, and a brief that has to pin exact names and signatures — both panes are working to it, and an unpinned interface fails as a test failure.
- **`test-authoring: {mode: implementer}`** — the implementing pane writes its own tests under RED-GREEN-REFACTOR. Cheaper, and the reviewing panes then **review the test code** as the compensating control: does the test assert the requirement or just mirror the implementation, and would it fail if the behavior regressed? That review is not optional under this mode.
- **`fix-round-test-authoring`** answers the same question for a fix round. Delegated, the round's covering tests come from a pane that is neither the fixing pane nor the original test author — tests written by whoever just changed the behavior prove only that the behavior changed.

Whichever runs, the report names the pane that wrote the tests.

## Exhaustion and Fallback

An agent type is exhausted when its output says the usage or rate limit is reached, or when two delegations to two different idle panes of that type both come back with no completion marker and no work done. Exhaustion is a property of the agent type, not of one pane.

The orchestrator then takes the first substitute from the resolved `fallbacks:` map that has a usable idle pane, re-delegates the same instruction unchanged, and routes around the exhausted type for the rest of the task. Every fallback is named in the final report.

If no substitute is available, the work runs in the orchestrator pane when that is safe, and the report says which independence was lost.

**Escalation is the same mechanism, different trigger.** Exhaustion routes around an agent type that *cannot* work; escalation routes around one that *is not getting there* — a pane reporting BLOCKED for lack of reasoning, or a fix loop still open at round 4. Panes expose no model dial to the orchestrator, so "try something stronger" means a fresh pane of a different agent type: another type eligible for the role, or the substitute in `fallbacks:`. The swap is named in the ledger, same as a fallback is named in the report.

## Delegating

| Platform | How |
|---|---|
| Any agent inside herdr (`HERDR_ENV=1`) | `using-herdr-sibling-panes` → `scripts/composer-submit.sh`, then wait for the completion marker with `herdr wait output`. |
| Outside herdr | No delegation. Skills degrade to inline execution (`executing-plans`), and the report states which steps were not independent. |

Before an agent CLI is used as a delegation target for the first time — and again after that CLI is upgraded — run `skills/using-herdr-sibling-panes/scripts/probe-composer.sh "$PANE"` against one idle pane of that type. Composer key bindings differ per CLI and change across releases; any `FAIL` means that agent type is not delegatable yet.

Skills that wrap delegation:

- `orchestration` — routing, the complex-coding boundary, plan double review, fallbacks
- `using-herdr-sibling-panes` — the transport: composer-safe submission, markers, failure handling
- `pane-driven-development` — the per-task loop over panes
- `requesting-code-review` + `receiving-code-review` — the review request and how to process its findings
