# Profiles

Names follow the owner-coder pattern (orchestrator-implementer). `panel` means four external reviewers; `solo` means no separate coder.

| File | Composition and purpose |
|---|---|
| `fable-sol-panel.yaml` | `Fable 5.2` owner, `GPT-6.1-Sol` coder, four external reviewers. Largest composition. |
| `fable-opus-panel.yaml` | `Fable 5.2` owner, separate `Opus 5.5` coder, four external reviewers. Largest composition. |
| `astra-sol.yaml` | `GPT-6-Astra` owner, `GPT-6.1-Sol` coder; the owner reviews. Conserves Codex tokens. |
| `fable-opus.yaml` | `Fable 5.2` owner, `Opus 5.5` coder; the owner reviews. Conserves Claude tokens. |
| `sol-solo.yaml` | `GPT-6.1-Sol` only. |
| `opus-solo.yaml` | `Opus 5.5` only. |

For the two largest compositions, choose the coder from whichever subscription has the larger token allowance.
The smaller compositions use owner reviews to leave more tokens available for reviewing heavier work.
Use `solo` for tasks that need neither complex decisions nor coding.

- Select a profile by setting `profile` in `.herdrpowers/config.yaml` to the filename without its extension.
  Naming a profile in the task instructions selects it for that run only; leave the config unchanged.
  Profiles contain only the `orchestrator`, `generalist`, `coder`, and `reviewers` composition keys.
  Omitted `coder` and `reviewers` keep the resolved role bindings; an omitted `orchestrator` keeps the reception pane as owner.
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
  `coder`/`generalist`: `orchestrator` / `null` / `[]` / `none` binds to the owner.
  `reviewers: [orchestrator]` / `[]` / `null` / `none` selects owner review; it does not disable reviews.
- `delegate` requires a fresh subagent every time, even when targeting the owner. An empty composition does not waive this requirement.
  Disabled gates stay disabled. Selecting a composition must not change modes or gates.
- If the reception pane does not match the owner, always ask whether it should be `unused` or a `relay` before handoff or startup.
- Fallback strings belong in the config or default roles. They do not inherit the original target's `effort`.
  Preserve `Calude`, `muse-1.0-wonder`, and `muse-wonder-1.0` exactly. Do not merge distinct names through fuzzy matching or spelling repairs.

See the [composition, selection, and handoff contract](https://github.com/transparent-pegasus/herdrpowers/blob/main/skills/orchestration/references/profiles.md) for details.
