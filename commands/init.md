---
description: Initialize the current repository for herdrpowers by declaring repo-specific configuration in its instruction files
---

# /init Workflow (herdrpowers)

herdrpowers skills and commands reference repo-specific values through `<KEY>` placeholders (for example `<PLAN_PATH_PATTERN>`, `<BASELINE_VERIFICATION_COMMAND>`). This workflow declares the actual values inside the target repository's own instruction files, where every pack file resolves them at runtime. Pack files themselves are never edited: plugin installations are read-only, and checked-in copies stay diff-clean against the pack.

It also writes `.herdrpowers/config.yaml`: the role list, task assignments,
optional profile selection, and separate lifecycle permission. It installs
missing shipped composition templates in `.herdrpowers/profiles/`. Read
`skills/orchestration/references/profiles.md` before proposing or writing these
values: that reference owns key-presence precedence, target validation,
handoff/lifecycle rules, and profile-scoped self-review/subagent routes.
`skills/orchestration/roles.yaml` remains the shipped default layer.

## Deliverable Saves

This workflow has three deliverables:

1. The `Herdrpowers Configuration` section written into the repository's instruction files.
2. `.herdrpowers/config.yaml` — roles, assignments, delegation defaults, top-level `profile`, and top-level boolean `allow_agent_lifecycle`.
3. Missing shipped `.herdrpowers/profiles/*.yaml` templates, copied without overwriting existing local profiles.

Commit these with the target repository's normal configuration conventions.
In an initialized consumer repo, config and profile YAML files are tracked,
not scratch; keep `.herdrpowers/pdd/` ignored. This workflow initializes a
consumer repository; editing this upstream plugin's payload is a separate
maintainer task, not a reason to initialize the plugin checkout itself.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file.

## Execution Steps

1. Inventory
Inspect the repository to ground a proposal for every key below: build and test tooling (`package.json`, `Makefile`, `pyproject.toml`, `Cargo.toml`, CI workflow files), docs layout, and existing `CLAUDE.md` / `AGENTS.md` content.
If a `Herdrpowers Configuration` section already exists in an instruction file, load it and treat this run as an update of that section.
Read `skills/orchestration/roles.yaml` for every shipped role, assignment,
delegation default, and policy. Load an existing `.herdrpowers/config.yaml`
and local profile files; preserve customized bindings, assignments, gates,
selection, and templates on repeat init. Inventory shipped profile filenames
from `<pack>/.herdrpowers/profiles/`; do not reconstruct them from memory.
If Herdr is running (`HERDR_ENV=1`), inspect `herdr pane list` and the panes
inside the resolved scope. Read their live footer model lines with
`bash <pack>/skills/using-herdr-sibling-panes/scripts/pane-model.sh <pane-id>`.
For proposed model/effort targets use the optional MODEL/EFFORT arguments and
report missing evidence or unavailable targets. Inventory is read-only: do
not start, exit, restart, or change an agent to make a proposal look usable.

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

Also present the available profile names, proposed selection, and separate
top-level `allow_agent_lifecycle` boolean. A new config selects no profile
(`profile: null`) and ships lifecycle false unless the user chooses otherwise.
Repeat init preserves the existing selection and permission. Installing
templates does not select one. Explain that a selected profile overrides
only composition keys present in its file; missing keys retain resolved
roles, explicit empties override them, and modes/gate enablement stay intact.
Validate any selected name/file per the profiles reference; invalid or missing
selection is an explicit error, not a reason to silently clear it.

| Role | Binds to | Meaning |
|---|---|---|
| `planning-design` | one target, or `orchestrator` | Who plans and designs; the alias resolves to the active owner. Preserve custom target bindings |
| `reviewer` | a **list** of targets | One review per entry. A profile's explicit empty reviewers instead selects the owner; it does not disable reviews |
| `coder` | one agent type | The heavier-judgment role: complex coding, test authoring, whole-branch review |
| `generalist` | one target, or `orchestrator` | Simple coding, inspection, tests, and routine operations; preserve custom target bindings |
| `fallbacks.<agent>` | a list of string targets | Ordered substitutes for unavailable/exhausted agents; no effort constraint |

