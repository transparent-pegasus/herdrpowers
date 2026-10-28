# Fix Loop and Five-Round Breaker

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

### 4. The fix loop

The loop triggers when the review reports spec ❌, any Critical or Important
finding, or a ⚠️ item you confirmed as a real gap.

Before the loop starts, two routes leave it immediately:

- Record Minor findings in the progress ledger as you go
  (`Task <N>: minor (deferred): <one-liner>`), and point the final
  whole-branch review at that list so it can triage which must be fixed
  before merge. A roll-up nobody reads is a silent discard. Minor findings
  never enter the loop.
- A finding labeled plan-mandated — or any finding that conflicts with
  what the plan's text requires — is yours to rule on: weigh the finding
  against the plan text, decide with the spec as the binding authority, and
  ledger the ruling before you act on it. Do not dismiss the finding because
  the plan mandates it, and do not delegate a fix that contradicts the plan
  without a recorded ruling.

Everything else enters the loop. A fix round is one fix delegation plus one
scoped re-review. Five rounds maximum per task:

**Rounds 1-3 — go back to the same implementing pane.** Send it the open
findings verbatim through `composer-submit.sh`, with a fresh completion
marker. Every submit resets its session: carry the brief path, the
report-file path, and the findings so it can recover the task from files.
If that pane has crashed or is no longer idle, delegate to a fresh pane of
the same agent type with those same paths. The report file is the persistent
memory either way.

**Rounds 4-5 — delegate to a fresh pane of an escalated agent type** (see
Delegation Assignments), with the brief path, the report-file path, the open findings,
and this framing: "A prior pane attempted this task [N] times; you own it now.
Read the report file for what was tried." A loop that survives three rounds with
one agent type usually means that type cannot see the problem — fresh eyes and
a capability swap in one move.

**Every round, either way:** the fixing pane fixes, re-runs the verification
covering the amended code, appends its fix report to the same report file, and
replies with the short contract. Name the covering test files in the fix
message — a one-line fix does not need the whole suite.

**The round's covering tests come from `fix-round-test-authoring`.** When it
resolves to `mode: implementer`, the fixing pane writes or amends them itself
under RED-GREEN-REFACTOR and its fix report carries RED and GREEN, exactly as
before. When it resolves to `mode: delegate`, the round runs in four ordered
steps and **the evidence is assembled by you, not by any one pane** — no pane
sees both halves:

1. **Delegate both, from the findings.** The fixing pane changes source only.
   The test author is a pane that is neither the fixing pane nor the
   implementation round's test author — a fix's tests written by whoever just
   changed the behavior prove only that the behavior changed. Write its
   contract to `task-N-fix-R-tests.md` per
   [test-author-brief.md](../test-author-brief.md), using that template's fix-round
   variant, and give it the open findings — not the fix diff.
2. **Its worktree is detached at FIX_BASE**, the head the previous review saw:
   `git worktree add --detach <plan-workspace>/tests-task-N-fix-R FIX_BASE`.
   The buggy implementation *is* present there — that is the point. Its RED is
   the finding reproducing: a new test must fail because the finding is still
   unfixed, and a test that passes at FIX_BASE does not cover the finding.
3. **Cherry-pick, then run.** Once both report, cherry-pick the test commit onto
   the fix head and run the covering tests yourself. That run is the round's
   GREEN.
4. **Consolidate before the re-review.** Append to the fix report: the covering
   tests, the command, its output, and which pane wrote them. Only then
   delegate the re-review. A re-reviewer handed a fix report with no test
   evidence returns NOT ADDRESSED on a fix that is fine, and burns a round of
   the five-round cap doing it.

Either mode: confirm the fix report contains the covering tests, the command
run, and the output before delegating the re-review. Remove the round's test
worktree once its commit is in.

**The re-review is scoped.** Skipped when `assignments.fix-round-re-review` is
disabled — the round then closes on the fix report's covering tests, command,
and output, and the cap still counts it. Otherwise: run
`bash scripts/review-package PLAN_FILE FIX_BASE HEAD`
where FIX_BASE is the head the previous review saw, and delegate
[re-review-brief.md](../re-review-brief.md) to a fresh pane — one per agent type
in the resolved role — with the findings list, the brief, the report file, and
the printed diff path. Each re-reviewer verdicts each finding ADDRESSED or NOT
ADDRESSED and flags new breakage in the fix diff only; a finding is closed only
when every re-reviewer that ran calls it ADDRESSED. New Critical/Important
breakage in the fix diff joins the open findings list. Out-of-scope
observations go to the ledger as deferred minors — they never extend the loop.

**After each round,** append to the ledger:
`Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`

Never fix findings yourself in the orchestrator pane — your context stays
clean for coordination, and orchestrator fixes skip review.

**The breaker.** When round 5's re-review still leaves findings open, stop
delegating. Adjudicate each open finding yourself — you hold the plan and
the cross-task context the reviewer lacks:

- **The reviewer is wrong, or the point is contestable:** park it —
  `Task <N>: parked — <finding> — Ruling: <why the code stands>`. The final
  review sees both sides.
- **Real, but nothing downstream builds on it:** park it the same way, with
  a ruling that says it's real and deferred.
- **Real and load-bearing** — a later task builds on it, or it reveals a
  plan defect: rule on the smallest change that unblocks the dependent work,
  ledger it as `Task <N>: Ruling: <finding> — <what you decided and why>`,
  and carry it into the next task's brief. Parking a structural failure
  silently lets every dependent task build on it and hands the final review a
  problem it cannot fix either. Stop only when the defect leaves every path
  forward a guess.

Adjudicate only at the cap. Adjudicating earlier to end a loop is
pre-judging with a different name. Every adjudication is a ledger entry —
a silent discard is forbidden.
