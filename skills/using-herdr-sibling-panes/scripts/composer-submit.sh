#!/usr/bin/env bash
set -euo pipefail

# Reset an agent pane's session and submit exactly one instruction to it.
#
# usage: composer-submit.sh <pane-id> <instruction>
#
# exit 0  instruction submitted and the pane started working
# exit 2  bad usage, or the pane is not a usable idle agent pane
# exit 3  instruction did not submit (composer key sequence is wrong for this
#         agent CLI, or the pane stopped responding) — before retrying, check
#         whether the task already finished by matching its completion marker

if [[ $# -ne 2 ]]; then
  echo "usage: composer-submit.sh <pane-id> <instruction>" >&2
  exit 2
fi

pane_id=$1
instruction=$2
input_settle_seconds=${HERDR_COMPOSER_INPUT_SETTLE_SECONDS:-0.40}
clear_settle_seconds=${HERDR_COMPOSER_CLEAR_SETTLE_SECONDS:-1.20}
confirm_timeout_seconds=${HERDR_COMPOSER_CONFIRM_TIMEOUT_SECONDS:-10}

if [[ -z $pane_id || -z $instruction ]]; then
  echo "pane id and instruction must be non-empty" >&2
  exit 2
fi

# Newlines survive send-text as literal newlines (bracketed paste), but a
# composer that is NOT in paste mode would submit on the first one.
if [[ $instruction == *$'\n'* ]]; then
  echo "instruction must be a single line" >&2
  exit 2
fi

pane_field() {
  herdr pane get "$pane_id" 2>/dev/null |
    python3 -c "import sys,json;p=json.load(sys.stdin)['result']['pane'];print(p.get('$1',''))"
}

agent=$(pane_field agent)
status=$(pane_field agent_status)

if [[ -z $agent ]]; then
  echo "pane $pane_id is not running an agent (crashed, or it is a plain shell)" >&2
  exit 2
fi
if [[ $status != idle && $status != done ]]; then
  echo "pane $pane_id is '$status' — never submit to a working or blocked pane" >&2
  exit 2
fi

# ctrl+u empties the composer without touching the session. Do NOT use ctrl+c:
# on an idle Codex composer it quits the TUI and drops the pane to a shell.
# Each send-text call is one atomic paste — a slash command must be written in
# full, because a partial command plus popup autocomplete submits the partial
# text, not the completion shown on screen.
submit_line() {
  herdr pane send-keys "$pane_id" ctrl+u
  sleep "$input_settle_seconds"
  herdr pane send-text "$pane_id" "$1"
  sleep "$input_settle_seconds"
  # esc dismisses the slash/mention popup that would otherwise eat the Enter.
  herdr pane send-keys "$pane_id" esc
  sleep "$input_settle_seconds"
  herdr pane send-keys "$pane_id" enter
}

started() {
  local deadline=$((SECONDS + confirm_timeout_seconds))
  while ((SECONDS < deadline)); do
    case "$(pane_field agent_status)" in
      working | blocked) return 0 ;;
    esac
    sleep 0.5
  done
  return 1
}

submit_line "/clear"
sleep "$clear_settle_seconds"

submit_line "$instruction"
sleep "$input_settle_seconds"

if ! started; then
  # One retry: a popup or a slow paste can swallow the first Enter. Never
  # re-send the text — that concatenates onto whatever is already there.
  herdr pane send-keys "$pane_id" esc
  sleep "$input_settle_seconds"
  herdr pane send-keys "$pane_id" enter
  if ! started; then
    echo "pane $pane_id ($agent) did not start after submit" >&2
    herdr pane read "$pane_id" --source recent --lines 40 >&2
    exit 3
  fi
fi

herdr pane read "$pane_id" --source recent --lines 40
