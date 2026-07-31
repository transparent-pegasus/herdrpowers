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

1. Run `herdr pane list` and identify your own pane (the orchestrator) and idle sibling agent panes.
2. Select only sibling panes that have an `agent` field and `agent_status: idle` or `done`. A pane with no `agent` field is a plain shell or a crashed agent — see "Failure handling".
3. Distribute independent work items across the available panes, one instruction per pane.
4. Submit one self-contained instruction per pane with `scripts/composer-submit.sh`. It resets the target session and submits the instruction in one call; do not send `/clear` yourself.
5. Do not send a second prompt such as "Please run the task I just sent." The submitted instruction is already running.
6. Wait for the instruction's unique completion marker with `herdr wait output`, always with a timeout.
7. On a marker match, re-read `pane list`. If the pane is still `working`, wait for `idle`; if it is already `idle` or `done`, continue. Agent status lags behind the visible output — the marker is the completion signal, status is not.
8. On anything other than a marker match, go to "Failure handling". Never retype into a composer to "fix" a failed submission.
9. Read the completed result and integrate it in the orchestrator pane.

## Composer-safe submission

Agent CLIs take input through a composer — a stateful input box with slash-command autocomplete, follow-up suggestions, and message queueing. Composers cannot be driven reliably with `herdr pane run`, regardless of which agent runs in the pane:

* **Keys consumed by UI.** Slash-command and autocomplete popups swallow the single Enter that `pane run` sends, leaving the text sitting in the composer.
* **Autocomplete is a lie.** A composer can *render* the highlighted completion (`/clear`) while its buffer still holds what was actually typed (`/cl`). Submitting then sends the partial text to the model as a chat message. Always write a slash command in full, in a single `send-text` call.
* **Any bare `/word` is a slash trigger, not just a real command.** An incidental `/word` mid-sentence (`... the /run integration step ...`) opens the popup *during the paste*, and `esc` + `enter` then submits a corrupted or truncated string instead of the instruction. Observed on cursor-agent 3× in a row: the pane goes idle with no completion marker and no work done, and `pane read` shows a garbled fragment starting mid-word, sometimes prefixed `$ ` or ending `exit 1` — the remainder ran as a shell command. Rewording (`/run` → `hourly-pipeline`) fixed it immediately on the same panes. Absolute paths (`/abs/path/to/worktree`) have not triggered it. The helper rejects bare slash tokens with exit `2` before submitting; reword the instruction rather than retrying it.
* **Retained state and races.** A composer can keep the previous prompt or queued follow-ups after completion, and text insertion and key handling are asynchronous, so back-to-back CLI calls can race even with the right keys. Later delegation text then concatenates onto stale input.

Therefore, never submit `/clear` or delegated prompts to an agent pane with `pane run`. Use the bundled helper, which clears the composer, resets the session, submits exactly one instruction, and confirms the pane actually started.

**Width is a precondition.** Cursor's composer has been measured ignoring Enter in narrow panes, while Codex still submitted at widths down to 4 columns. Raising the settle seconds does not compensate. The observed boundary is not monotonic — 22 columns passed while 24 failed — and remains unexplained, so the default 40-column floor is conservative, not a measured cliff. Before touching the composer, the helper reads the foreground process's terminal width. Below `HERDR_COMPOSER_MIN_COLS` (default `40`), it temporarily widens the pane with `herdr pane zoom`; if the pane remains below the floor, it refuses with exit `4` and names the measured width and floor. Any zoom taken by the helper is removed on exit, including failure paths.

`$SKILL_DIR` below is the directory containing *this* `SKILL.md`. The scripts ship next to it, so resolve them against it — never against the repo you are working in.

```bash
SKILL_DIR=<directory containing this SKILL.md>
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
```

Exit codes: `0` submitted and running, `2` bad usage (embedded newline, or a bare `/word` slash trigger in the instruction) or the pane is not a usable idle agent pane, `3` the instruction did not submit, `4` the pane remained too narrow after a zoom attempt.

