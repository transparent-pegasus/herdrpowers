---
name: using-herdr-sibling-panes
description: "Use when inside herdr (HERDR_ENV=1), the current pane is acting as the orchestrator for the task, and idle sibling agent panes can take delegated work — operational repo tasks standalone, or any routed task as the delegation transport for the orchestration skill."
---

# Using herdr sibling panes

`HERDR_ENV=1` is required. If it is missing, stop.

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<REPORT_DIRECTORY>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise), or fall back to the git-ignored workspace that `bash pane-driven-development/scripts/pdd-workspace [PLAN_FILE]` prints (per-plan with a plan file, the shared `adhoc` directory without one).

For pane layout, read [`herdr`](../herdr/SKILL.md). Use this skill only for multi-pane delegation to idle sibling agent panes.

## When to use

Use when you are inside herdr, your pane is acting as the orchestrator for the task (whichever pane received the task — no specific tool is assumed or required), and one or more sibling agent panes are idle.

What to delegate depends on how this skill was entered:

* **Driven by the `orchestration` skill**: this skill is the delegation transport; the orchestration skill's task routing decides what goes to which agent, including complex coding.
* **Standalone**: delegate only independent operational work such as tests, lint, formatting, file reads, git status/diff/log, server logs, and command output. Do not delegate coding, design, root-cause debugging, planning, or reasoning-heavy work.

## Workflow

1. Run `herdr pane list` and identify your own pane (the orchestrator) by `$HERDR_PANE_ID`. Every entry carries `pane_id`, `tab_id`, `workspace_id`, `agent`, `agent_status`, and `cwd`.
2. Discard every out-of-scope pane first — by default that is every pane outside your own tab. See "Delegation scope" below; it applies before anything else in this list.
3. From what remains, select only sibling panes that have an `agent` field and `agent_status: idle` or `done`. A pane still holding one of your delegations — no marker, no report yet — is not a candidate whatever its status: from herdr 0.9.4, agy and grok count as `idle` once back at their prompt while their background tasks or subagents keep running, and a submit would reset the session under that work. For an `agent@model` entry, the pane's footer must also show that model — see "Model-pinned entries". A pane with no `agent` field is a plain shell or a crashed agent — see "Failure handling". The `agent` field alone is not proof the agent is alive: it can name a CLI that has since exited, leaving the pane at a shell prompt. The helper checks this before sending anything (it exits `2` when the pane's foreground process is its own shell), so let it. From herdr 0.9.4 the field can also name an agent suspended with Ctrl+Z while another program holds the foreground, which that check misses — `pane read` the pane and confirm its composer is on screen. Never hand-send text to a pane you have not confirmed.
4. When more than one candidate remains, confirm the composer is empty before you send: `herdr pane read "$PANE" --source visible`. An empty composer reads as an empty follow-up placeholder (`› `, `→ Add a follow-up`). A pane showing unsent text is not a candidate — another orchestrator is composing there, and `composer-submit.sh` wipes that draft with `ctrl+u` before it resets the session. The helper cannot tell a half-written brief from any other composer content and must not try: this is someone else's work being destroyed, not a failure to recover from. If the only candidate has leftover text, do not send — report the pane to the user.
5. Distribute independent work items across the available panes, one instruction per pane.
6. Submit one self-contained instruction per pane with `bash scripts/composer-submit.sh`. It resets the target session and submits the instruction in one call; do not send `/clear` yourself.
7. Do not send a second prompt such as "Please run the task I just sent." The submitted instruction is already running.
8. Wait for the instruction's unique completion marker with `herdr pane wait-output`, always with a timeout.
9. On a marker match, re-read `pane list`. If the pane is still `working`, wait for `idle` or `done` — work that finishes unseen settles at `done`, so a wait for `idle` alone sits out its whole timeout; if it is already `idle` or `done`, continue. Agent status lags behind the visible output — the marker is the completion signal, status is not.
10. On anything other than a marker match, go to "Failure handling". Never retype into a composer to "fix" a failed submission.
11. Read the completed result and integrate it in the orchestrator pane.

## Delegation scope

**Delegation stays inside the orchestrator's own tab unless the repository widens it.** A tab is how a herdr user separates projects: every pane carries its own `cwd`, and a pane one tab over is usually sitting in a different repository, in a session its own user is mid-task in. `composer-submit.sh` resets the target session, so a cross-tab delegation destroys that work — silently, and in a repo the task has no business touching.

