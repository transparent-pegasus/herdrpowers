---
description: Interactive workflow for the entire development cycle with every review gate forced on, ignoring the reviews a repository disabled in its configuration
---

# /strict_full_cycle Workflow

Run the `/full_cycle` workflow exactly as written: read `full_cycle.md` — the workflow file next to this one in the pack's `commands/` directory — and follow every step, rule, and execution requirement in it. This file adds one override and nothing else.

## The Override

**Every review gate runs, whatever `.herdrpowers/config.yaml` says.**

Resolve the configuration the way `orchestration` describes — the repository's `.herdrpowers/config.yaml` first, `orchestration/roles.yaml` for anything it omits — and then ignore `enabled` on every review task in the resolved result. Each counts as `enabled: true` for this run, including any review task a later pack release adds. `/full_cycle`'s "when it is disabled, skip" clauses therefore never fire here.

Nothing else changes. `role` and `mode` still bind for every task, as do `roles:`, `fallbacks:`, and `delegation:` — strict mode does not widen `delegation.pane_scope` to find a pane for a forced-on gate, and does not change `delegation.execution`. Strict mode overrides one key: it never reassigns a role, changes a mode, or relaxes an invariant — review independence remains the reset session (not pane identity), and a review whose role binds to a list of agent types still runs once per entry.

Never write the configuration file. `enabled: false` stays where the user put it; this run declines to honor it and says so in the report.

## What Forcing a Gate On Cannot Do

A gate still needs a pane. If the role a review resolves to has no available agent type — an empty `agents:` list, or no idle pane of any listed type — the gate degrades exactly as `orchestration`'s "Roles that bind to a list" and "Exhaustion and fallback" sections describe. Forced on is a decision, not a guarantee that the review happened; the report names what actually ran.

## Reporting

`/full_cycle`'s final report already names every non-default assignment and every disabled review. Add one section to it: **Review gates forced on by strict mode** — each review task whose resolved `enabled` was `false`, run anyway, with what the repository's configuration said. If no gate was disabled, say so plainly: strict mode changed nothing, and this run is identical to `/full_cycle`.

## When to Use It

When the branch has to clear every gate the pack defines regardless of how this repository is configured: a release branch, a change on a security or money path, or an unfamiliar repository whose configuration you did not write. Otherwise use `/full_cycle`, which honors the repository's own decisions.
