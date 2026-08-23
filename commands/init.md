---
description: Initialize the current repository for herdrpowers by declaring repo-specific configuration in its instruction files
---

# /init Workflow (herdrpowers)

herdrpowers skills and commands reference repo-specific values through `<KEY>` placeholders (for example `<PLAN_PATH_PATTERN>`, `<BASELINE_VERIFICATION_COMMAND>`). This workflow declares the actual values inside the target repository's own instruction files, where every pack file resolves them at runtime. Pack files themselves are never edited: plugin installations are read-only, and checked-in copies stay diff-clean against the pack.

It also writes `.herdrpowers/config.yaml`: the repository's **role list** and the **role assigned to every delegation task** — implementation, tests, chores, verification, and each review. That file is the only place a repo customizes who takes which task and where it runs; `skills/orchestration/roles.yaml` stays untouched as the shipped default.

## Deliverable Saves

This workflow has two deliverables:

1. The `Herdrpowers Configuration` section written into the repository's instruction files.
2. `.herdrpowers/config.yaml` at the repository root — the role list and the per-task role assignments.

Commit both with the repository's normal instruction-file conventions. `.herdrpowers/config.yaml` is tracked configuration, not scratch — do not add it to `.gitignore`. (The sibling `.herdrpowers/pdd/` workspace ignores itself and is unaffected.)

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file.

## Execution Steps

1. Inventory
Inspect the repository to ground a proposal for every key below: build and test tooling (`package.json`, `Makefile`, `pyproject.toml`, `Cargo.toml`, CI workflow files), docs layout, and existing `CLAUDE.md` / `AGENTS.md` content.
If a `Herdrpowers Configuration` section already exists in an instruction file, load it and treat this run as an update of that section.
Read the pack's `skills/orchestration/roles.yaml` for the shipped role list, the shipped `delegation:` defaults, and the default role assigned to each delegation task. If `.herdrpowers/config.yaml` already exists, load it too and treat this run as an update of both deliverables — never silently reset a customized assignment or a gate the user turned off.
If herdr is running (`HERDR_ENV=1`), run `herdr pane list` and note which agent types actually exist in the session, **and which of them share the caller's `tab_id`**. Delegation is confined to the orchestrator's own tab by default, so an agent type that exists only in another tab is not usable by this repository's workflows as configured — flag that, alongside any default assignment naming an agent type this user does not have at all.

2. Propose Values
Present one proposed value per key with the evidence it was inferred from (file or command).
Ask the user only about keys that cannot be inferred confidently. Never invent verification or test commands; propose only commands proven to exist in the repository.

| Key | Meaning |
|---|---|
| `REPO_INSTRUCTION_FILES` | The repo's instruction files, such as `README.md`, `AGENTS.md`, `CLAUDE.md`, or equivalent |
| `BASE_BRANCH` | The branch feature worktrees and pull requests branch from (e.g. `main`, `dev`) |
| `REPORT_DIRECTORY` | Git-ignored directory where delegated panes write their report files (e.g. `.tmp/`, `.herdrpowers/pdd/<plan>/`) |
| `DESIGN_DOC_PATH_PATTERN` | Where brainstorming design docs are written (e.g. `docs/designs/YYYY-MM-DD-feature.md`) |
| `PLAN_PATH_PATTERN` | Where implementation plans are written (e.g. `docs/plans/YYYY-MM-DD-feature.md`) |
| `PLAN_DIRECTORY` | Directory to search first when only a plan filename is given |
| `BASELINE_VERIFICATION_COMMAND` | Default repo-wide verification command (e.g. `make check`, `npm test`) |
| `SUPPLEMENTAL_VERIFICATION_COMMANDS` | Extra commands triggered by changed surfaces (CLI, deploy, build, generation); may be `none` |
| `TEST_FRAMEWORK_AND_COMMANDS` | The repo's test stack and command conventions |
| `TEST_FILE_LOCATIONS` | Where tests and shared test helpers belong |
| `TARGETED_TEST_COMMAND` | Narrow test command for the touched scope |
| `FULL_TEST_SUITE_COMMAND` | Broader test suite command |

