# Lifecycle Map

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

Paths inside diagram labels are relative to the parent skill directory too.

Read the canonical [profiles contract](../../orchestration/references/profiles.md)
before applying this map. Separate delegated targets use reset-backed panes;
selected-profile self-target `delegate` requires fresh subagents, while other
owner-session modes permit reported self-review and optional subagents.
Disabled gates stay off; no-profile independence and the five-round cap remain.

## The Process

```dot
digraph process {
    rankdir=TB;

    subgraph cluster_per_task {
        label="Per Task";
        "Run resolved implementer + test-author routes (briefs: ./implementer-brief.md, ./test-author-brief.md)" [shape=box];
        "Implementer asks questions?" [shape=diamond];
        "Cherry-pick tests into task worktree, run them (GREEN or findings)" [shape=box];
        "Answer questions, re-delegate" [shape=box];
        "Implementer commits and self-reviews; test author commits RED tests off BASE" [shape=box];
        "Package diff, run enabled task-review by target/mode (./task-reviewer-brief.md)" [shape=box];
        "Spec OK and quality approved?" [shape=diamond];
        "Finding conflicts with plan text?" [shape=diamond];
        "Rule on the conflict, ledger the ruling" [shape=box];
        "Fix round R/5: self-target keeps mode; separate targets escalate at R>=4; tests per assignment" [shape=box];
        "Run enabled scoped re-review by target/mode (./re-review-brief.md)" [shape=box];
        "All findings addressed?" [shape=diamond];
        "R = 5?" [shape=diamond];
        "Adjudicate each open finding" [shape=box];
        "Any load-bearing finding?" [shape=diamond];
        "Rule and continue; stop only if every path forward is a guess" [shape=box];
        "Park findings in ledger with rulings" [shape=box];
        "Append completion to ledger, mark todo complete" [shape=box];
    }

    "Setup: worktree, plan workspace, ledger check, read plan, pre-flight review" [shape=box];
    "More tasks remain?" [shape=diamond];
    "Run enabled final review by target/mode (../requesting-code-review/review-brief.md)" [shape=box];
    "Final findings? ONE resolved fix wave, scoped re-review, adjudicate residuals" [shape=box];
    "Final review clean: delete this plan's workspace" [shape=box];
    "Use finishing-a-development-branch" [shape=box style=filled fillcolor=lightgreen];

    "Setup: worktree, plan workspace, ledger check, read plan, pre-flight review" -> "Run resolved implementer + test-author routes (briefs: ./implementer-brief.md, ./test-author-brief.md)";
    "Run resolved implementer + test-author routes (briefs: ./implementer-brief.md, ./test-author-brief.md)" -> "Implementer asks questions?";
    "Implementer asks questions?" -> "Answer questions, re-delegate" [label="yes"];
    "Answer questions, re-delegate" -> "Implementer commits and self-reviews; test author commits RED tests off BASE";
    "Implementer asks questions?" -> "Implementer commits and self-reviews; test author commits RED tests off BASE" [label="no"];
    "Implementer commits and self-reviews; test author commits RED tests off BASE" -> "Cherry-pick tests into task worktree, run them (GREEN or findings)";
    "Cherry-pick tests into task worktree, run them (GREEN or findings)" -> "Package diff, run enabled task-review by target/mode (./task-reviewer-brief.md)";
    "Package diff, run enabled task-review by target/mode (./task-reviewer-brief.md)" -> "Spec OK and quality approved?";
    "Spec OK and quality approved?" -> "Append completion to ledger, mark todo complete" [label="yes"];
    "Spec OK and quality approved?" -> "Finding conflicts with plan text?" [label="no"];
    "Finding conflicts with plan text?" -> "Rule on the conflict, ledger the ruling" [label="yes"];
    "Rule on the conflict, ledger the ruling" -> "Fix round R/5: self-target keeps mode; separate targets escalate at R>=4; tests per assignment";
    "Finding conflicts with plan text?" -> "Fix round R/5: self-target keeps mode; separate targets escalate at R>=4; tests per assignment" [label="no"];
    "Fix round R/5: self-target keeps mode; separate targets escalate at R>=4; tests per assignment" -> "Run enabled scoped re-review by target/mode (./re-review-brief.md)";
    "Run enabled scoped re-review by target/mode (./re-review-brief.md)" -> "All findings addressed?";
    "All findings addressed?" -> "Append completion to ledger, mark todo complete" [label="yes"];
    "All findings addressed?" -> "R = 5?" [label="no"];
    "R = 5?" -> "Fix round R/5: self-target keeps mode; separate targets escalate at R>=4; tests per assignment" [label="no - next round"];
    "R = 5?" -> "Adjudicate each open finding" [label="yes - breaker trips"];
    "Adjudicate each open finding" -> "Any load-bearing finding?";
    "Any load-bearing finding?" -> "Rule and continue; stop only if every path forward is a guess" [label="yes"];
    "Any load-bearing finding?" -> "Park findings in ledger with rulings" [label="no"];
    "Rule and continue; stop only if every path forward is a guess" -> "Append completion to ledger, mark todo complete";
    "Park findings in ledger with rulings" -> "Append completion to ledger, mark todo complete";
    "Append completion to ledger, mark todo complete" -> "More tasks remain?";
    "More tasks remain?" -> "Run resolved implementer + test-author routes (briefs: ./implementer-brief.md, ./test-author-brief.md)" [label="yes"];
    "More tasks remain?" -> "Run enabled final review by target/mode (../requesting-code-review/review-brief.md)" [label="no"];
    "Run enabled final review by target/mode (../requesting-code-review/review-brief.md)" -> "Final findings? ONE resolved fix wave, scoped re-review, adjudicate residuals";
    "Final findings? ONE resolved fix wave, scoped re-review, adjudicate residuals" -> "Final review clean: delete this plan's workspace";
    "Final review clean: delete this plan's workspace" -> "Use finishing-a-development-branch";
}
```
