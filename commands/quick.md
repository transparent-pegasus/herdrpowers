---
description: Interactive workflow for a shortened development cycle from brainstorming through final review
---

# /quick Workflow

This command runs a shortened development cycle for small-scoped changes in this repository. It keeps the `/full_cycle` flow's brainstorming, workspace isolation, documentation, implementation, verification, review, and integration phases while omitting the separate plan creation and its review. Follow these steps and require explicit user confirmation before advancing to the next stage.

## Deliverable Saves

Whenever this workflow saves a deliverable, also save any corresponding design/plan files in the same change so the artifact and its rationale stay together.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file. For example, `update commands/plan.md ...` permits editing the workflow, while `commands/plan.md add a feature ... to the app` does not.

## Configuration

`<KEY>` placeholders in this workflow (for example `<PLAN_PATH_PATTERN>`) resolve from the `Herdrpowers Configuration` section of the repository's instruction files (`CLAUDE.md` / `AGENTS.md`). If that section is missing, run the pack's init workflow first: `/herdrpowers:init` on Claude Code plugin installs, or `commands/init.md` otherwise.

## Orchestration

`/quick` omits the separate plan and its review. Read `orchestration`, its [profiles contract](../skills/orchestration/references/profiles.md), and `using-herdr-sibling-panes` before routing the remaining work and gates.

Resolve repo config over shipped roles, then only profile composition keys present. Freeze the owner, targets, modes, gates, scope, and lifecycle policy. A profile never changes modes or enablement. A gate set to `enabled: false` is skipped and named in the report; empty profile reviewers instead select the owner.

Routing comes from `assignments:` and effective targets. Without a profile, retain the legacy small-scope inline implementation choice. With a profile, read `complex-coding` / `simple-coding` and preserve their modes; small scope cannot replace required delegation with inline work. `test-authoring`, `chores`, `verification`, and review assignments follow their resolved routes. List roles run once per effective entry.
- Separate delegated targets use reset-backed Herdr panes, even when a concrete target matches the owner's model. With a selected profile, self-target `delegate` requires a fresh in-process subagent for work and reviews, including empty reviewers; other owner-session modes permit inline work/self-review and optional subagents at the active owner's judgment. Report self-review honestly. Without a profile, keep legacy routing and fresh-subagent orchestrator-mode reviews. Workers never re-delegate.

**Every delegation** states the worktree's absolute path (and requires the pane to confirm it is there first), the exact scope, the edit policy, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and the prohibition on re-delegating. Read results from the report file, not from pane scrollback.

**Degrade honestly.** Without a profile, retain the legacy critical self-review fallback when no delegated reviewer is available and name the lost independence. With a profile, owner targets retain their mode: an unavailable required fresh subagent is reported as inability, never replaced by inline review or called passed. Wait for busy matching agents; never interrupt them.

## Execution Steps

1. Brainstorming
Read the specific `SKILL.md` for `brainstorming` and follow its context-first opening. Ask only what the existing project and supplied context leave open.
Invoking this workflow is the user choosing its ceremony: say the size the brainstorming skill picks, but do not downgrade the workflow — its remaining steps run even for a quick, clear task, and even when the user skips the questions. A project requiring a full design is more than this workflow carries, because it has no plan step: say so and offer `/full_cycle` before continuing. If what they want is a spike (a throwaway build to learn from, not code to keep), say so and confirm with the user before continuing.
Engage in a design and requirement gathering discussion without writing implementation code.
For a small change, present the approaches and recommendation, let the user choose, and save a short design at `<DESIGN_DOC_PATH_PATTERN>` without committing it. The short design goes directly to the user without a builder check. Proceed to Step 2 after they approve it, or explicitly opt out of brainstorming. Because the user selected `/quick`, continue with workspace isolation instead of invoking `writing-plans`; the separate plan and its review remain omitted.

2. Workspace Isolation
Inform the user that you will create an isolated workspace.
Read and use the using-git-worktrees skill to set up a new branch and worktree (e.g., feature/xxx) based on `<BASE_BRANCH>`.
Record the worktree's absolute path — the rest of this workflow runs there, and every delegation brief must carry it.
Proceed to Step 3 after setup completes.

3. Documentation Impact Review
Gate: `assignments.documentation-impact-review`. When it is disabled, skip this step and name the skipped gate in the final report. Use the review route resolved above, including mandatory profile self-target subagents and the legacy no-profile fresh-subagent rule.
Inform the user that the sweep will identify every file that must be updated if the implementation changes behavior, contracts, prompts, schema, or workflow instructions.
List the expected non-code follow-up targets before implementation begins, including `<REPO_INSTRUCTION_FILES>`, any affected files under `docs/`, any agent-instruction directories present (such as `.claude/`, `.agents/`, `commands/`), example env/config files, and CI/deploy definitions.
Proceed to Step 4 only after the update target list is explicit and the user confirms.

