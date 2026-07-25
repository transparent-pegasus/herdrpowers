---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and the user needs to decide how to integrate the work - presents the integration candidates (merge locally, push and open a PR, push only, keep, discard) and executes only the chosen one; never merges on its own
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Detect Environment

**Determine workspace state before presenting options:**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

This determines which menu to show and how cleanup works:

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 5 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 5 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 4 options (no local merge) | No cleanup (externally managed) |

### Step 3: Determine Base Branch

```bash
# Prefer the declared base; fall back to common names
git merge-base HEAD "$BASE_BRANCH" 2>/dev/null \
  || git merge-base HEAD main 2>/dev/null \
  || git merge-base HEAD master 2>/dev/null
```

`<BASE_BRANCH>` comes from the repository's `Herdrpowers Configuration` section. When it is declared, merge and PR targets are that branch — do not silently retarget `main` because it exists.

If nothing resolves, ask: "This branch split from `<name>` - is that correct?"

### Step 4: Present Options

**Normal repo and named-branch worktree — present exactly these 5 options:**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push to origin and create a Pull Request
3. Push to origin only (no PR)
4. Keep the branch as-is (I'll handle it later)
5. Discard this work

Which option?
```

**Detached HEAD — present exactly these 4 options:**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as a new branch and create a Pull Request
2. Push as a new branch only (no PR)
3. Keep as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

**Present, don't presume.** Merging is one candidate among several, not the default ending. Never merge, push, or delete anything before the user names the option — and when they do, execute that option only.

### Step 5: Execute Choice

#### Option 1: Merge Locally

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result
<test command>

# Only after merge succeeds: cleanup worktree (Step 6), then delete branch
```

Then: Cleanup worktree (Step 6), then delete branch:

```bash
git branch -d <feature-branch>
```

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>
```

Then open the PR against `<base-branch>` — not against `main` because it exists.

**Do NOT clean up worktree** — user needs it alive to iterate on PR feedback.

#### Option 3: Push Only

```bash
git push -u origin <feature-branch>
```

Report the pushed branch and its remote URL. Do not open a PR, and do not merge.

**Don't cleanup worktree** — the branch is still live work.

#### Option 4: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 5: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then: Cleanup worktree (Step 6), then force-delete branch:
```bash
git branch -D <feature-branch>
```

### Step 6: Cleanup Workspace

**Only runs for Option 1 (Merge locally) and Option 5 (Discard).** Options 2, 3, and 4 always preserve the worktree.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**If `GIT_DIR == GIT_COMMON`:** Normal repo, no worktree to clean up. Done.

**If worktree path is under `.worktrees/` or `worktrees/`:** this pack created the worktree — we own cleanup.

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**Otherwise:** The host environment (harness) owns this workspace. Do NOT remove it. If your platform provides a workspace-exit tool, use it. Otherwise, leave the workspace in place.

## Quick Reference

| Option | Merge | Push | Open PR | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------|---------------|----------------|
| 1. Merge locally | yes | - | - | - | yes |
| 2. Push + PR | - | yes | yes | yes | - |
| 3. Push only | - | yes | - | yes | - |
| 4. Keep as-is | - | - | - | yes | - |
| 5. Discard | - | - | - | - | yes (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" is ambiguous
- **Fix:** Present exactly 5 structured options (or 4 for detached HEAD)

**Presuming the merge**
- **Problem:** Merging (or pushing) because the work is done, before the user picked an option
- **Fix:** Present the candidates, wait, then execute only the one named

**Cleaning up worktree for Option 2 or 3**
- **Problem:** Remove worktree user needs for PR iteration or follow-up pushes
- **Fix:** Only cleanup for Options 1 and 5

**Deleting branch before removing worktree**
- **Problem:** `git branch -d` fails because worktree still references the branch
- **Fix:** Merge first, remove worktree, then delete branch

**Running git worktree remove from inside the worktree**
- **Problem:** Command fails silently when CWD is inside the worktree being removed
- **Fix:** Always `cd` to main repo root before `git worktree remove`

**Cleaning up harness-owned worktrees**
- **Problem:** Removing a worktree the harness created causes phantom state
- **Fix:** Only clean up worktrees under `.worktrees/` or `worktrees/`

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Merge, push, or delete before the user has picked an option — presenting the candidates is the whole point of this step
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Remove a worktree before confirming merge success
- Clean up worktrees you didn't create (provenance check)
- Run `git worktree remove` from inside the worktree

**Always:**
- Verify tests before offering options
- Detect environment before presenting menu
- Present exactly 5 options (or 4 for detached HEAD)
- Get typed confirmation for Option 5 (Discard)
- Clean up worktree for Options 1 & 5 only
- `cd` to main repo root before worktree removal
- Run `git worktree prune` after removal
