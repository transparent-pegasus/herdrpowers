---
name: herdr
description: Use when the user explicitly requests Herdr pane, tab, workspace, or agent operations from an existing Herdr session.
---

# Herdr

Before inspecting or changing a Herdr session, load the installed CLI's
operating instructions:

```bash
test "${HERDR_ENV:-}" = 1 || exit 1
herdr --skill
```

Read the complete output and follow it for this session. The installed binary
supplies the guide locally; no repository clone or separate skill installation
is needed.

If `HERDR_ENV` is not `1`, stop Herdr operations and explain that the agent
must run inside Herdr. If `herdr --skill` fails, report that the installed
Herdr must support that flag and stop; do not substitute a downloaded copy.

For development-task delegation, follow `orchestration` and
`using-herdr-sibling-panes` as well. Their routing and composer-submission
rules still apply.

Before starting, exiting, or restarting any agent, read
[`orchestration/references/profiles.md`](../orchestration/references/profiles.md)
and resolve the applicable top-level `allow_agent_lifecycle` policy from repo
config over shipped defaults. It is a strict boolean, false when omitted;
a profile or nested delegation field cannot grant it. False prohibits these
process actions even for handoff, fallback, or recovery. True permits them
only through `using-herdr-sibling-panes/scripts/agent-lifecycle.sh`; read
[its reference](../using-herdr-sibling-panes/references/agent-lifecycle.md)
before acting. The helper enforces the value and exits `6` otherwise.

Start only in available in-scope shell panes, verify live model/effort, and
record agents actually started for this task. End only those agents once idle
with no pending work, with the exit keys verified for that CLI. Permission does
not authorize interrupting working agents, widening scope, or destroying
workspace/tab/pane topology. A mismatched profile owner always requires the
unused-versus-relay answer before handoff or startup. `herdr --skill` remains
authoritative for supported commands; never invent a stop command.
