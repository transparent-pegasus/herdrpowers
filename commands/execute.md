---
description: Interactive workflow for workspace isolation, pane-delegated implementation, testing, review, and cleanup
---

# /execute Workflow

This command runs the post-plan execution stages of the development cycle. Follow these steps and require user consensus before advancing to the next phase, except between Step 1 and Step 2.

## Deliverable Saves

Whenever this workflow saves a deliverable, also save any corresponding design/plan files in the same change so the artifact and its rationale stay together.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file. For example, `update commands/plan.md ...` permits editing the workflow, while `commands/plan.md add a feature ... to the app` does not.

## Configuration

`<KEY>` placeholders in this workflow (for example `<PLAN_PATH_PATTERN>`) resolve from the `Herdrpowers Configuration` section of the repository's instruction files (`CLAUDE.md` / `AGENTS.md`). If that section is missing, run the pack's init workflow first: `/herdrpowers:init` on Claude Code plugin installs, or `commands/init.md` otherwise.

## Orchestration

Every dispatch in this workflow goes through the `orchestration` skill, with `using-herdr-sibling-panes` as the transport. Read both, plus `orchestration/roles.yaml`, before the first delegation.

- Implementation tasks, test authoring, and code review → **Coder** panes.
- Chores that come up while executing the plan (lookups, file moves, log gathering, mechanical edits, lint/format runs) → **Generalist** panes.
- Plan revisions and final synthesis stay with the orchestrator.
- In-process subagents are not used. Do not dispatch the Agent tool for workflow work.

**Every delegation** states the absolute worktree path (and requires the pane to confirm it is there first), the exact scope, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from the report file, not from pane scrollback, and re-run the decisive command rather than trusting a "verified" claim.

**Degrade, don't block.** If `HERDR_ENV` is unset or no idle sibling agent pane exists, run the work in the orchestrator pane with the `executing-plans` skill, and state in the final report which steps were not delegated and which independence was lost. Never interrupt a working pane to free one up.

## Execution Steps

1. Workspace Isolation
Inform the user that you will create an isolated workspace.
Read and use the using-git-worktrees skill to set up a new branch and worktree (e.g., feature/xxx) based on `<BASE_BRANCH>`.
Record the worktree's absolute path — every delegation brief must carry it.
Proceed directly to Step 2 after setup completes.

2. Documentation Impact Review
Inform the user that you will identify every file that must be updated if the implementation changes behavior, contracts, prompts, schema, or workflow instructions.
List the expected non-code follow-up targets before implementation begins, including `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions.
Proceed to Step 3 only after the update target list is explicit.

3. Implementation and Testing
Inform the user that implementation and testing will begin.
Read and use the pane-driven-development skill to execute the plan's tasks, delegating a fresh pane per task.
Rule requirement: the Coder pane that implements a task also writes its tests and owns RED-GREEN-REFACTOR per the test-driven-development skill. Say so in every implementation brief. There is no separate test-authoring agent.
Rule requirement: each task's review goes to a fresh pane — never the pane that implemented it, and preferably a different agent type.
Never run two implementation panes against the same worktree.
On any test failure, unexpected behavior, or bug — in a pane or in the orchestrator — use the systematic-debugging skill before proposing or applying a fix. No speculative fixes.
Ensure implementation tasks, their tests, and their task reviews are complete before proceeding.

4. Documentation Update
Inform the user that documentation and workflow updates are starting.
Update every target identified in Step 2 that is still affected by the implemented result, using the update-docs skill for files under `docs/`.
If implementation changed the expected update list, revise the list first and then finish the missing updates.
Proceed to Step 5 only after the repository instructions and relevant docs are aligned with the final code.

5. Repository Verification
Inform the user that repository verification is starting.
Verification commands run inside the task's worktree, not in the primary checkout.
If only documentation, workflow, or agent-instruction files changed, note that no repository-wide quality command is required and proceed.
If any non-documentation file changed, run repository verification:
- always run `<BASELINE_VERIFICATION_COMMAND>`
- also run `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` that apply to the touched surfaces, such as CLI smoke tests, integration checks, deploy checks, schema/code generation, or image builds
If `<BASELINE_VERIFICATION_COMMAND>` or `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` are not declared in the repository's `Herdrpowers Configuration` section, stop and run the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise) before proceeding.
A delegated verification run is a claim: read the quoted output in the report file, or re-run the decisive command yourself, before accepting it.
If a required verification command cannot run because Docker, gcloud, or another external dependency is unavailable, report the blocker explicitly and stop until the user decides whether to skip that check.
Proceed to Step 6 only when verification evidence is fresh and successful.

6. Final Code Review
Inform the user that the final review is starting.
Read and use the requesting-code-review skill to delegate a whole-branch review to a fresh pane over the entire changeset.
Fix any critical or important issues reported — one fix delegation carrying the complete findings list, not one pane per finding.
Proceed to Step 7 only when the review assesses it as Ready to merge.

7. Integration and Cleanup
Inform the user that the implementation is complete and ready for integration.
Stop and wait for the user's instruction. Additional implementation happens only on an explicit instruction.
When the user instructs cleanup, read and use the finishing-a-development-branch skill: present its options — merge locally into `<BASE_BRANCH>`, push and open a pull request, keep the branch as-is, or discard — and wait for the user to pick one.
Do not assume merge. Execute only the chosen option, and clean up the worktree and branch only as that option requires.

## Execution Requirements

- Do not begin until a plan already exists and has been approved.
- When the plan input is only a filename and the path is ambiguous, search `<PLAN_DIRECTORY>` first and use the matching file there before checking other locations.
- Block and require user confirmation at the end of every step except Step 1. Do not proceed autonomously through the whole cycle.
- Branch from `<BASE_BRANCH>`, never from a branch the deploy flow does not expect.
- If tests fail or errors occur, pause and use the systematic-debugging skill.
- Before claiming that verification passed or the task is complete, use `verification-before-completion`.
- Name in the final report every role that fell back to a substitute agent, and every step that ran in the orchestrator pane instead of being delegated.
- Read the specific `SKILL.md` file for a skill before invoking it.
