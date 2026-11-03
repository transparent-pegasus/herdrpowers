# herdrpowers

Development workflows for AI coding agents in [herdr](https://herdr.dev),
adapted from [obra/superpowers](https://github.com/obra/superpowers).

Coordinates planning, implementation, testing, and review across agent panes.

## Features

- Automatic task delegation from the orchestrator to agent panes.
- Independent pane contexts, with configurable separation of test authors and implementers.
- Superpowers features adapted for development across panes.

| | Superpowers | herdrpowers |
|---|---|---|
| worker | in-process subagent | idle sibling herdr pane (any agent CLI) |
| task loop | `subagent-driven-development` | `pane-driven-development` |
| parallel work | `dispatching-parallel-agents` | panes, bounded by idle panes and worktrees |
| entry point | skills trigger themselves | `commands/` workflows, plus the same skills |
| routing | fixed in the skill | `.herdrpowers/config.yaml` over `roles.yaml` |
| who writes tests | the implementer, always | the `test-authoring` assignment |
| review | one reviewer subagent | a role bound to a list of agent types: one review per entry |

## Getting started

### Claude Code

```text
/plugin marketplace add transparent-pegasus/herdrpowers
/plugin install herdrpowers@herdrpowers
```

### Codex

```bash
codex plugin marketplace add https://github.com/transparent-pegasus/herdrpowers
codex plugin add herdrpowers@herdrpowers
```

### Cursor

```bash
cursor-agent plugin marketplace add https://github.com/transparent-pegasus/herdrpowers
```

Alternatively, install from this repository through the Cursor Marketplace.

### OpenCode 2

```bash
opencode plugin add git+https://github.com/transparent-pegasus/herdrpowers.git
```

Use `opencode2` if that is your binary's name.
For OpenCode 1, see [OpenCode setup](docs/opencode.md).

### Initialize your repository

Run the [init workflow](commands/init.md) once per repository:

```text
/herdrpowers:init
```

Then tell your agent what you want to build.

## Development workflows

The agent normally chooses between `full_cycle` and `quick` based on the task.
Invoke either command when you want to choose explicitly.

Use `plan` followed by `execute` or `execute_parallel` to separate planning
and execution in time or across execution environments.

Choose `execute` for sequential execution, or `execute_parallel` to run
independent tracks in parallel worktrees.

See [Workflows](docs/workflows.md) for all commands and how to invoke them
in each agent.

## Configuration

Repository settings stay outside the plugin and survive updates:

- `AGENTS.md` / `CLAUDE.md`: base branch, verification commands, and shared
  worktree directory (`WORKTREE_DIRECTORY`, default `.worktrees/`).
- `.herdrpowers/config.yaml`: agent roles, task assignments, delegation scope,
  and review settings.

Relative worktree paths resolve from the primary checkout so all agents
share the same parent directory. Delegation stays within one herdr tab
unless configured otherwise.

## Requirements

Delegation requires herdr with `herdr --skill` support and available agent panes.
Planning, TDD, debugging, and verification skills also work outside herdr.

Verify new or upgraded delegation targets with the
[composer probe](skills/using-herdr-sibling-panes/references/composer-keys.md#onboarding-a-new-agent-cli).

## Documentation

[Workflows](docs/workflows.md) · [Roles](docs/roles.md) ·
[Skills](docs/skills.md) · [OpenCode setup](docs/opencode.md)

## License

[MIT](LICENSE). See [NOTICE](NOTICE) for attribution.