Write new role targets as one-key mappings, e.g.
`{codex: {model: GPT-6.1-Sol, effort: max}}`. `model` and `effort` are optional
nonempty strings; effort requires model. A kind-only target uses `{kind: {}}`.
Keep the bare `orchestrator` alias for roles that use it. Read legacy bare
kinds and `kind@model`; normalize non-fallback pins with a deprecation notice
and write nested targets. Fallback keys/substitutes keep bare-kind or
`kind@model` string syntax. Preserve supplied strings, including `Calude` and
the unequal `muse-1.0-wonder` / `muse-wonder-1.0` spellings; no fuzzy aliases.

State the empty-value rules explicitly: profile `coder: null`/`[]`/`none`
means no separate coder; `reviewers: []`/null/`none` means owner review.
Legacy `roles.<role>.agents: []` still disables the task when no profile
overrides that binding. Lists replace, and a matched empty fallback list is
authoritative. A fallback never inherits the primary effort.

A repo may add a role beyond these four and assign tasks to it. Say so if the user asks.

4. Assign a Role to Each Delegation Task
Present every delegation task's role and mode from the resolved table.
`delegate` uses a fresh reset-backed pane for a separate target; with a
selected profile, a target resolving to the active owner instead requires a
fresh in-process subagent, for reviews too, even with empty reviewers.
`orchestrator` uses the active owner: a selected profile permits same-session
self-review or an optional subagent, while no-profile reviews still require
a fresh subagent. `implementer` continues in the session owning the task.
Profile selection never rewrites these modes or gate enablement.

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
| `plan-review` | Plans go to the user for approval unreviewed (`/plan`, `/full_cycle`), and a project's full design skips `brainstorming`'s builder check |
| `documentation-impact-review` | No pre-implementation sweep for non-code files the change invalidates |
| `task-review` | Each task completes on the implementing pane's own report (`pane-driven-development`) |
| `fix-round-re-review` | Fix rounds are taken on the fixing pane's word; the five-round cap still applies |
| `final-branch-review` | The branch reaches the integration decision unreviewed |

