# Agent Lifecycle

This reference belongs to `using-herdr-sibling-panes`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

The core [profiles policy](../../orchestration/references/profiles.md#lifecycle-is-a-separate-permission)
decides **whether and when** an agent is started or ended. This reference is
**how**. Only the active orchestrator does it — or the reception pane, for the
selected owner it hands off to. Workers never start or end agents.

## The permission is a configuration value

`allow_agent_lifecycle` is a top-level strict boolean in the repository's
`.herdrpowers/config.yaml`, false when omitted. The helper reads it on every
call, so the value itself decides what happens:

```bash
SKILL_DIR=<directory containing using-herdr-sibling-panes/SKILL.md>
LIFECYCLE="$SKILL_DIR/scripts/agent-lifecycle.sh"
bash "$LIFECYCLE" policy   # prints true or false; exit 2 on an invalid value
```

- **`false`** — `start` and `stop` exit `6` and send nothing. Do not route
  around the helper with `herdr agent start`, `pane run`, composer keys, or a
  shell command: reuse a matching live agent, or report the manual action.
- **`true`** — `start` and `stop` run, behind the guards below.
- Anything else (`"true"`, `yes`, null, a duplicate key, a key nested under
  `delegation` or inside a profile) grants nothing. A request in chat does not
  change the value either: the user edits the configuration.

The helper reads block-style YAML as init writes it. It resolves the repository
from `HERDRPOWERS_REPO_ROOT`, else the git toplevel of the current directory;
run it from the task's repository or worktree.

## Start an agent

Start one only for a resolved target that has **no matching live agent in
scope**; a busy match is waited for. One ledger file per task records what the
task started — keep it in the run's report workspace (`<REPORT_DIRECTORY>`, or
the directory `pane-driven-development/scripts/pdd-workspace` prints), note
its path in the run's progress ledger so it survives compaction, and never
reuse a ledger an earlier task left behind.

1. Find a shell pane inside the resolved scope (tab scope shown):

   ```bash
   herdr pane list | jq -r --arg tab "$HERDR_TAB_ID" --arg self "$HERDR_PANE_ID" '
     .result.panes[]
     | select(.tab_id == $tab and .pane_id != $self and .agent == null)
     | "\(.pane_id)\t\(.foreground_cwd)"'
   ```

   No such pane means the target cannot be started: report it. Never split,
   create, or close a pane, tab, or workspace to make room. A shell sitting
   outside the repository is not usable until it is moved there
   (`herdr pane run "$PANE" "cd /abs/repository"`).
2. Learn the target CLI's native model/effort arguments from **its own help**
   (`<cli> --help`, its model list). Do not derive them from the profile
   strings alone. They are an attempt, never evidence.
3. Start it. `NAME` matches `[a-z][a-z0-9_-]{0,31}` and is unique among live
   agents; pass the resolved model and effort unchanged, and native arguments
   after `--`:

   ```bash
   LEDGER="<REPORT_DIRECTORY>/lifecycle-agents.tsv"
   bash "$LIFECYCLE" start "$LEDGER" "$PANE" codex hp-coder-1 "GPT-6.1-Sol" max \
     -- -m gpt-6.1-sol -c 'model_reasoning_effort="max"'
   ```

   The helper refuses (exit `2`, nothing sent) a pane outside
   `delegation.pane_scope`, your own pane, a pane that hosts an agent or runs a
   foreground program, and a shell outside the repository. It then discards
   any half-typed prompt line with `ctrl+c`, runs `herdr agent start`, and
   polls the live footer with `pane-model.sh` for the model and effort.