4. Implementation and Testing
Inform the user that implementation and testing will begin.
Read the specific `SKILL.md` for `test-driven-development`, then execute the scoped work in the worktree without a separate plan-creation phase.
Route the tests by the resolved `test-authoring` assignment. With `mode: implementer` the implementer writes the failing test first and owns RED-GREEN-REFACTOR. With `mode: delegate`, record BASE (`git rev-parse HEAD` in the worktree) before delegating and give the test author its own worktree detached at it (`git worktree add --detach`, never `-b` — a named branch outlives `git worktree remove` and collides on the next run), removed after its commit is cherry-picked back. One writer per working tree: the test author never shares the implementation's worktree. Run the merged tests yourself after the cherry-pick: that run is the GREEN evidence, because neither pane produced both halves. Name in the report which pane wrote the tests.
If the touched package has no automated test harness, state that gap explicitly and use the strongest available validation instead of inventing a fake test step.
On any test failure, unexpected behavior, or bug, use the `systematic-debugging` skill before proposing or applying a fix. A test author's RED run is not a failure in this sense: a test that fails for its stated reason, in a worktree where the covered behavior is absent or the finding is unfixed, is the evidence the task asked for. Debug the failures that survive the merge, and any failure whose reason does not match what the test author predicted.
Ensure implementation and required tests or equivalent validations are complete before proceeding.
Proceed to Step 5 only after the user confirms.

5. Documentation Update
Inform the user that documentation and workflow updates are starting.
Update every target identified in Step 3 that is still affected by the implemented result, using the update-docs skill for files under `docs/`.
If implementation changed the expected update list, revise the list first and then finish the missing updates.
Proceed to Step 6 only after the repository instructions and relevant docs are aligned with the final code and the user confirms.

6. Repository Verification
Inform the user that repository verification is starting.
Verification commands run inside the worktree, not in the primary checkout.
If only documentation, workflow, or agent-instruction files changed, note that no repository-wide quality command is required and proceed.
If any non-documentation file changed, run repository verification:
- always run `<BASELINE_VERIFICATION_COMMAND>`
- also run `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` that apply to the touched surfaces, such as CLI smoke tests, integration checks, deploy checks, schema/code generation, or image builds
If `<BASELINE_VERIFICATION_COMMAND>` or `<SUPPLEMENTAL_VERIFICATION_COMMANDS>` are not declared in the repository's `Herdrpowers Configuration` section, stop and run the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise) before proceeding.
If a required verification command cannot run because Docker, gcloud, or another external dependency is unavailable, report the blocker explicitly and stop until the user decides whether to skip that check.
Proceed to Step 7 only when verification evidence is fresh, successful, and the user confirms.

7. Final Code Review
Gate: `assignments.final-branch-review`. When it is disabled, skip this step and tell the user the change is shipping unreviewed — for a workflow whose only independence is this review, say it plainly.
Inform the user that the final review is starting.
Read requesting-code-review and run the whole-changeset gate through its resolved target and mode.
Fix any critical or important issues reported.
Proceed to Step 8 only when the review assesses it as Ready to merge and the user confirms.

8. Integration and Cleanup
Inform the user that the change is complete, and name its branch and the worktree's absolute path.
Stop and wait for the user's instruction. Additional implementation happens only on an explicit instruction.
When the user instructs cleanup, read and use the finishing-a-development-branch skill: present its options — merge locally into `<BASE_BRANCH>`, push and open a pull request, push only, or keep the branch as-is — and wait for the user to pick one. Discarding the work is not on the menu; it happens only if the user explicitly asks for it.
Do not assume merge. Execute only the chosen option, and delete the worktree only as that option requires.

## Execution Requirements

- Use `/quick` only when the change is small enough to proceed without a separate written implementation plan.
- If the work expands beyond that scope, stop and switch to `/full_cycle`, or use `/plan` followed by `/execute`.
- Branch from `<BASE_BRANCH>`, never from a branch the deploy flow does not expect.
- Treat `<REPO_INSTRUCTION_FILES>`, the repository's build/test/deploy configuration, and the latest approved plan as the source of truth for repository-specific commands, environment variables, and deploy flows.
- Block and require user confirmation at the end of every step. Do not proceed autonomously through the whole cycle.
- Separate delegated reviews require reset; profile owner-session modes permit honestly reported self-review, while self-target `delegate` requires fresh subagents. Preserve the no-profile independence path.
- Name in the final report the branch and the worktree's absolute path, every role that fell back to a substitute agent, and every non-default assignment or mode and every disabled review from `.herdrpowers/config.yaml`.
- If tests fail or errors occur, pause and use the `systematic-debugging` skill.
- Before claiming that verification passed or the task is complete, use `verification-before-completion`.
- Include the canonical profiles contract's run record: selected profile or none, active owner/reception role, verified targets, task/review transports, self-review versus independence, unavailable routes, fallbacks/lost effort, lifecycle actions, and test writer.
- With `allow_agent_lifecycle: true`, start a resolved target that has no live in-scope match and, before the final report, end the idle agents this run started — both only through `agent-lifecycle.sh`. Name every agent started, ended, or left running. With `false`, start and end none.
- Read the specific `SKILL.md` file for a skill before invoking it.
