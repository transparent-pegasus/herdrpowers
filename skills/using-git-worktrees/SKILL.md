---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace under the repository's shared worktree directory. Prefer native worktree tools that can use that directory; otherwise use git worktrees.

**Core principle:** Detect existing isolation first. Resolve one shared directory for all agents, then choose a tool that honors it.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 2 (Project Setup). Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

If this task's design doc or plan sits untracked in the primary checkout, carry it over now (Step 1c).

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout.

Has the user already indicated their worktree preference in your instructions? If not, ask for consent before creating a worktree:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor any existing declared preference without asking. If the user declines consent, work in place and skip to Step 2.

## Step 1: Create Isolated Workspace

### Shared Directory Selection (both mechanisms)

Read `<WORKTREE_DIRECTORY>` from the **primary checkout's** `Herdrpowers Configuration` section in `CLAUDE.md` / `AGENTS.md`, so stale instruction copies in linked worktrees cannot send agents to different parents. If the key is absent, use `.worktrees/`. An explicit location in the user's current request takes precedence; an existing directory elsewhere does not override the declared value.

Resolve relative values against the **primary checkout**, even when creating another workspace from a linked worktree. Keep absolute values unchanged. Store the resolved absolute parent as `LOCATION`:

```bash
MAIN_ROOT=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
LOCATION="<WORKTREE_DIRECTORY>"
case "$LOCATION" in
  /*) ;;
  *) LOCATION="$MAIN_ROOT/$LOCATION" ;;
esac
```

Use this parent for coordination, track, detached test-author, and temporary review worktrees. Choose unique child paths for concurrent runs and tracks. Record each created worktree's absolute path and that this task created it; delegation and cleanup use that recorded path, never a sibling pane's current directory.

Apply Safety Verification below before either creation mechanism. Already-isolated workspaces from Step 0 stay in place; do not move them or create nested worktrees merely to match the setting.

### 1a. Native Worktree Tools (when they honor the directory)

The user has asked for an isolated workspace (Step 0 consent). If a native tool such as `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag can create it under the resolved `LOCATION`, use that tool and pass the directory explicitly, then continue at Step 1c.

Native tools then own branch creation and cleanup. If their placement is fixed elsewhere, continue to Step 1b rather than silently changing the shared directory. Report which mechanism and absolute path you used.

### 1b. Git Worktree Fallback

Use this when no native tool can honor the shared directory. Create the worktree manually using git and the resolved `LOCATION`.

#### Safety Verification (project-local directories only)

**MUST verify directory is ignored before creating worktree:**

```bash
git -C "$MAIN_ROOT" check-ignore -q "$LOCATION/"
```

**If NOT ignored:** Add the selected directory to .gitignore, commit the change, then proceed. Do not treat a different ignored directory as proof that `LOCATION` is ignored.

**Why critical:** Prevents accidentally committing worktree contents to repository.

#### Create the Worktree

```bash
# LOCATION is the shared absolute parent resolved above
WORKTREE_PATH="$LOCATION/$BRANCH_NAME"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" "$BASE_BRANCH"
cd "$WORKTREE_PATH"
pwd   # absolute path — every delegation brief must carry it
```

**Base the branch explicitly.** `<BASE_BRANCH>` comes from the repository's `Herdrpowers Configuration` section; without it, `git worktree add` bases the new branch on whatever HEAD happens to be, which silently produces a branch off the wrong commit when the session is not sitting on the base. If the key is not declared, ask which branch to base on rather than defaulting to HEAD.

**Record the absolute path.** Delegated panes do not inherit the orchestrator's working directory — every brief states this path and requires the pane to confirm it is there before doing anything else.

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), tell the user the sandbox blocked worktree creation and you're working in the current directory instead. Then run setup and baseline tests in place.

### 1c. Carry the Task's Design and Plan Docs (both mechanisms)

The design doc and the implementation plan are usually written before the worktree exists, so they sit **untracked in the primary checkout**. Once the worktree is ready, move them into it so they land in the feature branch's commits and the primary checkout stays clean.

1. Locate the primary checkout and check only this task's docs — the paths the invoking workflow wrote under `<DESIGN_DOC_PATH_PATTERN>` / `<PLAN_PATH_PATTERN>`:

   ```bash
   MAIN=$(git worktree list --porcelain | head -1 | sed 's/^worktree //')
   git -C "$MAIN" status --porcelain -- "<design-doc-path>" "<plan-path>"
   ```

2. Move **only `??` (untracked) entries**. A tracked file stays put: moving it would dirty the primary checkout — the opposite of the point — and if it is already committed on `<BASE_BRANCH>`, the worktree has it via the branch.

   ```bash
   mkdir -p "<worktree>/<docs-dir>"   # target directory may not exist in the worktree yet
   mv "$MAIN/<docs-dir>/<file>" "<worktree>/<docs-dir>/"
   ```

   `git mv` cannot cross worktrees (each working tree has its own index) — use plain `mv`, then `git add` and commit inside the worktree. A docs-only commit before implementation starts is fine.

3. **Several worktrees in one run** (a coordination worktree plus per-track ones): the docs go into the **coordination worktree only**. Per-track delegation briefs reference them by the coordination worktree's absolute path.

4. Report the new absolute paths. Every later delegation brief and review request must cite the new location — the old path no longer exists.

Move only this task's docs — never sweep the whole plans directory; other tasks' drafts stay where they are. If nothing matches untracked (a workflow with no plan phase, docs already committed, or working in place after declined consent / sandbox fallback), skip silently.

## Step 2: Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

**CodeGraph (optional):** if a codegraph plugin/tool is available *and* the main
checkout has a `.codegraph/` index, run `codegraph init` in the worktree. The
index is machine-local and gitignored, so `git worktree add` never copies it —
without this the worktree has no index and codegraph queries silently fall back
to plain search. Check the main checkout, not the worktree (`.codegraph/` is
absent there by definition). If the main checkout is not indexed, skip it:
indexing is the user's decision.

## Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
# Use project-appropriate command
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| `WORKTREE_DIRECTORY` declared | Resolve it from the primary checkout and verify ignored |
| Key absent | Use `.worktrees/` under the primary checkout |
| Native tool can honor the shared directory | Use it (Step 1a) |
| No native tool can honor the shared directory | Git worktree fallback (Step 1b) |
| Directory not ignored | Add to .gitignore + commit |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |
| Main checkout has `.codegraph/` | `codegraph init` in the worktree (Step 2) |
| Main checkout not indexed | Skip codegraph — user's decision |
| Design/plan docs untracked in primary checkout | `mv` into the worktree + commit there (Step 1c) |
| Docs already tracked/committed | Leave them — the branch carries them |
| Coordination + per-track worktrees | Docs into the coordination worktree only |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'm obviously not in a worktree — no need to check" | Run Step 0. Harness-created isolation and submodules both fool eyeballing; the detection commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | Prefer a native tool when it honors the shared directory; otherwise use the Git fallback explicitly and record that this task owns cleanup. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. An unignored worktree directory commits the whole tree into the repo. |
| "Any directory name works" | All agents use `WORKTREE_DIRECTORY`, resolved from the primary checkout; an existing alternative directory does not override it. |
| "Panes can read the plan from the main checkout anyway" | They can, but then the plan never lands in the branch's history and the primary checkout stays dirty. Carry it over (Step 1c) and cite the new path. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run the tests now; proceeding past failures is your human partner's call. |
