---
description: Interactive workflow to execute the entire development cycle from brainstorming to the integration decision
---

# /full_cycle Workflow

This command executes the full development cycle interactively: the pack's default procedure for a task that arrives directly from the user. Do not skip a step and do not collapse two steps into one.

## Deliverable Saves

Whenever this workflow saves a deliverable, also save any corresponding design/plan files in the same change so the artifact and its rationale stay together.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file. For example, `update commands/plan.md ...` permits editing the workflow, while `commands/plan.md add a feature ... to the app` does not.

## Configuration

`<KEY>` placeholders in this workflow (for example `<PLAN_PATH_PATTERN>`) resolve from the `Herdrpowers Configuration` section of the repository's instruction files (`CLAUDE.md` / `AGENTS.md`). If that section is missing, run the pack's init workflow first: `/herdrpowers:init` on Claude Code plugin installs, or `commands/init.md` otherwise.

## Orchestration

Every dispatch in this workflow goes through the `orchestration` skill, with `using-herdr-sibling-panes` as the transport. Read both before the first delegation, and resolve the repository's assignments and review gates as `orchestration` describes: `.herdrpowers/config.yaml` first, then `orchestration/roles.yaml` for anything it omits. Every gate this workflow would run is resolved up front; a gate set to `enabled: false` is skipped and named in the final report.

Routing comes from `assignments:`, not from this file, and the resolved YAML is the source of truth for every default — read each task's `role` and `mode` there rather than recalling one. This workflow touches `plan-and-design`, `complex-coding` / `simple-coding`, `test-authoring`, `fix-round-test-authoring`, `review-fixes`, `chores`, `verification`, and every review gate from `plan-double-review` through `final-branch-review`. A review task whose role binds to a list of agent types runs once per entry.
- In-process subagents are not used. Do not dispatch the Agent tool for workflow work.

**Every delegation** states the absolute worktree path (and requires the pane to confirm it is there first), the exact scope, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from the report file, not from pane scrollback, and re-run the decisive command rather than trusting a "verified" claim.

**Degrade, don't block.** If `HERDR_ENV` is unset or no idle sibling agent pane exists, run the work in the orchestrator pane with the `executing-plans` skill, and state in the final report which steps were not delegated and which independence was lost. Never interrupt a working pane to free one up.

## Execution Steps

1. Brainstorming
Ask the user what they want to build.
Read the brainstorming SKILL.md.
Engage in a design and requirement gathering discussion without writing implementation code.
Proceed to Step 2 as soon as the last clarifying question has been answered and there are no unresolved design concerns.

2. Plan Creation and Double Review
Inform the user that you will create an implementation plan.
Read and use the writing-plans skill to break the design into small achievable tasks.
Save the plan to `<PLAN_PATH_PATTERN>`.
Gate: `assignments.plan-double-review`. When it is disabled, skip the review and say the plan is going to approval unreviewed.
Otherwise the plan is not complete when it is written. Delegate the same self-contained review request to one idle pane of each Reviewer agent type in the merged configuration, independently and in separate panes (reset-backed; the drafting pane is fine after a reset). Degrade to one review, or to a critical self-review, when Reviewer agents are unavailable — and say which happened.
Resolve every finding, present the resolved plan with the findings and their resolutions, and ask the user to approve.
Proceed to Step 3 only after the user approves the resolved plan. Code is not touched before that.

3. Workspace Isolation
Inform the user that you will create an isolated workspace.
Read and use the using-git-worktrees skill to set up a new branch and worktree (e.g., feature/xxx) based on `<BASE_BRANCH>`.
Record the worktree's absolute path — every delegation brief must carry it.

