#!/usr/bin/env bash
set -euo pipefail

# Print the model line a pane's agent CLI renders in its footer, and optionally
# check it against a model. herdr reports a pane's agent kind but not its model,
# and a CLI's splash header goes stale after a /model switch, so the footer
# below the composer is the only per-pane source.
#
# usage: pane-model.sh <pane-id> [<model>]
#        pane-model.sh --kind <agent-kind> [<model>] < screen-text
#
# exit 0  model line printed — and, with <model>, it contains <model>,
#         compared case-insensitively
# exit 1  no model line on the screen, or it does not contain <model>
# exit 2  bad usage, unknown pane, or the pane runs no agent
# exit 3  no model-line rule for this agent kind

if [[ ${1-} == --kind ]]; then
  if [[ $# -lt 2 || $# -gt 3 || -z $2 ]]; then
    echo "usage: pane-model.sh --kind <agent-kind> [<model>] < screen-text" >&2
    exit 2
  fi
  kind=$2
  shift 2
  screen=$(cat)
else
  if [[ $# -lt 1 || $# -gt 2 || -z $1 ]]; then
    echo "usage: pane-model.sh <pane-id> [<model>]" >&2
    exit 2
  fi
  pane_id=$1
  shift
  if ! pane=$(herdr pane get "$pane_id" 2>/dev/null); then
    echo "unknown pane: $pane_id" >&2
    exit 2
  fi
  kind=$(python3 -c 'import sys,json;print(json.load(sys.stdin)["result"]["pane"].get("agent") or "")' <<<"$pane")
  if [[ -z $kind ]]; then
    echo "pane $pane_id runs no agent" >&2
    exit 2
  fi
  if ! screen=$(herdr pane read "$pane_id" --source visible 2>/dev/null); then
    echo "cannot read pane $pane_id" >&2
    exit 2
  fi
fi

model=
if (($#)); then
  model=$1
  if [[ -z $model || $model == *$'\n'* ]]; then
    echo "model must be one non-empty line" >&2
    exit 2
  fi
fi

PANE_MODEL_SCREEN=$screen python3 - "$kind" "$model" <<'PY'
import os
import re
import sys

kind, model = sys.argv[1], sys.argv[2]

# kind -> (composer anchor, how the model line is found below the last line
# that starts with the anchor). Observed on herdr 0.9.3, 2026-10-09.
#   separated  a border or blank line closes the composer — a wrapped composer
#              spans several lines — and the model line is the first text line
#              after that separator
#   next       the model line is the first text line after the anchor
#   anchor     the anchor line itself is the model line (opencode draws it
#              inside its composer box)
rules = {
    "claude": ("❯", "separated"),
    "codex": ("›", "separated"),
    "cursor": ("→", "separated"),
    "agy": (">", "separated"),
    "grok": ("❯", "next"),
    "opencode": ("┃", "anchor"),
}
if kind not in rules:
    print(f"no model-line rule for agent kind '{kind}'", file=sys.stderr)
    sys.exit(3)
anchor, layout = rules[kind]

has_text = re.compile(r"[A-Za-z0-9]").search
lines = os.environ["PANE_MODEL_SCREEN"].splitlines()
# str.strip() also drops U+00A0, which claude prints after its anchor.
anchors = [i for i, line in enumerate(lines) if line.strip().startswith(anchor)]
if not anchors:
    print(f"no '{anchor}' composer line on the {kind} screen", file=sys.stderr)
    sys.exit(1)

if layout == "anchor":
    candidates = [lines[anchors[-1]].strip()[len(anchor):]]
else:
    candidates = lines[anchors[-1] + 1:]
    if layout == "separated":
        gap = next((i for i, line in enumerate(candidates) if not has_text(line)), None)
        candidates = [] if gap is None else candidates[gap + 1:]

found = next((line.strip() for line in candidates if has_text(line)), None)
if found is None:
    print(f"no model line below the {kind} composer", file=sys.stderr)
    sys.exit(1)
print(found)
if model and model.casefold() not in found.casefold():
    print(f"model line '{found}' does not contain '{model}'", file=sys.stderr)
    sys.exit(1)
PY