The scope comes from `delegation.pane_scope` in the merged configuration (`.herdrpowers/config.yaml` over `orchestration/roles.yaml`), and defaults to `tab` — including standalone use, where no configuration was resolved at all.

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

An out-of-scope pane is not a candidate at all: not a last resort, not a fallback target, and never counted when deciding whether an agent type is available. When no in-scope pane of the needed type exists, that type is unavailable for this delegation — say so to the user and ask them to start one, wait for one to free up, fall back per "Exhaustion and fallback", or degrade as the calling skill directs. Never widen the scope mid-run to find a pane; that is a configuration change, and configuration is not written from inside a run.

An absolute path in the instruction does not make a cross-repository pane safe. That pane's agent loads *its own* repository's instruction files, configuration, and skills before reading your task, so it works your files under someone else's conventions. If the task itself turns out to target a repository other than the one you are working in, confirm the target with the user before delegating or editing — read-only investigation needs no confirmation.

## Model-pinned entries

herdr reports each pane's agent kind (`agent: cursor`) but not the model it runs, so two cursor panes on different models look identical to routing. An entry can pin the model as `agent@model` — `cursor@Muse Spark`. Split it at the first `@`: the left side is the agent kind, the right side the model. A bare kind matches any model.

The model comes from the footer the CLI draws below its composer, read by `scripts/pane-model.sh`. Nothing else is per-pane truth: herdr's JSON has no model field, a CLI's config file is shared by every pane running it, launch arguments go stale after a `/model` switch, and so does the splash header — a grok pane kept `Model · Grok 4.6` in its header after switching to Grok 4.7, and only the footer changed. A pane matches when the model is a case-insensitive substring of its footer model line, that is, when `pane-model.sh "$PANE" "$MODEL"` exits `0`.

| kind | composer anchor | model line | observed |
| --- | --- | --- | --- |
| `claude` | `❯` | first text line after the composer's closing border | Claude Code 2.1.295 |
| `codex` | `›` | first text line after the blank line below the composer | codex 0.162.0 |
| `cursor` | `→` | first text line after the composer's closing border | cursor-agent 2026.10.01-e373342 |
| `agy` | `>` | first text line after the composer's closing border | Antigravity CLI 1.3.2 |
| `grok` | `❯` | first text line after the composer line | grok 1.0.50 |
| `opencode` | `┃` | the last `┃` line, inside the composer box | opencode 1.18.35 |

Matching fails closed. A kind with no rule (exit `3`), a screen with no composer line, or an open model picker gives no match, and the pane is not a candidate for a pinned entry. claude prints a model line only through a user `statusLine` that outputs the model (for example `.model.display_name`); without one, a `claude@…` entry never matches. A pinned entry whose kind has in-scope panes, none of them showing the model, is **unavailable** — the same as a kind with no pane.

Select for one entry like this (tab scope; widen the topology filter as in "Delegation scope"), then pass the model to the helper as its third argument. The helper re-checks the footer before it sends any key and again after the reset, and exits `5` on a mismatch:

```bash
entry='cursor@Muse Spark'
kind=${entry%%@*}
model=
[[ $entry == *@* ]] && model=${entry#*@}
herdr pane list | jq -r --arg tab "$HERDR_TAB_ID" --arg self "$HERDR_PANE_ID" --arg kind "$kind" '
  .result.panes[]
  | select(.tab_id == $tab and .pane_id != $self and .agent == $kind)
  | select(.agent_status == "idle" or .agent_status == "done")
  | .pane_id' |
while read -r pane; do
  [[ -z $model ]] || bash "$SKILL_DIR/scripts/pane-model.sh" "$pane" "$model" >/dev/null || continue
  echo "$pane"
done
# then, for the chosen pane:
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION" ${model:+"$model"}
```

Routing selects panes by model; it never sends `/model` or otherwise switches one. For every delegation to a pinned entry, name the pane id and its model line in the report.

## Composer-safe submission

Agent CLIs take input through a composer — a stateful input box with slash-command autocomplete, follow-up suggestions, and message queueing. Composers cannot be driven reliably with `herdr pane run`, regardless of which agent runs in the pane:

