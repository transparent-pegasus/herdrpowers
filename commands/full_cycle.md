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

Read `orchestration`, its [profiles contract](../skills/orchestration/references/profiles.md), and `using-herdr-sibling-panes` before routing work. Resolve repo config over shipped roles, then only keys present in the selected profile. Freeze the active owner, targets, assignments, gates, scope, strategy, and lifecycle policy. Profile assignment overrides resolve before routing; a resolved disabled gate is skipped and named in the report.

Routing comes from `assignments:`, not from this file, and the resolved YAML is the source of truth for every default — read each task's `role` and `mode` there rather than recalling one. This workflow touches `plan-and-design`, `complex-coding` / `simple-coding`, `test-authoring`, `fix-round-test-authoring`, `review-fixes`, `chores`, `verification`, and every review gate from `plan-review` through `final-branch-review`. A review task whose effective role binds to a list runs once per entry.
- Separate delegated targets use reset-backed Herdr panes, even when a concrete target matches the owner's model. With a selected profile, self-target `delegate` requires a fresh in-process subagent for work and reviews, including empty reviewers; other owner-session modes permit inline work/self-review and optional subagents at the active owner's judgment. Report self-review honestly. Without a profile, keep legacy routing and fresh-subagent orchestrator-mode reviews. Workers never re-delegate.

Resolve `delegation:` in the same pass, before Step 2 — both keys change what this workflow does:
- **`delegation.pane_scope`** confines every delegation to eligible panes. Under its default, `tab`, a pane in another tab is not a candidate for any step of this workflow. An agent type with no in-scope pane is unavailable, and the workflow degrades around it rather than reaching across tabs.
- **`delegation.execution`** sets the implementation strategy in Step 5, and under its default, `parallel`, also shapes the plan written in Step 2 and the worktree created in Step 3. Read it before writing the plan, not when reaching Step 5.

**Every delegation** states the absolute worktree path (and requires the pane to confirm it is there first), the exact scope, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from the report file, not from pane scrollback, and re-run the decisive command rather than trusting a "verified" claim.

**Degrade honestly.** Without a profile, unavailable pane routing may fall back to `executing-plans`, naming lost delegation/independence. With a profile, preserve modes: a route resolving to the owner in `delegate` still requires a fresh subagent. If it cannot spawn, report inability, never inline substitution or a passed gate. Wait for busy matching agents; never interrupt them.

## Execution Steps

1. Brainstorming
Read the brainstorming SKILL.md and follow its context-first opening. Ask only what the existing project and supplied context leave open.
Invoking this workflow is the user choosing its ceremony: say the size the brainstorming skill picks, but do not downgrade the workflow — its remaining steps run even for a quick, clear task or a small change, and even when the user skips the questions. If what they want is a spike (a throwaway build to learn from, not code to keep), say so and confirm with the user before continuing. A project's full design gets the builder check through the `plan-review` gate; a small change's short design goes directly to the user without that check. For a project's check, the final report names whether it ran, degraded, or was disabled, separately from the plan's review in Step 2.
Engage in a design and requirement gathering discussion without writing implementation code.
Proceed to Step 2 after the user chooses an approach and approves the short or full design document. If they explicitly opt out of brainstorming, keep the remaining workflow steps.

2. Plan Creation and Review
Inform the user that you will create an implementation plan.
Read and use the writing-plans skill to break the design into small achievable tasks.
Under `delegation.execution: parallel`, the plan must carry writing-plans' `## Tracks` table and a track tag on every task — Step 5 executes that partition instead of deriving one. A plan whose work genuinely does not partition declares one `main` track and says why; that is a complete plan, not a missing table.
Save the plan to `<PLAN_PATH_PATTERN>`.
Gate: `assignments.plan-review`. When it is disabled, skip the review and say the plan is going to approval unreviewed.
Otherwise run the gate through its resolved effective role and mode, using the same self-contained request for each list entry. Separate delegated targets use reset-backed panes; selected-profile owner targets in `delegate` require fresh subagents, even with empty reviewers. Other owner-session modes permit reported self-review. Preserve legacy no-profile degradation; missing mandatory subagent capability is inability, never a passed review.
Resolve every finding, present the resolved plan with the findings and their resolutions, and ask the user to approve.
Proceed to Step 3 only after the user approves the resolved plan. Code is not touched before that.

3. Workspace Isolation
Inform the user that you will create an isolated workspace.
Read and use the using-git-worktrees skill to set up a new branch and worktree (e.g., feature/xxx) based on `<BASE_BRANCH>`.
Under `delegation.execution: parallel` this is the **coordination** branch and worktree: per-track worktrees are created in Step 5 once the track table is confirmed, all off `<BASE_BRANCH>`, and their work is integrated back onto this branch. Under `serial` it is the single worktree the whole plan runs in.
Record the worktree's absolute path — every delegation brief must carry it.

