---
name: using-herdr-sibling-panes
description: "Use when inside herdr (HERDR_ENV=1), the current pane is acting as the orchestrator for the task, and idle sibling agent panes can take delegated work — operational repo tasks standalone, or any routed task as the delegation transport for the orchestration skill."
---

# Using herdr sibling panes

For Herdr-pane transport, `HERDR_ENV=1` is required. If it is missing, stop that transport.

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<REPORT_DIRECTORY>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise), or fall back to the git-ignored workspace that `bash pane-driven-development/scripts/pdd-workspace [PLAN_FILE]` prints (per-plan with a plan file, the shared `adhoc` directory without one).

Before profile routing, handoff, or lifecycle decisions, read
[`orchestration/references/profiles.md`](../orchestration/references/profiles.md).
It owns composition resolution and the active orchestrator's authority. A
reception pane that mismatches the selected kind, model, or effort always asks
the user whether it should be unused or relay; it cannot silently take over.
The explicit handoff carries the instruction, repo/worktree, profile and frozen
settings and must not bounce back as worker delegation.

For pane layout, read [`herdr`](../herdr/SKILL.md), which loads the installed
Herdr guide. This skill transports separate targets to idle sibling panes.
With a selected profile, a self-target (solo coder or empty reviewers) in
`mode: delegate` instead requires a fresh in-process subagent, including reviews;
missing capability is a reported inability, never inline delegation. Other
modes run in the owner session and may use a subagent at its judgment; report
same-session self-review honestly, without claiming independence. Disabled gates
stay disabled. A separate target whose pane is not open, with no usable
fallback, goes to the `orchestration` skill's subagent fallback — a fresh
in-process subagent of the owner's own kind — while that fallback is enabled.
Only the active orchestrator dispatches; workers never re-delegate.

## When to use

Use when you are inside herdr, your pane is acting as the orchestrator for the task (whichever pane received the task — no specific tool is assumed or required), and one or more sibling agent panes are idle.

What to delegate depends on how this skill was entered:

* **Driven by the `orchestration` skill**: this skill is the delegation transport; the orchestration skill's task routing decides what goes to which agent, including complex coding.
* **Standalone**: delegate only independent operational work such as tests, lint, formatting, file reads, git status/diff/log, server logs, and command output. Do not delegate coding, design, root-cause debugging, planning, or reasoning-heavy work.

## Workflow

1. Run `herdr pane list` and identify your own pane (the orchestrator) by `$HERDR_PANE_ID`. Every entry carries `pane_id`, `tab_id`, `workspace_id`, `agent`, `agent_status`, and `cwd`.
2. Discard every out-of-scope pane first — by default that is every pane outside your own tab. See "Delegation scope" below; it applies before anything else in this list.
3. From what remains, select only sibling panes that have an `agent` field and `agent_status: idle` or `done`. A pane still holding one of your delegations — no marker, no report yet — is not a candidate whatever its status: from herdr 0.9.4, agy and grok count as `idle` once back at their prompt while asynchronous work continues in their existing session, and a submit would reset the session under that work. A target's requested model and effort must match the live footer — see "Target model and effort". A pane with no `agent` field is a plain shell or a crashed agent. The `agent` field alone is not proof the agent is alive: the helper refuses a pane whose foreground is its own shell (exit `2`), and for an agent suspended with Ctrl+Z, `pane read` the pane and confirm its composer is on screen. Never hand-send text to a pane you have not confirmed.
4. When more than one candidate remains, confirm the composer is empty before you send: `herdr pane read "$PANE" --source visible`. An empty composer reads as an empty follow-up placeholder (`› `, `→ Add a follow-up`). A pane showing unsent text is not a candidate — another orchestrator is composing there, and the helper wipes that draft with `ctrl+u` before it resets the session. If the only candidate has leftover text, do not send — report the pane to the user.
5. Distribute independent work items across the available panes, one instruction per pane. When footers show quota, prefer the candidate with the most left — after reading what the figure means: codex prints `weekly 99% left`, while a statusLine's bare `5h: 43%` is whatever that script prints.
6. Submit one self-contained instruction per pane with `bash scripts/composer-submit.sh PANE INSTRUCTION [MODEL [EFFORT]]`. It resets the target session and submits the instruction in one call. Do not send `/clear` yourself.
7. Do not send a second prompt such as "Please run the task I just sent." The submitted instruction is already running.
8. Wait for the instruction's unique completion marker with `herdr pane wait-output`, always with a timeout, in bounded stretches (see "Task contract").
9. On a marker match, re-read `pane list`. If the pane is still `working`, wait with `herdr agent wait "$PANE" --until idle --until done` — work that finishes unseen settles at `done`. Agent status lags behind the visible output — the marker is the completion signal, status is not.
10. On anything other than a marker match, go to "Failure handling". Never retype into a composer to "fix" a failed submission.
11. Read the completed result and integrate it in the orchestrator pane.

