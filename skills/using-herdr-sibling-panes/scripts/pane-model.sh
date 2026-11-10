#!/usr/bin/env bash
set -euo pipefail

# Print the model line a pane's agent CLI renders in its footer, and optionally
# check it against a model and effort. herdr reports a pane's agent kind but not its model,
# and a CLI's splash header goes stale after a /model switch, so the footer
# below the composer is the only per-pane source.
#
# usage: pane-model.sh <pane-id> [<model> [<effort>]]
#        pane-model.sh --kind <agent-kind> [<model> [<effort>]] < screen-text
#
# exit 0  model line printed — and, with <model>, it contains <model>,
#         compared case-insensitively, and any requested effort matches exactly
# exit 1  no model line, model mismatch, or missing/mismatched effort evidence
# exit 2  bad usage, unknown pane, or the pane runs no agent
# exit 3  no model-line rule for this agent kind

pane_id=
if [[ ${1-} == --kind ]]; then
  if [[ $# -lt 2 || $# -gt 4 || -z $2 ]]; then
    echo "usage: pane-model.sh --kind <agent-kind> [<model> [<effort>]] < screen-text" >&2
    exit 2
  fi
  kind=$2
  shift 2
else
  if [[ $# -lt 1 || $# -gt 3 || -z $1 ]]; then
    echo "usage: pane-model.sh <pane-id> [<model> [<effort>]]" >&2
    exit 2
  fi
  pane_id=$1
  shift
fi

model=${1-}
effort=${2-}
if (($#)); then
  if [[ -z ${model//[[:space:]]/} || $model == *$'\n'* || $model == *$'\r'* ]]; then
    echo "model must be one non-empty line" >&2
    exit 2
  fi
fi
if (($# == 2)); then
  if [[ -z ${effort//[[:space:]]/} || $effort == *$'\n'* || $effort == *$'\r'* ]]; then
    echo "effort must be one non-empty line and requires a model" >&2
    exit 2
  fi
fi

if [[ -n $pane_id ]]; then
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
else
  screen=$(cat)
fi

PANE_MODEL_SCREEN=$screen python3 - "$kind" "$model" "$effort" <<'PY'
import os
import re
import sys

kind, model, effort = sys.argv[1:]

# kind -> (composer anchor, how the model line is found below the last line
# that starts with the anchor). Observed on herdr 0.9.3, 2026-10-09;
# Muse Code 1.4.14's separated footer was observed at startup, 2026-11-06.
#   separated  a border or blank line closes the composer — a wrapped composer
#              spans several lines — and the model line is the first text line
#              after that separator
#   next       the model line is the first text line after the anchor
#   anchor     the anchor line itself is the model line (opencode draws it
#              inside its composer box)
rules = {
    "claude": ("❯", "separated"),
    "muse": ("❯", "separated"),
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


def canonical_effort(value):
    value = value.strip().casefold()
    return "xhigh" if value == "extra high" else value


def footer_effort():
    # Restrict effort to its footer field, excluding usage/context/help.
    # Cursor's explicit labels are synthetic acceptance inputs, not UI evidence.
    token = r"extra high|xhigh|none|minimal|low|medium|high|max|ultra"
    if kind in ("claude", "codex"):
        primary = found.split("·", 1)[0].strip()
        match = re.fullmatch(rf"(.+?)\s+({token})", primary, re.IGNORECASE)
    elif kind in ("agy", "grok"):
        primary = re.split(r"[·|]", found, maxsplit=1)[0].strip()
        match = re.fullmatch(rf"(.+?)\s+\(({token})\)", primary, re.IGNORECASE)
    elif kind == "cursor":
        fields = [field.strip() for field in found.split("·")]
        if model.casefold() not in fields[0].casefold():
            return None
        efforts = set()
        for field in fields[1:]:
            labeled = re.fullmatch(r"(?:Reasoning|Effort)\s*:\s*(.*)", field, re.IGNORECASE)
            if labeled:
                if not re.fullmatch(token, labeled[1], re.IGNORECASE):
                    return None
                efforts.add(canonical_effort(labeled[1]))
        return efforts.pop() if len(efforts) == 1 else None
    elif kind == "muse":
        fields = [field.strip() for field in found.split("·")]
        if len(fields) >= 2 and model.casefold() in fields[0].casefold():
            if re.fullmatch(token, fields[1], re.IGNORECASE):
                return canonical_effort(fields[1])
        return None
    elif kind == "opencode":
        fields = [field.strip() for field in found.split("·")]
        if len(fields) == 3 and model.casefold() in fields[1].casefold():
            if re.fullmatch(token, fields[2], re.IGNORECASE):
                return canonical_effort(fields[2])
        return None
    if match and model.casefold() in match[1].casefold():
        return canonical_effort(match[2])
    return None


if effort:
    observed = footer_effort()
    if observed is None or observed != canonical_effort(effort):
        print(
            f"model line '{found}' has no verified effort '{effort}' "
            f"(observed: {observed or 'unknown'})",
            file=sys.stderr,
        )
        sys.exit(1)
PY
