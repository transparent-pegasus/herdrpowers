---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<BASE_BRANCH>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise).

Delegate the review to a **fresh herdr sibling pane** to catch issues before they cascade. The reviewing pane starts from a reset session, so it sees the work product and never your thought process — that is where review independence comes from in this pack, not from a separate named agent.

**Core principle:** Review early, review often. Never review your own work, and never send a change back to the pane that wrote it.

## When to Request Review

**Mandatory:**
- After each task in pane-driven development
- After completing a major feature
- Before merge to the base branch

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

## How to Request

**1. Record the range and build the diff package:**
```bash
BASE_SHA=$(git merge-base <BASE_BRANCH> HEAD)   # or the commit recorded before the task
HEAD_SHA=$(git rev-parse HEAD)
../pane-driven-development/scripts/review-package "$BASE_SHA" "$HEAD_SHA"   # prints the path
```
The package never enters your own context — you pass the path, the pane reads the file.

**2. Pick the pane:**
Resolve the role from `orchestration`'s `roles.yaml` (code review → Coder). Pick any idle pane of that type **other than the one that implemented the change**; prefer a different agent type when one is idle. If the only idle pane is the implementer's, wait for another, or state in the final report that the review was not independent.

**3. Delegate:**
Write the review contract from [review-brief.md](review-brief.md) to a file, then submit the one-line instruction through `using-herdr-sibling-panes` (`composer-submit.sh`) and wait for the completion marker. Never submit an agent-pane prompt with `pane run`.

**Placeholders:**
- `[DESCRIPTION]` - Brief summary of what you built
- `[PLAN_OR_REQUIREMENTS]` - What it should do
- `[BASE_SHA]` / `[HEAD_SHA]` - The range under review
- `[DIFF_FILE]` - The path `review-package` printed

**4. Act on feedback:**
- Read the review from its output file, not from pane scrollback
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if the reviewer is wrong (with reasoning) — see `receiving-code-review`

## Example

```
[Just completed Task 2: Add verification function]

You: Delegating the review before proceeding.

BASE_SHA=a7981ec   # recorded before Task 2's implementer was delegated
HEAD_SHA=3df7661
[review-package a7981ec 3df7661 → /repo/.herdrpowers/pdd/review-a7981ec..3df7661.diff]
[Write the review contract to /repo/.herdrpowers/pdd/task-2-review-brief.md]
[composer-submit.sh w2:p19 "<one-line instruction>"; wait output REVIEW_OK_9C4A]

[Read /repo/.herdrpowers/pdd/task-2-review.md]:
  Strengths: Clean architecture, tests assert the requirement
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Delegate one fix with both findings]
[Continue to Task 3]
```

## Integration with Workflows

**Pane-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to the next task

**Executing Plans:**
- Review at natural checkpoints
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Send the review to the pane that wrote the code
- Submit the review prompt with `pane run`, or without a completion marker
- Accept "looks good" without a written report file
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If the reviewer is wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See the template at: [review-brief.md](review-brief.md)