If the repository has no test suite or verification tooling yet, record the honest value `none yet` rather than a fabricated command; skills treat that as "report the gap" rather than "run something".

3. Propose the Role List
Present each role and the agent type(s) it binds to, with the shipped default beside the proposed value. Default to the shipped values — propose a change only when the repository or the session gives a reason, such as an agent type that does not appear in this session's `herdr pane list`.

| Role | Binds to | Meaning |
|---|---|---|
| `planning-design` | one agent type, or `orchestrator` | Who plans and designs; `orchestrator` means the pane the user typed into |
| `reviewer` | a **list** of agent types | Independent review. A list role runs **one delegation per entry**, so its length sets how many reviews each review task assigned to it runs |
| `coder` | one agent type | The heavier-judgment role: complex coding, test authoring, whole-branch review |
| `generalist` | one agent type, or `orchestrator` | Simple coding, search, file inspection, tests, lint, routine operations |
| `fallbacks.<agent>` | a list of agent types | Ordered substitutes for an agent that hits a usage limit or has no usable pane |

A repo may add a role beyond these four and assign tasks to it. Say so if the user asks.

4. Assign a Role to Each Delegation Task
Present every delegation task with its assigned role and mode. This is the routing table — the pack reads it instead of assuming implementation goes to the Coder. Each task takes `role` (from the list above) and `mode` (`delegate` = a fresh pane of that role, `orchestrator` = the orchestrator pane itself — a work task runs inline, a review task runs in a fresh subagent the orchestrator spawns, `implementer` = the pane that already owns the task).

**Read the shipped defaults out of `skills/orchestration/roles.yaml` and propose those values** — that file is the source of truth for what the pack ships, and it changes across releases. Do not propose defaults from memory or from this file; the tables below say only what each task covers.

Work tasks — always happen; the assignment decides who and where:

| Delegation task | Covers |
|---|---|
| `plan-and-design` | Brainstorming, design docs, implementation plans |
| `complex-coding` | Implementation over the complex-coding boundary |
| `simple-coding` | Localized, pattern-following edits under that boundary |
| `chores` | Lookups, file moves, log gathering, mechanical edits, lint/format runs |
| `test-authoring` | A task's tests for the implementation round |
| `fix-round-test-authoring` | The covering tests for one fix round |
| `review-fixes` | Fixing review findings |
| `verification` | Running `<BASELINE_VERIFICATION_COMMAND>` and `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` |

Review tasks — same two knobs plus `enabled`, which turns the gate off entirely:

| Delegation task | Turning it off means |
|---|---|
| `plan-review` | Plans go to the user for approval unreviewed (`/plan`, `/full_cycle`) |
| `documentation-impact-review` | No pre-implementation sweep for non-code files the change invalidates |
| `task-review` | Each task completes on the implementing pane's own report (`pane-driven-development`) |
| `fix-round-re-review` | Fix rounds are taken on the fixing pane's word; the five-round cap still applies |
| `final-branch-review` | The branch reaches the integration decision unreviewed |

Rules to state while proposing:
- Say plainly what each `enabled: false` costs before the user confirms it. Disabling a gate is the user's call; presenting it as free is not. Mention that `/strict_full_cycle` runs every gate anyway, so a disabled one is skipped by default but reachable on demand.
- Work tasks are never disabled. To stop delegating one, set `mode: orchestrator`.
- A config file written before v1.10.0 holds `plan-double-review` where the table now says `plan-review`. Rename the key while rewriting the file and tell the user: left as it was, the old key configures nothing and the gate runs on the shipped default, so a review the repo had turned off comes back silently.
- **A review task assigned to a role that binds to a list of agent types runs once per entry.** Assigning `task-review` or `fix-round-re-review` to such a role multiplies pane usage per task by the list length. Say the arithmetic out loud before the user confirms it.
- `test-authoring` and `fix-round-test-authoring` decide who writes tests. `mode: delegate` puts them in a pane that never sees the implementation, which costs an extra pane and a throwaway worktree per task; `mode: implementer` collapses them onto the pane whose behavior they cover, leaving the reviewers as the only check on that test code. Either is legitimate; state the trade before the user chooses, because the workflow reports which one ran.
- Two pack invariants are not configurable — state them if the user asks for either: review independence is the reset session (not pane identity; same physical pane OK after a reset-backed submit), and reviews from a list role come from different agent types.
- `review-fixes` escalates to a fresh pane at fix-loop rounds 4-5 whatever its mode says.

