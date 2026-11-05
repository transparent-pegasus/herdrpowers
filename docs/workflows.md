# Workflows

Workflows tie roles and skills into end-to-end development procedures. They live in `commands/`, the default command directory of the Claude Code, Codex, and Cursor plugin conventions; the OpenCode plugin registers them at startup. Each file carries YAML frontmatter `description: ...` so supporting platforms expose it as a slash command.

Every development workflow reads `orchestration` and its [profiles contract](../skills/orchestration/references/profiles.md), resolving repo config over shipped roles and then only present composition slots. Separate delegated targets use reset-backed in-scope Herdr panes. Profile self-target `delegate` requires fresh subagents for work and reviews, even with empty reviewers; other owner-session modes permit inline work/self-review and optional subagents. Without a profile, legacy independence and unavailable-pane degradation remain. Workers never re-delegate. Scope, modes, gates, and lifecycle permission stay frozen.

## Available Workflows

### `/init`

Repository initialization, re-runnable to update. Detects tooling, confirms a concrete configuration, and writes three deliverables:

- the `Herdrpowers Configuration` section into the repo's `CLAUDE.md` / `AGENTS.md` — the section every other workflow and skill uses to resolve `<KEY>` placeholders (`<BASE_BRANCH>`, `<REPORT_DIRECTORY>`, `<PLAN_PATH_PATTERN>`, `<BASELINE_VERIFICATION_COMMAND>`, …);
- `.herdrpowers/config.yaml` — roles, task assignments, delegation, optional `profile`, and separate top-level strict boolean `allow_agent_lifecycle`. New targets use nested kind/model/effort settings; fallback strings remain exact and effort-free;
- missing shipped `.herdrpowers/profiles/*.yaml` templates. Preserve existing files and selection on repeat init; installing templates selects nothing. Config/profile YAML is tracked; report scratch is ignored.

Pack files themselves are never edited. On Claude Code plugin installs it surfaces as `/herdrpowers:init`. See [Roles](./roles.md) for the schema and the full delegation-task table.

Use when: the pack was just installed (plugin or checked-in copy), or the repo's base branch, report directory, or test/verification commands changed.

### `/full_cycle`

The full development cycle: brainstorm → plan → configured plan review → approval → isolate → documentation impact review → implementation with TDD → documentation update → repository verification → configured final review → stop and present integration candidates (merge locally / push and open a PR / push only / keep). Enabled gates use their resolved target and mode; self-review and unavailable routes are named explicitly.

Implementation runs **in parallel by default** (`delegation.execution` in the resolved configuration): the plan carries a `## Tracks` table with owned files per track, and the confirmed tracks run in per-track worktrees off a coordination branch. Setting `delegation.execution: serial` runs the plan's tasks one at a time instead. Either way the report names which ran and how much parallelism was actually achieved.

Use when: starting real feature work.

### `/strict_full_cycle`

`/full_cycle` with every review gate forced on: the resolved configuration's `enabled` key is ignored for review tasks, so a gate the repository turned off runs anyway and is named as forced-on in the final report. Everything else still binds — `role`, `mode`, `roles:`, `fallbacks:`, and every invariant. Strict mode overrides one key, not the routing, and never writes the configuration file.

Use when: the branch must clear every gate the pack defines regardless of how the repository is configured — a release branch, a change on a security or money path, or an unfamiliar repository.

### `/plan`

Brainstorming, plan creation, and the enabled plan-review gate. Stops after the resolved plan is approved; reports actual independence or self-review.

Use when: you want the design and the reviewed implementation plan, but intend to execute later (often in a different session with `/execute`).

### `/execute`

Post-plan execution: workspace isolation from `<BASE_BRANCH>`, documentation impact review, pane-delegated implementation with per-task review, documentation update, repository verification, final code review, then stop and present the integration candidates.

Use when: a reviewed plan already exists and you want it carried through to a reviewed, ready-to-integrate branch.

### `/execute_parallel`

Same as `/execute`, but extracts independent tracks and runs them in parallel worktrees before integrating on a coordination branch. Falls back to serial execution if fewer than two tracks remain or resolved writer routes cannot run concurrently. Modes and mandatory subagent requirements remain binding.

Use when: the approved plan has tasks that truly can be implemented in parallel without shared ownership.

### `/quick`

A shortened cycle for small-scoped changes. Keeps brainstorming, workspace isolation off `<BASE_BRANCH>`, documentation impact review, TDD, documentation update, verification, the configured final-review gate, and integration handoff. Brainstorming saves a short design at `<DESIGN_DOC_PATH_PATTERN>` (not committed), sent directly to the user without a builder check. The separate plan and its review remain omitted; small scope does not override assignment modes.

Use when: the change is small enough to land without a separate written plan. If scope grows, stop and switch to `/full_cycle`.

## Guarantees

All development workflows share the same guardrails:

- **Safety**: Never write to `<BASE_BRANCH>` without explicit user consent; work happens on a feature branch (and, for most workflows, in a dedicated worktree).
- **Integration is offered, not assumed**: a finished branch ends with the candidates presented — merge locally, push and open a PR, push only, or keep as-is (discarding happens only on an explicit request). The workflow executes the chosen one and cleans up only as far as that choice requires. No workflow merges on its own.
- **Review routes**: Separate delegated reviews use reset-backed panes, including reuse of an implementing pane after reset. Profile self-target `delegate` requires fresh subagents; other owner-session modes permit reported self-review. No-profile independence remains unchanged. List roles run once per effective entry; empty profile reviewers select the owner rather than disabling a gate.
- **Quality**: Test reports name the writer and RED/GREEN evidence. Enabled task reviews return both spec-compliance and code-quality verdicts; disabled reviews stay off except strict mode's enabled-only override.
- **Transparency**: Each step blocks for user confirmation. Agents do not proceed autonomously through the whole cycle.
- **Evidence**: `verification-before-completion` runs before any "done" claim, and a delegated pane's claim is verified against its report file — not taken on trust.
- **Root cause over symptoms**: When tests fail, `systematic-debugging` drives the investigation.
- **Owner and lifecycle policy**: Owner mismatch always asks unused versus relay before handoff/startup. Lifecycle is a separate strict boolean, false by default; true permits guarded process management, not arbitrary topology destruction. Only explicit owner handoff transfers orchestration authority.
- **Honest degradation**: Reports name profile/owner, verified model/effort, transports, self-review versus independence, fallback constraints lost, lifecycle actions, changed assignments, disabled/forced gates, and actual concurrency. A mandatory subagent that cannot spawn is inability, never inline delegation or a passed gate.

## Invoking a Workflow

| Platform | How |
|---|---|
| Claude Code | Type the namespaced slash command (`/herdrpowers:full_cycle`, `/herdrpowers:plan`, …) from the plugin, or the bare command from a checked-in copy of `commands/`. |
| Cursor | Native slash commands from the plugin's `commands/`. |
| OpenCode 1.18.29+ / 2 | The plugin registers each workflow under the same namespaced name (`/herdrpowers:full_cycle`, `/herdrpowers:plan`, …), which also leaves OpenCode's own `/init` alone. V2 submits the workflow and any arguments in the current session, preserving attachments and the requested delivery mode. |
| Codex | Plugin commands surface as skills — invoke them by name, or read `commands/<name>.md` directly. |
| Aider / other tools | No native slash commands — read the workflow file directly (e.g. `commands/full_cycle.md`) and instruct the agent to follow it step-by-step. |

> **See Also**: [Development Cycle Guide](./development_cycle.md) for a detailed walkthrough of each phase, and [Roles](./roles.md) for who does what.