## Delegation scope

**Delegation stays inside the orchestrator's own tab unless the repository widens it.** A tab is how a herdr user separates projects: a pane one tab over is usually sitting in a different repository, in a session its own user is mid-task in, and the helper's reset would destroy that work.

The scope comes from resolved `delegation.pane_scope` after repo config and present profile overrides over `orchestration/roles.yaml`, and defaults to `tab` — including standalone use, where no configuration was resolved at all.

| value | eligible panes |
|---|---|
| `tab` | only panes whose `tab_id` equals the orchestrator's — the default |
| `workspace` | any pane in the orchestrator's `workspace_id`, in any tab |
| `session` | every agent pane `herdr pane list` reports |

Filter before selecting anything. Under the default scope, this prints every eligible pane and its agent type:

```bash
herdr pane list | jq -r --arg tab "$HERDR_TAB_ID" --arg self "$HERDR_PANE_ID" '
  .result.panes[]
  | select(.tab_id == $tab and .pane_id != $self)
  | select(.agent != null and (.agent_status == "idle" or .agent_status == "done"))
  | "\(.pane_id)\t\(.agent)\t\(.cwd)"'
```

For `workspace`, compare `.workspace_id` against `$HERDR_WORKSPACE_ID` instead; for `session`, drop the topology filter. Without `jq`, read the same three fields out of the JSON by hand — do not skip the check.

An out-of-scope pane is not a candidate at all: not a last resort, not a fallback target, and never counted when deciding whether an agent type is available. When no in-scope pane of the needed type exists, that type is unavailable for this delegation — start one when `allow_agent_lifecycle` is true ("Agent lifecycle"); otherwise take a fallback per "Failure handling", take the orchestration skill's subagent fallback, wait for one to free up, ask the user to start one, or degrade as the calling skill directs. Never widen the scope mid-run to find a pane; that is a configuration change, and configuration is not written from inside a run.

An absolute path in the instruction does not make a cross-repository pane safe: that pane's agent loads its own repository's instruction files and skills first. If the task itself targets a repository other than the one you are working in, confirm the target with the user before delegating or editing.

## Target model and effort

New profiles and newly written roles use nested targets, for example
`{codex: {model: GPT-6.2-Sol, effort: max}}`: one kind, optional model and
effort strings, effort requiring model. Preserve the user's spelling. Legacy
bare kinds and `orchestrator` stay readable; non-fallback `kind@model` is
read-only migration input, normalized with a deprecation notice by
`orchestration`. Fallback strings retain that syntax.