4. Documentation Impact Review
Gate: `assignments.documentation-impact-review`. When it is disabled, skip to Step 5 and name the skipped gate in the final report. Route it by its resolved role and mode: `delegate` runs the sweep in a fresh pane that reports back, `orchestrator` runs it in this pane.
Inform the user that the sweep will identify every file that must be updated if the implementation changes behavior, contracts, prompts, schema, or workflow instructions.
List the expected non-code follow-up targets before implementation begins, including `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions.
Proceed to Step 5 only after the update target list is explicit.

5. Implementation and Testing
Inform the user that implementation and testing will begin.
Read and use the pane-driven-development skill to execute the plan's tasks, delegating a fresh pane per task.
Rule requirement: route each task's tests by the resolved `test-authoring` assignment — `mode: delegate` to a pane that never sees the implementation, `mode: implementer` to the implementing pane under RED-GREEN-REFACTOR per the test-driven-development skill. Say which in every implementation brief, and name in the report which pane wrote the tests.
Rule requirement: the `task-review` assignment resolves to any idle pane of its role's agent type(s) via a reset-backed submit — including the pane that implemented; when its role binds to a list of agent types, it runs once per entry. When that gate is disabled, say so in the report.
Never run two implementation panes against the same worktree.
When the plan has tasks that are genuinely independent — no ordering dependency, no overlapping write ownership — switch to `/execute_parallel`'s track extraction rather than serializing them here.
On any test failure, unexpected behavior, or bug — in a pane or in the orchestrator — use the systematic-debugging skill before proposing or applying a fix. No speculative fixes. A test author's RED run is not a failure in this sense: a test that fails for its stated reason, in a worktree where the covered behavior is absent or the finding is unfixed, is the evidence the task asked for. Debug the failures that survive the merge, and any failure whose reason does not match what the test author predicted.
Ensure implementation tasks, their tests, and their task reviews are complete before proceeding.

6. Documentation Update
Inform the user that documentation and workflow updates are starting.
Update every target identified in Step 4 that is still affected by the implemented result, using the update-docs skill for files under `docs/`.
If implementation changed the expected update list, revise the list first and then finish the missing updates.
Proceed to Step 7 only after the repository instructions and relevant docs are aligned with the final code.

7. Repository Verification
Inform the user that repository verification is starting.
Verification commands run inside the task's worktree, not in the primary checkout.
If only documentation, workflow, or agent-instruction files changed, note that no repository-wide quality command is required and proceed.
If any non-documentation file changed, run repository verification:
- always run `<BASELINE_VERIFICATION_COMMAND>`
- also run `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` that apply to the touched surfaces, such as CLI smoke tests, integration checks, deploy checks, schema/code generation, or image builds
If `<BASELINE_VERIFICATION_COMMAND>` or `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` are not declared in the repository's `Herdrpowers Configuration` section, stop and run the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise) before proceeding.
A delegated verification run is a claim: read the quoted output in the report file, or re-run the decisive command yourself, before accepting it.
If a required verification command cannot run because Docker, gcloud, or another external dependency is unavailable, report the blocker explicitly and stop until the user decides whether to skip that check.
Proceed to Step 8 only when verification evidence is fresh and successful.

8. Final Code Review
Gate: `assignments.final-branch-review`. When it is disabled, skip to Step 9 and tell the user the branch is reaching the integration decision unreviewed.
Inform the user that the final review is starting.
Read and use the requesting-code-review skill to delegate a whole-branch review via a reset-backed submit over the entire changeset.
Fix any critical or important issues reported — one fix delegation carrying the complete findings list, not one pane per finding.
Proceed to Step 9 only when the review assesses it as Ready to merge.

9. Integration and Cleanup
Inform the user that the implementation is complete and ready for integration.
Stop and wait for the user's instruction. Additional implementation happens only on an explicit instruction.
When the user instructs cleanup, read and use the finishing-a-development-branch skill: present its options — merge locally into `<BASE_BRANCH>`, push and open a pull request, push only, or keep the branch as-is — and wait for the user to pick one. Discarding the work is not on the menu; it happens only if the user explicitly asks for it.
Do not assume merge. Execute only the chosen option, and delete the worktree only as that option requires.

## Execution Requirements

- Block and require user confirmation at the end of every step. Do not proceed autonomously through the whole cycle.
- Branch from `<BASE_BRANCH>`, never from a branch the deploy flow does not expect.
- If tests fail or errors occur, pause and use the systematic-debugging skill.
- Before claiming that verification passed or the task is complete, use `verification-before-completion`.
- Name in the final report every role that fell back to a substitute agent, every non-default assignment or mode and every disabled review from `.herdrpowers/config.yaml`, and every step that ran in the orchestrator pane instead of being delegated.
- Read the specific `SKILL.md` file for a skill before invoking it.
