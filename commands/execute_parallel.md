---
description: Interactive workflow for isolated parallel execution across herdr panes, testing, review, and cleanup
---

# /execute_parallel Workflow

This command runs the post-plan execution stages of the development cycle when the approved plan contains tasks that can be implemented safely in parallel. Follow these steps and require user consensus before advancing to the next phase, except between Step 2 and Step 3.

## Deliverable Saves

Whenever this workflow saves a deliverable, also save any corresponding design/plan files in the same change so the artifact and its rationale stay together.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file. For example, `update commands/plan.md ...` permits editing the workflow, while `commands/plan.md add a feature ... to the app` does not.

## Configuration

`<KEY>` placeholders in this workflow (for example `<PLAN_PATH_PATTERN>`) resolve from the `Herdrpowers Configuration` section of the repository's instruction files (`CLAUDE.md` / `AGENTS.md`). If that section is missing, run the pack's init workflow first: `/herdrpowers:init` on Claude Code plugin installs, or `commands/init.md` otherwise.

## Orchestration

Read `orchestration`, its [profiles contract](../skills/orchestration/references/profiles.md), and `using-herdr-sibling-panes` before routing work. Resolve repo config over shipped roles, then only composition keys present in the selected profile. Freeze the active owner, targets, assignments, gates, scope, strategy, and lifecycle policy. A profile never rewrites modes or gate enablement; a disabled gate is skipped and named in the report.

Routing comes from `assignments:`, not from this file, and the resolved YAML is the source of truth for every default — read each task's `role` and `mode` there rather than recalling one. This workflow touches implementation tracks (`complex-coding` / `simple-coding`), `test-authoring`, `fix-round-test-authoring`, `review-fixes`, `chores`, `verification`, `documentation-impact-review`, `task-review`, `fix-round-re-review`, and `final-branch-review`. A review task whose effective role binds to a list runs once per entry.
- Track extraction, integration, and final synthesis stay with the orchestrator.
- Separate delegated targets use reset-backed Herdr panes, even when a concrete target matches the owner's model. With a selected profile, self-target `delegate` requires a fresh in-process subagent for work and reviews, including empty reviewers; other owner-session modes permit inline work/self-review and optional subagents at the active owner's judgment. Report self-review honestly. Without a profile, keep legacy routing and fresh-subagent orchestrator-mode reviews. Workers never re-delegate.

**Parallelism is bounded by resolved routes and worktrees.** One implementation writer per worktree, one worktree per track. Count the whole writer set: delegated implementation and test authoring each need a fresh worker and separate worktree. Separate targets need matching Herdr panes; selected-profile self-target `delegate` needs fresh-subagent capacity. Enabled reviews use their own resolved transport, including permitted owner-session self-review. Serializing tracks never changes these routes.

Only panes within `delegation.pane_scope` count toward that arithmetic — under its default, `tab`, idle panes in another tab are not available to this workflow at any point.

Do not compute a wave plan from those numbers. Take what is idle, start those tracks, and **wait** for the rest: when no in-scope pane of the needed type is idle, wait for one to free — never interrupt a working pane, never reach into another tab, and never collapse two writers into one worktree to save a pane. If panes free up one at a time, the tracks land one at a time; a run that degrades all the way to serial execution is a slow correct run, not a failure, and the final report says how much parallelism was actually achieved.

**Every delegation** states its own track's absolute worktree path (and requires the pane to confirm it is there first), the owned files, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from report files, not from pane scrollback.

**Degrade honestly.** If the resolved routes cannot run concurrently, continue with `/execute`, stating why and preserving all modes. Missing mandatory subagent capability is a reported inability, never inline delegation. No-profile unavailable Herdr transport retains its legacy inline fallback.

## Execution Steps

