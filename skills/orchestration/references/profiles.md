# Profiles, Targets, and Active Ownership

Read this reference before resolving ownership or routing any task. It is the
composition contract for `orchestration`; configuration is interpreted by the
skills, not by a separate parser or execution service. Paths below distinguish
the target repository (`<repo-root>`) from the installed plugin (`<pack>`):
the directory holding `skills/`, three levels above this file.

## Resolve once, by key presence

1. Read `<pack>/skills/orchestration/roles.yaml`, then overlay the target
   repository's `.herdrpowers/config.yaml` using the existing per-key rules.
   An absent repo file uses shipped defaults. Lists replace lists; they never
   concatenate, including empty fallback arrays. Keep custom roles and task
   assignments. An explicit role binding replaces its prior `agent`/`agents`
   binding rather than leaving both forms active.
2. Resolve the top-level `profile` and `allow_agent_lifecycle` separately from
   `delegation`. Missing, YAML null, or literal `none` for `profile` means no
   selection. A selected name must be a string matching
   `[A-Za-z0-9][A-Za-z0-9_-]*`: a simple filename without extension, separators,
   or traversal. An empty string, another scalar type, or a collection is an
   explicit configuration error, not no selection. `allow_agent_lifecycle`
   must be a strict YAML boolean; omission uses the shipped false. Strings
   such as `"false"`, null, and collections are errors for this policy.
   A lifecycle policy nested under `delegation` or inside a profile is invalid
   and cannot authorize lifecycle actions.

   A profile the user names in the task itself ("run this with `fable-opus`"),
   or an explicit request to use none, selects the composition for that run
   and takes precedence over the configured `profile`. Validate it the same
   way and leave the configuration file unchanged. This covers selection
   only: lifecycle permission comes from configuration alone, never from chat.
3. For a selected name, read `<repo-root>/.herdrpowers/profiles/<name>.yaml`
   first; only if that file is absent, read the shipped
   `<pack>/.herdrpowers/profiles/<name>.yaml`. An invalid local file is an error,
   not permission to use the shipped copy. Missing selected files, malformed
   YAML, invalid targets, and extra profile keys must be reported explicitly;
   stop profile routing instead of silently using legacy defaults.
4. Overlay only keys **present** in that profile, using the table below. Do
   not use truthiness, fill missing profile keys from another profile, or
   expand the profile into assignments. Resolve owner aliases after this
   overlay. A selected profile never rewrites `assignments.*.role`, `mode`,
   `enabled`, `delegation`, or `fallbacks`.
5. Reconcile the reception pane with the selected owner as described below,
   then freeze the selected file, effective targets, assignments, scope,
   execution strategy, and lifecycle permission for the run. Do not rewrite
   configuration or switch profiles to escape a missing agent or a gate.

Profiles contain only `orchestrator`, `generalist`, `coder`, and `reviewers`.
Each is optional in a custom profile; shipped compositions live in the six YAML
assets, which are the source of truth for their values and reviewer order.

| Profile key | When absent | When present |
|---|---|---|
| `orchestrator` | Keep the legacy owner, the pane receiving the user's task | One nested target selects the active owner; null, `none`, and lists are invalid |
| `generalist` | Keep the resolved `roles.generalist` binding | The bare `orchestrator` alias binds Generalist tasks to the active owner |
| `coder` | Keep the resolved `roles.coder` binding | One nested target replaces that binding; null, `[]`, or literal `none` binds it to the active owner, with no separate coder |
| `reviewers` | Keep the resolved `roles.reviewer` binding | A nonempty list of nested targets replaces that binding in order; `[]`, null, or literal `none` binds it to the active owner, with no external reviewers |

**Empty profile reviewers choose a reviewer; they do not disable a gate.**
An enabled review still runs, and an explicitly delegated review still needs
a fresh subagent when its target is the owner. An `enabled: false` gate stays
off (except the existing `/strict_full_cycle` enabled-only override).
Legacy `roles.<role>.agents: []` still disables tasks using that binding when
the selected profile has not overridden it; profile omission must not
reactivate it. The profile's explicit empty `coder` or `reviewers` replaces
that binding, so legacy empty-list disabling no longer applies to it.

Owner selection does not replace `planning-design` or `generalist` bindings.
An existing `agent: orchestrator` is a dynamic alias for the active owner;
custom bindings to other targets remain intact, as do all user-added roles.
A concrete coder/reviewer target remains a separate worker even when its
kind/model equals the owner's. Only an owner alias or a mode resolving to
the owner is a self-target.

## Target shape and migration

A new target is a one-key mapping from an agent kind to a settings mapping:

```yaml
coder:
  codex:
    model: GPT-6.1-Sol
    effort: max
```

Settings may contain only `model` and `effort`, each an optional nonempty
string. `{codex: {}}` constrains only kind. Effort requires model. Multiple
kinds, a scalar instead of the settings mapping, an empty/malformed model or
effort, or an unsupported scalar/collection where a target is required is an
error, not an omitted constraint. New profiles always use nested targets.
Newly written roles use them too, except the bare `orchestrator` alias.

