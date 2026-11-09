# Failure Handling and Fallback

This reference belongs to `using-herdr-sibling-panes`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

Before fallback, handoff or any agent startup/exit, read the core
[profiles policy](../../orchestration/references/profiles.md). Only the active
orchestrator routes; workers report their result and never re-delegate.
Top-level `allow_agent_lifecycle` is a strict boolean, false by default. False
forbids starting, exiting or restarting agents by keys or shell to satisfy
routing; report the required manual action instead. True permits only verified
startup in available in-scope shell panes and ending idle task-owned agents with
no pending work, through `scripts/agent-lifecycle.sh` as
[agent-lifecycle.md](agent-lifecycle.md) describes. The helper enforces the
value, verifies live model/effort after startup, and preserves unrelated
processes and topology. Never invent a stop command or treat launch flags as
live truth.

## Failure handling

`herdr pane wait-output` exits `1` on timeout — and on a server error such as an unknown pane, with JSON on stderr — so every delegation ends in exactly one of these states. An immediate exit `2` is a CLI syntax error, not a timeout: fix the command before reading anything into it. Diagnose with `herdr pane get`, `herdr pane read --source recent`, and `herdr pane process-info --pane "$PANE"`.

Helper exits `2`, `4`, and `5` mean the delegation never started. Do not call `herdr pane wait-output` after any of them, and never count one toward the two-pane no-marker exhaustion rule.

| state | how it looks | what to do |
| --- | --- | --- |
| **finished** | marker matched | read the result, integrate it |
| **too narrow** | helper exits `4` after its zoom attempt | the 40-column floor is conservative, not a measured cliff — resubmit to the same pane with a lower floor (`HERDR_COMPOSER_MIN_COLS=24 bash "$COMPOSER_SUBMIT" ...`; codex has submitted down to 4 columns, cursor has not) before touching the layout. Layout retry only — never exhaustion or fallback |
| **wrong model/effort** | helper exits `5` | the footer does not verify the requested model or effort — before reset (no keys) or after reset (session reset, no instruction). Re-read with `pane-model.sh PANE MODEL [EFFORT]`; pick a matching available pane or classify the target as unavailable. Missing/unknown evidence, including Cursor's bare `Max` and Muse screens without a composer or effort, fails closed. Never exhaustion |
| **did not submit** | helper exits `3` | check for the marker first — a very fast task can finish before the status poll sees it. Otherwise re-run the helper once; a second `3` means the keys are wrong for this CLI, so run the probe |
| **submitted but idle** | helper exited `0`, the composer still shows `[Pasted Content ...]`, no tree change | the paste was split — put the brief in a file and send a one-line pointer |
| **crashed** | `pane read` shows a shell prompt; `pane get` may or may not still name an `agent`; the helper exits `2` naming the shell pid | with lifecycle false, report the manual restart needed. With true, the crashed pane is a shell pane again: restart the target there with `agent-lifecycle.sh start` (see [agent-lifecycle.md](agent-lifecycle.md)), which verifies live model/effort, then retry once. Previously captured argv may help choose native arguments but never proves current settings |
| **someone else's draft** | `pane read` shows unsent text in the composer while `agent_status` is `idle` | not a candidate — another orchestrator is composing there; pick a different pane or report it |
| **stalled on an approval** | `pane read` shows `Run this MCP tool?` / `Run (once) (y)`; `agent_status` may be `blocked` **or** `idle` | report the pane and the prompt to the user; do not answer a shell approval yourself — see "A delegated pane can stall on its own approval prompt" |
| **blocked** | `agent_status: blocked` | the agent is waiting on an approval or input prompt. Do not answer it blindly — report it to the user. Confirm it against `pane read` first: a cursor pane reporting `blocked` at an empty composer is a false positive from the echoed instruction, not a prompt — see below |
| **still running** | agy or grok pane `idle` or `done`, no marker, no report, and `pane read` shows its background tasks or subagents — or, on grok, the task itself — still running | not finished and not failed. From herdr 0.9.4, agy and grok count as idle once back at their prompt while their background work runs, and grok 1.0.50 reads `idle` for a whole task (see "Verified keys"). Keep waiting in bounded stretches; do not re-delegate to the pane or give it other work, because a submit resets the session under that work |
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

The underlying fix is upstream in herdr's cursor detection rules. Keep herdr and the agent CLI integrations current, and re-run `bash scripts/probe-composer.sh` after either is upgraded.

### Exhaustion and fallback

Treat an agent type as **exhausted** when its output says the usage or rate limit is reached, or when two delegations to two different idle panes of that type both come back with no marker and no completed work. Exhaustion is a property of the resolved target, not of one pane — do not retry it on a sibling pane matching the same target. Record constrained nested targets with their exact settings: `{cursor: {model: Grok 4.7, effort: Extra High}}` exhausted leaves a different model target usable, and the two-pane rule counts only panes that matched the requested settings. A vendor whose limit is account-wide then fails once more on the other target, which is recorded the same way. Legacy entries retain their original identity in the report.

An agent type with no in-scope pane is **unavailable**, not exhausted. Report it as such: it may have plenty of idle panes one tab over, and the fix is a configuration decision by the user, not a retry.

Only submissions for which the helper returned `0` can contribute to the two-pane no-marker rule. Helper exits `2`, `4`, and `5` never started a delegation and must never count as exhaustion.

Do not match vendor error strings; they change with every CLI release. The reliable signal is the outcome: no marker, twice, on two panes.

When exhausted, report it upward. If this skill was entered from `orchestration`,
the active orchestrator resolves the merged fallback map: nested kind/model
becomes the exact `kind@model` lookup key, then bare kind. An explicitly empty
matched list stops lookup. Fallback values remain strings and have no effort
constraint; discard the primary effort rather than inheriting it. Preserve
exact user names, including `Calude` and the distinct `muse-1.0-wonder` /
`muse-wonder-1.0` strings. Reuse an available matching pane under the same scope
and lifecycle policy. Profile self-targets follow the core mode policy: explicit
delegate requires a fresh in-process subagent, including reviews; unavailable
capability is reported. Other modes stay with the owner and may use a subagent
at its judgment. Standalone, do the work in the orchestrator pane and say which
target was skipped and why. This does not turn a disabled gate back on or alter
legacy no-profile review independence.

Record the exhausted agent type for the rest of the task and stop routing to it, so one exhausted agent does not burn a retry on every subsequent delegation.

### Future work

File-based completion detection — polling the report file or a sentinel — is the recommended next improvement. It would remove the 16-character marker limit and two-fragment prompt rule, and is independent of the width fix.

A non-interactive bypass (`cursor-agent -p` or `codex exec`) was evaluated and deferred. It would eliminate composer bugs, but loses interactive `/clear`, session resume, and visible progress.
