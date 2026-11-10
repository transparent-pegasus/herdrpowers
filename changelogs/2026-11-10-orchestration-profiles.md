---
change_type: pack-native
pack_version: 1.21.0
previous_pack_version: 1.20.0
date: 2026-11-10
---

# v1.21.0 — Orchestration profiles, effort, and agent lifecycle

Advances the pack from 1.20.0 to 1.21.0 across the four versioned plugin and
marketplace manifests and `package.json`.

## Composition profiles

Six composition templates ship under `.herdrpowers/profiles/`. Consumer config
selects one with `profile`; a profile named in the task selects that run's
composition without rewriting config. Init installs only missing templates and
preserves custom files and selection on repeat runs. Resolve repo config over
shipped roles, then overlay only present profile composition slots. Omitted
slots keep roles; empty coder selects solo execution and empty reviewers select
the owner, without changing assignment modes or gate enablement.

A concise Japanese README in that directory records naming and composition
intent: heaviest Fable-led panels, contract-token-based coder choice, reviewer
token savings, and solo tasks without complex decisions or coding. It explains
Herdr kind names, visible model/effort strings, null/none pitfalls, the
lifecycle boolean, and the statusLine a `claude` target needs. Init copies the
README only if absent, preserving local edits; npm ships it too, and
`.codexignore` no longer excludes the shipped profiles.

New profile and role targets use nested kind/model/effort settings. Legacy
non-fallback model pins remain migration input; fallback strings remain exact
and effort-free. A matched empty fallback list is authoritative; fallback drops
the primary effort. Preserve `Calude` and the unequal profile model
`muse-1.0-wonder` / fallback key model `muse-wonder-1.0` spellings.

Live footer evidence verifies requested model and effort before keys and after
reset. Helpers retain old invocations and accept optional effort after model.
Unknown effort fails closed; transcript text and Cursor's bare Max plan label
cannot establish reasoning effort. Concrete targets remain separate workers
even when their kind/model equals the owner's.

## Ownership and agent lifecycle

A selected-owner mismatch always asks whether reception is unused or relay
before explicit handoff or startup. The effective owner is a live match of the
selected target; with lifecycle permission the selected target is started
before any substitute; only an exhausted or unstartable primary falls back,
through the same exact map as workers, dropping the primary effort and keeping
the reception pane's chosen role.

Top-level `allow_agent_lifecycle` is a separate strict boolean, false by
default, and it now works at runtime rather than as prose. The new
`using-herdr-sibling-panes/scripts/agent-lifecycle.sh` reads the resolved value
on every call and exits 6 without sending anything unless it is the literal
`true`; a quoted string, `yes`, null, a duplicate, or a nested key grants
nothing, and neither does a chat instruction.

With true, the active owner starts a resolved target that has no live in-scope
match through `herdr agent start`, in a shell pane inside
`delegation.pane_scope` and the task's repository, after discarding any
half-typed prompt line. Native model/effort arguments come from the CLI's own
help and are only an attempt: the helper polls the live footer and reports a
started agent that does not verify (exit 5) or that sits at a startup dialog
(exit 4), which is never answered for the user. A per-task ledger records what
was started. `stop` ends only those agents, only while idle and still the same
process, only from a composer whose verified footer is still visible, with one
key sequence observed per CLI on herdr 0.9.5: Claude Code 2.1.321
`ctrl+c ctrl+c`, codex-cli 0.167.0 `ctrl+c`, cursor-agent 2026.11.05 `ctrl+d`,
opencode 2.0.32 `ctrl+c`. agy, muse, and grok were not verifiable and are left
running and reported. No pane, tab, or workspace is created or closed.

Claude Code prints no model or effort below its composer, so a `claude` target
with a model failed closed on a default installation. The lifecycle reference
gives the statusLine that prints `<model> <effort>`: passed as `--settings` to
an agent the task starts, or set by the user for a pane they start by hand.
Init reports the missing setting and never writes user settings.

## Routing

Separate delegated targets keep reset-backed Herdr transport. With a selected
profile, self-target `delegate` requires fresh in-process subagents for work
and reviews, including empty reviewers; other owner-session modes permit
reported self-review and optional subagents. Missing mandatory capability is
inability, never inline delegation or a passed gate. Workers never re-delegate;
explicit owner handoff transfers authority separately. No-profile routing and
review independence remain unchanged.

Consumer workflows, skills, review briefs, root documentation, and plugin
descriptions now follow the canonical profiles contract. Profile self-target
fixes retain their mode through the five-round loop; separate-target escalation,
test ownership, disabled gates, and fresh skill-authorship samples are preserved.
Reports distinguish self-review, independent review, unavailable routes, lost
fallback constraints, and lifecycle actions.

## Verification

`tests/agent-lifecycle/` drives the real helper against an offline herdr stub:
the permission gate, scope and repository guards, ledger ownership, footer
verification, and each CLI's exit keys. `tests/orchestration-profiles/` checks
that npm ships exactly the six templates and their README from `.herdrpowers/`.
The start, verify, and stop path was also exercised live for claude, codex,
cursor, and opencode in an isolated herdr session.
