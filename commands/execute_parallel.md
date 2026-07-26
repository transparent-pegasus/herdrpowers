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

Every dispatch in this workflow goes through the `orchestration` skill, with `using-herdr-sibling-panes` as the transport. Read both before the first delegation, and resolve the repository's assignments and review gates as `orchestration` describes: `.herdrpowers/config.yaml` first, then `orchestration/roles.yaml` for anything it omits. Every gate this workflow would run is resolved up front; a gate set to `enabled: false` is skipped and named in the final report.

- Implementation tracks, test authoring, and code review → **Coder** panes.
- Chores that come up while executing the plan (lookups, file moves, log gathering, mechanical edits, lint/format runs) → **Generalist** panes.
- Track extraction, integration, and final synthesis stay with the orchestrator.
- In-process subagents are not used. Do not dispatch the Agent tool for workflow work.

**Parallelism is bounded by panes and worktrees, not by ambition.** One implementation pane per worktree, one worktree per track. If fewer idle panes exist than tracks, run the tracks in waves — never two implementers in one worktree, and never interrupt a working pane.

**Every delegation** states its own track's absolute worktree path (and requires the pane to confirm it is there first), the owned files, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from report files, not from pane scrollback.

**Degrade, don't block.** If `HERDR_ENV` is unset or no idle sibling agent pane exists, stop parallel execution and continue with `/execute`, stating why.

## Execution Steps

1. Implementation Track Extraction
Inform the user that you will extract confirmed implementation tracks before creating any worktree.
Partition the approved plan into independent implementation tracks yourself, in the orchestrator pane, before creating any worktree or delegating any implementer.
When extracting tracks:
- include only implementation work that can be owned and verified independently
- exclude documentation updates, repository-wide verification, final review, integration, cleanup, and other coordination tasks from parallel tracks
- split any mixed-scope item such as `implementation + docs update` into one implementation track plus a post-integration follow-up task
- require each track to define a goal, owned files, dependencies, expected verification, and documentation impact
- name tracks by module or behavior, not by generic phase labels such as `implementation` or `documentation update`
- produce one explicit post-integration update list covering `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions

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

3. Parallel Implementation and Testing
Inform the user that parallel implementation and testing will begin.
Read and use the pane-driven-development skill for the per-track task loop.
For each confirmed implementation track:
- assign one Coder pane and one isolated worktree
- provide the exact task text (as a brief file), owned files, constraints, and expected verification
- require the implementer to stop and escalate if the task expands beyond its assigned ownership
- the implementing pane writes its own tests and owns RED-GREEN-REFACTOR per the test-driven-development skill; say so in the brief
- run track-local verification inside that track's worktree before considering the track complete
- send each track's task review to a fresh pane that did not implement it, preferably of a different agent type

On any test failure, unexpected behavior, or bug — in a pane or in the orchestrator — use the systematic-debugging skill before proposing or applying a fix.

After all parallel tracks complete:
- integrate changes onto the coordination branch in a controlled order
- resolve conflicts before proceeding
- stop if integration reveals that the original post-integration update list is incomplete, then revise the list before moving on

4. Documentation Update
Inform the user that post-integration documentation and workflow updates are starting.
Apply every deferred update identified in Step 1 that still matters after integration, using the update-docs skill for files under `docs/`.
Proceed to Step 5 only after the repository instructions and relevant docs are aligned with the integrated result.

5. Repository Verification
Inform the user that repository verification is starting on the integrated result.
Verification runs inside the coordination worktree, not in the primary checkout.
If only documentation, workflow, or agent-instruction files changed, note that no repository-wide quality command is required and proceed.
If any non-documentation file changed, run repository verification:
- always run `<BASELINE_VERIFICATION_COMMAND>`
- also run `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` that apply to the touched surfaces, such as CLI smoke tests, integration checks, deploy checks, schema/code generation, or image builds
If `<BASELINE_VERIFICATION_COMMAND>` or `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` are not declared in the repository's `Herdrpowers Configuration` section, stop and run the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise) before proceeding.
A delegated verification run is a claim: read the quoted output in the report file, or re-run the decisive command yourself, before accepting it.
If a required verification command cannot run because Docker, gcloud, or another external dependency is unavailable, report the blocker explicitly and stop until the user decides whether to skip that check.
Proceed to Step 6 only when verification evidence is fresh and successful.

If any task is discovered to be coupled, conflicting, or blocked on another track, stop parallel execution for that task and continue it sequentially.

6. Final Code Review
Gate: `reviews.final-branch-review`. When it is disabled, skip this step and tell the user the branch is reaching the integration decision unreviewed.
Inform the user that the final review is starting.
Read and use the requesting-code-review skill to delegate a whole-branch review to a fresh pane over the fully integrated changeset on the coordination branch.
Fix any critical or important issues reported — one fix delegation carrying the complete findings list, not one pane per finding.
Proceed to Step 7 only when the review assesses it as Ready to merge.

7. Integration and Cleanup
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
- Name in the final report every role that fell back to a substitute agent, every review gate disabled in `.herdrpowers/config.yaml`, and every step that ran in the orchestrator pane instead of being delegated.
- Read the specific `SKILL.md` file for a skill before invoking it.