5. Propose Delegation Defaults
Present the two `delegation:` keys with the shipped defaults read out of `skills/orchestration/roles.yaml`, and what changing each one costs.

| Key | Values | Meaning |
|---|---|---|
| `pane_scope` | `tab` / `workspace` / `session` | Which panes may receive a delegation, relative to the pane the user typed into: only its own tab, any tab of its workspace, or every pane in the session |
| `execution` | `parallel` / `serial` | What `/full_cycle` and `/strict_full_cycle` attempt for implementation — extract the plan's independent tracks and run them concurrently, or run tasks one at a time |

Rules to state while proposing:
- Widening `pane_scope` past `tab` means a workflow may reset an agent session in another tab — usually another repository, with its own user mid-task. Each delegation resets the target session, so that work is gone. Widen it only when the user runs one project across several tabs on purpose.
- A narrow `pane_scope` reduces the panes available for reviews and parallel tracks. That is honest degradation, named in every report — not a silent loss.
- `execution: parallel` shapes plans too: plans get a `## Tracks` table with owned files per track, and `/full_cycle` runs that partition in per-track worktrees off a coordination branch. It attempts parallelism; a plan with one track, or a session with one usable pane, still runs serially.
- `/execute` and `/execute_parallel` are the user's explicit choice and ignore `execution`. `/strict_full_cycle` overrides `enabled` only — it never widens the scope or switches the strategy.

6. Write Configuration
After the user approves the values, upsert the following section into `CLAUDE.md` at the repository root (create the file if it does not exist). If `AGENTS.md` exists, mirror the identical section there. Preserve all other content of both files; only add or replace this one section.

```markdown
## Herdrpowers Configuration

herdrpowers skills and commands resolve `<KEY>` placeholders from this section.

- `REPO_INSTRUCTION_FILES`: <value>
- `BASE_BRANCH`: <value>
- `REPORT_DIRECTORY`: <value>
- `DESIGN_DOC_PATH_PATTERN`: <value>
- `PLAN_PATH_PATTERN`: <value>
- `PLAN_DIRECTORY`: <value>
- `BASELINE_VERIFICATION_COMMAND`: <value>
- `SUPPLEMENTAL_VERIFICATION_COMMANDS`: <value>
- `TEST_FRAMEWORK_AND_COMMANDS`: <value>
- `TEST_FILE_LOCATIONS`: <value>
- `TARGETED_TEST_COMMAND`: <value>
- `FULL_TEST_SUITE_COMMAND`: <value>
```

7. Write `.herdrpowers/config.yaml`
Create `.herdrpowers/` at the repository root if it does not exist, and write the approved role list and assignments there. Write every key explicitly, even the ones left at their shipped default — a config the user can read end to end is worth more than a minimal one, and a key absent from this file silently follows `roles.yaml`, which changes under them on the next pack refresh.