Rules to state while proposing:
- Say plainly what each `enabled: false` costs before the user confirms it. Disabling a gate is the user's call; presenting it as free is not. Mention that `/strict_full_cycle` runs every gate anyway, so a disabled one is skipped by default but reachable on demand.
- Work tasks are never disabled. To stop delegating one, set `mode: orchestrator`.
- Honor legacy `plan-double-review` as `plan-review` while reading an old config, then rename it on rewrite and tell the user. Preserve its gate settings rather than reviving a review through an unrecognized key.
- **A review task assigned to a role that binds to a list of agent types runs once per entry.** Assigning `task-review` or `fix-round-re-review` to such a role multiplies pane usage per task by the list length, and `plan-review` runs at two points in a workflow that writes a full project design — `brainstorming`'s builder check, then the plan's review — so its list length counts twice. Say the arithmetic out loud before the user confirms it.
- `test-authoring` and `fix-round-test-authoring` decide the test writer. A delegated author uses the requirements alone at BASE, without seeing implementation, in a fresh pane (or the profile's required fresh self-target subagent). `implementer` leaves tests with the implementing session; reviewers audit that test code. State the trade and report the writer.
- Separate delegated review independence comes from reset, not pane identity. Separate list slots need different kinds or distinct pinned models of one kind; effort alone is not a distinct model. The profiles reference scopes owner-session self-review precisely; without a selected profile, legacy independence remains required.
- The existing fix-loop escalation applies to separate targets. Profile self-targets continue to obey their resolved mode, including mandatory fresh subagents for `delegate`.

5. Propose Delegation Defaults
Present the two `delegation:` keys with the shipped defaults read out of `skills/orchestration/roles.yaml`, and what changing each one costs.

| Key | Values | Meaning |
|---|---|---|
| `pane_scope` | `tab` / `workspace` / `session` | Which panes may receive work, relative to the orchestrator: its tab, its workspace, or the session; owner handoff stays in scope too |
| `execution` | `parallel` / `serial` | What `/full_cycle` and `/strict_full_cycle` attempt for implementation — extract the plan's independent tracks and run them concurrently, or run tasks one at a time |

Rules to state while proposing:
- Widening `pane_scope` past `tab` means a workflow may reset an agent session in another tab — usually another repository, with its own user mid-task. Each delegation resets the target session, so that work is gone. Widen it only when the user runs one project across several tabs on purpose.
- A narrow `pane_scope` reduces the panes available for reviews and parallel tracks. That is honest degradation, named in every report — not a silent loss.
- `execution: parallel` shapes plans too: plans get a `## Tracks` table with owned files per track, and `/full_cycle` runs that partition in per-track worktrees off a coordination branch. It attempts parallelism; a plan with one track, or a session with one usable pane, still runs serially.
- `/execute` and `/execute_parallel` are the user's explicit choice and ignore `execution`. `/strict_full_cycle` overrides `enabled` only — it never widens the scope or switches the strategy.
- `allow_agent_lifecycle` is not a delegation key. False prohibits start/exit/restart, including recovery, fallback, and owner startup. True requires learning installed Herdr operations/help, starting only in available in-scope shell panes, and verifying live model/effort. End only idle agents actually started for this task with no pending work; preserve unrelated/working sessions. Do not invent a stop command.
- A profile-owner mismatch always asks whether reception is unused or relay before handoff or startup, regardless of lifecycle permission or existing matching agents. A relay retains no decision authority; describe the explicit owner handoff from the profiles reference.

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
Create `.herdrpowers/` and write the approved configuration. Materialize the
resolved roles, fallbacks, assignments, and delegation keys from `roles.yaml`
plus existing customizations, not the illustrative entry counts below. Write
top-level `profile` (null for no selection) and a strict boolean
`allow_agent_lifecycle`. Preserve the existing selection on repeat init.
Use canonical nested role targets, leaving bare `orchestrator` aliases and
custom planning-design/generalist bindings intact. Remove optional model or
effort keys that were not chosen; a kind-only settings map is `{}`.

```yaml
# herdrpowers configuration for this repository.
# Overrides the pack's shipped defaults in skills/orchestration/roles.yaml,
# key by key. Anything omitted here falls back to those defaults.
# Written by the herdrpowers init workflow; safe to edit by hand.

# --- composition selection and separate process-lifecycle permission ---
profile: <approved name, or null for no selection>
allow_agent_lifecycle: <true|false>

# --- roles: nested targets, or the bare active-owner alias ---
roles:
  planning-design:
    agent: orchestrator # or the approved custom nested target
  reviewer:
    agents: # materialize every approved entry; do not infer a default count
      - <agent kind>:
          model: <model string>
          effort: <effort string>
  coder:
    agent:
      <agent kind>:
        model: <model string>
        effort: <effort string>
  generalist:
    agent: orchestrator # or the approved custom nested target

fallbacks: # string key -> ordered string substitutes, without effort
  <kind or kind@model>: [<kind or kind@model>]

# --- delegation defaults applying to every task and workflow ---
delegation:
  pane_scope: <tab|workspace|session> # tab = the orchestrator's own tab only
  execution: <parallel|serial> # /full_cycle and /strict_full_cycle strategy

# --- delegation tasks: each assigned a role from the list above ---
# mode: delegate (fresh worker; profile self-target requires a subagent) |
#       orchestrator (active owner) | implementer (session owning the task)
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

Install profile templates by iterating the actual shipped
`<pack>/.herdrpowers/profiles/*.yaml` files. Create the local profiles directory
if needed and copy a template **only when its destination is absent**.
Preserve every existing file byte for byte, including a customized profile
with a shipped filename; do not overwrite, merge, or refresh it on repeat
init. Preserve custom profile filenames too. Profiles contain composition
only, never assignments, delegation, fallbacks, lifecycle policy, or session
pane IDs/scope. Installing templates is independent of selecting a profile.

8. Validate
Re-read every written file and confirm:
- the `Herdrpowers Configuration` section exists, every key has a value, and no value is still an angle-bracket placeholder;
- `.herdrpowers/config.yaml` parses as YAML, has no angle-bracket placeholders left, carries a `fallbacks:` key, and defines every role that any assignment references;
- top-level `profile` is null/`none` or a valid simple name whose selected local/shipped file exists and validates; errors remain explicit rather than clearing selection;
- top-level `allow_agent_lifecycle` is a YAML boolean, not a string, null, or a field nested in a profile or `delegation`;
- new role targets are one-kind mappings with only optional nonempty model/effort strings, effort requires model, and bare `orchestrator` aliases/custom bindings were preserved;
- profiles contain only the three composition keys with the absent/empty semantics above; original string spelling and reviewer order are intact;
- all missing shipped templates were installed, every pre-existing profile file is byte-identical, and repeat init preserved the chosen profile, assignments, gate enablement, delegation, and permission;
- `delegation.pane_scope` is one of `tab`, `workspace`, `session`, and `delegation.execution` is one of `parallel`, `serial`;
- every delegation task named in `skills/orchestration/roles.yaml` appears under `assignments:` with a `role` that exists in `roles:` and a valid `mode`, and every review task there also has `enabled` — count them from that file rather than from a number written here, which goes stale;
- no work task carries `enabled: false` — that is the wrong knob; `mode: orchestrator` is how a work task stops being delegated;
- `.herdrpowers/config.yaml` is not git-ignored (`git check-ignore -v .herdrpowers/config.yaml` must find no matching rule);
- installed profile YAML files are likewise trackable in the consumer repo, while the report workspace remains ignored.

9. Report
Report files written, templates installed/preserved, profile selection,
lifecycle permission, effective role targets, placeholders, delegation, and
task assignments. Name disabled reviews, changed assignments, widened scope,
legacy-target migrations, and unverified model/effort constraints. Explain
owner/self-review consequences of the selected composition without calling
same-session self-review independent. Workflows resolve config plus the
selected composition; installing templates alone does not change routes.

## Execution Requirements

- Never modify files that belong to the pack itself (the plugin installation directory, or checked-in copies of the pack's `skills/` and `commands/` directories). Assignments and gates are customized in the repository's `.herdrpowers/config.yaml`, never by editing `orchestration/roles.yaml` — that file is read-only on plugin installs and must stay diff-clean on checked-in copies.
- `REPORT_DIRECTORY` must be git-ignored. If needed, propose an ignore change or choose an ignored directory. In the consumer repo, config and profile YAML must stay tracked; scratch stays ignored.
- Require approval of the concrete proposed configuration before writing the init deliverables, including installing missing templates. Do not write unconfirmed guesses. Existing authorization to implement upstream plugin behavior is not an invocation of consumer init.
- Preserve every byte of pre-existing instruction-file content outside the upserted section.
- Mark proposed kinds/models/efforts unverified unless backed by current pane/footer evidence. Shipped profile strings remain exact even when unavailable; do not rewrite a template to fit the current session.
- Separate Reviewer slots of one kind require distinct pinned models under the profiles reference's comparison rule. Reusing the implementing pane after reset is legitimate; profile-selected owner-session review is instead reported as self-review.
- Adding a role beyond the shipped four is allowed — define it under `roles:` and reference it from the assignments that should use it. Never reference a role no `roles:` entry defines.
