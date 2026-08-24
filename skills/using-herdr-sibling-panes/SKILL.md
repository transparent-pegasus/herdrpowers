---
name: using-herdr-sibling-panes
description: "Use when inside herdr (HERDR_ENV=1), the current pane is acting as the orchestrator for the task, and idle sibling agent panes can take delegated work — operational repo tasks standalone, or any routed task as the delegation transport for the orchestration skill."
---

# Using herdr sibling panes

`HERDR_ENV=1` is required. If it is missing, stop.

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<REPORT_DIRECTORY>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise), or fall back to the git-ignored workspace that `pane-driven-development/scripts/pdd-workspace [PLAN_FILE]` prints (per-plan with a plan file, the shared `adhoc` directory without one).

For pane layout, read [`herdr`](../herdr/SKILL.md). Use this skill only for multi-pane delegation to idle sibling agent panes.

## When to use

Use when you are inside herdr, your pane is acting as the orchestrator for the task (whichever pane received the task — no specific tool is assumed or required), and one or more sibling agent panes are idle.

What to delegate depends on how this skill was entered:

* **Driven by the `orchestration` skill**: this skill is the delegation transport; the orchestration skill's task routing decides what goes to which agent, including complex coding.
* **Standalone**: delegate only independent operational work such as tests, lint, formatting, file reads, git status/diff/log, server logs, and command output. Do not delegate coding, design, root-cause debugging, planning, or reasoning-heavy work.

## Workflow