```yaml
# herdrpowers configuration for this repository.
# Overrides the pack's shipped defaults in skills/orchestration/roles.yaml,
# key by key. Anything omitted here falls back to those defaults.
# Written by the herdrpowers init workflow; safe to edit by hand.

# --- role list: role -> agent type(s) ---
roles:
  planning-design:
    agent: <agent type, or `orchestrator` for the pane the user typed into>
  reviewer:
    agents: # one independent plan review per entry
      - <agent type>
      - <agent type>
  coder:
    agent: <agent type>
  generalist:
    agent: <agent type, or `orchestrator` for the pane the user typed into>

fallbacks: # agent -> ordered substitutes, tried left to right
  <agent type>: [<agent type>]

# --- delegation defaults applying to every task and workflow ---
delegation:
  pane_scope: <tab|workspace|session> # tab = the orchestrator's own tab only
  execution: <parallel|serial> # /full_cycle and /strict_full_cycle strategy

# --- delegation tasks: each assigned a role from the list above ---
# mode: delegate (fresh pane of that role) | orchestrator (this pane) |
#       implementer (the pane that already owns the task)
assignments:

  # work tasks — always happen; `mode` decides whether they are delegated
  plan-and-design:
    role: <role>
    mode: <delegate|orchestrator>
  complex-coding:
    role: <role>
    mode: <delegate|orchestrator>
  simple-coding:
    role: <role>
    mode: <delegate|orchestrator>
  chores:
    role: <role>
    mode: <delegate|orchestrator>
  test-authoring:
    role: <role>
    mode: <delegate|implementer>
  fix-round-test-authoring:
    role: <role>
    mode: <delegate|implementer>
  review-fixes:
    role: <role>
    mode: <implementer|delegate|orchestrator>
  verification:
    role: <role>
    mode: <delegate|orchestrator>

  # review tasks — `enabled: false` removes the gate entirely
  plan-review:
    role: <role>
    mode: <delegate|orchestrator>
    enabled: <true|false>
  documentation-impact-review:
    role: <role>
    mode: <delegate|orchestrator>
    enabled: <true|false>
  task-review:
    role: <role>
    mode: <delegate|orchestrator>
    enabled: <true|false>
  fix-round-re-review:
    role: <role>
    mode: <delegate|orchestrator>
    enabled: <true|false>
  final-branch-review:
    role: <role>
    mode: <delegate|orchestrator>
    enabled: <true|false>
```

If the repository already had a `.herdrpowers/config.yaml`, rewrite it in full from the approved values — carrying forward every customization the user did not change in this run.

8. Validate
Re-read every written file and confirm:
- the `Herdrpowers Configuration` section exists, every key has a value, and no value is still an angle-bracket placeholder;
- `.herdrpowers/config.yaml` parses as YAML, has no angle-bracket placeholders left, carries a `fallbacks:` key, and defines every role that any assignment references;
- `delegation.pane_scope` is one of `tab`, `workspace`, `session`, and `delegation.execution` is one of `parallel`, `serial`;
- every delegation task named in `skills/orchestration/roles.yaml` appears under `assignments:` with a `role` that exists in `roles:` and a valid `mode`, and every review task there also has `enabled` — count them from that file rather than from a number written here, which goes stale;
- no work task carries `enabled: false` — that is the wrong knob; `mode: orchestrator` is how a work task stops being delegated;
- `.herdrpowers/config.yaml` is not git-ignored (`git check-ignore -v .herdrpowers/config.yaml` must find no matching rule).

9. Report
List the files written and the final values: the placeholder keys, the role list, the `delegation:` defaults, and every delegation task with its role and mode. Name explicitly any review set to `enabled: false` and what independence that gives up, any task moved off its default role or mode, and a `pane_scope` widened past `tab` together with which other tabs' sessions that exposes. Note that `/plan`, `/execute`, `/execute_parallel`, `/full_cycle`, `/strict_full_cycle`, `/quick`, and the pack's skills now resolve their placeholders from the instruction-file section, and their routing from `.herdrpowers/config.yaml`.

## Execution Requirements

- Never modify files that belong to the pack itself (the plugin installation directory, or checked-in copies of the pack's `skills/` and `commands/` directories). Assignments and gates are customized in the repository's `.herdrpowers/config.yaml`, never by editing `orchestration/roles.yaml` — that file is read-only on plugin installs and must stay diff-clean on checked-in copies.
- `REPORT_DIRECTORY` must be git-ignored. If the proposed directory is not, say so and either add it to `.gitignore` with the user's approval or pick one that already is. `.herdrpowers/config.yaml` is the opposite: it must stay tracked.
- Block and require user confirmation before writing either deliverable. Do not write unconfirmed guesses.
- Preserve every byte of pre-existing instruction-file content outside the upserted section.
- Never propose an agent type that does not appear in `roles.yaml`'s defaults or in this session's `herdr pane list` without saying it is unverified.
- Do not write a config that puts the same agent type in both Reviewer slots, or that routes a review to the role that implements the work. Those are pack invariants; the workflow would override the config at runtime anyway.
- Adding a role beyond the shipped four is allowed — define it under `roles:` and reference it from the assignments that should use it. Never reference a role no `roles:` entry defines.