1. Implementation Track Extraction
Inform the user that you will extract confirmed implementation tracks before creating any worktree.
Partition the approved plan into independent implementation tracks yourself, in the orchestrator pane, before creating any worktree or delegating any implementer.
If the plan already carries a `## Tracks` table (written by the writing-plans skill), that is the partition: validate it against the criteria below and revise it with the user where it does not hold, rather than deriving a second one that contradicts the tags on its tasks.
When extracting tracks:
- include only implementation work that can be owned and verified independently
- exclude documentation updates, repository-wide verification, final review, integration, cleanup, and other coordination tasks from parallel tracks
- split any mixed-scope item such as `implementation + docs update` into one implementation track plus a post-integration follow-up task
- require each track to define a goal, owned files, dependencies, expected verification, and documentation impact
- name tracks by module or behavior, not by generic phase labels such as `implementation` or `documentation update`

Parallelize only tracks that satisfy all of the following:
- no ordering dependency between tasks
- no overlapping write ownership
- no shared mutable artifact that would require same-session coordination
- integration can be deferred until after all parallel tracks complete

If fewer than two confirmed implementation tracks remain after this extraction, stop parallel execution and continue with `/execute` instead.
Require user confirmation of the extracted track table before moving to Step 2.

2. Workspace Isolation
Inform the user that you will create isolated workspaces for the confirmed implementation tracks.
Read and use the using-git-worktrees skill to create one coordination branch/worktree plus one per-track worktree, all based on `<BASE_BRANCH>`.
Ensure every parallel track starts from the same approved base and has a clearly assigned ownership boundary.
Record each track's absolute worktree path — the track's delegation brief must carry its own path and no other.
Proceed directly to Step 3 after setup completes.

