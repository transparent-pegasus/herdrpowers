# Root Docs Contract Template

Use this file to define the contract for root-level Markdown docs in the initialized repository. The `update-docs` skill should treat this file as repo-specific configuration, not as a universal default.

## Initialization Rules

- Replace the example sections below with the actual root docs used by the repository.
- Remove sections for docs that do not exist.
- Add sections for repo-specific docs, runbooks, dashboards, or theory notes that matter.
- Keep planning notes and scratch docs out of source-of-truth status unless the user explicitly says otherwise.

## Common Rules

- Root docs are maintained only when they already exist or when the user/workflow explicitly asks for a new one.
- When implementation and documentation conflict, prefer the current code, config, repository instructions, and the agent-instruction directories present in the repository (such as `commands/`, `.claude/`, or `.agents/`).
- For each doc, define the minimum set of files or commands that act as source of truth.

## Section Template

### `docs/<name>.md`

- Role: what this document is responsible for
- Source of truth: exact files, commands, or systems that must be checked before editing
- Include: the information that belongs here
- Exclude: the information that should not appear here

## Example Entries

### `docs/architecture.md`

- Role: explain the current runtime architecture and major data flows
- Source of truth: entrypoints, core modules, build/run scripts, deploy config
- Include: major components, boundaries, external dependencies, operator-visible behavior
- Exclude: aspirational designs, stale diagrams, unimplemented ideas

### `docs/structure.md`

- Role: describe the current repository layout
- Source of truth: current top-level directories, key packages, important config directories
- Include: real directories and files with their responsibilities
- Exclude: deleted paths, speculative future structure, exhaustive low-value file listings

### `docs/history.md`

- Role: summarize repository history when the repo maintains a history doc
- Source of truth: `git log --oneline` or the repository's release log source
- Include: factual change summaries in correct order
- Exclude: invented rationale, reordered events, details not supported by the history source

### `docs/todo.md`

- Role: track unfinished work when the repository uses a TODO doc
- Source of truth: current codebase, approved plans, open issues, explicit user direction
- Include: unfinished work, priority, current status
- Exclude: completed tasks, speculative wishes with no owner, duplicated backlog text
