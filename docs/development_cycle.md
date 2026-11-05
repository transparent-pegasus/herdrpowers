# Development Cycle Guide

This guide describes the 7-phase herdrpowers development cycle. The full cycle is driven by the `/full_cycle` workflow — or by `/strict_full_cycle`, which runs the same phases with every review gate forced on regardless of the repository's configuration; `/plan`, `/execute`, and `/execute_parallel` run structured subsets, and `/quick` runs every phase but the written plan and its review.

Every phase routes work through `orchestration` and its [profiles contract](../skills/orchestration/references/profiles.md). Separate delegated targets use reset-backed Herdr panes. With a selected profile, self-target `delegate` requires fresh in-process subagents for work and reviews, even with empty reviewers; other owner-session modes permit inline work/self-review and optional subagents. Missing mandatory subagent capability is inability, never inline substitution or a passed gate. Without a profile, preserve legacy routing, independence, and unavailable-pane degradation. Workers never re-delegate.

Resolve config over shipped roles, then only present profile composition keys.
Freeze modes, gates, scope, and lifecycle policy. A mismatched reception pane
always asks unused versus relay before explicit owner handoff or startup.
Lifecycle false forbids start/exit/restart even in recovery; true grants guarded
agent-process management, not topology destruction. Report the actual owner,
transports, live model/effort evidence, self-review, and lifecycle actions.

## 7 Phases of Development

### Phase 1: Brainstorming (Design & Requirements)

The agent reads the existing project and supplied context first, draws out what remains unclear, and plays its understanding back for you to correct. It presents the viable approaches and a recommendation before you choose one and it sizes the work. No implementation code is written at this stage.

- **Purpose**: Define the feature's intent, goals, non-goals, and constraints, and which parts of the how you want to decide.
- **Outcome**: An approved design at `<DESIGN_DOC_PATH_PATTERN>` (not committed), including the approaches considered and the choice. A small change gets a short document sent directly to you; a project gets the full document and a builder check first: readers routed as the `plan-review` gate list what they would still need to ask to build it. The next step is planning, except when you explicitly chose `/quick`, which keeps its plan omission. Quick, fully specified tasks and an explicit opt-out still follow the calling workflow.
- **Skill**: `brainstorming`. **Routes**: resolved `plan-and-design`; the builder check follows `plan-review`.

---

### Phase 2: Plan Creation and Review

Drafting follows `plan-and-design`; the active owner then runs the enabled
`plan-review` gate through its effective target and mode. Each separate review
slot gets the same self-contained request without shared draft opinion. Profile
owner targets follow the mode rules above. The owner resolves findings and
presents the plan for approval, naming self-review, disabled gates, or inability.

- **Purpose**: Create a clear, actionable roadmap, and catch its defects while they are still cheap.
- **Outcome**: A reviewed, resolved, approved plan at `<PLAN_PATH_PATTERN>` (not committed), carrying a `## Tracks` table — which tasks can run concurrently, and which files each track owns — because Phase 5 runs those tracks in parallel by default.
- **Skill**: `writing-plans`. **Routes**: resolved `plan-and-design` and `plan-review` assignments and profile targets.

A plan reaches approval after its enabled review and findings are resolved; skipped or unavailable reviews remain explicit in the report.

---

### Phase 3: Workspace Isolation (Safe Development)

Once the plan is approved, a new branch and isolated git worktree (e.g., `feature/xxx`) are created from `<BASE_BRANCH>`.

- **Purpose**: Keep the base branch untouched and prevent context pollution between features.
- **Skill**: `using-git-worktrees`.

Panes do not inherit the orchestrator's working directory: the worktree's **absolute path** goes into every delegation brief from here on.

---

### Phase 4: Documentation Impact Review

Before implementation, list every non-code file the change will invalidate: instruction files, affected files under `docs/`, agent-instruction directories, example env/config files, and CI/deploy definitions.

- **Purpose**: Make the documentation debt explicit before it accrues.
- **Outcome**: A written update-target list, revised if implementation turns out to affect something else.

