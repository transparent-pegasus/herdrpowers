# Code Review Brief Template

The review runs in a **sibling pane via a reset-backed submit** — any idle pane of the resolved role's agent type(s), including the pane that wrote the code. Submit a one-line instruction that points at this contract written to a file; the contract itself never goes through the composer.

**Purpose:** Review completed work against requirements and code quality standards before it cascades into more work.

## 1. The submitted instruction (one line)

```bash
INSTRUCTION="Work in /abs/path/to/worktree — confirm you are there before anything else. Review-only task: make no edits and do not mutate the working tree, index, HEAD, or branch state. Read /abs/path/to/review-brief.md for your review contract and the diff package path. Write your review to /abs/path/to/review.md and reply with the verdict and that path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with REVIEW_OK immediately followed by _<4-hex>."
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
rtk herdr wait output "$PANE" --match "REVIEW_OK_<4-hex>" --timeout 900000
```

## 2. The review contract (write to the brief file)

```markdown
    You are a Senior Code Reviewer with expertise in software architecture,
    design patterns, and best practices. Your job is to review completed work
    against its plan or requirements and identify issues before they cascade.

    ## What Was Implemented

    [DESCRIPTION]

    ## Requirements / Plan

    [PLAN_OR_REQUIREMENTS]

    ## Git Range to Review

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff package:** [DIFF_FILE]

    Read the diff package once — it holds the commit list, the stat summary,
    and the full diff with context. Only if it is missing, derive the diff
    yourself:

    ```bash
    git diff --stat [BASE_SHA]..[HEAD_SHA]
    git diff [BASE_SHA]..[HEAD_SHA]
    ```

    ## Read-Only Review

    Your review is read-only on this checkout. Do not mutate the working tree,
    the index, HEAD, or branch state in any way. Use tools like `git show`,
    `git diff`, and `git log` to inspect history. If you need a working copy
    of a different revision, check it out into a separate temporary directory
    (e.g. `git worktree add /tmp/review-[SHA] [SHA]`) — never move HEAD on
    this checkout. Cleaning the tree counts as mutating it: never execute
    `git checkout`, `git restore`, `git stash`, `git clean`, or `git reset`
    here. Other panes may have edits in flight, and a dirty tree is a
    finding to report, not a problem to fix.

    ## Scope Discovery

    Before reviewing, do not limit yourself to changed files. If a codegraph
    plugin/tool is available, use codegraph search plus callers/callees/impact
    to identify related files, symbols, and downstream surfaces touched by the
    diff. If unavailable, use `rg`, file reads, and manual dependency tracing.
    Review only evidence you actually inspect.

    ## Do Not Trust the Description

    The description and requirements above summarize what the implementer
    believes was built. Treat them as unverified claims: verify each one
    against the diff and repository state, and report gaps between claim and
    code as findings. Never mark a requirement satisfied on the
    description's word.

    ## What to Check

    **Plan alignment:**
    - Does the implementation match the plan / requirements?
    - Are deviations justified improvements, or problematic departures?
    - Is all planned functionality present?

    **Code quality:**
    - Clean separation of concerns?
    - Proper error handling?
    - Type safety where applicable?
    - DRY without premature abstraction?
    - Edge cases handled?

    **Architecture:**
    - Sound design decisions?
    - Reasonable scalability and performance?
    - Security concerns?
    - Integrates cleanly with surrounding code?

    **Tests (the implementing pane wrote its own tests — you are the only
    independent check on them):**
    - Does each test assert the requirement, or only what the implementation
      happens to do? A test written to match the code catches nothing.
    - Would the test fail if the behavior regressed? Tautologies, over-mocked
      paths that never reach the code under test, and assertions on call
      counts instead of outcomes are findings.
    - Do the reports show RED before GREEN, failing for the right reason, when
      TDD was required? Missing or reconstructed RED evidence is a finding.
    - Exact commands and their output present, and pristine (failures,
      warnings, or noise in reported output are findings)?
    - Every acceptance criterion traceable to a named test?

    **Production readiness:**
    - Migration strategy if schema changed?
    - Backward compatibility considered?
    - Documentation complete?
    - No obvious bugs?

    ## Calibration

    Categorize issues by actual severity. Not everything is Critical.
    Acknowledge what was done well before listing issues — accurate praise
    helps the implementer trust the rest of the feedback.

    If you find significant deviations from the plan, flag them specifically
    so the implementer can confirm whether the deviation was intentional.
    If you find issues with the plan itself rather than the implementation,
    say so.

    ## Output Format

    ### Strengths
    [What's well done? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    [Bugs, security issues, data loss risks, broken functionality]

    #### Important (Should Fix)
    [Architecture problems, missing features, poor error handling, test gaps]

    #### Minor (Nice to Have)
    [Code style, optimization opportunities, documentation polish]

    For each issue:
    - File:line reference
    - What's wrong
    - Why it matters
    - How to fix (if not obvious)

    ### Recommendations
    [Improvements for code quality, architecture, or process]

    ### Assessment

    **Ready to merge?** [Yes | No | With fixes]

    **Reasoning:** [1-2 sentence technical assessment]

    ## Critical Rules

    **DO:**
    - Categorize by actual severity
    - Be specific (file:line, not vague)
    - Explain WHY each issue matters
    - Acknowledge strengths
    - Give a clear verdict

    **DON'T:**
    - Say "looks good" without checking
    - Mark nitpicks as Critical
    - Give feedback on code you didn't actually read
    - Be vague ("improve error handling")
    - Avoid giving a clear verdict
```

**Placeholders:**
- **worktree path** — REQUIRED, absolute; the pane does not inherit the orchestrator's cwd
- `[DESCRIPTION]` — brief summary of what was built
- `[PLAN_OR_REQUIREMENTS]` — what it should do (plan file path, task text, or requirements)
- `[BASE_SHA]` — starting commit
- `[HEAD_SHA]` — ending commit
- `[DIFF_FILE]` — the path printed by `pane-driven-development/scripts/review-package PLAN_FILE BASE HEAD` (`-` for PLAN_FILE in plan-less flows)
- **review output file + completion marker** — REQUIRED

**Reviewer returns:** Strengths, Issues (Critical / Important / Minor), Recommendations, Assessment

## Example Output

```
### Strengths
- Clean database schema with proper migrations (db.ts:15-42)
- Comprehensive test coverage (18 tests, all edge cases)
- Good error handling with fallbacks (summarizer.ts:85-92)

### Issues

#### Important
1. **Missing help text in CLI wrapper**
   - File: index-conversations:1-31
   - Issue: No --help flag, users won't discover --concurrency
   - Fix: Add --help case with usage examples

2. **Date validation missing**
   - File: search.ts:25-27
   - Issue: Invalid dates silently return no results
   - Fix: Validate ISO format, throw error with example

#### Minor
1. **Progress indicators**
   - File: indexer.ts:130
   - Issue: No "X of Y" counter for long operations
   - Impact: Users don't know how long to wait

### Recommendations
- Add progress reporting for user experience
- Consider config file for excluded projects (portability)

### Assessment

**Ready to merge: With fixes**

**Reasoning:** Core implementation is solid with good architecture and tests. Important issues (help text, date validation) are easily fixed and don't affect core functionality.
```
