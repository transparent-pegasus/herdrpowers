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