| exit | meaning | what to do |
| --- | --- | --- |
| `0` | ready, footer verified (prints the footer line) | delegate to it through `composer-submit.sh` as usual |
| `2` | bad usage or a guard refused; nothing was sent | pick another pane or report the manual step |
| `3` | herdr did not start the agent; the pane is still a shell | report the error text; do not retry blindly |
| `4` | started, but blocked at a startup dialog (folder trust, login) | read the pane and report it with the prompt text; never answer it for the user. It is in the ledger |
| `5` | started, but the footer does not verify the model/effort | read the pane. At its composer on other settings: `stop` it. At a dialog: leave it and report it. Either way the target is unavailable — launch arguments prove nothing |
| `6` | the permission is false or invalid | reuse a live agent or report the manual action |

A kind-only target (`{codex: {}}`) passes no model, so nothing is verified
beyond herdr's own readiness check. After exit `0` the normal rules still
hold: `composer-submit.sh` re-verifies before any key and after its reset.

## End an agent

End **only agents this task started**, once they are idle and hold none of
your delegations (marker and report received): when the run needs them no
more, when another resolved target needs their shell pane — shell panes are
the only room there is — and at the latest before the final report. Read the
pane first: exit keys belong on an idle, empty composer.

```bash
bash "$LIFECYCLE" list "$LEDGER"          # pane, kind, name, running|exited|replaced
bash "$LIFECYCLE" stop "$LEDGER" "$PANE"  # exit 0: the pane is back at its shell
```

`stop` refuses (exit `2`, nothing sent) a pane that is not in the ledger, a
pane whose process is no longer the one that was started, and a `working` or
`blocked` agent. It exits `3` and leaves the agent running when the footer
verified at start is no longer visible (a dialog or picker is open), when the
kind has no verified exit keys, or when the agent ignores the keys — it sends
them once and never repeats them. Report every agent left running, with its
pane id.

Never end an agent the task did not start, the session that owns the task
(an owner started for a handoff stays, and is reported), or a working agent.
There is no `herdr agent stop`; do not invent one, and do not kill processes.

## Observed operations

Observed 2026-11-10 on herdr 0.9.5 in an isolated session, each with
`herdr agent start` and one `herdr pane send-keys` call on an idle, empty
composer. Re-verify after a CLI upgrade; a kind missing here has no exit keys
in the helper.

| kind | observed CLI | start that produced a verified footer | exit keys |
| --- | --- | --- | --- |
| `claude` | Claude Code 2.1.321 | `-- --model fable --effort max --settings '<statusLine JSON below>'` → `Fable 5.2 max` | `ctrl+c ctrl+c` (one `ctrl+d` does nothing) |
| `codex` | codex-cli 0.167.0 | `-- -m gpt-6-astra -c 'model_reasoning_effort="max"'` → `GPT-6-Astra max` | `ctrl+c` |
| `cursor` | cursor-agent 2026.11.05-86047df | no arguments → the account default, `Claude Fable 5.2 300K Max`; no effort field, so an effort constraint exits `5` | `ctrl+d` (two `ctrl+c` do nothing) |
| `opencode` | opencode 2.0.32 | no arguments, kind-only | `ctrl+c` |
| `agy`, `muse`, `grok` | agy 1.4.12, Muse Code 1.4.14; grok not installed | not verified: both stopped at a login or trust screen before any composer | none — `stop` exits `3` |

Startup dialogs are real: Claude and Codex ask to trust a folder they have not
seen, and herdr reported Codex's dialog as `idle`. The footer check is what
catches it.

## Claude shows its model only through a statusLine

Claude Code prints no model or effort below its composer by default, so every
`claude` target with a model fails closed until a statusLine prints
`<model> <effort>` on its first line. Its statusLine input carries
`model.display_name` and `effort.level`:

```json
{"statusLine": {"type": "command", "command": "jq -r '\"\\(.model.display_name) \\(.effort.level // \"\")\"'"}}
```

- An agent this task starts: pass that JSON as `--settings '<json>'` after `--`.
- A pane the user starts by hand — including a `claude` reception pane that
  should match a profile's owner — needs the same `statusLine` in the user's
  `~/.claude/settings.json`. Report the missing setting; never write user
  settings yourself.
