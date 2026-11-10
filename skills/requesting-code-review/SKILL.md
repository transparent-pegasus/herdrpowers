---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<BASE_BRANCH>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise).

Read `orchestration` and its [profiles contract](../orchestration/references/profiles.md) before selecting the reviewer or transport. Separate delegated targets use reset-backed Herdr panes; the same physical pane may review after reset. With a selected profile, `delegate` to the active owner requires a fresh in-process subagent, including empty profile reviewers. Other owner-session modes permit self-review and an optional fresh subagent at the owner's judgment. Without a profile, keep legacy independence, including fresh-subagent orchestrator-mode reviews.

**Core principle:** Review early, through the resolved route. Report same-session self-review honestly; it is not independent review. Missing mandatory subagent capability is a reported inability, never inline substitution or a passed gate.

**Gate:** whole-branch review uses `assignments.final-branch-review`; per-task review uses `assignments.task-review`. Resolve repo config over shipped roles, then the selected profile's present composition keys. Keep assignment modes and gate enablement. List roles run once per effective entry; merge their findings. A disabled gate does not run and is named in the report. Empty profile reviewers instead select the active owner and leave the gate enabled.

## When to Request Review

**When the relevant gate is enabled:**
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
bash ../pane-driven-development/scripts/review-package "$PLAN_FILE" "$BASE_SHA" "$HEAD_SHA"   # prints the path
```
`PLAN_FILE` scopes the package to that plan's workspace. In plan-less flows (`/quick`, ad-hoc reviews) pass `-`.
For delegated review, pass the package path to the reviewer without loading its
diff into the coordinating session. For permitted owner-session self-review,
read the same package yourself and produce the required written verdict.

**2. Resolve the reviewer and mode:**
For separate delegated targets, pick matching in-scope idle panes with verified model/effort; a concrete target remains separate even if it matches the owner. Wait for busy matching agents, never interrupt. Apply `orchestration` fallbacks and lifecycle policy if unavailable. For owner targets, use the profile/mode rules above; do not treat an empty reviewer composition as a disabled gate.

**3. Run the review:**
Write the contract from [review-brief.md](review-brief.md) to a file. Separate targets use `using-herdr-sibling-panes` (`composer-submit.sh`) and its completion marker. Fresh subagents receive the same self-contained contract and no-re-delegation instruction. Permitted owner-session self-review uses the same scope and written verdict. Never submit an agent-pane prompt with `pane run`.

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
- Rule on every line of the reviewer's "Declined to judge" list: each set-aside behavior either stands, with your reason, or becomes a finding. None is dropped silently
- Push back if the reviewer is wrong (with reasoning) — see `receiving-code-review`

## Example: separate delegated targets

```
[Just completed Task 2: Add verification function]

You: Delegating the review before proceeding.

BASE_SHA=a7981ec   # recorded before Task 2's implementer was delegated
HEAD_SHA=3df7661
[review-package docs/plans/feature.md a7981ec 3df7661 → /repo/.herdrpowers/pdd/feature/review-a7981ec..3df7661.diff]
[Write the review contract to /repo/.herdrpowers/pdd/feature/task-2-review-brief.md]
[composer-submit.sh w2:p19 "<one-line instruction>"; pane wait-output REVIEW_OK_9C4A]

[Read /repo/.herdrpowers/pdd/feature/task-2-review.md]:
  Strengths: Clean architecture, tests assert the requirement
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Delegate one fix with both findings]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just review the diff myself instead of delegating" | Follow the mode. Profile owner-session modes permit reported self-review; `delegate` to the owner requires a fresh subagent. Separate delegated reviews require reset. |
| "The reviewing pane needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the review on the work product, not your thought process. |
| "The only idle pane is the one that wrote the code" | Reuse it after a reset-backed submit. Independence is the fresh session, not a different pane ID. |

## Red Flags

**Never:**
- Skip review because "it's simple"
- Claim independent review for owner-session self-review, or replace required delegation with it
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
