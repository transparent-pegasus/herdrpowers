# herdrpowers

**herdrpowers** is a development framework for AI coding agents running inside [herdr](https://herdr.dev). Structured skills and workflows route implementation, tests, and review through configurable roles and optional composition profiles. Separate delegated targets use reset-backed sibling panes; profile self-target delegation uses fresh in-process subagents.

The development cycle derives from [obra/superpowers](https://github.com/obra/superpowers) — brainstorming, plan writing, TDD, systematic debugging, worktrees, review — with configurable routing and a command-driven workflow layer. See [What Changed from Superpowers](#what-changed-from-superpowers).

## Core Principles

- **One active owner.** Without a profile, reception owns the task. A selected profile may transfer ownership through an explicit verified handoff; reception always asks unused versus relay when it mismatches. Workers execute directly and never re-delegate.
- **Explicit review routes.** Separate delegated reviews gain independence from reset, and may reuse the implementing pane after reset. A selected profile permits owner-session self-review in nondelegated modes; report it as self-review. Self-target `delegate` still requires a fresh subagent. Disabled gates remain disabled.
- **TDD, with a named writer.** `test-authoring` and `fix-round-test-authoring` choose fresh requirements-only workers or the implementing session. Delegated authors use separate BASE worktrees and never see implementation. Assertions come from requirements; the report records the writer, transport, and RED/GREEN evidence. Enabled reviews audit test code and report their actual independence.
- **Composer-safe delegation.** Agent CLIs take input through a stateful composer that swallows keys and retains stale text. Submission goes through the bundled `composer-submit.sh`, completion is detected with a unique marker, and results are handed over as **files** — never reconstructed from pane scrollback.
- **Isolated workspaces.** Feature work happens in a git worktree off `<BASE_BRANCH>`, one implementation pane per worktree.
- **Degrade honestly.** Legacy no-profile work may fall back inline when panes are unavailable. Selected-profile modes stay binding: missing mandatory subagent capability is reported as inability, never inline delegation or a passed review.
- **Codegraph-assisted discovery (optional).** When a codegraph plugin/tool is available, skills use it to find related files, symbols, callers, callees, and impact surfaces before planning, editing, debugging, testing, or reviewing.

## Requirements

Herdr must be installed and support `herdr --skill`. The pack reads its operating guide from the installed binary, so no Herdr repository clone or separate skill installation is needed.

`HERDR_ENV=1` is required for Herdr-pane transport. Planning, TDD, debugging, verification, and profile self-target subagent routes use their own runtime capabilities; a mandatory unavailable route is reported explicitly.

Before an agent CLI is used as a delegation target for the first time (and after every upgrade), verify it can be driven at all:

```bash
bash skills/using-herdr-sibling-panes/scripts/probe-composer.sh "$PANE"
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

**OpenCode 2**

```bash
opencode plugin add git+https://github.com/transparent-pegasus/herdrpowers.git
```

Use `opencode2` in place of `opencode` if that is the name of your v2 binary.
The same package also supports **OpenCode 1.18.29+**, using its v1 installer:

```bash
opencode plugin -g herdrpowers@git+https://github.com/transparent-pegasus/herdrpowers.git
```

Both versions expose all 16 skills and the seven `/herdrpowers:*` workflows.
See [OpenCode setup](./docs/opencode.md) for local checkout configuration and verification.

**Any other tool** — check the pack in or vendor it as a submodule, and point the tool at the directories:

```bash
git clone https://github.com/transparent-pegasus/herdrpowers
cp -r herdrpowers/skills herdrpowers/commands .claude/     # or .agents/, or wherever your tool looks
mkdir -p .claude/.herdrpowers
cp -r herdrpowers/.herdrpowers/profiles .claude/.herdrpowers/
```

Then ask the agent to "follow the workflow in `commands/full_cycle.md`" or "use the skill at `skills/<name>/SKILL.md`". `docs/instruction_snippet.md` has a paste-ready block for the repo's instruction files.

### After installing — run `/init` once per repository

```
/herdrpowers:init
```

Plugin files are read-only, so repo-specific values are never written into the pack. `/init` detects tooling, confirms a concrete configuration with you, and writes three deliverables:

- a `Herdrpowers Configuration` section in `CLAUDE.md` / `AGENTS.md` — every skill and command resolves its `<KEY>` placeholders (`<BASE_BRANCH>`, `<REPORT_DIRECTORY>`, `<TARGETED_TEST_COMMAND>`, `<PLAN_PATH_PATTERN>`, …) from there;
- `.herdrpowers/config.yaml` — roles, assignments, gates, delegation, optional `profile`, and separate boolean `allow_agent_lifecycle`, over the shipped [roles.yaml](./skills/orchestration/roles.yaml) defaults;
- missing `.herdrpowers/profiles/*.yaml` templates and their `README.md`, copied without overwriting existing files. Repeat init preserves custom profiles, the local README, existing selection, and unmodified settings; installation alone selects nothing. Config, profile YAML, and the directory README are tracked, while report scratch stays ignored.

```yaml
# Select a composition in the consumer repository's config:
profile: fable-sol-panel
allow_agent_lifecycle: false
```

The six shipped compositions are [fable-sol-panel](./.herdrpowers/profiles/fable-sol-panel.yaml), [astra-sol](./.herdrpowers/profiles/astra-sol.yaml), [opus-solo](./.herdrpowers/profiles/opus-solo.yaml), [sol-solo](./.herdrpowers/profiles/sol-solo.yaml), [fable-opus-panel](./.herdrpowers/profiles/fable-opus-panel.yaml), and [fable-opus](./.herdrpowers/profiles/fable-opus.yaml). Their YAML defines the exact targets and reviewer order. Use a simple filename without extension as `profile`; absent/null/literal `none` keeps the legacy path. Local profiles win over shipped copies; invalid or missing selections are errors.

The [concise profile guide](./.herdrpowers/profiles/README.md) explains names and intended use: Fable-led four-reviewer configurations for the heaviest work, with coder choice based on available contract tokens; same-contract configurations that save reviewer tokens; solo configurations for tasks needing neither complex decisions nor coding.

Profiles contain only `orchestrator`, `coder`, and `reviewers`. Only present slots replace resolved role bindings; omitted slots keep them, including custom owner aliases and roles. New targets use nested settings such as `{codex: {model: GPT-6.1-Sol, effort: max}}`; optional effort requires a model. Both constraints need live footer evidence before keys and after reset; unknown effort fails closed. Legacy non-fallback `kind@model` is migration input only.

Empty coder means solo; empty reviewers choose the owner rather than disabling reviews. With a selected profile, self-target `delegate` requires a fresh subagent, including reviews with no external reviewers. Other owner-session modes allow inline work/self-review and an optional subagent at owner judgment. A concrete target matching the owner's model stays separate. Without a profile, legacy review independence remains. Profiles never rewrite assignment modes or gate enablement.

`allow_agent_lifecycle` is a strict top-level boolean, false by default: false forbids starting, exiting, or restarting agents, even during recovery, fallback, or handoff. True requires installed Herdr/CLI help, available in-scope shell panes, verified live settings, and cleanup only of idle agents actually started for this task. It grants process management, not arbitrary pane/tab/workspace destruction. Owner mismatch always asks unused versus relay before handoff or startup.

Fallbacks keep exact effort-free `kind@model`/bare-kind strings. A matched empty list blocks substitutes; fallback drops the primary effort. Preserve `Calude` and the intentionally different `muse-1.0-wonder` profile model / `muse-wonder-1.0` fallback key: no spelling repair or fuzzy lookup. See the [canonical profiles contract](./skills/orchestration/references/profiles.md) and [roles guide](./docs/roles.md) for routing and reporting details. Re-run `/init` to change configuration; runs read frozen settings and report changed assignments and disabled gates.

Then start a feature with `/herdrpowers:full_cycle`, or break it up with `plan` → `execute` / `execute_parallel`. For small changes use `quick`. To run the same cycle with every review gate forced on regardless of the `enabled` values above, use `strict_full_cycle`.

### Updating

Plugin installs update through the marketplace (`/plugin marketplace update` in Claude Code, `codex plugin marketplace upgrade` for Codex). Repo-local instructions, config, profile customizations, and selection survive updates. Repeat init installs only missing templates. Checked-in copies update the shipped skills, commands, and profile assets against the copy — see [`changelogs/`](./changelogs/).

## Supported Platforms

The payload is a single tree at the repository root, discovered by each platform's plugin convention:

| Platform | Skills | Workflow commands |
|---|---|---|
| **Claude Code** | `skills/` (auto) | `commands/` as namespaced slash commands |
| **Codex** | `skills/` | `commands/` (surfaced as skills) |
| **Cursor** | `skills/` (auto) | `commands/` as slash commands (auto) |
| **OpenCode 1.18.29+ / 2** | `skills/` (registered by the plugin) | `commands/` as namespaced slash commands, registered by the plugin |
| **Aider / Gemini CLI / others** | read `skills/<name>/SKILL.md` directly | read `commands/<name>.md` directly |

Roles bind to targets rather than platforms or reserved panes. New role/profile targets use nested kind/model/effort settings; bare `orchestrator` dynamically aliases the active owner. Separate review slots need distinct kinds or distinct pinned models; effort alone is not another independent slot. Routing selects verified live settings and never switches an existing agent's model/effort.

## Repository Structure

```
skills/          # 16 skills (single tree, platform-neutral wording)
  herdr/                       bootstrap for the installed binary's herdr --skill guide
  orchestration/               routing, roles.yaml defaults, delegation assignments, fallbacks
  using-herdr-sibling-panes/   the delegation transport + composer scripts
  pane-driven-development/     the per-task loop over panes + brief templates
  …                            planning, TDD, debugging, review, worktrees, docs
commands/        # Workflows: init, plan, execute, execute_parallel, full_cycle,
                 #            strict_full_cycle, quick
.herdrpowers/profiles/ # Six shipped compositions and concise usage README
docs/            # Human-facing framework docs + instruction-file snippet
changelogs/      # obra/superpowers refresh history + pack-native release notes
.claude-plugin/  # Claude Code plugin + marketplace manifests
.codex-plugin/   # Codex plugin manifest
.cursor-plugin/  # Cursor plugin manifest
.opencode-plugin/ # OpenCode plugin: v1 config hook and v2 setup/transforms
package.json     # OpenCode package manifest (main → .opencode-plugin/index.mjs)
.agents/plugins/ # Codex marketplace manifest (fixed location per Codex convention)
NOTICE           # Third-party attribution and retained MIT notices
```

## Documentation

- **[Development Cycle Guide](./docs/development_cycle.md)** — Step-by-step walkthrough of the 7-phase process.
- **[Roles](./docs/roles.md)** — Orchestrator, Reviewer, Coder, Generalist; `roles.yaml` and fallbacks.
- **[Skills](./docs/skills.md)** — Catalog of every skill and when to use it.
- **[Workflows](./docs/workflows.md)** — `/init`, `/full_cycle`, `/strict_full_cycle`, `/plan`, `/execute`, `/execute_parallel`, `/quick`.
- **[Security policy](./SECURITY.md)** — Supported versions and vulnerability reporting.
- **[Plugin scanner](./.github/SCANNER.md)** — Pinned local reproduction commands and rule dispositions.

## What Changed from Superpowers

Superpowers is skill-triggered and subagent-driven: skills fire on their own as the conversation goes, and `subagent-driven-development` dispatches each task to an in-process subagent that implements, tests, commits, and self-reviews before a reviewer subagent sees it. herdrpowers keeps that methodology and changes who runs it and how it is started.

**Dispatch follows explicit targets and modes.** Separate delegated targets use idle sibling Herdr panes over the composer, each its own CLI process and context. Selected-profile self-target delegation uses fresh in-process subagents; other owner-session modes permit reported self-review. The legacy no-profile path keeps its review independence.

| | Superpowers | herdrpowers |
|---|---|---|
| worker | in-process subagent | resolved pane target, or profile self-target subagent |
| task loop | `subagent-driven-development` | `pane-driven-development` |
| parallel work | `dispatching-parallel-agents` | panes, bounded by idle panes and worktrees |
| entry point | skills trigger themselves | `commands/` workflows, plus the same skills |
| routing | fixed in the skill | repo config over `roles.yaml`, then present selected-profile slots |
| who writes tests | the implementer, always | the `test-authoring` assignment |
| review | one reviewer subagent | a role bound to a list of agent types: one review per entry |

**A command-driven workflow layer.** Superpowers has no `commands/`. herdrpowers adds seven: `init`, `plan`, `execute`, `execute_parallel`, `full_cycle`, `strict_full_cycle`, `quick` — so a cycle is something you start and can stop mid-way, rather than something that unfolds from skill triggers. `/init` is what makes the pack repo-agnostic: plugin files are read-only, so every repo-specific value lives in the target repo instead of in the pack.

**Test authorship became a setting.** `test-authoring` and `fix-round-test-authoring` select a fresh requirements-only worker or the implementing session. Delegated authors use isolated BASE worktrees; reviewers audit implementer-authored tests when the gate is enabled. Reports name the writer, RED/GREEN evidence, and actual review independence.

**Review independence comes from fresh context.** Separate targets receive reset-backed submissions and may reuse an implementing pane after reset. Selected-profile owner targets follow their mode: mandatory fresh subagent for `delegate`, permitted reported self-review otherwise. Brainstorming's builder check follows the same `plan-review` gate rules.

**Routes and degradation are reported.** Reports distinguish disabled gates, unavailable mandatory subagents, permitted self-review, independent review, and fallback constraints lost. Missing capability never becomes a passed review.

Skills dropped from upstream: `dispatching-parallel-agents` and `subagent-driven-development` (replaced by pane delegation and `pane-driven-development`), and `using-superpowers` (the pack's own meta-skill). Not carried yet: `diagnosing-superpowers` (upstream v6.4.1), which needs its own pane-native design — the decisions a port must make first are in its [port policy](./changelogs/2026-10-20-upstream-v7.0.0.md#diagnosing-superpowers-port-policy). Added: `herdr`, `orchestration`, `using-herdr-sibling-panes`, `pane-driven-development`, `update-docs`. Upstream's `hooks/`, `scripts/`, `tests/`, and `package.json` are not carried — the payload is skills and commands only.

## Contributing

This repository includes GitHub issue and pull-request templates under [`.github/`](./.github/) that require disclosure of the authoring environment: model, harness, harness version, installed plugins, and human review status. If an agent produced a contribution, say so plainly. If a human wrote it by hand without agent assistance, say that instead.

## Changelog

Every refresh from [obra/superpowers](https://github.com/obra/superpowers) is recorded in [`changelogs/`](./changelogs/), alongside pack-native release notes; the tracked upstream commit is in [`changelogs/UPSTREAM_SHA`](./changelogs/UPSTREAM_SHA).

## License

[MIT License](./LICENSE). This pack retains material derived from MIT-licensed packs, chiefly [obra/superpowers](https://github.com/obra/superpowers); see [NOTICE](./NOTICE) for the full attribution chain. Herdr is installed separately, and its official guide is read from `herdr --skill`. Earlier versions that bundled Herdr files retain their Apache-2.0 license.