4. Documentation Impact Review
Gate: `assignments.documentation-impact-review`. When it is disabled, skip to Step 5 and name the skipped gate in the final report. Use the review route resolved above, including mandatory profile self-target subagents and the legacy no-profile fresh-subagent rule.
Inform the user that the sweep will identify every file that must be updated if the implementation changes behavior, contracts, prompts, schema, or workflow instructions.
List the expected non-code follow-up targets before implementation begins, including `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions.
Proceed to Step 5 only after the update target list is explicit.

5. Implementation and Testing
Inform the user that implementation and testing will begin, and state which execution strategy `delegation.execution` resolved to.

**`parallel` (the default): run the tracks concurrently.**
Take the plan's `## Tracks` table as the partition. Validate it against `/execute_parallel`'s Step 1 criteria — no overlapping write ownership, no ordering dependency inside the wave, no shared mutable artifact, integration deferrable — and revise it with the user if the plan's boundaries do not hold. Only derive a partition from scratch when the plan has no table (an older plan, or one written outside this workflow).
Present the resulting track table and require the user's confirmation before creating any per-track worktree.
Then follow `/execute_parallel`'s Steps 2 and 4: one worktree per track off `<BASE_BRANCH>`, one implementation writer per worktree, each brief carrying its own path and owned files, and every track integrated onto the Step 3 coordination branch in a controlled order once complete. Resolve conflicts before moving on.
Parallelism is bounded by the resolved writer routes and available capacity: count Herdr panes for separate targets and fresh-subagent capacity for profile self-target delegation. Wait for busy matching agents, never interrupt them, and never put two writers in one worktree. Report actual concurrency.
Fall back to `serial` when fewer than two independent tracks remain or the resolved routes cannot run concurrently. Serial execution retains every mode and mandatory delegation; it does not authorize inline substitution.

**`serial`: run the plan's tasks one at a time**, in plan order, in the single Step 3 worktree — even where tracks are independent.

Both paths share everything below.
Read and use the pane-driven-development skill for the per-task loop and its profile-aware task routes.
Rule requirement: route tests by `test-authoring`: `delegate` uses a fresh worker (reset-backed pane or required profile self-target subagent) that never sees implementation; `implementer` leaves RED-GREEN-REFACTOR with the implementing session. Give delegated test authors separate BASE worktrees and requirements-only briefs. Name the test writer and transport in the brief and report.
Rule requirement: `task-review` follows its effective target and mode, once per list entry. Separate delegated reviews use reset-backed panes; profile self-target `delegate` requires fresh subagents, while other owner-session modes allow reported self-review. Disabled gates stay off and are named in the report.
Never run two implementation panes against the same worktree.
On any test failure, unexpected behavior, or bug — in a pane or in the orchestrator — use the systematic-debugging skill before proposing or applying a fix. No speculative fixes. A test author's RED run is not a failure in this sense: a test that fails for its stated reason, in a worktree where the covered behavior is absent or the finding is unfixed, is the evidence the task asked for. Debug the failures that survive the merge, and any failure whose reason does not match what the test author predicted.
Ensure implementation tasks, their tests, and their task reviews are complete before proceeding.

6. Documentation Update
Inform the user that documentation and workflow updates are starting.
Update every target identified in Step 4 that is still affected by the implemented result, using the update-docs skill for files under `docs/`.
If implementation changed the expected update list, revise the list first and then finish the missing updates.
Proceed to Step 7 only after the repository instructions and relevant docs are aligned with the final code.

7. Repository Verification
Inform the user that repository verification is starting.
Verification commands run inside the task's worktree, not in the primary checkout — under `parallel`, that is the coordination worktree holding the fully integrated result, never a per-track one.
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
Read and use requesting-code-review to run the whole-branch gate over the entire changeset through its resolved target and mode.
Fix critical or important issues through `review-fixes`: one fix wave carrying the complete findings list, with profile self-targets retaining their mode.
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
- Never run two implementation panes against the same worktree, and never delegate to a pane outside `delegation.pane_scope`.
- Name in the final report every role that fell back to a substitute agent, every non-default assignment or mode and every disabled review from `.herdrpowers/config.yaml`, every non-default `delegation:` value, and every step that ran in the orchestrator pane instead of being delegated.
- Name in the final report which execution strategy ran, how many tracks were confirmed, and how many of them actually ran concurrently — a `parallel` run that degraded to one track at a time is reported as such, not as parallel.
- Include the canonical profiles contract's run record: selected profile or none, active owner/reception role, verified targets, task/review transports, self-review versus independence, unavailable routes, fallbacks/lost effort, lifecycle actions, and test writer.
- With `allow_agent_lifecycle: true`, start a resolved target that has no live in-scope match and, before the final report, end the idle agents this run started — both only through `agent-lifecycle.sh`. Name every agent started, ended, or left running. With `false`, start and end none.
- Read the specific `SKILL.md` file for a skill before invoking it.