---

### Phase 5: Implementation (TDD across panes)

The active coding phase. Each task follows its frozen target and assignment mode.

- **The per-task cycle**:
    1. Extract the task brief to a file; delegate it with the worktree path, report path, and completion marker.
    2. Tests follow `test-authoring`: a fresh delegated worker (reset-backed pane or profile self-target subagent) gets requirements alone in its own BASE worktree, or the implementing session owns RED-GREEN-REFACTOR. Name the writer and transport.
    3. Each pane writes its full report to a file and replies with status + marker. A delegated test author's commit is cherry-picked into the task worktree and run: passing is **GREEN**, failing is a finding.
    4. The owner builds a review package and runs enabled task reviews by effective target and mode, once per list entry, with **Spec Compliance** and **Task Quality** verdicts. Permitted owner-session self-review uses the same contract and is reported as self-review.
    5. Critical/Important findings enter one fix loop. Separate targets and no-profile routing retain rounds 1-3 on the implementing pane and rounds 4-5 on an escalated fresh target; profile self-targets retain their mode throughout. Covering tests follow `fix-round-test-authoring`; enabled scoped re-reviews check only the fix diff. Five rounds remains the cap, followed by ledgered adjudication and rulings carried to dependent tasks.
- **Skills**: `pane-driven-development`, `test-driven-development`, `systematic-debugging`.
- **Routes**: read resolved assignments and profile targets; [`roles.yaml`](../skills/orchestration/roles.yaml) supplies defaults rather than this guide.

`delegation.execution` chooses the attempted strategy. Parallel tracks use
separate worktrees and available writer capacity (matching panes or required
profile subagents); owner-session work may serialize. `/full_cycle` confirms
the plan's `## Tracks` table before creating track worktrees. Serial degradation
keeps every mode and gate; it cannot replace mandatory delegation with inline
work. See `/execute_parallel` for the same machinery invoked explicitly.

Every pane a phase delegates to sits in the orchestrator's own tab, unless the repository widened `delegation.pane_scope`.

---

### Phase 6: Verification and Final Code Review

Repository verification runs inside the worktree, then the enabled final review checks the entire changeset through its resolved target and mode.

- **Purpose**: Evidence before assertions, then a merge-level judgment on the whole branch.
- **Outcome**: Verification output quoted from the report file (or re-run), plus a report with Critical / Important / Minor issues.
- **Skills**: `verification-before-completion`, `requesting-code-review`, `receiving-code-review`.

A pane reporting "tests pass" is a claim, not evidence. Read the quoted output, or re-run the decisive command.

---

### Phase 7: Integration (Candidates & Cleanup)

Work stops and waits for the owner's instruction. On that instruction, the options are **presented, not assumed**: merge locally into `<BASE_BRANCH>`, push and open a pull request, push only, or keep the branch as-is (discarding happens only on an explicit request). The owner picks; only that option runs, and the worktree and branch are cleaned up only as far as it requires.

- **Purpose**: Hand the finished branch back with its integration choices open.
- **Skill**: `finishing-a-development-branch`.

A workflow that merges on its own has taken a decision that belongs to the owner.

---

## Supporting Rules

Throughout the cycle, these skills are always in play:

- **`verification-before-completion`** — Before claiming anything works, run the verification command and read the output.
- **`systematic-debugging`** — When something fails, find the root cause before proposing fixes. No speculative fixes, in a pane or in the orchestrator.
- **`update-docs`** — When code or config changes alter behavior covered in `docs/`, update the affected root docs.

## Your Role as a User

The agent is autonomous within a phase but not independent across phases. You:

- **Review and approve**: Approve the design, the resolved plan, and the integration choice.
- **Provide context**: Answer clarifying questions before the agent proceeds.
- **Confirm success**: Validate that the implementation meets your expectations before merging.

Every workflow (`/full_cycle`, `/strict_full_cycle`, `/plan`, `/execute`, `/execute_parallel`, `/quick`) blocks for user confirmation between phases. That is by design.
