# using-herdr-sibling-panes

Agent skill for delegating work from an orchestrator pane to idle sibling agent panes inside [herdr](../herdr/) — operational repo work (tests, lint, file reads, git inspection, command output) when used standalone, or any routed task when serving as the delegation transport for the [orchestration](../orchestration/) skill. Provides a race-free, composer-safe submission sequence and a task contract with unique completion markers.

Read the core [profiles policy](../orchestration/references/profiles.md) before
profile routing, orchestrator handoff or lifecycle decisions. Separate targets
still use reset-backed Herdr panes. With a selected profile, self-targets under
explicit `mode: delegate` use a fresh in-process subagent, including reviews;
missing capability is reported. Other modes stay in the owner session and may
use a subagent at its judgment; same-session self-review is reported honestly.
Disabled gates remain disabled and legacy no-profile routing is preserved.
Workers never re-delegate.

## Files

- [`SKILL.md`](SKILL.md) — the skill: when to delegate, delegation scope, the composer-safe submission sequence, the task contract, and failure/exhaustion handling.
- [`scripts/composer-submit.sh`](scripts/composer-submit.sh) — bundled helper that checks the pane is a live agent at a usable width, clears the composer, resets the session, submits exactly one instruction with bounded settle points, and confirms the pane started.
- [`scripts/pane-model.sh`](scripts/pane-model.sh) — reads a live footer and optionally verifies the requested model and exact semantic effort; also accepts offline fixture input with `--kind`.
- [`scripts/probe-composer.sh`](scripts/probe-composer.sh) — run once per agent CLI (and after every upgrade) to verify it can be driven at all: width, clear, reset, submit, marker capture, interrupt, survival.
- [`scripts/agent-lifecycle.sh`](scripts/agent-lifecycle.sh) — starts an agent in an in-scope shell pane and ends agents the task started, only while the repository's `allow_agent_lifecycle` is `true`; verifies the live footer and keeps a per-task ledger. See [`references/agent-lifecycle.md`](references/agent-lifecycle.md).

## Key properties

- Requires `HERDR_ENV=1` and applies to whichever pane is acting as the orchestrator for the task. Invoke the bundled scripts with `bash` so installs that strip executable bits still work.
- Delegation is confined to the orchestrator's own tab by default (`delegation.pane_scope`) — a pane in another tab is usually another repository's, and a submit resets its session.
- Never uses `pane run` for agent-pane prompts — agent composers need dismiss/submit key sequences with settle delays to avoid stale or concatenated input.
- Never sends `ctrl+c` to an agent: on an idle Codex composer it quits the TUI. `ctrl+u` clears the composer instead; `ctrl+c` reaches only a shell prompt, to discard a stray line. `ctrl+enter` does not submit in Codex; `enter` does.
- Refuses a pane whose agent has exited to a shell prompt, and a pane too narrow for its composer to accept Enter — zooming it temporarily and restoring the tab's zoom on every exit path. The model/effort check runs after that widening, because a narrow pane can hide its footer. An agent whose process group loses the terminal during the reset gets no instruction; a helper process reordering inside that group does not count as an exit.
- Rejects an instruction carrying an embedded newline or a bare `/word`: the composer's slash popup opens mid-paste and corrupts the submission.
- Completion is detected by matching a unique marker with `herdr pane wait-output`, split into fragments in the prompt so the marker never matches the prompt itself. Agent status lags the output and is not a completion signal; on long work, poll for the report file and wait in bounded stretches instead.
- Every brief carries the absolute working directory (panes do not inherit the orchestrator's cwd) and a report-file path — results are read from that file, never reconstructed from lossy pane scrollback.
- Delegated panes are forbidden from `git checkout` / `restore` / `stash` / `clean` / `reset`, because sibling edits may be in flight, and the integration tree is checked before any merge.
- A brief long enough to be pasted as `[Pasted Content …]` never submits even though the helper exits `0` — long briefs go in a file, sent as a one-line pointer.
- New targets use `{codex: {model: GPT-6.2-Sol, effort: max}}`; effort requires model. Legacy bare kinds remain supported; non-fallback `kind@model` is read-only migration input with a deprecation notice. Fallbacks keep string syntax and never inherit the primary effort.
- Model and effort come only from the live footer, checked before any keys and after reset. Models retain case-insensitive substring matching; effort tokens match exactly, case-insensitively, with `Extra High` / `xhigh` aliases. `high` never matches extra high. Routing never switches an existing pane's settings.
- Unknown/missing evidence fails closed. Cursor's effort is the label its footer appends to the model name (`Grok 4.7 256K Extra High`); a name without exactly one effort label cannot meet an effort constraint. Effort `any` verifies only the model and leaves the effort to the orchestrator. Muse's observed startup footer is supported; runtime requires a READY live pane with a matching current footer. See [evidence and readiness limits](references/composer-keys.md#footer-model-and-effort-evidence).
- Top-level `allow_agent_lifecycle` is a strict boolean, false by default, enforced by `agent-lifecycle.sh` (exit `6` unless it is `true`). False forbids starting/exiting/restarting agents to satisfy routing, even by keys or shell. True lets the active owner start a resolved target that has no live match in an available in-scope shell pane, with native flags from the CLI's help and a verified footer, and end idle agents the task started; unrelated processes and topology are preserved, and startup dialogs are never answered.
- An agent type is exhausted after a usage-limit message, or two markerless delegations on two different panes matching the resolved target; record the exact target settings. The orchestration skill then resolves exact fallback keys (including authoritative empty lists). Helper exits `2`, `4`, and `5` never started a delegation and never count toward that, and a brief refused on cybersecurity policy is a rewrite, not exhaustion.

## Helper interfaces

```bash
bash "$SKILL_DIR/scripts/pane-model.sh" "$PANE" [MODEL [EFFORT]]
bash "$SKILL_DIR/scripts/pane-model.sh" --kind KIND [MODEL [EFFORT]] < screen
bash "$SKILL_DIR/scripts/composer-submit.sh" "$PANE" "$INSTRUCTION" [MODEL [EFFORT]]
bash "$SKILL_DIR/scripts/agent-lifecycle.sh" policy
bash "$SKILL_DIR/scripts/agent-lifecycle.sh" start "$LEDGER" "$PANE" KIND NAME [MODEL [EFFORT]] [-- AGENT_ARG...]
bash "$SKILL_DIR/scripts/agent-lifecycle.sh" stop "$LEDGER" "$PANE"
bash "$SKILL_DIR/scripts/agent-lifecycle.sh" list "$LEDGER"
```

Model is submit argument three; effort is argument four. Old invocations and
footer stdout are preserved. Bad arguments exit `2`; pane-model mismatch exits
`1` (unknown kind `3`); composer mismatch exits `5` without submitting the task.
The optional probe also accepts `PANE [MODEL [EFFORT]]`. The lifecycle helper
exits `6` when the permission is false or invalid, `2` when a guard refuses,
`3` when nothing started or an agent was not ended, `4` for a startup dialog,
and `5` when the started agent's footer does not verify the target.
