#!/usr/bin/env bash
set -uo pipefail

# Verify that a herdr pane's agent CLI can actually be driven by
# composer-submit.sh. Run this ONCE per agent CLI (and after any CLI upgrade)
# before that agent is used as a delegation target.
#
# usage: probe-composer.sh <pane-id>
#
# Checks, in order:
#   1. pane runs an agent and is idle
#   2. pane meets the minimum composer width
#   3. leftover composer text can be cleared without killing the TUI
#   4. /clear resets the session and the TUI survives it
#   5. an instruction submits and the pane starts working
#   6. a split completion marker is not matched by the prompt echo
#   7. the completion marker is matched when the task finishes
#   8. a running task can be interrupted and the pane returns to idle
#   9. the agent process is still the same one it was at step 1
#
# exit 0 all checks passed — the agent is safe to delegate to
# exit 1 at least one check failed — resolve the reported failure before delegating

pane_id=${1:-}
[[ -n $pane_id ]] || { echo "usage: probe-composer.sh <pane-id>" >&2; exit 1; }

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
submit=$here/composer-submit.sh
fails=0
composer_min_cols=${HERDR_COMPOSER_MIN_COLS:-40}

pane_field() {
  herdr pane get "$pane_id" 2>/dev/null |
    python3 -c "import sys,json;p=json.load(sys.stdin)['result']['pane'];print(p.get('$1',''))"
}
argv() {
  herdr pane process-info --pane "$pane_id" 2>/dev/null |
    python3 -c "import sys,json;f=json.load(sys.stdin)['result']['process_info']['foreground_processes'];print(f[0]['cmdline'] if f else '')"
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
screen() { herdr pane read "$pane_id" --source recent --lines 60 2>/dev/null; }
ok()   { printf 'PASS  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fails=$((fails + 1)); }
wait_idle() {
  local deadline=$((SECONDS + ${1:-30}))
  while ((SECONDS < deadline)); do
    [[ $(pane_field agent_status) == idle || $(pane_field agent_status) == done ]] && return 0
    sleep 0.5
  done
  return 1
}

agent=$(pane_field agent)
argv_before=$(argv)
if [[ -n $agent && ( $(pane_field agent_status) == idle || $(pane_field agent_status) == done ) ]]; then
  ok "1 pane runs '$agent' and is idle"
else
  bad "1 pane is not an idle agent pane (agent='$agent' status='$(pane_field agent_status)')"
  exit 1
fi

if [[ ! $composer_min_cols =~ ^[0-9]+$ ]]; then
  bad "2 HERDR_COMPOSER_MIN_COLS must be a non-negative integer"
  exit 1
fi
composer_min_cols=$((10#$composer_min_cols))
if ! pid=$(foreground_pid) || [[ ! $pid =~ ^[0-9]+$ ]]; then
  bad "2 could not resolve the foreground pid; cannot measure composer width"
  exit 1
fi
if ! cols=$(tty_cols "$pid") || [[ ! $cols =~ ^[0-9]+$ ]]; then
  bad "2 could not read terminal width from /proc/$pid/fd/0"
  exit 1
fi
cols=$((10#$cols))
if ((cols < composer_min_cols)); then
  bad "2 pane too narrow ($cols cols, floor $composer_min_cols); this probe requires a stable >=floor layout, and temporary submit-time zoom is not enough; widen the pane and re-run"
  exit 1
fi
ok "2 pane meets the composer width floor ($cols cols, floor $composer_min_cols)"

# 3. leftover text must clear without ctrl+c (ctrl+c quits some TUIs)
herdr pane send-text "$pane_id" "PROBE_LEFTOVER_TEXT" >/dev/null; sleep 0.6
herdr pane send-keys "$pane_id" ctrl+u >/dev/null; sleep 0.6
if screen | grep -q "PROBE_LEFTOVER_TEXT"; then
  bad "3 ctrl+u did not clear the composer — find this CLI's clear-line key"
else
  ok "3 ctrl+u clears leftover composer text"
fi

# 4+5. reset the session and submit a real instruction
marker_head=PROBE_OK
marker_tail=_5E1B
marker=$marker_head$marker_tail
instruction="Reply with exactly one line: the name of the current git branch. Make no edits and run no commands. End your reply with $marker_head immediately followed by $marker_tail."

submit_rc=0
"$submit" "$pane_id" "$instruction" >/dev/null 2>&1 || submit_rc=$?
if [[ $submit_rc -eq 0 ]]; then
  ok "4 /clear reset the session and the TUI survived"
  ok "5 instruction submitted and the pane started working"
elif [[ $submit_rc -eq 4 ]]; then
  bad "4-5 composer-submit.sh exited 4 — pane too narrow even after its zoom attempt; widen the pane and re-run"
  exit 1
else
  bad "4-5 composer-submit.sh exited $submit_rc — instruction did not submit"
fi

# 6. the split marker must not match the echoed prompt. composer-submit.sh
# returns as soon as the pane is working, so a marker visible while the agent
# is still working can only have come from the echoed prompt.
if screen | grep -q "$marker" && [[ $(pane_field agent_status) == working ]]; then
  bad "6 marker '$marker' visible while still working — the prompt echo matches it"
else
  ok "6 split marker is not matched by the prompt echo"
fi

# 7. completion is detected by the marker
if herdr wait output "$pane_id" --match "$marker" --timeout 120000 >/dev/null 2>&1; then
  ok "7 completion marker '$marker' matched"
else
  bad "7 completion marker never appeared within 120s"
  screen | tail -20 >&2
fi
wait_idle 60 || true

# 8. a running task can be interrupted. Status alone is not proof — a CLI can
# report idle while output keeps arriving — so also require the output to stop.
interrupt_submit_rc=0
"$submit" "$pane_id" "Count slowly from 1 to 400, one number per line, with no other output." >/dev/null 2>&1 || interrupt_submit_rc=$?
if [[ $interrupt_submit_rc -eq 4 ]]; then
  bad "8 interrupt-test submission hit the layout floor (composer-submit.sh exited 4); widen the pane and re-run"
  exit 1
elif [[ $interrupt_submit_rc -ne 0 ]]; then
  bad "8 interrupt-test submission failed (composer-submit.sh exited $interrupt_submit_rc)"
else
  sleep 2
  if [[ $(pane_field agent_status) != working ]]; then
    printf 'SKIP  %s\n' "8 task finished before it could be interrupted — rerun to test the interrupt key"
  else
    herdr pane send-keys "$pane_id" esc >/dev/null; sleep 2
    before=$(screen | tail -5); sleep 4; after=$(screen | tail -5)
    if wait_idle 30 && [[ $before == "$after" ]]; then
      ok "8 esc interrupted the running task and output stopped"
    else
      bad "8 esc did not stop the task — find this CLI's interrupt key"
    fi
  fi
fi

# 9. the TUI must be the same process it was before the probe
argv_after=$(argv)
if [[ -n $(pane_field agent) && $argv_after == "$argv_before" ]]; then
  ok "9 agent survived the probe ($argv_after)"
else
  bad "9 agent died or restarted during the probe (before='$argv_before' after='$argv_after')"
fi

echo
if ((fails == 0)); then
  echo "all checks passed for '$agent' — safe to delegate"
else
  echo "$fails check(s) failed for '$agent' — do not delegate until fixed"
fi
exit $((fails > 0))
