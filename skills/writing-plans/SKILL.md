---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<PLAN_PATH_PATTERN>` or `<TARGETED_TEST_COMMAND>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise).

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should have been created via the `using-git-worktrees` skill at execution time.

**Save plans to:** `<PLAN_PATH_PATTERN>`
- (User preferences for plan location override this default)

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## Repository Discovery

Before choosing files, discover the current code shape.

- If a codegraph plugin/tool is available, use it to search relevant files and symbols, then inspect callers, callees, and impact surface for the planned changes.
- If codegraph is unavailable, continue with ordinary repo exploration (`rg`, file reads, recent commits). Codegraph is optional; do not block plan creation because it is missing.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Implementation Tracks

**Plan for parallel execution by default.** The pack's default execution strategy (`delegation.execution` in the merged configuration — `.herdrpowers/config.yaml` over `orchestration/roles.yaml`) is `parallel`, and a plan that only lists tasks forces whoever executes it to re-derive the partition afterwards, from a document that was never written with ownership boundaries in mind. Draw the boundaries here, where the file structure is already in front of you.

Group the tasks into **tracks**: sets of tasks that can be implemented in separate worktrees at the same time. A track is parallelizable only when all of these hold:

- **No overlapping write ownership.** Every file belongs to exactly one track. Two tracks that both modify `src/config.py` are one track.
- **No ordering dependency inside the parallel window.** A track that consumes another's interfaces runs after it, not beside it — record that in `Depends on`.
- **No shared mutable artifact** requiring same-session coordination (a migration sequence, a lockfile, a generated bundle).
- **Integration can be deferred** until every track in the wave is complete.

Then declare them in the plan's `## Tracks` table (see the header below) and tag every task with its track.

Two things this is not: it is not a licence to split work that is genuinely sequential — **a single-track plan is a correct answer**, written as one `main` track with one line saying why the work does not partition; and it is not a reason to weaken a task boundary — right-size tasks first, then group them.

Where a file must be touched by two tracks, prefer moving that edit into one track and having the other consume the result. Where that is impossible, put both tasks in the same track.

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and is worth a
fresh reviewer's gate. When drawing task boundaries: fold setup,
configuration, scaffolding, and documentation steps into the task whose
deliverable needs them; split only where a reviewer could meaningfully
reject one task while approving its neighbor. Each task ends with an
independently testable deliverable.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use pane-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Spec:** [path to the spec/design doc this plan implements — the plan
argues from the spec, so the spec travels with it; executors read both]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

## Tracks

| Track | Goal | Tasks | Owned files | Depends on |
|---|---|---|---|---|
| `parser` | [one line] | 1-3 | `src/parser/**`, `tests/parser/**` | — |
| `cli` | [one line] | 4-5 | `src/cli.py`, `tests/test_cli.py` | `parser` |

[Owned-file globs must not overlap between tracks. `Depends on` is empty for
every track that can start immediately; a track that names another runs after
it. One track named `main` owning everything is a valid plan — state in one
line why the work does not partition.]

**Post-integration follow-ups:** [documentation, repo-wide verification, and
anything else that must wait until every track has landed — these are never
parallel tracks.]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Track:** `parser`

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Track partition:** Does every task name a track that the `## Tracks` table defines? Does every file in a task's **Files** block fall under its own track's owned globs? Two tracks writing the same file is a merge conflict the executing workflow will hit — fix it here by moving the edit into one track, or by merging the two tracks.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `<PLAN_PATH_PATTERN>`. Two execution options:**

**1. Pane-Driven (recommended)** - I delegate a fresh herdr sibling pane per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?"**

**If Pane-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use pane-driven-development
- Fresh pane per task + task review and final review
- Requires `HERDR_ENV=1` and an idle sibling agent pane; without those, fall back to Inline Execution

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use executing-plans
- Batch execution with checkpoints for review
