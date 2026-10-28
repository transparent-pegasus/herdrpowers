# Lifecycle Map

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

Paths inside diagram labels are relative to the parent skill directory too.

## The Process

```dot
digraph process {
    rankdir=TB;

    subgraph cluster_per_task {
        label="Per Task";
        "Delegate implementer pane (./implementer-brief.md) + test author pane off BASE (./test-author-brief.md)" [shape=box];
        "Implementer pane asks questions?" [shape=diamond];
        "Cherry-pick tests into task worktree, run them (GREEN or findings)" [shape=box];
        "Answer questions, re-delegate" [shape=box];
        "Implementer commits and self-reviews; test author commits RED tests off BASE" [shape=box];
        "Write review package, delegate task reviewer panes, one per reviewer agent type (./task-reviewer-brief.md)" [shape=box];
        "Spec OK and quality approved?" [shape=diamond];
        "Finding conflicts with plan text?" [shape=diamond];
        "Rule on the conflict, ledger the ruling" [shape=box];
        "Fix round R of 5: R<=3 same pane; R>=4 fresh pane, escalated agent type; covering tests from a separate fix-round test author" [shape=box];
        "Delegate scoped re-review, one per reviewer agent type (./re-review-brief.md)" [shape=box];
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
    "Delegate final code review (../requesting-code-review/review-brief.md)" [shape=box];
    "Final findings? ONE fix delegation, one scoped re-review, adjudicate residuals" [shape=box];
    "Final review clean: delete this plan's workspace" [shape=box];
    "Use finishing-a-development-branch" [shape=box style=filled fillcolor=lightgreen];

    "Setup: worktree, plan workspace, ledger check, read plan, pre-flight review" -> "Delegate implementer pane (./implementer-brief.md) + test author pane off BASE (./test-author-brief.md)";
    "Delegate implementer pane (./implementer-brief.md) + test author pane off BASE (./test-author-brief.md)" -> "Implementer pane asks questions?";
    "Implementer pane asks questions?" -> "Answer questions, re-delegate" [label="yes"];
    "Answer questions, re-delegate" -> "Implementer commits and self-reviews; test author commits RED tests off BASE";
    "Implementer pane asks questions?" -> "Implementer commits and self-reviews; test author commits RED tests off BASE" [label="no"];
    "Implementer commits and self-reviews; test author commits RED tests off BASE" -> "Cherry-pick tests into task worktree, run them (GREEN or findings)";
    "Cherry-pick tests into task worktree, run them (GREEN or findings)" -> "Write review package, delegate task reviewer panes, one per reviewer agent type (./task-reviewer-brief.md)";
    "Write review package, delegate task reviewer panes, one per reviewer agent type (./task-reviewer-brief.md)" -> "Spec OK and quality approved?";
    "Spec OK and quality approved?" -> "Append completion to ledger, mark todo complete" [label="yes"];
    "Spec OK and quality approved?" -> "Finding conflicts with plan text?" [label="no"];
    "Finding conflicts with plan text?" -> "Rule on the conflict, ledger the ruling" [label="yes"];
    "Rule on the conflict, ledger the ruling" -> "Fix round R of 5: R<=3 same pane; R>=4 fresh pane, escalated agent type; covering tests from a separate fix-round test author";
    "Finding conflicts with plan text?" -> "Fix round R of 5: R<=3 same pane; R>=4 fresh pane, escalated agent type; covering tests from a separate fix-round test author" [label="no"];
    "Fix round R of 5: R<=3 same pane; R>=4 fresh pane, escalated agent type; covering tests from a separate fix-round test author" -> "Delegate scoped re-review, one per reviewer agent type (./re-review-brief.md)";
    "Delegate scoped re-review, one per reviewer agent type (./re-review-brief.md)" -> "All findings addressed?";
    "All findings addressed?" -> "Append completion to ledger, mark todo complete" [label="yes"];
    "All findings addressed?" -> "R = 5?" [label="no"];
    "R = 5?" -> "Fix round R of 5: R<=3 same pane; R>=4 fresh pane, escalated agent type; covering tests from a separate fix-round test author" [label="no - next round"];
    "R = 5?" -> "Adjudicate each open finding" [label="yes - breaker trips"];
    "Adjudicate each open finding" -> "Any load-bearing finding?";
    "Any load-bearing finding?" -> "Rule and continue; stop only if every path forward is a guess" [label="yes"];
    "Any load-bearing finding?" -> "Park findings in ledger with rulings" [label="no"];
    "Rule and continue; stop only if every path forward is a guess" -> "Append completion to ledger, mark todo complete";
    "Park findings in ledger with rulings" -> "Append completion to ledger, mark todo complete";
    "Append completion to ledger, mark todo complete" -> "More tasks remain?";
    "More tasks remain?" -> "Delegate implementer pane (./implementer-brief.md) + test author pane off BASE (./test-author-brief.md)" [label="yes"];
    "More tasks remain?" -> "Delegate final code review (../requesting-code-review/review-brief.md)" [label="no"];
    "Delegate final code review (../requesting-code-review/review-brief.md)" -> "Final findings? ONE fix delegation, one scoped re-review, adjudicate residuals";
    "Final findings? ONE fix delegation, one scoped re-review, adjudicate residuals" -> "Final review clean: delete this plan's workspace";
    "Final review clean: delete this plan's workspace" -> "Use finishing-a-development-branch";
}
```
