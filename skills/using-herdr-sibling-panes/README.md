# using-herdr-sibling-panes

Agent skill for delegating work from an orchestrator pane to idle sibling agent panes inside [herdr](../herdr/) — operational repo work (tests, lint, file reads, git inspection, command output) when used standalone, or any routed task when serving as the delegation transport for the [orchestration](../orchestration/) skill. Provides a race-free, composer-safe submission sequence and a task contract with unique completion markers.

## Files

- [`SKILL.md`](SKILL.md) — the skill: when to delegate, delegation scope, the composer-safe submission sequence, the task contract, and failure/exhaustion handling.
- [`scripts/composer-submit.sh`](scripts/composer-submit.sh) — bundled helper that checks the pane is a live agent at a usable width, clears the composer, resets the session, submits exactly one instruction with bounded settle points, and confirms the pane started.
- [`scripts/probe-composer.sh`](scripts/probe-composer.sh) — run once per agent CLI (and after every upgrade) to verify it can be driven at all: width, clear, reset, submit, marker capture, interrupt, survival.

## Key properties

- Requires `HERDR_ENV=1` and applies to whichever pane is acting as the orchestrator for the task.
- Delegation is confined to the orchestrator's own tab by default (`delegation.pane_scope`) — a pane in another tab is usually another repository's, and a submit resets its session.
- Never uses `pane run` for agent-pane prompts — agent composers need dismiss/submit key sequences with settle delays to avoid stale or concatenated input.
- Never uses `ctrl+c`: on an idle Codex composer it quits the TUI. `ctrl+u` clears the composer instead. `ctrl+enter` does not submit in Codex; `enter` does.
- Refuses a pane whose agent has exited to a shell prompt, and a pane too narrow for its composer to accept Enter — zooming it temporarily and restoring the tab's zoom on every exit path.
- Rejects an instruction carrying an embedded newline or a bare `/word`: the composer's slash popup opens mid-paste and corrupts the submission.
- Completion is detected by matching a unique marker with `herdr wait output`, split into fragments in the prompt so the marker never matches the prompt itself. Agent status lags the output and is not a completion signal; on long work, poll for the report file and wait in bounded stretches instead.
- Every brief carries the absolute working directory (panes do not inherit the orchestrator's cwd) and a report-file path — results are read from that file, never reconstructed from lossy pane scrollback.
- Delegated panes are forbidden from `git checkout` / `restore` / `stash` / `clean` / `reset`, because sibling edits may be in flight, and the integration tree is checked before any merge.
- A brief long enough to be pasted as `[Pasted Content …]` never submits even though the helper exits `0` — long briefs go in a file, sent as a one-line pointer.
- An agent type is exhausted after a usage-limit message, or two markerless delegations on two different panes; the orchestration skill then substitutes from its `fallbacks:` map. Helper exits `2` and `4` never started a delegation and never count toward that, and a brief refused on cybersecurity policy is a rewrite, not exhaustion.