Herdr reports kind, not model or effort. Read the live footer below the
composer with `bash scripts/pane-model.sh PANE [MODEL [EFFORT]]`; offline
input is `bash scripts/pane-model.sh --kind KIND [MODEL [EFFORT]] < screen`.
Config, launch arguments, transcript, and splash header are never live truth.
Models match as case-insensitive substrings. Efforts match as exact semantic
tokens, case-insensitively: `Extra High` and `xhigh` are aliases; `high`
matches neither. Missing, unknown, or ambiguous evidence fails closed. Effort
`any` verifies only the model and leaves the choice to the active owner: pass
the settings unchanged, `any` included, or pass the effort you chose for the
task to have it verified — then report it. Before relying on a footer rule, read
[references/composer-keys.md#footer-model-and-effort-evidence](references/composer-keys.md#footer-model-and-effort-evidence):
it holds the per-CLI layouts, effort positions, observed versions, and
evidence limits (Claude needs a statusLine; Cursor appends its effort label
to the model name). Never invent a rule to make a profile match.

A narrow pane can hide its footer: opencode draws no model line at about 30
columns, so `pane-model.sh` reports none. That is unverified, not a mismatch —
`composer-submit.sh` widens a pane below its width floor before it verifies,
so let it decide; its exit `5` is the verdict.

Select at the resolved scope and pass the settings unchanged; the submit
helper checks them before any key and again after reset, exiting `5` on a
mismatch without submitting the instruction:

```bash
# Resolved from {codex: {model: GPT-6.2-Sol, effort: max}}:
kind=codex
target_settings=(GPT-6.2-Sol max)
herdr pane list | jq -r --arg tab "$HERDR_TAB_ID" --arg self "$HERDR_PANE_ID" --arg kind "$kind" '
  .result.panes[]
  | select(.tab_id == $tab and .pane_id != $self and .agent == $kind)
  | select(.agent_status == "idle" or .agent_status == "done")
  | .pane_id' |
while read -r pane; do
  # A printed footer that does not match rules the pane out; no footer at all
  # (a narrow pane) leaves the verdict to composer-submit.sh after widening.
  footer=$(bash "$SKILL_DIR/scripts/pane-model.sh" "$pane" "${target_settings[@]}") ||
    [[ -z $footer ]] || continue
  echo "$pane"
done
# then, for the chosen pane:
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION" "${target_settings[@]}"
```

Routing selects matching panes; it never switches an existing pane's model or
effort. Report the pane id and observed footer for each constrained
delegation. Fallback resolution belongs to `orchestration`: nested kind/model
becomes the exact `kind@model` key, then bare kind. An explicit empty list is
authoritative. Fallbacks have no effort constraint; never inherit the primary
effort or change exact user names such as the distinct Muse spellings.

## Agent lifecycle

`allow_agent_lifecycle` is a top-level strict boolean, false by default. When
false, do not start, exit, or restart agents by keys or shell to satisfy
routing, including fallback and handoff: reuse a matching live pane or report
the needed manual action. When true, the active owner starts a resolved
target that has no live match in an available in-scope shell pane, and ends
idle agents the task started — only through `scripts/agent-lifecycle.sh`,
which exits `6` while the value is not `true`. Read
[references/agent-lifecycle.md](references/agent-lifecycle.md) before the
first start or stop. Neither value allows interrupting working agents,
answering startup dialogs, changing topology, or widening scope. Native flags
come from the CLI's own help; never invent a stop command.

## Composer-safe submission

Agent CLIs take input through a stateful composer — slash-command popups,
autocomplete, queued follow-ups — so `herdr pane run` cannot drive them.
**Never submit `/clear` or a delegated prompt to an agent pane with
`pane run` or raw back-to-back keys.** Use the bundled helper: it checks that
the pane is a live agent at a usable width (zooming a narrow pane and
restoring the tab's zoom on every exit path), verifies the requested model
and effort, clears the composer, resets the session, submits exactly one
instruction, and confirms the pane started. Read
[references/composer-keys.md](references/composer-keys.md) before sending any
keys by hand: it explains each failure the helper guards against and holds
the verified key sequences.

`$SKILL_DIR` below is the directory containing *this* `SKILL.md`. The scripts ship next to it, so resolve them against it — never against the repo you are working in.

```bash
SKILL_DIR=<directory containing this SKILL.md>
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION" [MODEL [EFFORT]]
```

Exit codes: `0` submitted and running; `2` bad usage (including an empty or multiline model or effort, effort without model, an embedded newline, or a bare `/word` slash trigger) or the pane is not a usable idle agent pane — including an agent that exited to its shell, before or during the reset; `3` the instruction did not submit; `4` the pane stayed too narrow after zoom; `5` the requested model or effort could not be verified before keys or after reset, so no instruction was sent.

Before using a new or upgraded agent CLI as a target, run its
[onboarding probe](references/composer-keys.md#onboarding-a-new-agent-cli).
A failure stops onboarding until resolved.

## Task contract

Before preparing any delegation or waiting for it, read
[references/task-contract.md](references/task-contract.md). It defines the
absolute worktree path, scope and edit protections, file reports, the split
completion marker, and bounded waits with report-file reconciliation. Every
submission needs that contract; terminal status alone never proves
completion. Read it again after compaction. Never end your turn while a
delegation is in flight — nothing wakes the orchestrator when a pane finishes.

## Failure handling

On any submission failure, timeout, missing report, or unexpected pane status,
read [references/failure-handling.md](references/failure-handling.md) before
retrying or choosing a fallback. It distinguishes a failure to start, a
still-running pane, an approval prompt, a wrong model, and exhaustion. Do not
reset a working pane, answer its approval prompt on the user's behalf, or
rewrite herdr's agent state to get a submission through.

Use the [exhaustion rules](references/failure-handling.md#exhaustion-and-fallback)
to classify the outcome, then let `orchestration` resolve the fallback.
Unavailable, exhausted, and failed-to-start are different states.
