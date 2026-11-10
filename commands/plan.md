---
description: Interactive workflow for brainstorming, plan creation, and configured review
---

# /plan Workflow

This command runs only the discovery and planning stages of the development cycle. The plan is complete after its enabled review gate, resolution of findings, and the user's approval. Report disabled or unavailable review and permitted self-review explicitly.

## Deliverable Saves

Whenever this workflow saves a deliverable, also save any corresponding design/plan files in the same change so the artifact and its rationale stay together.

## Workflow File Edits

Do not edit workflow files unless the user's current request explicitly asks to change a workflow file or workflow behavior. A workflow path alone can select the workflow context; it is not permission to edit that file. For example, `update commands/plan.md ...` permits editing the workflow, while `commands/plan.md add a feature ... to the app` does not.

## Configuration

`<KEY>` placeholders in this workflow (for example `<PLAN_PATH_PATTERN>`) resolve from the `Herdrpowers Configuration` section of the repository's instruction files (`CLAUDE.md` / `AGENTS.md`). If that section is missing, run the pack's init workflow first: `/herdrpowers:init` on Claude Code plugin installs, or `commands/init.md` otherwise.

## Orchestration

Read `orchestration`, its [profiles contract](../skills/orchestration/references/profiles.md), and `using-herdr-sibling-panes` before routing. Resolve repo config over shipped roles, then only present profile keys; freeze targets, modes, gates, scope, and lifecycle policy. Drafting follows `plan-and-design`; the active owner keeps decisions. Separate delegated targets use reset-backed panes. With a selected profile, self-target `delegate` requires fresh in-process subagents for work and reviews, even with empty reviewers; other owner-session modes permit inline work/self-review and optional subagents at the owner's judgment. Without a profile, preserve legacy independence, including fresh-subagent orchestrator-mode reviews. Workers never re-delegate. An explicit profile-owner handoff transfers ownership under the canonical contract; ordinary worker delegation does not.

## Execution Steps

1. Brainstorming
Read the brainstorming SKILL.md and follow its context-first opening. Ask only what the existing project and supplied context leave open.
Invoking this workflow is the user choosing its ceremony: say the size the brainstorming skill picks, but do not downgrade the workflow — its remaining steps run even for a quick, clear task or a small change, and even when the user skips the questions. If what they want is a spike (a throwaway build to learn from, not code to keep), say so and confirm with the user before continuing. A project's full design gets the builder check through the `plan-review` gate; a small change's short design goes directly to the user without that check. For a project's check, the final report names whether it ran, degraded, or was disabled, separately from the plan's review in Step 3.
Engage in a design and requirement gathering discussion without writing implementation code.
Proceed to Step 2 after the user chooses an approach and approves the short or full design document. If they explicitly opt out of brainstorming, keep the remaining workflow steps.

2. Plan Creation
Inform the user that you will create an implementation plan.
Read and use the writing-plans skill to break the design into small achievable tasks.
Save the plan to `<PLAN_PATH_PATTERN>`.
Proceed directly to Step 3 — do not ask for approval yet.

3. Plan Review
Gate: `assignments.plan-review`. When it is disabled, skip this step, tell the user the plan is going to approval unreviewed, and go to Step 4.
Inform the user how the resolved plan review will run before approval.
Resolve the gate's effective role and mode, then use the **same self-contained review request** for each effective entry. Separate delegated targets use matching in-scope reset-backed panes without shared draft opinions; owner targets follow the profile/mode rules above. Empty profile reviewers select the owner and do not disable this gate.
Each review request states: the plan file path, the design doc path, the absolute repository path, that the review is read-only, the report-file path under `<REPORT_DIRECTORY>`, a unique completion marker, and that the recipient must execute the review itself and must not re-delegate.
Wait for every review to finish, read each report file, and compare the findings.
A separate delegated reviewer may reuse the drafting pane after reset. Degrade unavailable separate review sets honestly. Without a profile, retain the legacy critical self-review fallback when no delegated Reviewer is available; with a profile, a route resolving to the owner still obeys its mode. Missing mandatory subagent capability is an inability, never inline substitution or a passed gate.

4. Resolution and Approval
Resolve every finding: fix the plan, or record why the finding does not apply. Where reviews disagree, decide and state the reasoning — reviewers advise, the orchestrator judges.
Present the resolved plan, the findings, and their resolutions to the user, and ask for approval.

## Execution Requirements

- Stop after the plan is approved. Do not enter implementation, testing, review, or merge steps.
- Code is not touched until the resolved plan is approved.
- The remaining development-cycle responsibilities live in `/execute`, `/execute_parallel`, and `/full_cycle`, not in `<REPO_INSTRUCTION_FILES>`.
- If the design discussion changes scope materially, revisit Brainstorming before writing the plan.
- Name in the final report which reviews ran, which were skipped for lack of panes, which were disabled in `.herdrpowers/config.yaml`, any non-default assignment or mode, and any role that fell back to a substitute agent.
- Include the profiles contract's run record, especially selected owner/reception role, transports, model/effort evidence, self-review versus independence, and unavailable mandatory subagents.
- With `allow_agent_lifecycle: true`, start a resolved target that has no live in-scope match and, before the final report, end the idle agents this run started — both only through `agent-lifecycle.sh`. Name every agent started, ended, or left running. With `false`, start and end none.
- Read the specific `SKILL.md` file for a skill before invoking it.
