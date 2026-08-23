# Development Cycle Guide

This guide describes the 7-phase herdrpowers development cycle. The full cycle is driven by the `/full_cycle` workflow — or by `/strict_full_cycle`, which runs the same phases with every review gate forced on regardless of the repository's configuration; `/plan`, `/execute`, and `/execute_parallel` run structured subsets, and `/quick` runs every phase but the written plan and its double review.

Every phase that delegates work does so through the `orchestration` skill to a **herdr sibling agent pane**. Nothing here uses in-process subagents, except a review task whose resolved mode is `orchestrator`, which the orchestrator runs in a fresh spawned subagent instead of inline. Outside herdr, each phase degrades to inline execution and the final report says which independence was lost.

## 7 Phases of Development

### Phase 1: Brainstorming (Design & Requirements)

The agent asks what you want to build and engages in a design and requirements discussion. No implementation code is written at this stage.

- **Purpose**: Define the feature's purpose, constraints, and success criteria.
- **Outcome**: An approved architectural design saved to `<DESIGN_DOC_PATH_PATTERN>` (not committed).
- **Skill**: `brainstorming`. **Role**: orchestrator.

---

### Phase 2: Plan Creation and Double Review

The orchestrator breaks the approved design into small, achievable tasks — then sends the plan out for **independent double review** before anyone touches code. Two different agent types review the same self-contained request in separate panes, with no shared draft opinion. The orchestrator resolves the findings and presents the resolved plan for approval.

- **Purpose**: Create a clear, actionable roadmap, and catch its defects while they are still cheap.
- **Outcome**: A reviewed, resolved, approved plan at `<PLAN_PATH_PATTERN>` (not committed), carrying a `## Tracks` table — which tasks can run concurrently, and which files each track owns — because Phase 5 runs those tracks in parallel by default.
- **Skill**: `writing-plans`. **Roles**: orchestrator (drafts), Reviewer ×2 (review).

A plan is not complete when it is written. It is complete when it is reviewed, resolved, and approved.

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

The active coding phase. Each task in the plan is delegated to a fresh pane.

- **The per-task cycle**:
    1. Extract the task brief to a file; delegate it with the worktree path, report path, and completion marker.
    2. The task's tests follow the resolved `test-authoring` assignment: a separate pane writing them from the same brief in its own worktree at the pre-implementation commit — where **RED** is structural, because the code genuinely is not there — or the implementing pane writing them itself under RED-GREEN-REFACTOR.
    3. Each pane writes its full report to a file and replies with status + marker. A delegated test author's commit is cherry-picked into the task worktree and run: passing is **GREEN**, failing is a finding.
    4. The orchestrator builds the review package and delegates the task review via **reset-backed submits** to idle panes of the review role's agent type(s) — one per listed type: one pass each, two verdicts — **Spec Compliance** and **Task Quality**.
    5. Critical/Important findings from all reviews merge into one list and enter the fix loop: rounds 1-3 go back to the same implementing pane, rounds 4-5 to a fresh pane of an escalated agent type, the round's covering tests written per `fix-round-test-authoring`, each round closed by a **scoped re-review** of the fix diff only. Five rounds is the cap — then the orchestrator adjudicates each open finding into the ledger: contestable or non-load-bearing ones are parked with a ruling; a load-bearing one gets a ruling on the smallest change that unblocks the dependent work, carried into the next task's brief. It stops only when every path forward is a guess.
- **Skills**: `pane-driven-development`, `test-driven-development`, `systematic-debugging`.
- **Roles**: as assigned in [`roles.yaml`](../skills/orchestration/roles.yaml) — the pack ships implementation and test authoring on Coder, per-task review on Reviewer, chores on Generalist.

Independent tracks run concurrently by default — one pane per worktree, never two implementers in one working tree. `/full_cycle` takes the plan's `## Tracks` table, confirms it with you, and runs the tracks in per-track worktrees off a coordination branch; `delegation.execution: serial` runs them one at a time instead. See `/execute_parallel` for the same machinery invoked explicitly.

Every pane a phase delegates to sits in the orchestrator's own tab, unless the repository widened `delegation.pane_scope`.

---

### Phase 6: Verification and Final Code Review

Repository verification runs inside the worktree, then a final review of the entire changeset runs via a reset-backed submit.

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
