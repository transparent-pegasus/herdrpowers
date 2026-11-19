# Profiles

Names put the owner first. `solo` means one agent does everything.
YAML keys start with `orchestrator` when present, then `roles` (`planning-design` first, `decision-maker` next, `generalist` last), then override maps such as `assignments`.

| File | Composition and purpose |
|---|---|
| `fable.yaml` | `Fable 5.2` owner plans and decides; `any` coder; `GPT-6.2-Astra` and `Gemini 4 Neon` review; `Gemini 4 Hydrogen` generalist. |
| `neon-fable.yaml` | `Gemini 4 Neon` owner; `Fable 5.2` handles planning and decisions; `any` coder; `GPT-6.2-Astra` and `Gemini 4 Neon` review; `Gemini 4 Hydrogen` generalist. |
| `solo.yaml` | `any` owner only. |

`any` is filled in the task: name the profile, then the target, as in `solo Opus 5.5 max` or `neon-fable coder: codex`.
For `fable` and `neon-fable`, name the coder from whichever subscription has the larger token allowance.
`neon-fable` overrides `assignments.plan-and-design.mode` and `assignments.decision-making.mode` to `delegate`; other assignment fields retain config/default values.
Use `solo` for tasks that need neither complex decisions nor coding.

- Select a profile by setting `profile` in `.herdrpowers/config.yaml` to the filename without its extension.
  Naming a profile in the task instructions selects it for that run only; leave the config unchanged.
  Profiles allow top-level `orchestrator`, `roles`, `fallbacks`, `delegation`, and `assignments`; other top-level keys are errors.
  `roles` takes `planning-design`, `decision-maker`, `coder`, `reviewers`, `generalist`, and custom roles, which act only through `assignments`.
  Role entries replace bindings; override maps merge per key, including each assignment's fields. Omitted keys keep config/default values.
  Lists replace, including `[]`; empty override maps change nothing. Null, scalars, and lists are invalid override maps.
  An omitted `orchestrator` keeps the reception pane as owner. Lifecycle permission remains config-only.
- `allow_agent_lifecycle` is a config boolean. Use literal `true` or `false`; `"true"` and `yes` are errors.
  `false` (default): no agent starts, exits, or restarts. Set up any missing agents manually.
  `true`: the owner starts missing targets in available shell panes within scope and ends only idle agents it started.
  Do not create or close panes. Prepare available shell panes beforehand. Chat instructions cannot grant this permission.
- Target keys are the agent kind names shown in `herdr pane list` under `agent` (`claude`, `codex`, etc.). Pane aliases such as `hp-coder` and pane IDs are invalid.
  Use the form `roles: {coder: {codex: {model: GPT-6.2-Sol, effort: max}}}`.
  Settings are nested. `model` and `effort` are optional nonempty strings; `effort` requires `model`.
  Do not write new `kind@model` targets except in fallback strings.
- Bare `any` may stand for `orchestrator` or a one-target role, not a list entry, fallback, or config value.
  Fill it as `slot: value` (`coder: codex`); right after the name of a profile with one `any` slot, the bare value is enough.
  A value is an optional kind, then optional model and effort. Omitted parts stay open: `codex` means any codex model and effort.
  A value without a kind matches any kind whose footer shows that model and effort, but is never started or replaced by a fallback.
  An unfilled slot accepts any agent; unfilled `solo` keeps the receiving pane as owner. A value for a slot not written `any` is an error.
- `model` and `effort` must match the pane's footer. Do not infer them from provider names.
  Context usage and a plan's `Max` label are not evidence of reasoning effort. Do not silently change template strings.
- `claude` does not show model or effort in its footer by default. Without a statusLine, a `claude` target always fails to match.
  Add this to `~/.claude/settings.json` (`jq` required):
  `{"statusLine": {"type": "command", "command": "jq -r '\"\\(.model.display_name) \\(.effort.level // \"\")\"'"}}`
- `null` is standard YAML null. Bare `none` is a supported literal alias, not YAML null.
  `roles.planning-design`/`decision-maker`/`coder`/`generalist`: `orchestrator` / `null` / `[]` / `none` binds to the owner.
  `roles.reviewers: [orchestrator]` / `[]` / `null` / `none` selects owner review; it does not disable reviews.
- `delegate` requires a fresh subagent every time, even when targeting the owner. An empty composition does not waive this requirement.
  Apply resolved modes and gates after profile overrides; a resolved disabled gate stays off.
- If the reception pane does not match the owner, always ask whether it should be `unused` or a `relay` before handoff or startup.
- Fallback strings may be overridden per key in a profile. They do not inherit the original target's `effort`.
  Preserve exact user strings. Do not merge distinct names through fuzzy matching or spelling repairs.

See the [composition, selection, and handoff contract](https://github.com/transparent-pegasus/herdrpowers/blob/main/skills/orchestration/references/profiles.md) for details.
