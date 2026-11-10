---
description: Interactive workflow for the entire development cycle with every review gate forced on, ignoring the reviews a repository disabled in its configuration
---

# /strict_full_cycle Workflow

Run the `/full_cycle` workflow exactly as written: read `full_cycle.md` — the workflow file next to this one in the pack's `commands/` directory — and follow every step, rule, and execution requirement in it. This file adds one override and nothing else.

## The Override

**Every review gate runs, whatever `.herdrpowers/config.yaml` says.**

Resolve configuration and the selected composition through `orchestration` and its [profiles contract](../skills/orchestration/references/profiles.md), then ignore `enabled` on every review task in the resolved result. Each counts as `enabled: true` for this run, including later gates. `/full_cycle`'s disabled-gate skip clauses therefore never fire here.

Nothing else changes. Effective profile targets, `role`, `mode`, `fallbacks`, scope, strategy, and lifecycle policy still bind. Separate delegated reviews use reset-backed panes; profile self-target `delegate` requires fresh subagents, while other owner-session modes permit reported self-review and optional subagents. No-profile independence is preserved. Strict mode changes only `enabled`, never targets, modes, or lifecycle permission.

Never write the configuration file. `enabled: false` stays where the user put it; this run declines to honor it and says so in the report.

## What Forcing a Gate On Cannot Do

A gate still needs its resolved execution route. An unoverridden config empty role list retains its disabling semantics; profile empty reviewers instead select the owner. Unavailable separate targets degrade under `orchestration`; a mandatory fresh subagent that cannot spawn is inability, not inline success. Forced on does not prove a review happened; report the actual transport and self-review versus independence.

## Reporting

`/full_cycle`'s final report already names every non-default assignment and every disabled review. Add one section to it: **Review gates forced on by strict mode** — each review task whose resolved `enabled` was `false`, run anyway, with what the repository's configuration said. If no gate was disabled, say so plainly: strict mode changed nothing, and this run is identical to `/full_cycle`.

## When to Use It

When the branch has to clear every gate the pack defines regardless of how this repository is configured: a release branch, a change on a security or money path, or an unfamiliar repository whose configuration you did not write. Otherwise use `/full_cycle`, which honors the repository's own decisions.