### Verified keys

Verified 2026-07-25 against codex 0.145.0, cursor-agent 2026.07.23-e383d2b, and grok 0.2.112 with `scripts/probe-composer.sh`. All three agree, so the helper uses one sequence:

| purpose | key / text | notes |
| --- | --- | --- |
| clear composer | `ctrl+u` | leaves the session intact |
| reset session | `/clear` + `enter` | all three CLIs have `/clear` |
| dismiss popup | `esc` | keeps composer text, closes slash/mention popup |
| submit | `enter` | |
| interrupt a running task | `esc` | |

Two keys that look plausible and are wrong:

* **`ctrl+c` quits Codex.** On an idle Codex composer it exits the TUI and drops the pane to a shell. Never use it to cancel composer state; `ctrl+u` does that job without the exit path.
* **`ctrl+enter` does not submit in Codex.** The text stays in the composer and the delegation silently never runs.

If the helper is unavailable, this is the same sequence by hand. Do not remove the settle points:

```bash
rtk herdr pane send-keys "$PANE" ctrl+u
rtk sleep 0.40
rtk herdr pane send-text "$PANE" "/clear"
rtk sleep 0.40
rtk herdr pane send-keys "$PANE" esc
rtk sleep 0.40
rtk herdr pane send-keys "$PANE" enter
rtk sleep 1.20
rtk herdr pane send-keys "$PANE" ctrl+u
rtk sleep 0.40
rtk herdr pane send-text "$PANE" "$INSTRUCTION"
rtk sleep 0.40
rtk herdr pane send-keys "$PANE" esc
rtk sleep 0.40
rtk herdr pane send-keys "$PANE" enter
```

Use `pane run` normally for shells and other terminal programs; this workaround is specifically for agent composers.

### Onboarding a new agent CLI

Before an agent type is used as a delegation target for the first time, and again after that CLI is upgraded, run the probe against one idle pane of that type:

```bash
rtk "$SKILL_DIR/scripts/probe-composer.sh" "$PANE"
```

It checks, in order: the pane is an idle agent pane; the pane meets the conservative composer-width floor; leftover composer text clears without killing the TUI; `/clear` resets the session and the TUI survives; an instruction submits and the pane starts working; the split completion marker is not matched by the prompt echo; the marker is matched when the task finishes; a running task can be interrupted and the pane returns to idle; and the agent process is the same one it was before the probe.

Any `FAIL` stops onboarding until it is resolved. A width failure is a layout precondition: widen the pane and re-run. For other failures, find the CLI's real key for the failing step and update the helper before sending it work.

## Task contract

