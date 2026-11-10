# Profiles

Names put the owner first. `ultra` means four external reviewers; `solo` means no separate coder.
YAML keys start with `orchestrator` when present, then `planning-design`; `generalist` stays last.

| File | Composition and purpose |
|---|---|
| `fable-sol-ultra.yaml` | `Fable 5.2` owner, `GPT-6.1-Sol` coder, four external reviewers. Largest composition. |
| `fable-opus-ultra.yaml` | `Fable 5.2` owner, separate `Opus 5.5` coder, four external reviewers. Largest composition. |
| `sol-astra.yaml` | `GPT-6.1-Sol` owner executes; `GPT-6-Astra` handles planning and reviews. Conserves Codex tokens. |
| `opus-fable.yaml` | `Opus 5.5` owner executes; `Fable 5.2` handles planning and reviews. Conserves Claude tokens. |
| `sol-solo.yaml` | `GPT-6.1-Sol` only. |
| `opus-solo.yaml` | `Opus 5.5` only. |

For the two largest compositions, choose the coder from whichever subscription has the larger token allowance.
The two smaller compositions keep execution on the cheaper owner and delegate only planning and reviews to the upper model.
They override `assignments.plan-and-design.mode` to `delegate`; other assignment fields retain config/default values.
Use `solo` for tasks that need neither complex decisions nor coding.

- Select a profile by setting `profile` in `.herdrpowers/config.yaml` to the filename without its extension.
  Naming a profile in the task instructions selects it for that run only; leave the config unchanged.
  Profiles allow `planning-design`, `orchestrator`, `coder`, `reviewers`, `generalist`, `fallbacks`, `delegation`, and `assignments`.
  Composition slots replace bindings; override maps merge per key, including each assignment's fields. Omitted keys keep config/default values.
  Lists replace, including `[]`; empty override maps change nothing. Null, scalars, and lists are invalid override maps.
  An omitted `orchestrator` keeps the reception pane as owner. Lifecycle permission remains config-only.
- `allow_agent_lifecycle` is a config boolean. Use literal `true` or `false`; `"true"` and `yes` are errors.
  `false` (default): no agent starts, exits, or restarts. Set up any missing agents manually.
  `true`: the owner starts missing targets in available shell panes within scope and ends only idle agents it started.
  Do not create or close panes. Prepare available shell panes beforehand. Chat instructions cannot grant this permission.
- Target keys are the agent kind names shown in `herdr pane list` under `agent` (`claude`, `codex`, etc.). Pane aliases such as `hp-coder` and pane IDs are invalid.
  Use the form `coder: {codex: {model: GPT-6.1-Sol, effort: max}}`.
  Settings are nested. `model` and `effort` are optional nonempty strings; `effort` requires `model`.
  Do not write new `kind@model` targets except in fallback strings.
- `model` and `effort` must match the pane's footer. Do not infer them from provider names.
  Context usage and a plan's `Max` label are not evidence of reasoning effort. Do not silently change template strings.
- `claude` does not show model or effort in its footer by default. Without a statusLine, a `claude` target always fails to match.
  Add this to `~/.claude/settings.json` (`jq` required):
  `{"statusLine": {"type": "command", "command": "jq -r '\"\\(.model.display_name) \\(.effort.level // \"\")\"'"}}`
- `null` is standard YAML null. Bare `none` is a supported literal alias, not YAML null.
  `planning-design`/`coder`/`generalist`: `orchestrator` / `null` / `[]` / `none` binds to the owner.
  `reviewers: [orchestrator]` / `[]` / `null` / `none` selects owner review; it does not disable reviews.
- `delegate` requires a fresh subagent every time, even when targeting the owner. An empty composition does not waive this requirement.
  Apply resolved modes and gates after profile overrides; a resolved disabled gate stays off.
- If the reception pane does not match the owner, always ask whether it should be `unused` or a `relay` before handoff or startup.
- Fallback strings may be overridden per key in a profile. They do not inherit the original target's `effort`.
  Preserve `Calude` exactly. Do not merge distinct names through fuzzy matching or spelling repairs.

See the [composition, selection, and handoff contract](https://github.com/transparent-pegasus/herdrpowers/blob/main/skills/orchestration/references/profiles.md) for details.
