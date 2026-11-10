# Instruction-File Snippet for Target Repositories

The pack works without any of this: skills self-describe, and `/init` (`/herdrpowers:init` on Claude Code) writes the required `Herdrpowers Configuration` section into the target repo's `CLAUDE.md` / `AGENTS.md`. Paste the snippet below **in addition** only when a repository wants the framework rules stated explicitly in its own instruction files (recommended for tools without plugin support, e.g. Aider or Gemini CLI reading a checked-in copy).

```markdown
## Herdrpowers

This repository uses the herdrpowers framework: herdr multi-pane orchestration,
structured skills, and multi-phase workflows for AI-driven development.

Rules:
1. Direct user tasks resolve through `orchestration` and its canonical
   profiles reference. Without a profile, reception owns the task. A selected
   owner mismatch always asks unused versus relay before explicit handoff or
   startup. Only that handoff transfers authority; workers never re-delegate.
2. Separate delegated targets use reset-backed Herdr panes, including the
   implementing pane after reset. With a selected profile, self-target
   `delegate` requires fresh subagents for work and reviews, even with empty
   reviewers; other owner-session modes permit reported self-review and optional
   subagents at owner judgment. Missing mandatory capability is inability,
   never inline substitution or a passed review. No-profile independence stays.
3. The resolved `test-authoring` assignment says which session writes tests —
   a fresh worker that never sees implementation, or the implementing session
   itself. Assertions come from the requirements, never from the code, the RED
   run is quoted in the report, and the report names the test author.
4. Feature work happens on a branch off `<BASE_BRANCH>`, normally in a git
   worktree (`using-git-worktrees` skill) — never directly on the base branch.
5. Follow the workflows: `/init` (one-time setup), `/full_cycle`,
   `/strict_full_cycle` (same cycle, every review gate forced on), `/plan`,
   `/execute`, `/execute_parallel`, `/quick`. Stay inside their phases.
6. Delegated panes write reports to files under `<REPORT_DIRECTORY>` and reply
   with the path plus a completion marker. A "verified" claim is checked
   against that file, not trusted.
7. Design docs and implementation plans are coordination artifacts. Save them
   to `<DESIGN_DOC_PATH_PATTERN>` / `<PLAN_PATH_PATTERN>` and do not commit them.
8. Before claiming completion, use the `verification-before-completion` skill;
   on failures, use `systematic-debugging`.
9. `<KEY>` placeholders resolve from the `Herdrpowers Configuration` section in
   this file. Resolve repo config over shipped roles, then only present selected
   profile keys. Merge fallback/delegation/assignment maps per key; preserve
   custom roles and omitted bindings/settings.
   Empty profile reviewers select the owner; disabled gates stay off. New
   targets use nested kind/model/effort settings and verified live footers;
   fallback strings stay exact and effort-free. Freeze configuration for the run
   and report owner, transports, self-review/independence, changed assignments,
   disabled gates, fallback constraints lost, and test writer.
10. Top-level `allow_agent_lifecycle` is a strict boolean, false by default:
    false forbids start/exit/restart even for recovery or fallback. True lets
    the active owner start a selected target that has no live match in an idle
    in-scope shell pane and end idle agents this task started, only through
    `agent-lifecycle.sh`, which enforces the value and verifies live settings.
    It never creates or closes a workspace, tab, or pane.
```

For checked-in copies, adjust workflow invocation to how your tool reads `commands/` (slash commands, skills, or direct file reads — see [workflows.md](./workflows.md)).
