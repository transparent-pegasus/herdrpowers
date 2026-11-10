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

Read `orchestration`, its [profiles contract](../skills/orchestration/references/profiles.md), and `using-herdr-sibling-panes` before routing work. Resolve repo config over shipped roles, then only keys present in the selected profile. Freeze the active owner, targets, assignments, gates, scope, strategy, and lifecycle policy. Profile assignment overrides resolve before routing; a resolved disabled gate is skipped and named in the report.

Routing comes from `assignments:`, not from this file, and the resolved YAML is the source of truth for every default — read each task's `role` and `mode` there rather than recalling one. This workflow touches `complex-coding` / `simple-coding`, `test-authoring`, `fix-round-test-authoring`, `review-fixes`, `chores`, `verification`, `documentation-impact-review`, `task-review`, `fix-round-re-review`, and `final-branch-review`. A review task whose effective role binds to a list runs once per entry.
- Plan revisions follow `plan-and-design`; final synthesis stays with the active owner.
- Separate delegated targets use reset-backed Herdr panes, even when a concrete target matches the owner's model. With a selected profile, self-target `delegate` requires a fresh in-process subagent for work and reviews, including empty reviewers; other owner-session modes permit inline work/self-review and optional subagents at the active owner's judgment. Report self-review honestly. Without a profile, keep legacy routing and fresh-subagent orchestrator-mode reviews. Workers never re-delegate.

**Every delegation** states the absolute worktree path (and requires the pane to confirm it is there first), the exact scope, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from the report file, not from pane scrollback, and re-run the decisive command rather than trusting a "verified" claim.

**Degrade honestly.** Without a profile, unavailable pane routing may fall back to `executing-plans`, naming lost delegation/independence. With a profile, preserve modes: a route resolving to the owner in `delegate` still requires a fresh subagent. If it cannot spawn, report inability, never inline substitution or a passed gate. Wait for busy matching agents; never interrupt them.

## Execution Steps

1. Workspace Isolation
Inform the user that you will create an isolated workspace.
Read and use the using-git-worktrees skill to set up a new branch and worktree (e.g., feature/xxx) based on `<BASE_BRANCH>`.
Record the worktree's absolute path — every delegation brief must carry it.
Proceed directly to Step 2 after setup completes.

2. Documentation Impact Review
Gate: `assignments.documentation-impact-review`. When it is disabled, skip this step and name the skipped gate in the final report. Use the review route resolved above, including mandatory profile self-target subagents and the legacy no-profile fresh-subagent rule.
Inform the user that the sweep will identify every file that must be updated if the implementation changes behavior, contracts, prompts, schema, or workflow instructions.
List the expected non-code follow-up targets before implementation begins, including `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions.
Proceed to Step 3 only after the update target list is explicit.

3. Implementation and Testing
Inform the user that implementation and testing will begin.
Read and use the pane-driven-development skill to execute tasks through their resolved targets and modes.
Rule requirement: route tests by `test-authoring`: `delegate` uses a fresh worker (reset-backed pane or required profile self-target subagent) that never sees implementation; `implementer` leaves RED-GREEN-REFACTOR with the implementing session. Give delegated test authors separate BASE worktrees and requirements-only briefs. Name the test writer and transport in the brief and report.
Rule requirement: `task-review` follows its effective target and mode, once per list entry. Separate delegated reviews use reset-backed panes; profile self-target `delegate` requires fresh subagents, while other owner-session modes allow reported self-review. Disabled gates stay off and are named in the report.
Never run two implementation panes against the same worktree.
On any test failure, unexpected behavior, or bug — in a pane or in the orchestrator — use the systematic-debugging skill before proposing or applying a fix. No speculative fixes. A test author's RED run is not a failure in this sense: a test that fails for its stated reason, in a worktree where the covered behavior is absent or the finding is unfixed, is the evidence the task asked for. Debug the failures that survive the merge, and any failure whose reason does not match what the test author predicted.
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
Gate: `assignments.final-branch-review`. When it is disabled, skip this step and tell the user the branch is reaching the integration decision unreviewed.
Inform the user that the final review is starting.
Read and use requesting-code-review to run the whole-branch gate over the entire changeset through its resolved target and mode.
Fix critical or important issues through `review-fixes`: one fix wave carrying the complete findings list, with profile self-targets retaining their mode.
Proceed to Step 7 only when the review assesses it as Ready to merge.

7. Integration and Cleanup
Inform the user that the implementation is complete and ready for integration.
Stop and wait for the user's instruction. Additional implementation happens only on an explicit instruction.
When the user instructs cleanup, read and use the finishing-a-development-branch skill: present its options — merge locally into `<BASE_BRANCH>`, push and open a pull request, push only, or keep the branch as-is — and wait for the user to pick one. Discarding the work is not on the menu; it happens only if the user explicitly asks for it.
Do not assume merge. Execute only the chosen option, and clean up the worktree and branch only as that option requires.

## Execution Requirements

- Do not begin until a plan already exists and has been approved.
- When the plan input is only a filename and the path is ambiguous, search `<PLAN_DIRECTORY>` first and use the matching file there before checking other locations.
- Block and require user confirmation at the end of every step except Step 1. Do not proceed autonomously through the whole cycle.
- Branch from `<BASE_BRANCH>`, never from a branch the deploy flow does not expect.
- If tests fail or errors occur, pause and use the systematic-debugging skill.
- Before claiming that verification passed or the task is complete, use `verification-before-completion`.
- Name in the final report every role that fell back to a substitute agent, every non-default assignment or mode and every disabled review from `.herdrpowers/config.yaml`, and every step that ran in the orchestrator pane instead of being delegated.
- Include the canonical profiles contract's run record: selected profile or none, active owner/reception role, verified targets, task/review transports, self-review versus independence, unavailable routes, fallbacks/lost effort, lifecycle actions, and test writer.
- With `allow_agent_lifecycle: true`, start a resolved target that has no live in-scope match and, before the final report, end the idle agents this run started — both only through `agent-lifecycle.sh`. Name every agent started, ended, or left running. With `false`, start and end none.
- Read the specific `SKILL.md` file for a skill before invoking it.
