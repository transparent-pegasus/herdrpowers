# Instruction-File Snippet for Target Repositories

The pack works without any of this: skills self-describe, and `/init` (`/herdrpowers:init` on Claude Code) writes the required `Herdrpowers Configuration` section into the target repo's `CLAUDE.md` / `AGENTS.md`. Paste the snippet below **in addition** only when a repository wants the framework rules stated explicitly in its own instruction files (recommended for tools without plugin support, e.g. Aider or Gemini CLI reading a checked-in copy).

```markdown
## Herdrpowers

This repository uses the herdrpowers framework: herdr multi-pane orchestration,
structured skills, and multi-phase workflows for AI-driven development.

Rules:
1. Tasks that arrive directly from the user are routed through the pane that
   received them (the orchestrator) via the `orchestration` skill. A task
   delegated from another pane is executed in place and never re-delegated.
   In-process subagents are not used.
2. Independence comes from fresh pane context: the pane that writes code never
   reviews it, and plans get two independent reviews from two agent types
   before approval. No configuration relaxes this.
3. The pane implementing a task writes that task's tests and owns
   RED-GREEN-REFACTOR. Assertions come from the requirements, never from the
   code, and the RED run is quoted in the report.
4. Feature work happens on a branch off `<BASE_BRANCH>`, normally in a git
   worktree (`using-git-worktrees` skill) — never directly on the base branch.
5. Follow the workflows: `/init` (one-time setup), `/full_cycle`, `/plan`,
   `/execute`, `/execute_parallel`, `/quick`. Stay inside their phases.
6. Delegated panes write reports to files under `<REPORT_DIRECTORY>` and reply
   with the path plus a completion marker. A "verified" claim is checked
   against that file, not trusted.
7. Design docs and implementation plans are coordination artifacts. Save them
   to `<DESIGN_DOC_PATH_PATTERN>` / `<PLAN_PATH_PATTERN>` and do not commit them.
8. Before claiming completion, use the `verification-before-completion` skill;
   on failures, use `systematic-debugging`.
9. `<KEY>` placeholders resolve from the `Herdrpowers Configuration` section in
   this file. Routing resolves from `.herdrpowers/config.yaml`: a role list plus
   a role and a mode for every delegation task. It is read once before the first
   delegation and never written from inside a run. Any non-default assignment or
   disabled review is named in the workflow's final report.
```

For checked-in copies, adjust workflow invocation to how your tool reads `commands/` (slash commands, skills, or direct file reads — see [workflows.md](./workflows.md)).
