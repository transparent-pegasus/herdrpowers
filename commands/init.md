---
description: Initialize the current repository for herdrpowers by declaring repo-specific configuration in its instruction files
---

# /init Workflow (herdrpowers)

herdrpowers skills and commands reference repo-specific values through `<KEY>` placeholders (for example `<PLAN_PATH_PATTERN>`, `<BASELINE_VERIFICATION_COMMAND>`). This workflow declares the actual values inside the target repository's own instruction files, where every pack file resolves them at runtime. Pack files themselves are never edited: plugin installations are read-only, and checked-in copies stay diff-clean against the pack.

## Deliverable Saves

The only deliverable of this workflow is the `Herdrpowers Configuration` section written into the repository's instruction files. Commit it with the repository's normal instruction-file conventions.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file.

## Execution Steps

1. Inventory
Inspect the repository to ground a proposal for every key below: build and test tooling (`package.json`, `Makefile`, `pyproject.toml`, `Cargo.toml`, CI workflow files), docs layout, and existing `CLAUDE.md` / `AGENTS.md` content.
If a `Herdrpowers Configuration` section already exists in an instruction file, load it and treat this run as an update of that section.

2. Propose Values
Present one proposed value per key with the evidence it was inferred from (file or command).
Ask the user only about keys that cannot be inferred confidently. Never invent verification or test commands; propose only commands proven to exist in the repository.

| Key | Meaning |
|---|---|
| `REPO_INSTRUCTION_FILES` | The repo's instruction files, such as `README.md`, `AGENTS.md`, `CLAUDE.md`, or equivalent |
| `BASE_BRANCH` | The branch feature worktrees and pull requests branch from (e.g. `main`, `dev`) |
| `REPORT_DIRECTORY` | Git-ignored directory where delegated panes write their report files (e.g. `.tmp/`, `.herdrpowers/pdd/`) |
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

3. Write Configuration
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

4. Validate
Re-read the written file(s) and confirm: the section exists, every key has a value, and no value is still an angle-bracket placeholder.

5. Report
List the file(s) written and the final key values. Note that `/plan`, `/execute`, `/execute_parallel`, `/full_cycle`, `/quick`, and the pack's skills now resolve their placeholders from this section.

## Execution Requirements

- Never modify files that belong to the pack itself (the plugin installation directory, or checked-in copies of the pack's `skills/` and `commands/` directories). `orchestration/roles.yaml` is the one exception the user may edit deliberately — never as a side effect of this workflow.
- `REPORT_DIRECTORY` must be git-ignored. If the proposed directory is not, say so and either add it to `.gitignore` with the user's approval or pick one that already is.
- Block and require user confirmation before writing the configuration section. Do not write unconfirmed guesses.
- Preserve every byte of pre-existing instruction-file content outside the upserted section.