1. Run `herdr pane list` and identify your own pane (the orchestrator) by `$HERDR_PANE_ID`. Every entry carries `pane_id`, `tab_id`, `workspace_id`, `agent`, `agent_status`, and `cwd`.
2. Discard every out-of-scope pane first — by default that is every pane outside your own tab. See "Delegation scope" below; it applies before anything else in this list.
3. From what remains, select only sibling panes that have an `agent` field and `agent_status: idle` or `done`. A pane with no `agent` field is a plain shell or a crashed agent — see "Failure handling". The `agent` field alone is not proof the agent is alive: it can name a CLI that has since exited, leaving the pane at a shell prompt. The helper checks this before sending anything (it exits `2` when the pane's foreground process is its own shell), so let it — never hand-send text to a pane you have not confirmed.
4. When more than one candidate remains, confirm the composer is empty before you send: `herdr pane read "$PANE" --source visible`. An empty composer reads as an empty follow-up placeholder (`› `, `→ Add a follow-up`). A pane showing unsent text is not a candidate — another orchestrator is composing there, and `composer-submit.sh` wipes that draft with `ctrl+u` before it resets the session. The helper cannot tell a half-written brief from any other composer content and must not try: this is someone else's work being destroyed, not a failure to recover from. If the only candidate has leftover text, do not send — report the pane to the user.
5. Distribute independent work items across the available panes, one instruction per pane.
6. Submit one self-contained instruction per pane with `scripts/composer-submit.sh`. It resets the target session and submits the instruction in one call; do not send `/clear` yourself.
7. Do not send a second prompt such as "Please run the task I just sent." The submitted instruction is already running.
8. Wait for the instruction's unique completion marker with `herdr wait output`, always with a timeout.
9. On a marker match, re-read `pane list`. If the pane is still `working`, wait for `idle`; if it is already `idle` or `done`, continue. Agent status lags behind the visible output — the marker is the completion signal, status is not.
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
"$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
```

Exit codes: `0` submitted and running, `2` bad usage (embedded newline, or a bare `/word` slash trigger in the instruction) or the pane is not a usable idle agent pane — including a pane whose agent has exited and left it at a shell prompt, `3` the instruction did not submit, `4` the pane remained too narrow after a zoom attempt.

### Verified keys

Verified 2026-07-25 against codex 0.145.0, cursor-agent 2026.07.23-e383d2b, and grok 0.2.112 with `scripts/probe-composer.sh`, and re-verified 2026-08-24 against grok 1.0.5. All agree, so the helper uses one sequence:

| purpose | key / text | notes |
| --- | --- | --- |
| clear composer | `ctrl+u` | leaves the session intact |
| reset session | `/clear` + `enter` | all three CLIs have `/clear` |
| dismiss popup | `esc` | keeps composer text, closes slash/mention popup |
| submit | `enter` | |
| interrupt a running task | `esc` | |

The grok 1.0.5 re-verification covers clear, reset, popup-dismiss, and submit at 44 columns and again at 39: `esc` closes the slash popup leaving the composer text untouched, and `enter` submits at both widths. It does not cover the interrupt row — that account hit its weekly usage limit mid-probe, which leaves the pane `blocked` on an upgrade prompt `esc` does not clear.

Two keys that look plausible and are wrong:

* **`ctrl+c` quits Codex.** On an idle Codex composer it exits the TUI and drops the pane to a shell. Never use it to cancel composer state; `ctrl+u` does that job without the exit path.
* **`ctrl+enter` does not submit in Codex.** The text stays in the composer and the delegation silently never runs.

If the helper is unavailable, this is the same sequence by hand. Do not remove the settle points — and understand what you give up: the hand sequence skips the shell-prompt check, the width floor, and the started confirmation, so it will happily type a delegated instruction onto a bare command line. Before the first `send-text`, `pane read` the target and confirm you can see a composer (`›`, `→ Add a follow-up`) and not a shell prompt (`%`, `$`). Send lowercase `enter` as a key; a literal `Enter` string is text, and it silently accumulates in the composer instead of submitting.

```bash
herdr pane send-keys "$PANE" ctrl+u
sleep 0.40
herdr pane send-text "$PANE" "/clear"
sleep 0.40
herdr pane send-keys "$PANE" esc
sleep 0.40
herdr pane send-keys "$PANE" enter
sleep 1.20
herdr pane send-keys "$PANE" ctrl+u
sleep 0.40
herdr pane send-text "$PANE" "$INSTRUCTION"
sleep 0.40
herdr pane send-keys "$PANE" esc
sleep 0.40
herdr pane send-keys "$PANE" enter
```

Use `pane run` normally for shells and other terminal programs; this workaround is specifically for agent composers.

### Onboarding a new agent CLI

Before an agent type is used as a delegation target for the first time, and again after that CLI is upgraded, run the probe against one idle pane of that type:

```bash
"$SKILL_DIR/scripts/probe-composer.sh" "$PANE"
```

It checks, in order: the pane is an idle agent pane; the pane meets the conservative composer-width floor; leftover composer text clears without killing the TUI; `/clear` resets the session and the TUI survives; an instruction submits and the pane starts working; the split completion marker is not matched by the prompt echo; the marker is matched when the task finishes; a running task can be interrupted and the pane returns to idle; and the agent process is the same one it was before the probe.

Any `FAIL` stops onboarding until it is resolved. A width failure is a layout precondition: widen the pane and re-run. For other failures, find the CLI's real key for the failing step and update the helper before sending it work.

## Task contract

Every instruction must include the **absolute working directory** (a pane does not inherit the orchestrator's cwd — when the work happens in a worktree, give the worktree path and require the pane to confirm it is there before doing anything else), the exact command or path, the edit policy, the report format, and a unique final completion marker that `wait output` can match.

**Reports go to files.** Terminal scrollback is lossy — an agent on the alternate screen loses rows that `pane read` can never recover. Name a report file path in every brief (under `<REPORT_DIRECTORY>`, or the worktree's scratch directory) and require the pane to write its full report there and reply with that path plus the marker. Read the file; do not reconstruct the result from scrollback.

**Verify claims, do not trust them.** A pane reporting "verified" or "tests pass" is a claim. Re-execute the decisive command, or read the quoted output in the report file, before accepting it.

**Never let a delegated pane undo work it did not do.** Sibling panes can have edits in flight, and a pane that decides a dirty tree is "unexpected churn" will clean it. One did: a read-only link-checking pane ran `git checkout -- package.json aube-lock.yaml` and wiped a sibling's dependency work mid-verify. Every instruction gets an explicit clause: make no edits outside the stated scope, and never execute `git checkout`, `git restore`, `git stash`, `git clean`, or `git reset` — sibling edits may be in flight, and a dirty tree is not evidence of a problem. State the same for the orchestrator's own repository when the pane works in a worktree.

**Check the tree before integrating.** A pane whose task file named a dedicated worktree still edited the orchestrator's main worktree, and it surfaced only when `git merge` refused. Before any merge or integration step, `git status --short` in the integration tree and treat every unexpected modification as a scope violation: save it (`git diff > <scratch>/stray-<task>.patch`), restore the file, and surface it to the user as its own decision. Never let it ride along in a merge commit.

**Marker rules.** Keep the marker at 16 ASCII characters or fewer. `wait output` matches against unwrapped output, so a marker split across lines by a narrow pane still matches — the failure mode is the opposite one. The complete marker must not occur verbatim in the submitted prompt, because `wait output` also sees the echoed user text; describe it as two fragments the delegated agent concatenates, and keep those fragments apart in the sentence. Naming them adjacently ("end with PLANREV followed by _A1C7") has rendered them side by side in a narrow pane and fired the match the moment the prompt echoed, before any work happened.

**On a long delegation, poll for the report file.** The marker is the completion signal for short work. For anything measured in tens of minutes, a `wait output` that times out tells you nothing — the pane may still be working, may have died, or may have finished before the wait started, because `wait output` only scans output emitted after it begins. Poll for the report file the instruction named instead, and require the pane to write it in one final write (or to a temporary path and rename), because a file rewritten in place disappears mid-write and turns an existence check into a false negative. Treat the task as done only when the report file is present *and* the pane reports `idle` or `done`. Keep the instruction on a single line — the helper rejects embedded newlines. Keep bare `/word` tokens out of the text for the same reason: the helper rejects them with exit `2`, because they open the composer's slash popup mid-paste and corrupt the submission. Absolute paths are fine; a step name like `/run` must be reworded or backtick-wrapped. Keep the word `run` out of instruction prose entirely — write `execute`, `invoke`, or name the command — because a wrap that puts `run` at the start of a line pins a cursor pane at `blocked` for the rest of its session; see "A wrapped `run ` line pins a cursor pane at `blocked`".

**Wait in bounded stretches, and reconcile between them.** Never poll with short
timeouts, and never sit in one silent open-ended wait either. While you have
local work — reading a report that already came back, packaging the next
delegation, updating a ledger — do it; delegated panes finish on their own.
When you are genuinely idle, replace one long `wait output` with stretches of
five to ten minutes, and between stretches check the report file and re-read
`pane list` for every live delegation. That between-stretch check is not
optional: `wait output` only scans output emitted after it starts, so a marker
landing in the gap is never matched, and the report file is what proves the work
finished. A pane back at `idle` or `done` with no marker and no report has
already failed — diagnosing it now costs minutes instead of the rest of the
session.

**A long brief can be pasted and never submitted, and the helper still exits `0`.** Composers split a large paste: an instruction beyond a few hundred characters can land in the composer as `[Pasted Content 1024 chars] #2 #3` and sit there unsent. The helper still returns `0`, because the pane flickers to `working` while the paste lands and passes the `started()` `working|blocked` check — so you wait on a delegation that never began. Observed 2026-08-22 at roughly 3000 characters. Put a long brief in a file under `<REPORT_DIRECTORY>` (or the worktree's scratch directory) and submit a single line pointing at it: `Read <absolute path> and carry out exactly what it says, starting by confirming the worktree it names.` And never take exit `0` as evidence of completion: a few minutes in, confirm real movement with `git status` in the worktree or the report file the brief named, and if nothing has changed, `pane read` the pane and look at the composer.

**Write a brief as the defender's invariant, not as an attack.** Work that hardens your own code against resource exhaustion is refused when the brief reads as an attack recipe: the delegated pane prints a cybersecurity policy message and stops. Observed 2026-08-22 on a codex pane. "A request whose body never finishes must not hold a worker thread indefinitely; give the socket a read deadline" passes where "a client can declare gigabytes, dribble bytes, and pin a thread" does not. The same applies to denial of service generally — state the invariant ("never hold indefinitely", "discard past a cap", "measure by idle time") rather than laying out the attacker's viewpoint as reproduction steps. When a pane does refuse, look at the worktree before discarding anything: the refusal can land after the work is done — observed with 374 lines of tests already written and only the commit-and-report step refused. This is not exhaustion. Do not send it to a fallback; reword the brief and re-delegate to the same pane.

```bash
PANE=w2:p18
INSTRUCTION="Execute make lint in /path/to/repo. Make no edits. Report the command, exit code, and errors. End with LINT_OK immediately followed by _7F3A."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"
submit_rc=0
"$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION" || submit_rc=$?
case "$submit_rc" in
  0) ;;
  4) echo "composer submission needs a wider layout; fix it and retry" >&2; exit 4 ;;
  *) echo "composer submission failed with exit $submit_rc; diagnose it before waiting" >&2; exit "$submit_rc" ;;
esac
herdr wait output "$PANE" --match "LINT_OK_7F3A" --timeout 300000
herdr pane list
# If the target is still working:
herdr wait agent-status "$PANE" --status idle --timeout 300000
herdr pane read "$PANE" --source recent --lines 120
```

Re-read pane ids after panes close because ids can compact. Do not send work to `working` or `blocked` panes, and do not rely on a single terminal status name for completion.

## Failure handling

`herdr wait output` exits non-zero on timeout, so every delegation ends in exactly one of these states. Diagnose with `herdr pane get`, `herdr pane read --source recent`, and `herdr pane process-info --pane "$PANE"`.

Helper exits `2` and `4` mean the delegation never started. Do not call `herdr wait output` after either exit, and never count either one toward the two-pane no-marker exhaustion rule.

| state | how it looks | what to do |
| --- | --- | --- |
| **finished** | marker matched | read the result, integrate it |
| **too narrow** | helper exits `4` after its zoom attempt | the 40-column floor is conservative, not a measured cliff — resubmit to the same pane with a lower floor (`HERDR_COMPOSER_MIN_COLS=24 "$COMPOSER_SUBMIT" ...`; codex has submitted down to 4 columns, cursor has not) before touching the layout. Layout retry only — never exhaustion or fallback |
| **did not submit** | helper exits `3` | check for the marker first — a very fast task can finish before the status poll sees it. Otherwise re-run the helper once; a second `3` means the keys are wrong for this CLI, so run the probe |
| **submitted but idle** | helper exited `0`, the composer still shows `[Pasted Content ...]`, no tree change | the paste was split — put the brief in a file and send a one-line pointer |
| **crashed** | `pane read` shows a shell prompt; `pane get` may or may not still name an `agent`; the helper exits `2` naming the shell pid | restart it in place with the argv from `pane process-info` taken *before* the crash, then re-delegate once |
| **someone else's draft** | `pane read` shows unsent text in the composer while `agent_status` is `idle` | not a candidate — another orchestrator is composing there; pick a different pane or report it |
| **stalled on an approval** | `pane read` shows `Run this MCP tool?` / `Run (once) (y)`; `agent_status` may be `blocked` **or** `idle` | report the pane and the prompt to the user; do not answer a shell approval yourself — see "A delegated pane can stall on its own approval prompt" |
| **blocked** | `agent_status: blocked` | the agent is waiting on an approval or input prompt. Do not answer it blindly — report it to the user. Confirm it against `pane read` first: a cursor pane reporting `blocked` at an empty composer is a false positive from the echoed instruction, not a prompt — see below |
| **interrupted** | pane idle, no marker, output ends mid-task | re-delegate once to the same pane. A second interruption is a failure, not a retry loop |
| **errored** | pane idle, no marker, output ends in an error | report the error verbatim; do not paper over it with a retry |
| **refused on policy** | the pane prints a cybersecurity policy message and stops; not a usage limit | reword the brief as the defender's invariant and resend — do not treat it as exhaustion |
| **exhausted** | usage/rate-limit message in the output, or the pane refuses work while idle | see below |

### A delegated pane can stall on its own approval prompt

An agent CLI that asks before each shell command or MCP tool call will stop mid-task waiting for an answer nobody is watching for. Observed on cursor panes on both halves of a double review: the pane sat at `Run this MCP tool?` or `Run (once) (y)` while `agent_status` read `blocked` on one pane and `idle` on the other, so status alone said "stuck" for one and "finished" for the other, and neither was true. The completion marker never arrived and the review silently degraded to one reviewer.

**Prevent it rather than answer it.** A pane that will take delegated work should be started with the permissions it needs already granted in that CLI's own configuration — cursor's `permissions.allow`, codex's sandbox/approval settings, and so on. That is a one-time setup on the pane, outside any run, and it removes the stall entirely.

When one happens anyway: poll `herdr pane read "$PANE" --source recent --lines 25` alongside the marker wait, and treat a visible approval prompt as a stop, not a completion. Report it to the user with the pane id and the exact prompt text, and let them decide — do not answer a shell-command approval on their behalf, because the command is the delegated agent's idea, not the plan's. The keys, when the user authorizes them: `tab` on an MCP prompt allowlists that tool for the rest of the session (better than `y`, which approves once and prompts again), and `y` answers a single shell approval.

Note the overlap with the section below: herdr's cursor rules key `blocked` off text like `Run (once) (y)` in the scrollback, which is why the same status can mean a genuine prompt or a false positive from the echoed instruction. `pane read` is the arbiter in both directions — never `agent_status` alone.

### A wrapped `run ` line pins a cursor pane at `blocked`

herdr infers `agent_status` from the pane's screen for any CLI whose integration does not report lifecycle state itself. Its cursor rules include an approval-prompt pattern that matches **any line beginning with `run `** anywhere in the recent scrollback (`^\s*(run |...)`, state `blocked`, region `whole_recent`). It is meant to catch cursor's `run (once) (y)` confirmation, but nothing anchors it to an actual prompt affordance.

The echoed instruction is part of that scrollback. In a narrow pane it wraps, and any wrap point that puts `run` at the start of a line trips the rule — position in the sentence is irrelevant. Verified on herdr 0.7.1 with cursor-agent 2026.07.23, in a 30-column pane, same pane and same helper both times:

| instruction ends with | wrapped transcript line | result |
| --- | --- | --- |
| `... Make no edits and run no commands.` | `run no commands.` | `blocked` from the moment the prompt echoes, and it never clears |
| `... Make no edits and execute no shell commands.` | — | `working` → `idle`, normally |

Because the rule scans the whole recent scrollback rather than the live footer, the match survives the turn: the pane sits at an empty follow-up composer, reporting `blocked`, with nothing to approve. No key input clears it. Only `/clear` does, by wiping the transcript that holds the matching line — and that is exactly what the helper cannot send, because it refuses `blocked` panes at exit `2`. Such a pane silently leaves the candidate pool after one delegation.

Two consequences for delegated instructions:

* **Do not let `run` fall at the start of a wrapped line.** You cannot predict the wrap — the helper zooms the pane wide to submit and restores the layout afterwards, so the transcript reflows at the pane's real width. The reliable move is to avoid the word entirely in instruction prose aimed at a cursor pane: write `execute the test suite`, `invoke`, or name the command directly. Commands inside backticks or code blocks are still subject to the same rule if they wrap onto their own line starting with `run `.
* **Do not clear a `blocked` pane to unstick it.** The status gate stays strict, because an agent genuinely waiting on an approval prompt must never be reset out from under the user. When a pane reports `blocked` but `pane read` shows an idle composer and no prompt, report it to the user as a false-positive status and name the pane. Do not treat the agent type as exhausted — this is one pane's transcript, not a capacity problem.

The underlying fix is upstream in herdr's cursor detection rules. Keep herdr and the agent CLI integrations current, and re-run `scripts/probe-composer.sh` after either is upgraded.

### Exhaustion and fallback

Treat an agent type as **exhausted** when its output says the usage or rate limit is reached, or when two delegations to two different idle panes of that type both come back with no marker and no completed work. Exhaustion is a property of the agent type, not of one pane — do not retry it on a sibling pane of the same type.

An agent type with no in-scope pane is **unavailable**, not exhausted. Report it as such: it may have plenty of idle panes one tab over, and the fix is a configuration decision by the user, not a retry.

Only submissions for which the helper returned `0` can contribute to the two-pane no-marker rule. Helper exits `2` and `4` never started a delegation and must never count as exhaustion.

Do not match vendor error strings; they change with every CLI release. The reliable signal is the outcome: no marker, twice, on two panes.

When exhausted, report it upward. If this skill was entered from the `orchestration` skill, the orchestrator resolves a substitute from that skill's merged `fallbacks:` map (`.herdrpowers/config.yaml` over `roles.yaml`) and re-delegates there. Standalone, run the work in the orchestrator pane and say which agent was skipped and why.

Record the exhausted agent type for the rest of the task and stop routing to it, so one exhausted agent does not burn a retry on every subsequent delegation.

### Future work

File-based completion detection — polling the report file or a sentinel — is the recommended next improvement. It would remove the 16-character marker limit and two-fragment prompt rule, and is independent of the width fix.

A non-interactive bypass (`cursor-agent -p` or `codex exec`) was evaluated and deferred. It would eliminate composer bugs, but loses interactive `/clear`, session resume, and visible progress.
