#!/usr/bin/env bash
set -euo pipefail

# Reset an agent pane's session and submit exactly one instruction to it.
#
# usage: composer-submit.sh <pane-id> <instruction>
#
# exit 0  instruction submitted and the pane started working
# exit 2  bad usage (including an instruction holding a bare "/word" slash
#         trigger), or the pane is not a usable idle agent pane
# exit 3  instruction did not submit (composer key sequence is wrong for this
#         agent CLI, or the pane stopped responding) — before retrying, check
#         whether the task already finished by matching its completion marker
# exit 4  pane is too narrow even after a zoom attempt

if [[ $# -ne 2 ]]; then
  echo "usage: composer-submit.sh <pane-id> <instruction>" >&2
  exit 2
fi

pane_id=$1
instruction=$2
input_settle_seconds=${HERDR_COMPOSER_INPUT_SETTLE_SECONDS:-0.40}
clear_settle_seconds=${HERDR_COMPOSER_CLEAR_SETTLE_SECONDS:-1.20}
confirm_timeout_seconds=${HERDR_COMPOSER_CONFIRM_TIMEOUT_SECONDS:-10}
composer_min_cols=${HERDR_COMPOSER_MIN_COLS:-40}

if [[ -z $pane_id || -z $instruction ]]; then
  echo "pane id and instruction must be non-empty" >&2
  exit 2
fi

if [[ ! $composer_min_cols =~ ^[0-9]+$ ]]; then
  echo "HERDR_COMPOSER_MIN_COLS must be a non-negative integer" >&2
  exit 2
fi
composer_min_cols=$((10#$composer_min_cols))

# Newlines survive send-text as literal newlines (bracketed paste), but a
# composer that is NOT in paste mode would submit on the first one.
if [[ $instruction == *$'\n'* ]]; then
  echo "instruction must be a single line" >&2
  exit 2
fi

# A bare "/word" anywhere in the text opens the composer's slash-command popup
# during the paste itself, and the paste that follows is then eaten or rewritten
# by the popup — cursor-agent has been observed submitting a truncated string or
# running the remainder as a shell command. Multi-segment paths (/abs/path/to/x)
# do not trigger it and are allowed; a lone /run or /tmp is rejected, because the
# popup cannot tell a directory from a command.
read -ra instruction_tokens <<<"$instruction"
for token in "${instruction_tokens[@]}"; do
  [[ $token == /?* ]] || continue
  rest=${token#/}
  [[ $rest == */* ]] && continue
  echo "instruction contains the slash-command trigger '$token'; the composer's" >&2
  echo "popup corrupts the paste. Reword it (drop the leading slash, wrap the" >&2
  echo "token in backticks, or give a full path such as '$token/') and resubmit." >&2
  exit 2
done

pane_field() {
  herdr pane get "$pane_id" 2>/dev/null |
    python3 -c "import sys,json;p=json.load(sys.stdin)['result']['pane'];print(p.get('$1',''))"
}

foreground_pid() {
  herdr pane process-info --pane "$pane_id" 2>/dev/null |
    python3 -c "import sys,json;f=json.load(sys.stdin)['result']['process_info']['foreground_processes'];print(f[0].get('pid','') if f else '')"
}

tty_cols() {
  python3 - "$1" <<'PY'
import fcntl
import os
import struct
import sys
import termios

fd = os.open(f"/proc/{sys.argv[1]}/fd/0", os.O_RDONLY | os.O_NOCTTY)
try:
    _, cols, _, _ = struct.unpack(
        "HHHH", fcntl.ioctl(fd, termios.TIOCGWINSZ, b"\0" * 8)
    )
finally:
    os.close(fd)
print(cols)
PY
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

if ! pid=$(foreground_pid) || [[ ! $pid =~ ^[0-9]+$ ]]; then
  echo "pane $pane_id has no foreground process; cannot measure composer width" >&2
  exit 2
fi
if ! cols=$(tty_cols "$pid") || [[ ! $cols =~ ^[0-9]+$ ]]; then
  echo "pane $pane_id foreground pid $pid has no readable terminal width" >&2
  exit 2
fi
cols=$((10#$cols))

zoom_taken=0
restore_zoom() {
  local rc=$?
  trap - EXIT
  if ((zoom_taken)); then
    if ! herdr pane zoom "$pane_id" --off >/dev/null; then
      echo "warning: pane $pane_id was zoomed for composer submission but could not be unzoomed" >&2
    fi
  fi
  exit "$rc"
}

if ((cols < composer_min_cols)); then
  prezoom_cols=$cols
  trap restore_zoom EXIT
  if ! zoom_result=$(herdr pane zoom "$pane_id" --on); then
    echo "pane $pane_id is too narrow ($cols cols, floor $composer_min_cols) and the zoom attempt failed" >&2
    exit 4
  fi
  # herdr puts the flag at result.zoom.zoom_changed (also result.zoom.changed).
  if ! zoom_changed=$(python3 -c \
    'import json,sys
d=json.load(sys.stdin)["result"]["zoom"]
changed=d.get("zoom_changed", d.get("changed"))
assert isinstance(changed, bool)
print(int(changed))' \
    <<<"$zoom_result" 2>/dev/null) || [[ $zoom_changed != 0 && $zoom_changed != 1 ]]; then
    echo "pane $pane_id zoom succeeded but did not report whether it changed the layout; refusing to claim zoom cleanup ownership" >&2
    exit 4
  fi
  zoom_taken=$zoom_changed
  sleep "$input_settle_seconds"
  if ! zoomed_cols=$(tty_cols "$pid") || [[ ! $zoomed_cols =~ ^[0-9]+$ ]]; then
    echo "pane $pane_id was too narrow ($prezoom_cols cols, floor $composer_min_cols) and its width could not be re-read after zoom" >&2
    exit 4
  fi
  cols=$((10#$zoomed_cols))
  if ((cols < composer_min_cols)); then
    echo "pane $pane_id is too narrow after zoom ($cols cols, floor $composer_min_cols); widen the pane and retry" >&2
    exit 4
  fi
fi

ensure_zoom_width() {
  local current_cols
  if ((!zoom_taken)); then
    return 0
  fi
  if ! current_cols=$(tty_cols "$pid") || [[ ! $current_cols =~ ^[0-9]+$ ]]; then
    echo "pane $pane_id width could not be re-read before Enter while zoom-managed" >&2
    exit 4
  fi
  current_cols=$((10#$current_cols))
  if ((current_cols < composer_min_cols)); then
    echo "pane $pane_id fell below the composer width floor before Enter ($current_cols cols, floor $composer_min_cols); fix the layout and retry" >&2
    exit 4
  fi
}

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
  ensure_zoom_width
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
  ensure_zoom_width
  herdr pane send-keys "$pane_id" enter
  if ! started; then
    echo "pane $pane_id ($agent) did not start after submit" >&2
    herdr pane read "$pane_id" --source recent --lines 40 >&2
    exit 3
  fi
fi

herdr pane read "$pane_id" --source recent --lines 40