Read old role bindings containing a bare kind, bare `orchestrator`, or
non-fallback `kind@model`. Normalize `kind@model` to the nested target in
memory and report its deprecation; init writes the canonical nested form.
Do not rewrite configuration during a run. `orchestrator@model` and nested
settings for that alias are invalid: select an owner through the profile.
Fallbacks retain their existing string syntax, described below.

Herdr targets must match kind and every requested model/effort constraint.
Preserve the original strings in configuration, handoffs, helper arguments,
and reports. Compare model text case-insensitively against the live footer;
compare effort as case-insensitive semantic tokens, with `Extra High` and
`xhigh` aliases. `High` does not match `Extra High`; `max` in transcript,
context usage, or plan text is not reasoning evidence. Cursor's bare `Max`
plan label does not establish reasoning effort.

Use `using-herdr-sibling-panes` and its `pane-model.sh PANE [MODEL [EFFORT]]`
and `composer-submit.sh PANE INSTRUCTION [MODEL [EFFORT]]` contracts. Verify
requested settings before any key and after the reset. Missing or unknown
footer evidence fails closed; startup flags, config, headers, and transcript
cannot prove a match. An unrecognized CLI layout needs observed footer
evidence and helper support before it can verify that constraint. Routing
selects a matching agent; it never changes an existing agent's model/effort.

## Reception and owner handoff

Without a selected profile, the reception pane remains the owner and legacy
routing/review independence applies. With a profile, check whether the
reception pane matches the selected owner target, including requested model
and effort — like any other target, by its `agent` kind and
`pane-model.sh "$HERDR_PANE_ID" MODEL [EFFORT]`. A pane whose footer shows no
such evidence does not match. If the profile omitted `orchestrator`, keep the
reception owner.

**A mismatch always requires the reception-role question**, even if an exact
owner is already idle, a shell is available, or lifecycle permission is true:
ask whether the reception pane should be **unused** or act as a **relay**.
Do not infer relay consent from silence, urgency, or the availability of a
matching pane. No owner handoff or agent startup precedes the answer.

After the answer, resolve an **effective owner target** within the frozen pane
scope, in this order:

1. A live agent matching the profile's primary target. Wait for a busy match
   rather than interrupting it.
2. With lifecycle true and no live match in scope, start the primary in an
   available in-scope shell pane, per the lifecycle section below: the
   selected composition is stood up before any substitute is considered.
3. If the primary is exhausted, or cannot be started and verified, apply the
   exact fallback lookup below and try its substitutes left to right — a live
   match first, a guarded start only with lifecycle true. Skip exhausted
   targets.

Owner selection uses the same approved fallback map as worker selection. An
exact empty list permits no substitute. A fallback has only its own kind/model
constraints and no effort constraint; do not carry primary effort into the
handoff helper or pretend the substitute matches the primary target.

If nothing can serve, report the manual setup needed for the primary or an
allowed substitute. With lifecycle false that is the outcome as soon as live
candidates run out: a shell is not an agent, and nothing is started. Verify the
effective target before transferring authority.
The mismatched reception pane keeps its chosen unused/relay role; it is never
silently promoted to fallback owner, even if a bare-kind substitute matches it.
Neither fallback nor lifecycle permission waives the reception-role question.

Send an explicit **orchestrator handoff**, containing:

- The original user instruction, constraints, and current task state.
- Absolute repository/worktree paths, selected profile name/path, frozen
  effective targets, assignments/gates, scope/strategy, and lifecycle policy.
- The primary and effective owner targets, any fallback key/substitute used,
  and lost constraints. Keep the profile file unchanged; owner aliases bind
  to the verified effective owner.
- An explicit transfer of decision authority to the verified effective owner,
  the reception pane's chosen unused/relay role, and the communication path.
- That this is ownership transfer, not worker delegation: the new owner may
  orchestrate; workers may not. The handoff must not bounce ownership back.

Use the verified sibling-pane submission transport, with the effective target's
own model/effort constraints (no effort argument for a fallback). A relay carries
messages and results; it retains no routing or
final-decision authority. An unused reception pane takes no further work.
If verification fails, report the failed handoff rather than treating the
mismatched reception pane as the owner. Runtime pane IDs belong in the run's
handoff/report, never in profile templates.

## Lifecycle is a separate permission

The top-level boolean applies during owner handoff, normal routing, recovery,
and fallback, with or without a profile. It governs Herdr agent processes;
creation of the profile routing table's in-process task subagents is a
separate routing operation and remains allowed when this boolean is false.

The value works at runtime, not only on paper: every start and end goes
through `using-herdr-sibling-panes/scripts/agent-lifecycle.sh`, which reads
the resolved value and exits `6` without sending anything unless it is the
literal `true`. Read
[its reference](../../using-herdr-sibling-panes/references/agent-lifecycle.md)
before the first lifecycle action; it holds the procedure, the exit codes, the
observed start arguments and exit keys per CLI, and Claude's statusLine
requirement.

- **False:** reuse existing matching live agents only. Do not start, exit, or
  restart agents to satisfy routing, whether through the helper, Herdr, shell
  commands, composer keys, or recovery argv. Report required manual setup when
  existing candidates and allowed fallbacks cannot serve the task. Resetting a
  live worker's conversation through the normal submission helper is still
  the delegation transport; it does not authorize restarting its agent process.
