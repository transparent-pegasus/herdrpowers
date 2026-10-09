---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<PLAN_PATH_PATTERN>` or `<TARGETED_TEST_COMMAND>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise).

## Overview

Write implementation plans for an engineer who has not seen this codebase or this spec. Assume they write idiomatic code in the project's language once they know the exact interface and the exact test, and that they will make a reasonable choice wherever the plan leaves one open. What they cannot know is what you decided: which files, which names and signatures, which values from the spec, which tests prove each task. Document those. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

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

## Step Granularity

**Each step is one action with a checkable result:**
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

## Review Focus

[The five input classes or failure modes the spec implies but no task's
tests exercise that are most likely to bite a person using this software
— one line each, naming the input or condition and the behavior a
reasonable person would expect, most likely first. The spec is a vision
document: it says what the software must do, not everything it will
meet, and its silence on an input is not permission for that input to
break the program. Write the list here, once, with the spec in front of
you. Then, for each line, add the test that pins it to the task that
owns the code, in that task's own step style.]

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

- [ ] **Step 3: Implement `function(input: InputType) -> ResultType` in `exact/path/to/file.py`**

One line on the approach when the signature and the test leave a choice
(which library call, which data structure); a code block only for an
algorithm they do not determine.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## What a Step Contains

A step is done when the implementer can write exactly one reasonable thing
from it. That is the whole requirement: unambiguous, not complete. Each kind
of step carries what makes it unambiguous and nothing more:

- **A test step:** the test's name and its assertions, as code, with the
  spec's exact values in them.
- **A code step:** the exact signature (name, parameters, return type), the
  file it lives in, and the specific values the spec pins. The implementer
  writes the body. A body appears only for an algorithm the signature and
  tests do not determine, or for exact copy the spec fixes.
- **A verification step:** the command to run and the output that means it
  passed.
- **A reference to another task:** that task's Interfaces block says what
  to use; the plan does not repeat that task's code.

A plan is the set of decisions the implementer cannot make alone. A plan
longer than the code it describes has written the code instead. Lines that
decide nothing ("TBD", "handle edge cases", "add appropriate validation",
"write tests for the above", a type or function no task defines) are the
opposite failure, and the self-review catches both.

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Step scan:** Every step must let the implementer write exactly one reasonable thing, and no step may carry more than that: a line that decides nothing is a gap, a function body the signature and tests already determine is a transcript. Fix both.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Track partition:** Does every task name a track that the `## Tracks` table defines? Does every file in a task's **Files** block fall under its own track's owned globs? Two tracks writing the same file is a merge conflict the executing workflow will hit — fix it here by moving the edit into one track, or by merging the two tracks.

**5. Review Focus:** For each input class or failure mode the spec implies, is there a task whose tests exercise it? The five uncovered ones most likely to bite a person go in the Review Focus section, and each line there gets its test added to the owning task. An empty section means you checked and found none, not that you skipped the check.

**6. Proportion:** Compare the plan's length to the spec's. A plan several times longer than the spec it implements is a transcript of the program, not a plan. If code blocks are most of the document, replace bodies with signatures, test names and assertions, and check that each step is still unambiguous.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving and self-reviewing the plan, link it for the user to read. If
they have already explicitly supplied an execution method, ask them to
review the plan and confirm it captures what they want; wait for that review
before implementation, then use the preserved method. Otherwise, ask them to
review the plan and choose an execution method before implementation.
Inside a workflow (`/plan`, `/full_cycle`, and the rest), the workflow's own
review and approval steps are this handoff, and its execution steps are the
supplied method.

**When no execution method has already been supplied:**

**"Plan complete and saved to `<PLAN_PATH_PATTERN>`. Please review the plan. Which execution approach would you prefer?**

- **Pane-driven** - A fresh herdr sibling pane implements each task and reset-backed reviewer panes check it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh session per task and per review.
- **Inline** - I implement every task myself in this session, then one fresh-session review checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend <one of the two>, because <one sentence from the plan: how much the tasks depend on each other's interfaces, how many there are, what a shipped mistake would cost>. Does the plan capture what you want, and which approach should we use?"**

Pane-driven requires `HERDR_ENV=1` and an idle sibling agent pane inside `delegation.pane_scope`; without them, offer Inline alone and say why.

**When an execution method has already been supplied:**

**"Plan complete and saved to `<PLAN_PATH_PATTERN>`. Please review the plan. Does it capture what you want?"**

**If Pane-driven chosen:**
- **REQUIRED SUB-SKILL:** Use pane-driven-development

**If Inline chosen:**
- **REQUIRED SUB-SKILL:** Use executing-plans