* **Keys consumed by UI.** Slash-command and autocomplete popups swallow the single Enter that `pane run` sends, leaving the text sitting in the composer.
* **Autocomplete is a lie.** A composer can *render* the highlighted completion (`/clear`) while its buffer still holds what was actually typed (`/cl`). Submitting then sends the partial text to the model as a chat message. Always write a slash command in full, in a single `send-text` call.
* **Any bare `/word` is a slash trigger, not just a real command.** An incidental `/word` mid-sentence (`... the /run integration step ...`) opens the popup *during the paste*, and `esc` + `enter` then submits a corrupted or truncated string instead of the instruction. Observed on cursor-agent 3× in a row: the pane goes idle with no completion marker and no work done, and `pane read` shows a garbled fragment starting mid-word, sometimes prefixed `$ ` or ending `exit 1` — the remainder ran as a shell command. Rewording (`/run` → `hourly-pipeline`) fixed it immediately on the same panes. Absolute paths (`/abs/path/to/worktree`) have not triggered it. The helper rejects bare slash tokens with exit `2` before submitting; reword the instruction rather than retrying it.
* **Retained state and races.** A composer can keep the previous prompt or queued follow-ups after completion, and text insertion and key handling are asynchronous, so back-to-back CLI calls can race even with the right keys. Later delegation text then concatenates onto stale input.

Therefore, never submit `/clear` or delegated prompts to an agent pane with `pane run`. Use the bundled helper, which clears the composer, resets the session, submits exactly one instruction, and confirms the pane actually started.

**Width is a precondition.** Cursor's composer has been measured ignoring Enter in narrow panes, while Codex still submitted at widths down to 4 columns. Raising the settle seconds does not compensate. The observed boundary is not monotonic — 22 columns passed while 24 failed — and remains unexplained, so the default 40-column floor is conservative, not a measured cliff. Before touching the composer, the helper reads the foreground process's terminal width. Below `HERDR_COMPOSER_MIN_COLS` (default `40`), it temporarily widens the pane with `herdr pane zoom`; if the pane remains below the floor, it refuses with exit `4` and names the measured width and floor. On exit, including every failure path, it puts the tab's zoom back the way it found it — unzoomed, or zoomed on whichever pane held it before.

**Zoom is one slot per tab, so submissions into one tab serialize.** `herdr pane zoom --on` against an already-zoomed tab *moves* the zoom onto the target pane while reporting `zoom_changed: false`, so a helper that trusted that flag would disclaim cleanup and leak the zoom — and every later submission would then see the leaked zoom and leak it again. The helper reads the tab's real zoom state instead, and holds a per-tab `flock` across measure → zoom → Enter so two concurrent delegations into the same tab cannot trade the slot and resize each other's composer mid-paste. Parallel delegation is unaffected apart from a few seconds of submission ordering; the delegated work still runs concurrently.

`$SKILL_DIR` below is the directory containing *this* `SKILL.md`. The scripts ship next to it, so resolve them against it — never against the repo you are working in.

```bash
SKILL_DIR=<directory containing this SKILL.md>
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
```

Exit codes: `0` submitted and running, `2` bad usage (embedded newline, or a bare `/word` slash trigger in the instruction) or the pane is not a usable idle agent pane — including a pane whose agent has exited and left it at a shell prompt, `3` the instruction did not submit, `4` the pane remained too narrow after a zoom attempt, `5` a third argument named a model the pane's footer does not show — checked before any key is sent and again after the reset, so no instruction was sent (see "Model-pinned entries").

### Verified keys

For the verified key sequences or a manual fallback when the helper is
unavailable, read [references/composer-keys.md](references/composer-keys.md)
before sending any keys. The helper remains the normal submission path.

### Onboarding a new agent CLI

Before using a new or upgraded CLI as a target, read the
[onboarding procedure](references/composer-keys.md#onboarding-a-new-agent-cli)
and run its probe. A failure stops onboarding until resolved.

## Task contract

Before preparing any delegation or waiting for it, read
[references/task-contract.md](references/task-contract.md). It defines the
absolute worktree path, scope and edit protections, file reports, split
completion marker, and bounded waits with report-file reconciliation.
Every submission needs that contract; terminal status alone never proves
completion. Read it again after compaction.

## Failure handling

On any submission failure, timeout, missing report, or unexpected pane status,
read [references/failure-handling.md](references/failure-handling.md) before
retrying or choosing a fallback. It distinguishes a failure to start, a
still-running pane, an approval prompt, a wrong model, and exhaustion.
Do not reset a working pane or answer its approval prompt on the user's behalf.

### Exhaustion and fallback

Use the [exhaustion rules](references/failure-handling.md#exhaustion-and-fallback)
to classify the outcome, then let `orchestration` resolve the fallback.
Unavailable, exhausted, and failed-to-start are different states.