Every instruction must include the **absolute working directory** (a pane does not inherit the orchestrator's cwd — when the work happens in a worktree, give the worktree path and require the pane to confirm it is there before doing anything else), the exact command or path, the edit policy, the report format, and a unique final completion marker that `wait output` can match.

**Reports go to files.** Terminal scrollback is lossy — an agent on the alternate screen loses rows that `pane read` can never recover. Name a report file path in every brief (under `<REPORT_DIRECTORY>`, or the worktree's scratch directory) and require the pane to write its full report there and reply with that path plus the marker. Read the file; do not reconstruct the result from scrollback.

**Verify claims, do not trust them.** A pane reporting "verified" or "tests pass" is a claim. Re-run the decisive command, or read the quoted output in the report file, before accepting it. Keep the marker at 16 ASCII characters or fewer so terminal wrapping cannot split it. The complete marker must not occur verbatim in the submitted prompt, because `wait output` also sees user text; describe it as two fragments that the delegated agent must concatenate. Keep the instruction on a single line — the helper rejects embedded newlines. Keep bare `/word` tokens out of the text for the same reason: the helper rejects them with exit `2`, because they open the composer's slash popup mid-paste and corrupt the submission. Absolute paths are fine; a step name like `/run` must be reworded or backtick-wrapped.

```bash
PANE=w2:p18
INSTRUCTION="Please run rtk make lint in /path/to/repo. Make no edits. Report the command, exit code, and errors. End with LINT_OK immediately followed by _7F3A."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"
submit_rc=0
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION" || submit_rc=$?
case "$submit_rc" in
  0) ;;
  4) echo "composer submission needs a wider layout; fix it and retry" >&2; exit 4 ;;
  *) echo "composer submission failed with exit $submit_rc; diagnose it before waiting" >&2; exit "$submit_rc" ;;
esac
rtk herdr wait output "$PANE" --match "LINT_OK_7F3A" --timeout 300000
rtk herdr pane list
# If the target is still working:
rtk herdr wait agent-status "$PANE" --status idle --timeout 300000
rtk herdr pane read "$PANE" --source recent --lines 120
```

Re-read pane ids after panes close because ids can compact. Do not send work to `working` or `blocked` panes, and do not rely on a single terminal status name for completion.

## Failure handling

`herdr wait output` exits non-zero on timeout, so every delegation ends in exactly one of these states. Diagnose with `herdr pane get`, `herdr pane read --source recent`, and `herdr pane process-info --pane "$PANE"`.

Helper exits `2` and `4` mean the delegation never started. Do not call `herdr wait output` after either exit, and never count either one toward the two-pane no-marker exhaustion rule.

| state | how it looks | what to do |
| --- | --- | --- |
| **finished** | marker matched | read the result, integrate it |
| **too narrow** | helper exits `4` after its zoom attempt | fix the pane or enclosing-terminal layout and retry the same delegation; this is layout retry only — never exhaustion or fallback |
| **did not submit** | helper exits `3` | check for the marker first — a very fast task can finish before the status poll sees it. Otherwise re-run the helper once; a second `3` means the keys are wrong for this CLI, so run the probe |
| **crashed** | `pane get` has no `agent` field; `pane read` shows a shell prompt | restart it in place with the argv from `pane process-info` taken *before* the crash, then re-delegate once |
| **blocked** | `agent_status: blocked` | the agent is waiting on an approval or input prompt. Do not answer it blindly — report it to the user |
| **interrupted** | pane idle, no marker, output ends mid-task | re-delegate once to the same pane. A second interruption is a failure, not a retry loop |
| **errored** | pane idle, no marker, output ends in an error | report the error verbatim; do not paper over it with a retry |
| **exhausted** | usage/rate-limit message in the output, or the pane refuses work while idle | see below |

### Exhaustion and fallback

Treat an agent type as **exhausted** when its output says the usage or rate limit is reached, or when two delegations to two different idle panes of that type both come back with no marker and no completed work. Exhaustion is a property of the agent type, not of one pane — do not retry it on a sibling pane of the same type.

Only submissions for which the helper returned `0` can contribute to the two-pane no-marker rule. Helper exits `2` and `4` never started a delegation and must never count as exhaustion.

Do not match vendor error strings; they change with every CLI release. The reliable signal is the outcome: no marker, twice, on two panes.

When exhausted, report it upward. If this skill was entered from the `orchestration` skill, the orchestrator resolves a substitute from that skill's merged `fallbacks:` map (`.herdrpowers/config.yaml` over `roles.yaml`) and re-delegates there. Standalone, run the work in the orchestrator pane and say which agent was skipped and why.

Record the exhausted agent type for the rest of the task and stop routing to it, so one exhausted agent does not burn a retry on every subsequent delegation.

### Future work

File-based completion detection — polling the report file or a sentinel — is the recommended next improvement. It would remove the 16-character marker limit and two-fragment prompt rule, and is independent of the width fix.

A non-interactive bypass (`cursor-agent -p` or `codex exec`) was evaluated and deferred. It would eliminate composer bugs, but loses interactive `/clear`, session resume, and visible progress.
