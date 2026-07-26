# Roles

herdrpowers has no in-process subagents and no named agent personas. Work is delegated to **sibling agent panes inside herdr**, and roles bind to *agent types*, not to reserved panes or specific tools. Any idle pane of the right type can take any task; a pane that just finished a review can take a coding task next.

Role assignments live in one swappable file: [`skills/orchestration/roles.yaml`](../skills/orchestration/roles.yaml). To change who does what, edit only that file — the skills speak in roles, never in tool names.

## The Roles

### Orchestrator

Whichever pane the user typed the request into. It plans, designs, integrates results, and talks to the user. It never re-delegates a task that arrived from another pane — a delegated instruction is executed in place.

Its judgment is final: reviewers advise, the orchestrator decides.

### Reviewer

Independent double review of **plans and designs**, before any code is touched. Two different agent types review the same self-contained request in separate panes, with no shared draft opinion. The orchestrator compares findings, resolves disagreements, and only then asks the user to approve.

If applying a fallback would put the same agent type in both Reviewer slots, the slot stays empty and the workflow degrades to a single review instead — two reviews from the same agent type are one review with extra steps.

### Coder

Complex coding, **test authoring**, and **code review of implemented changes**. The boundary between "complex" (Coder) and "simple" (Generalist) is spelled out in the orchestration skill: cross-cutting changes, design freedom, stateful/concurrent logic, non-obvious debugging, risky refactors, and algorithmic work are complex. When in doubt, treat it as complex.

The Coder pane that implements a task also writes its tests and owns RED-GREEN-REFACTOR for it.

### Generalist

Everything else: simple coding that follows an existing pattern, search, file inspection, running tests and lint, formatting, and other mechanical or routine operations.

## Where Independence Comes From

The older design separated a `test-engineer` from a `code-reviewer` so nobody graded their own homework. This pack gets the same property from **fresh pane context** instead:

- Every delegation resets the target session, so a reviewing pane never sees the implementing pane's reasoning.
- A change is never sent back for review to the pane that wrote it; where an idle pane of a different agent type exists, it is preferred for review.
- Because the implementing pane writes its own tests, the reviewing pane **reviews the test code** — does the test assert the requirement or just mirror the implementation, and would it fail if the behavior regressed? That review is the compensating control, and it is not optional.
- RED evidence is a report artifact: the failing run before implementation, quoted, with the reason the failure was expected. Missing or reconstructed RED evidence is a finding.

## Exhaustion and Fallback

An agent type is exhausted when its output says the usage or rate limit is reached, or when two delegations to two different idle panes of that type both come back with no completion marker and no work done. Exhaustion is a property of the agent type, not of one pane.

The orchestrator then takes the first substitute from the `fallbacks:` map in `roles.yaml` that has a usable idle pane, re-delegates the same instruction unchanged, and routes around the exhausted type for the rest of the task. Every fallback is named in the final report.

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
