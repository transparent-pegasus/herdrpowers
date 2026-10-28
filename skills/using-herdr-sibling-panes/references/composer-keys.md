# Composer Keys and Onboarding

This reference belongs to `using-herdr-sibling-panes`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

### Verified keys

Verified 2026-07-25 against codex 0.145.0, cursor-agent 2026.07.23-e383d2b, and grok 0.2.112 with `scripts/probe-composer.sh`, re-verified 2026-08-24 against grok 1.0.5, and re-verified 2026-10-09 against codex 0.162.0 on herdr 0.9.3. All three agree, so the helper uses one sequence. On 2026-10-09, herdr 0.9.3, claude (Claude Code 2.1.295), cursor-agent 2026.10.01-e373342, and agy (Antigravity CLI 1.3.2) also passed every probe step with it. grok 1.0.50 takes the same keys, but herdr reports it `idle` for the whole of a task — its detection rule reads the terminal title, which stays `grok` — so the helper's start check exits `3` after a submission that did run. opencode 1.18.35, verified 2026-10-09 on herdr 0.9.3, differs in the rows that name it:

| purpose | key / text | notes |
| --- | --- | --- |
| clear composer | `ctrl+u` | leaves the session intact |
| reset session | `/clear` + `enter` | codex, cursor, and grok have `/clear`. opencode: `ctrl+x`, then `n` |
| dismiss popup | `esc` | keeps composer text, closes slash/mention popup. opencode: wipes the composer along with a slash popup |
| submit | `enter` | |
| interrupt a running task | `esc` | opencode: `esc` twice — the first press only arms "esc again to interrupt" |

opencode's `esc` closes the slash popup and wipes the composer along with it, so the shared reset submits an empty line. Nothing resets, the next instruction lands in the previous conversation, and the helper still exits `0` — the probe passed its reset step that way until it began checking that the reset took effect. The helper resets opencode with its new-session keybind instead. Plain composer text survives `esc`, and a pasted `@` mid-sentence opens no popup, so the instruction itself goes through the shared sequence.

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

On opencode, send `ctrl+x` and then `n` in place of the `/clear` text and the `esc` and `enter` that follow it.

Use `pane run` normally for shells and other terminal programs; this workaround is specifically for agent composers.

### Onboarding a new agent CLI

Before an agent type is used as a delegation target for the first time, and again after that CLI is upgraded, run the probe against one idle pane of that type. Pass the model too when the pane is meant to serve an `agent@model` entry:

```bash
bash "$SKILL_DIR/scripts/probe-composer.sh" "$PANE" [MODEL]
```

It checks, in order: the pane is an idle agent pane; the pane meets the conservative composer-width floor; leftover composer text clears without killing the TUI; the session reset is sent and the TUI survives; an instruction submits and the pane starts working; the split completion marker is not matched by the prompt echo; the marker is matched when the task finishes; the reset really started a fresh conversation, because the agent can no longer name a word it was given before it; a running task can be interrupted and the pane returns to idle; the agent process is the same one it was before the probe; the footer model line is still readable after the resets (and still shows `MODEL`); and a submission pinned to a model the pane does not run is refused with exit `5` while the pane stays idle. The last two skip for a kind with no model-line rule.

Any `FAIL` stops onboarding until it is resolved. A width failure is a layout precondition: widen the pane and re-run. For other failures, find the CLI's real key for the failing step and update the helper before sending it work.
