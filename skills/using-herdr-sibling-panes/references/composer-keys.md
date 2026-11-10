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

If the helper is unavailable, this is the same sequence by hand. Do not remove the settle points — and understand what you give up: the hand sequence skips the shell-prompt check, the width floor, and the started confirmation, so it will happily type a delegated instruction onto a bare command line. Before the first `send-text`, `pane read` the target and confirm you can see a composer (`›`, `→ Add a follow-up`) and not a shell prompt (`%`, `$`). A constrained target also needs the same model/effort verification before any keys and after the reset; stop before the instruction if either check fails. Send lowercase `enter` as a key; a literal `Enter` string is text, and it silently accumulates in the composer instead of submitting.

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

### Footer model and effort evidence

New target settings are nested, for example
`{codex: {model: GPT-6.1-Sol, effort: max}}`. Pass both strings unchanged:
`bash scripts/composer-submit.sh PANE INSTRUCTION MODEL EFFORT`.
The fourth argument is optional, requires a non-empty model, and is checked by
`pane-model.sh` before any key and again after reset. All script paths resolve
against the skill directory. Model-only and unconstrained calls remain supported.

Observed renderer captures establish these effort field positions within the
footer already selected by the CLI's composer rule:

| kind | observed model/effort field | extraction |
| --- | --- | --- |
| claude | `Opus 5.5 medium` | trailing effort on the model segment, before any `·`; requires a model/effort statusLine ([snippet](agent-lifecycle.md#claude-shows-its-model-only-through-a-statusline)) |
| codex | `GPT-5.6-Luna medium · weekly 99% left` | trailing effort on the first segment |
| agy | `Gemini 3.8 Flash (High) \| 5h: 100% \| 7d: 100%` | parenthesized effort on the model segment |
| grok | `Grok 4.7 (xhigh) · always-approve · …` | parenthesized effort on the first segment |
| opencode | `Build · GPT-6.1 Sol OpenAI · max` | third segment, after the model/provider segment |
| muse | `muse-wonder-1.0 · max · /tmp/… · Auto-review` | exact second dot-separated field; model is the first field |
| cursor | `Muse Spark 1.3 1M Max` | no verified reasoning-effort field; bare `Max` is ambiguous |

Effort uses exact case-insensitive tokens. `Extra High` and `xhigh` canonicalize
to the same token; `high` does not. The requested model must occur in the model
part preceding that effort, so words in a model name cannot become effort.
Context, plan, usage, permissions and help segments are excluded. Missing or
unrecognized effort is a mismatch; the observed footer still goes to stdout.
Synthetic fixture variations can exercise tokens and casing in these established
positions, but must be labeled synthetic, not presented as observed CLI output.

**Cursor labeled-field acceptance.** The parser also accepts isolated,
dot-separated `Reasoning:` or `Effort:` fields after Cursor's model field.
These are synthetic acceptance inputs, not observed current UI output. The
entire value must be a known effort token; multiple labeled fields must agree
after alias normalization. Unknown values and conflicting fields fail closed.
A live layout without an explicit effort field cannot meet an effort constraint.

**Muse renderer support and readiness.** Muse Code 1.4.14 was observed on
2026-11-06 in a disposable PTY, with a normal provider, before an expired login
redirected to the login screen. The rendered snapshot establishes a `❯`
composer, a closing separator, and the footer above: model first, exact effort
second, then cwd and Auto-review. The echo footer was `echo · /tmp/… · Auto-review`
without effort. Login screens without a composer and echo footers without effort
fail closed. This startup capture does not prove authenticated live delegation
or composer-key onboarding. Routing still requires a READY live pane whose
current footer matches before keys and after reset; the onboarding probe below
remains required. Launch flags, help, transcript, header and config text cannot
replace renderer evidence. Changed layouts need a safely captured visible
fixture and regression coverage before adding a rule.

For startup/exit authorization, first read the core
[profiles policy](../../orchestration/references/profiles.md). Top-level
`allow_agent_lifecycle: false` forbids starting, exiting or restarting an agent
to obtain a fixture or satisfy routing. Request the manual action or use an
already available matching pane. When true, follow
[agent-lifecycle.md](agent-lifecycle.md): its helper starts and ends agents
behind the permission, with native flags taken from the CLI's own help and
verified against the live footer. Never infer a stop command, and never treat
a launch flag derived from the nested strings as proof. That reference also
holds the statusLine a `claude` pane needs before it shows any model or effort.

### Onboarding a new agent CLI

Before an agent type is used as a delegation target for the first time, and again after that CLI is upgraded, run the probe against an idle pane available for the probe, under the core lifecycle policy. Pass all requested settings from the resolved nested target:

```bash
bash "$SKILL_DIR/scripts/probe-composer.sh" "$PANE" [MODEL [EFFORT]]
```

It checks, in order: the pane is an idle agent pane; the pane meets the conservative composer-width floor; any requested model/effort matches before keys; leftover composer text clears without killing the TUI; the session reset is sent and the TUI survives; an instruction submits and the pane starts working; the split completion marker is not matched by the prompt echo; the marker is matched when the task finishes; the reset really started a fresh conversation, because the agent can no longer name a word it was given before it; the probe's own running task can be interrupted and the pane returns to idle; the agent process is the same one it was before the probe; the footer model/effort still matches after the resets; and a submission pinned to a model the pane does not run is refused with exit `5` while the pane stays idle. Unknown footer rules skip the last two only when no settings were requested; constrained unknown layouts fail before keys.

Any `FAIL` stops onboarding until it is resolved. A width failure is a layout precondition: widen the pane and re-run. For other failures, find the CLI's real key for the failing step and update the helper before sending it work.
