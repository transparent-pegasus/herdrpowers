# herdrpowers

**herdrpowers** is a development framework for AI coding agents running inside [herdr](https://herdr.dev). It layers structured skills and multi-phase workflows on top of any repository, and delegates the work — implementation, test authoring, code review — to **idle sibling agent panes**, not to in-process subagents.

It is the merge of two packs: the orchestration and delegation transport from [herdr-orchestration](https://github.com/transparent-pegasus/herdr-orchestration), and the development cycle from [superpowers-extended](https://github.com/transparent-pegasus/superpowers-extended) (which tracks [obra/superpowers](https://github.com/obra/superpowers)), restructured so every dispatch goes through a pane.

## Core Principles

- **One orchestrator, many panes.** Whichever pane the user types into owns the task: it plans, delegates, integrates, and reports. A pane that receives a delegated instruction executes it in place and never re-delegates.
- **Independence from fresh context.** Every delegation resets the target session. The pane that writes code never reviews it, and a role that binds to a list of agent types runs one review per entry — so plans and tasks get independent reviews from different agent types. There are no named `test-engineer` / `code-reviewer` personas — the property comes from the reset, not from the label.
- **TDD, and who owns it is a setting.** The `test-authoring` assignment decides: `delegate` puts a task's tests in a pane that works from the same brief in a worktree at the pre-implementation commit and never sees the code — RED is structural there; `implementer` gives RED-GREEN-REFACTOR to the implementing pane, and the reviewers audit that test code as the only independent check. `fix-round-test-authoring` answers the same for a fix round. Assertions come from the requirements, never from the code, the RED run is quoted in the report, and the report names which pane wrote the tests.
- **Composer-safe delegation.** Agent CLIs take input through a stateful composer that swallows keys and retains stale text. Submission goes through the bundled `composer-submit.sh`, completion is detected with a unique marker, and results are handed over as **files** — never reconstructed from pane scrollback.
- **Isolated workspaces.** Feature work happens in a git worktree off `<BASE_BRANCH>`, one implementation pane per worktree.
- **Degrade honestly.** Outside herdr, or with no idle pane, the work runs inline — and the report says which steps were not delegated and which independence was lost.
- **Codegraph-assisted discovery (optional).** When a codegraph plugin/tool is available, skills use it to find related files, symbols, callers, callees, and impact surfaces before planning, editing, debugging, testing, or reviewing.

## Requirements

`HERDR_ENV=1` — the delegation skills verify this and stop if it is missing. The planning, TDD, debugging, and verification skills work anywhere; only delegation needs herdr.

Before an agent CLI is used as a delegation target for the first time (and after every upgrade), verify it can be driven at all:

```bash
skills/using-herdr-sibling-panes/scripts/probe-composer.sh "$PANE"
```

Composer key bindings differ per CLI and change across releases: `ctrl+c` quits Codex from an idle composer, and `ctrl+enter` does not submit there at all.

## Install

**Claude Code**

```
/plugin marketplace add transparent-pegasus/herdrpowers
/plugin install herdrpowers@herdrpowers
```

**Codex**

```bash
codex plugin marketplace add https://github.com/transparent-pegasus/herdrpowers
codex plugin add herdrpowers@herdrpowers
```

**Cursor**

```bash
cursor-agent plugin marketplace add https://github.com/transparent-pegasus/herdrpowers
```

Or install from this repository via the Cursor Marketplace ("Import from Repo").

**Any other tool** — check the pack in or vendor it as a submodule, and point the tool at the directories:

```bash
git clone https://github.com/transparent-pegasus/herdrpowers
cp -r herdrpowers/skills herdrpowers/commands .claude/     # or .agents/, or wherever your tool looks
```

Then ask the agent to "follow the workflow in `commands/full_cycle.md`" or "use the skill at `skills/<name>/SKILL.md`". `docs/instruction_snippet.md` has a paste-ready block for the repo's instruction files.

### After installing — run `/init` once per repository

```
/herdrpowers:init
```

Plugin files are read-only, so repo-specific values are never written into the pack. `/init` detects the repo's tooling, confirms the values with you, and writes two things into the target repo:

- a `Herdrpowers Configuration` section in `CLAUDE.md` / `AGENTS.md` — every skill and command resolves its `<KEY>` placeholders (`<BASE_BRANCH>`, `<REPORT_DIRECTORY>`, `<TARGETED_TEST_COMMAND>`, `<PLAN_PATH_PATTERN>`, …) from there;
- `.herdrpowers/config.yaml` — a **role list** plus the **role assigned to every delegation task**. Nothing is hard-coded: implementation, tests, chores, verification, and each of the five reviews are all reassignable, overriding the pack's shipped defaults key by key.

```yaml
roles:                                        # role -> agent type(s)
  coder:      { agent: codex }
  generalist: { agent: cursor }
  reviewer:   { agents: [codex, cursor] }     # a list role: one delegation per entry

assignments:                                  # task -> role + where it runs
  complex-coding:      { role: coder,      mode: delegate }
  chores:              { role: generalist, mode: delegate }
  test-authoring:      { role: coder,      mode: delegate }     # a pane that never sees the code
  verification:        { role: generalist, mode: delegate }
  task-review:         { role: reviewer,   mode: delegate, enabled: true }   # two reviews, one per agent type
  fix-round-re-review: { role: reviewer,   mode: delegate, enabled: false }  # off: named in the report
```

`mode` is `delegate` (a fresh pane of that role), `orchestrator` (this pane, nothing delegated), or `implementer` (the pane that already owns the task). Reviews also take `enabled`; work tasks are never disabled — `mode: orchestrator` is how one stops being delegated.

Re-run `/init` any time to change them. Two things stay fixed regardless: a pane never reviews work it wrote, and every non-default assignment or disabled review is named in the final report.

Then start a feature with `/herdrpowers:full_cycle`, or break it up with `plan` → `execute` / `execute_parallel`. For small changes use `quick`.

### Updating

Plugin installs update through the marketplace (`/plugin marketplace update` in Claude Code, `codex plugin marketplace upgrade` for Codex). The repo-local `Herdrpowers Configuration` section and `.herdrpowers/config.yaml` survive updates untouched, because the pack never stores repo-specific values in its own files. Checked-in copies update by diffing the new `skills/` / `commands/` against the copy — see [`changelogs/`](./changelogs/).

## Supported Platforms

The payload is a single tree at the repository root, discovered by each platform's plugin convention:

| Platform | Skills | Workflow commands |
|---|---|---|
| **Claude Code** | `skills/` (auto) | `commands/` as namespaced slash commands |
| **Codex** | `skills/` | `commands/` (surfaced as skills) |
| **Cursor** | `skills/` (auto) | `commands/` as slash commands (auto) |
| **Aider / Gemini CLI / others** | read `skills/<name>/SKILL.md` directly | read `commands/<name>.md` directly |

Roles bind to **agent types**, not to platforms: the orchestrator can be any agent CLI, and Coder / Generalist / Reviewer resolve to whatever the repo's `.herdrpowers/config.yaml` says, falling back to `skills/orchestration/roles.yaml`. Reassign any delegation task, change where it runs, or turn a review off in the repo file — the pack's defaults stay untouched.

## Repository Structure

```
skills/          # 16 skills (single tree, platform-neutral wording)
  herdr/                       vendored official herdr skill (Apache-2.0)
  orchestration/               routing, roles.yaml defaults, delegation assignments, fallbacks
  using-herdr-sibling-panes/   the delegation transport + composer scripts
  pane-driven-development/     the per-task loop over panes + brief templates
  …                            planning, TDD, debugging, review, worktrees, docs
commands/        # Workflows: init, plan, execute, execute_parallel, full_cycle, quick
docs/            # Human-facing framework docs + instruction-file snippet
changelogs/      # Upstream-refresh history inherited from superpowers-extended
.claude-plugin/  # Claude Code plugin + marketplace manifests
.codex-plugin/   # Codex plugin manifest
.cursor-plugin/  # Cursor plugin manifest
.agents/plugins/ # Codex marketplace manifest (fixed location per Codex convention)
NOTICE           # Third-party attribution (required by Apache-2.0)
```

## Documentation

- **[Development Cycle Guide](./docs/development_cycle.md)** — Step-by-step walkthrough of the 7-phase process.
- **[Roles](./docs/roles.md)** — Orchestrator, Reviewer, Coder, Generalist; `roles.yaml` and fallbacks.
- **[Skills](./docs/skills.md)** — Catalog of every skill and when to use it.
- **[Workflows](./docs/workflows.md)** — `/init`, `/full_cycle`, `/plan`, `/execute`, `/execute_parallel`, `/quick`.

## What Changed in the Merge

Cut from superpowers-extended:

- `agents/` (`code-reviewer`, `test-engineer`) — roles now bind to agent types via `roles.yaml`
- `requesting-test-creation` / `receiving-test-creation` — test authorship is the `test-authoring` assignment
- `dispatching-parallel-agents` — parallel work goes to sibling panes, not in-process subagents
- `subagent-driven-development` → rewritten as `pane-driven-development`

Added in its place: pane delegation as the transport for every dispatch, double review from a list role, a delegated test author that never sees the implementation (with reviewer audit of test code as the compensating control when tests stay with the implementer), and honest degradation when panes are unavailable.

## Contributing

This repository includes GitHub issue and pull-request templates under [`.github/`](./.github/) that require disclosure of the authoring environment: model, harness, harness version, installed plugins, and human review status. If an agent produced a contribution, say so plainly. If a human wrote it by hand without agent assistance, say that instead.

## Changelog

Upstream-tracking refreshes inherited from superpowers-extended are recorded in [`changelogs/`](./changelogs/); the sync point is in [`changelogs/UPSTREAM_SHA`](./changelogs/UPSTREAM_SHA).

## License

[Apache License 2.0](./LICENSE). This pack bundles the herdr project's official agent skill (Apache-2.0) and material derived from MIT-licensed packs; see [NOTICE](./NOTICE) for attribution.