3. Documentation Impact Review
Gate: `assignments.documentation-impact-review`. When it is disabled, skip this step and name the skipped gate in the final report — the tracks then run with no update list, and Step 5 has nothing to apply. Use the review route resolved above, including mandatory profile self-target subagents and the legacy no-profile fresh-subagent rule.
Inform the user that the sweep will identify every file that must be updated if the implementation changes behavior, contracts, prompts, schema, or workflow instructions.
Produce one explicit post-integration update list covering `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions. The list is post-integration by construction: documentation is never a parallel track, so nothing here is owned by one.
Proceed to Step 4 only after the update target list is explicit.

4. Parallel Implementation and Testing
Inform the user that parallel implementation and testing will begin.
Read and use the pane-driven-development skill for the per-track task loop.
For each confirmed implementation track:
- assign the track its resolved writer set and worktrees, including a separate BASE worktree for delegated test authors; wait rather than start without the required writer capacity
- provide the exact task text (as a brief file), owned files, constraints, and expected verification
- require the implementer to stop and escalate if the task expands beyond its assigned ownership
- route the track's tests by the resolved `test-authoring` assignment and say which in the brief; a delegated test author gets its own worktree off the track's base, never the track's worktree
- run track-local verification inside that track's worktree before considering the track complete
- run each enabled task review through its effective target and mode, once per list entry; profile self-target `delegate` requires fresh subagents, other owner-session modes permit reported self-review, and separate delegated targets use reset-backed panes

On any test failure, unexpected behavior, or bug — in a pane or in the orchestrator — use the systematic-debugging skill before proposing or applying a fix. A test author's RED run is not a failure in this sense: a test that fails for its stated reason, in a worktree where the covered behavior is absent or the finding is unfixed, is the evidence the task asked for. Debug the failures that survive the merge, and any failure whose reason does not match what the test author predicted.

After all parallel tracks complete:
- integrate changes onto the coordination branch in a controlled order
- resolve conflicts before proceeding
- stop if integration reveals that the original post-integration update list is incomplete, then revise the list before moving on

5. Documentation Update
Inform the user that post-integration documentation and workflow updates are starting.
Apply every deferred update identified in Step 3 that still matters after integration, using the update-docs skill for files under `docs/`.
Proceed to Step 6 only after the repository instructions and relevant docs are aligned with the integrated result.

6. Repository Verification
Inform the user that repository verification is starting on the integrated result.
Verification runs inside the coordination worktree, not in the primary checkout.
If only documentation, workflow, or agent-instruction files changed, note that no repository-wide quality command is required and proceed.
If any non-documentation file changed, run repository verification:
- always run `<BASELINE_VERIFICATION_COMMAND>`
- also run `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` that apply to the touched surfaces, such as CLI smoke tests, integration checks, deploy checks, schema/code generation, or image builds
If `<BASELINE_VERIFICATION_COMMAND>` or `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` are not declared in the repository's `Herdrpowers Configuration` section, stop and run the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise) before proceeding.
A delegated verification run is a claim: read the quoted output in the report file, or re-run the decisive command yourself, before accepting it.
If a required verification command cannot run because Docker, gcloud, or another external dependency is unavailable, report the blocker explicitly and stop until the user decides whether to skip that check.
Proceed to Step 7 only when verification evidence is fresh and successful.

If any task is discovered to be coupled, conflicting, or blocked on another track, stop parallel execution for that task and continue it sequentially.

7. Final Code Review
Gate: `assignments.final-branch-review`. When it is disabled, skip to Step 8 and tell the user the branch is reaching the integration decision unreviewed.
Inform the user that the final review is starting.
Read and use requesting-code-review to run the whole-branch gate over the fully integrated coordination branch through its resolved target and mode.
Fix critical or important issues through `review-fixes`: one fix wave carrying the complete findings list, with profile self-targets retaining their mode.
Proceed to Step 8 only when the review assesses it as Ready to merge.

8. Integration and Cleanup
Inform the user that the implementation is complete and ready for integration.
Stop and wait for the user's instruction. Additional implementation happens only on an explicit instruction.
When the user instructs cleanup, read and use the finishing-a-development-branch skill on the coordination branch: present its options — merge locally into `<BASE_BRANCH>`, push and open a pull request, push only, or keep the branch as-is — and wait for the user to pick one. Discarding the work is not on the menu; it happens only if the user explicitly asks for it.
Do not assume merge. Execute only the chosen option. Per-track worktrees whose work is already integrated onto the coordination branch can be removed once that integration is confirmed; the coordination branch and its worktree are cleaned up only as the chosen option requires.

## Execution Requirements

- Do not begin until a plan already exists and has been approved.
- When the plan input is only a filename and the path is ambiguous, search `<PLAN_DIRECTORY>` first and use the matching file there before checking other locations.
- Block and require user confirmation at the end of every step except Step 2. Do not proceed autonomously through the whole cycle.
- Never run multiple implementation panes against the same worktree.
- Never create per-track worktrees until the implementation track extraction step has completed and been confirmed.
- Never parallelize tasks with overlapping file ownership unless the user explicitly approves a revised plan that serializes the overlap.
- Treat documentation updates as post-integration tasks unless the user explicitly approves a docs-only parallel track with independent ownership.
- If an approved plan item mixes implementation and documentation, split it into separate tasks before delegating any implementer.
- If fewer than two confirmed implementation tracks remain, use `/execute` instead of `/execute_parallel`.
- Treat the coordination branch as the only branch that may receive the final integrated result before review.
- Branch every worktree from `<BASE_BRANCH>`.
- If tests fail or errors occur, pause and use the systematic-debugging skill.
- Before claiming that verification passed or the task is complete, use `verification-before-completion`.
- Name in the final report every role that fell back to a substitute agent, every non-default assignment or mode and every disabled review from `.herdrpowers/config.yaml`, and every step that ran in the orchestrator pane instead of being delegated.
- Include the canonical profiles contract's run record: selected profile or none, active owner/reception role, verified targets, task/review transports, self-review versus independence, unavailable routes, fallbacks/lost effort, lifecycle actions, and test writer.
- With `allow_agent_lifecycle: true`, start a resolved target that has no live in-scope match and, before the final report, end the idle agents this run started — both only through `agent-lifecycle.sh`. Name every agent started, ended, or left running. With `false`, start and end none.
- Read the specific `SKILL.md` file for a skill before invoking it.
