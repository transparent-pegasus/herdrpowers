---
change_type: pack-native
date: 2026-11-03
---

# Shared worktree directory configuration

`/init` now proposes `WORKTREE_DIRECTORY: .worktrees/` in the repository's
`Herdrpowers Configuration` section in `CLAUDE.md` and mirrors it into an
existing `AGENTS.md`. Reinitialization preserves a declared value.

`using-git-worktrees` resolves this parent from the primary checkout, so agents
starting in different linked worktrees agree on one location. A native tool is
used only when it can honor that location; otherwise the Git fallback is used.
The ignore check verifies the selected directory itself.

Detached test-author and temporary review worktrees also use unique paths under
the shared parent. Finishing recognizes the configured parent and cleans up only
the current task's recorded Git-created worktree, preserving native workspaces
and other tasks' worktrees. Existing configurations without the key default to
`.worktrees/`; existing worktrees are not moved.
