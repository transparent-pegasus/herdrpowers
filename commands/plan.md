---
description: Interactive workflow for brainstorming, plan creation, and independent double review
---

# /plan Workflow

This command runs only the discovery and planning stages of the development cycle. The plan is **not** complete when it is written — it is complete after independent double review, resolution of the findings, and the user's approval.

## Deliverable Saves

Whenever this workflow saves a deliverable, also save any corresponding design/plan files in the same change so the artifact and its rationale stay together.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file. For example, `update commands/plan.md ...` permits editing the workflow, while `commands/plan.md add a feature ... to the app` does not.

## Configuration

`<KEY>` placeholders in this workflow (for example `<PLAN_PATH_PATTERN>`) resolve from the `Herdrpowers Configuration` section of the repository's instruction files (`CLAUDE.md` / `AGENTS.md`). If that section is missing, run the pack's init workflow first: `/herdrpowers:init` on Claude Code plugin installs, or `commands/init.md` otherwise.

## Orchestration

Planning and design stay with the orchestrator — the pane the user typed the request into. Only the reviews are delegated, through the `orchestration` skill with `using-herdr-sibling-panes` as the transport. Read both, plus `orchestration/roles.yaml`, before the first delegation. In-process subagents are not used.

## Execution Steps

1. Brainstorming
Ask the user what they want to build.
Read the brainstorming SKILL.md.
Engage in a design and requirement gathering discussion without writing implementation code.
Proceed to Step 2 as soon as the last clarifying question has been answered and there are no unresolved design concerns.

2. Plan Creation
Inform the user that you will create an implementation plan.
Read and use the writing-plans skill to break the design into small achievable tasks.
Save the plan to `<PLAN_PATH_PATTERN>`.
Proceed directly to Step 3 — do not ask for approval yet.

3. Independent Double Review
Inform the user that the plan goes to independent review before approval.
Resolve the Reviewer role from `orchestration/roles.yaml` and delegate the **same self-contained review request** to one idle pane of each Reviewer agent type, in separate panes, with no shared draft opinion between them.
Each review request states: the plan file path, the design doc path, the absolute repository path, that the review is read-only, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and that the recipient must execute the review itself and must not re-delegate.
Wait for both to finish, read both report files, and compare the findings.
Never delegate a review of the plan to the pane that drafted it.
Degrade instead of blocking: with only one Reviewer agent type available, run a single review and say so; with none available, critically review the plan yourself and state that no independent review happened.

4. Resolution and Approval
Resolve every finding: fix the plan, or record why the finding does not apply. Where the two reviews disagree, decide and state the reasoning — reviewers advise, the orchestrator judges.
Present the resolved plan, the findings, and their resolutions to the user, and ask for approval.

## Execution Requirements

- Stop after the plan is approved. Do not enter implementation, testing, review, or merge steps.
- Code is not touched until the resolved plan is approved.
- The remaining development-cycle responsibilities live in `/execute`, `/execute_parallel`, and `/full_cycle`, not in `<REPO_INSTRUCTION_FILES>`.
- If the design discussion changes scope materially, revisit Brainstorming before writing the plan.
- Name in the final report which reviews ran, which were skipped, and any role that fell back to a substitute agent.
- Read the specific `SKILL.md` file for a skill before invoking it.