- **True:** the active owner stands up what the frozen routes need and removes
  it afterwards.
  - **Start** when a resolved target the run needs — the selected owner, a
    separate coder or reviewer slot, or an allowed substitute — has no
    matching live agent in scope. A busy match is waited for, not duplicated.
    Start the primary before trying its substitutes; an exhausted target is
    not restarted. Use an available shell pane inside the already resolved
    scope. Native launch arguments come from the target CLI's own help and
    are only an attempt: the helper verifies the live kind/model/effort
    footer, and the normal pre/post-reset checks still follow. An agent whose
    footer does not verify is not that target. Unknown startup or footer
    support is a reported inability, not a reason to fabricate success.
  - **End** only agents actually started for this task, once idle with no
    pending work or delegation: when the run needs them no more, when another
    resolved target needs their shell pane, and at the latest before the
    final report. The helper's ledger records what the task started and
    refuses everything else. An owner started for a handoff holds the task:
    it is left running and reported.

Permission true does not widen scope, authorize topology changes (no pane,
tab, or workspace is created or closed), interrupt working agents, answer a
startup dialog for the user, or make existing unrelated agents task-owned.
Preserve unrelated sessions/processes and every working agent. If an
operation cannot be verified — an unknown CLI layout, a kind without verified
exit keys, an open dialog — leave the agent and report it. Never invent a
stop command. Workers never start or end agents.

## Profile routing: mode takes precedence

Apply gate enablement first. Then resolve the assignment and its effective
target. A selected composition changes targets, never assignment modes.

| Resolved route with a selected profile | Execution |
|---|---|
| `delegate`, separate target | A fresh reset-backed in-scope Herdr worker, one per list entry |
| `delegate`, current owner target | A **fresh in-process subagent**, for work and reviews alike; empty reviewers and solo coder do not permit inline execution |
| `orchestrator` | Active owner's session; same-session self-review is allowed, with a fresh subagent optional at the owner's judgment |
| `implementer` | The session already owning that task; if that is the active owner, the same owner-session/optional-subagent rule applies |

**Explicit `delegate` wins over empty reviewers.** No external reviewers
means the owner is the reviewer; the mode still decides how that review is
executed. If the runtime cannot spawn the required fresh subagent, report an
inability/degraded gate without claiming it passed. Do not silently run it
inline or disable it. This also applies if fallback leaves a delegated task
resolved to the owner. Give each subagent the self-contained task/review
brief and the no-re-delegation constraint; the active owner keeps synthesis
and decisions. Workers in any transport never re-delegate.

Report same-session self-review honestly as self-review, not independent
review. A selected-profile nondelegated review permits that choice. A
separate reset-backed reviewer still has structural independence, and a
list of separate targets still requires distinct types or distinct pinned
models of one type; effort alone does not make two slots independent. Keep
the legacy fresh-subagent rule for no-profile `mode: orchestrator` reviews,
and all other no-profile independence rules. Profile exceptions are scoped
here; they do not grant worker re-delegation or revive disabled gates.

## Fallback lookup and effort

Read fallback data from the resolved `fallbacks` map, never from profiles.
These lookup rules apply to owner selection and worker targets alike; owner
fallback still obeys the reception-role question and explicit handoff above.
For a nested primary target, form its `kind@model` key using the preserved
model string. If that exact key exists, use its list, **including `[]`**.
Only an absent exact key permits lookup by bare kind. A target without a
model goes directly to bare kind. No fuzzy aliases, spelling repairs, list
concatenation, or fallback-to-shipped substitution for explicit empties.

Keys and substitutes remain `kind@model` or bare-kind strings. A substitute
has **no effort constraint**: discard the primary effort, do not propagate
it into helper arguments, and do not invent a replacement. A pinned
substitute still needs its own model footer match and an in-scope candidate.
Record the loss of the primary effort constraint with the fallback result.

The shipped strings deliberately include `Calude`. The profile model
`muse-1.0-wonder` and fallback key model `muse-wonder-1.0` deliberately differ;
they do not match each other. Leave both spellings intact and report that
lookup result rather than silently unifying them. The exact shipped map is
in `roles.yaml` and must not be duplicated into profile assets.

## Init and run record

Follow `commands/init.md` to install only missing shipped templates and
`.herdrpowers/profiles/README.md`. Copy the README only when its local
destination is absent; preserve an existing local README byte for byte on
repeat init. Preserve custom local profiles and the existing selection, and
write canonical nested role targets plus the separate top-level selection/policy.
Init never selects a profile merely because it installed one. Runtime
resolution can use a shipped profile before init; a missing selected custom
profile is still an explicit error.

The final run report names the selected profile or no selection, effective
owner and reception role, target/model/effort evidence, transport for each
task/review, self-review versus independent review, fallbacks and lost
constraints, unavailable routes, lifecycle actions and task-owned agents
left running, test writer, changed assignments, and disabled/forced gates.
Do not confuse an empty reviewer composition, a disabled gate, and an
unavailable mandatory subagent: each produces a different record.
