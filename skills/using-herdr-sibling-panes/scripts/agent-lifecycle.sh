#!/usr/bin/env bash
set -euo pipefail

# Start or end an agent in a herdr pane, only when the repository permits it.
#
# usage: agent-lifecycle.sh policy
#        agent-lifecycle.sh start <ledger> <pane-id> <kind> <name> [<model> [<effort>]] [-- <agent-arg>...]
#        agent-lifecycle.sh stop  <ledger> <pane-id>
#        agent-lifecycle.sh list  <ledger>
#
# The permission is the top-level `allow_agent_lifecycle` of
# <repo>/.herdrpowers/config.yaml, falling back to the shipped roles.yaml.
# Only the literal YAML boolean `true` permits `start` and `stop`; a chat
# instruction, a profile, or a nested key cannot. <repo> is
# $HERDRPOWERS_REPO_ROOT, else the git toplevel of the cwd, else the cwd.
#
# <ledger> is this task's own file (keep it in the run's report directory).
# `start` appends the agents it launched; `stop` ends only those, and only
# while the pane still runs the very process that was started and — when the
# start verified a model — its footer still shows that model at an idle composer.
#
# exit 0  done — start: agent ready and its footer verified; stop: the pane is
#         back at its shell
# exit 2  bad usage, or a guard refused before any agent was started or ended
# exit 3  herdr did not start the agent, or the agent was not ended: it is not
#         at its composer, it ignored the exit keys, or its kind has no
#         verified exit keys — leave it and report it
# exit 4  the agent started but is not ready (a startup dialog); it is in the
#         ledger — report the pane, never answer the dialog for the user
# exit 5  the agent started but its footer does not verify the requested
#         model/effort; it is in the ledger — read the pane: `stop` it when it
#         sits at its composer on other settings, report it when a dialog is open
# exit 6  allow_agent_lifecycle is false or invalid: nothing was started or ended

usage() {
  cat >&2 <<'EOF'
usage: agent-lifecycle.sh policy
       agent-lifecycle.sh start <ledger> <pane-id> <kind> <name> [<model> [<effort>]] [-- <agent-arg>...]
       agent-lifecycle.sh stop  <ledger> <pane-id>
       agent-lifecycle.sh list  <ledger>
EOF
  exit 2
}

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
pane_model=$script_dir/pane-model.sh
shipped=$script_dir/../../orchestration/roles.yaml
settle_seconds=${HERDR_LIFECYCLE_SETTLE_SECONDS:-0.40}
start_timeout_ms=${HERDR_LIFECYCLE_START_TIMEOUT_MS:-60000}
verify_seconds=${HERDR_LIFECYCLE_VERIFY_SECONDS:-20}
exit_seconds=${HERDR_LIFECYCLE_EXIT_SECONDS:-15}
errors=
trap '[[ -z $errors ]] || rm -f "$errors"' EXIT

if [[ -n ${HERDRPOWERS_REPO_ROOT-} ]]; then
  repo=$HERDRPOWERS_REPO_ROOT
else
  repo=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
fi

# Not a YAML engine: reads two block-style scalars the way init writes them,
# and fails closed on anything else. Prints the value; exit 1 when the key is
# absent, 2 when it appears more than once.
top_level_scalar() {
  awk -v key="$2" '
    $0 ~ "^" key "[ \t]*:([ \t]|$)" {
      v = $0
      sub("^" key "[ \t]*:[ \t]*", "", v); sub(/[ \t]+#.*$/, "", v); sub(/[ \t\r]+$/, "", v)
      print v; n++
    }
    END { exit (n == 1 ? 0 : (n == 0 ? 1 : 2)) }' "$1"
}

delegation_pane_scope() {
  awk '
    /^[^ \t#]/ { inside = ($0 ~ /^delegation[ \t]*:([ \t]|$)/) }
    inside && /^[ \t]+pane_scope[ \t]*:([ \t]|$)/ {
      v = $0
      sub(/^[ \t]+pane_scope[ \t]*:[ \t]*/, "", v); sub(/[ \t]+#.*$/, "", v); sub(/[ \t\r]+$/, "", v)
      print v; n++
    }
    END { exit (n == 1 ? 0 : (n == 0 ? 1 : 2)) }' "$1"
}

# resolve <top|nested> <label> <default> <allowed value>...: repo config wins,
# then the shipped defaults. A present value outside the allowed set is an error.
resolve() {
  local reader=$1 label=$2 default=$3 file value rc allowed
  shift 3
  for file in "$repo/.herdrpowers/config.yaml" "$shipped"; do
    [[ -f $file ]] || continue
    rc=0
    if [[ $reader == top ]]; then
      value=$(top_level_scalar "$file" "$label") || rc=$?
    else
      value=$(delegation_pane_scope "$file") || rc=$?
    fi
    ((rc != 1)) || continue
    if ((rc != 0)); then
      echo "$label appears more than once in $file" >&2
      return 2
    fi
    for allowed in "$@"; do
      if [[ $value == "$allowed" ]]; then
        printf '%s\n' "$value"
        return 0
      fi
    done
    echo "$label in $file must be one of: $* (found '$value')" >&2
    return 2
  done
  printf '%s\n' "$default"
}

policy() { resolve top allow_agent_lifecycle false true false; }

require_permission() {
  local allowed
  if ! allowed=$(policy); then
    echo "allow_agent_lifecycle is invalid, so no agent is started or ended" >&2
    exit 6
  fi
  if [[ $allowed != true ]]; then
    echo "allow_agent_lifecycle is false for $repo: no agent is started or ended." >&2
    echo "Reuse a matching live agent, or report the manual action to the user." >&2
    exit 6
  fi
}

require_herdr() {
  if [[ ${HERDR_ENV-} != 1 ]]; then
    echo "not inside herdr (HERDR_ENV is not 1)" >&2
    exit 2
  fi
}

one_line() {
  if [[ -z ${2//[[:space:]]/} || $2 == *$'\n'* || $2 == *$'\r'* || $2 == *$'\t'* ]]; then
    echo "$1 must be one non-empty line" >&2
    exit 2
  fi
}

# Prints the named pane fields on one line, separated by U+001F so an empty
# field (a shell pane has no agent) keeps its position.
pane_fields() {
  herdr pane get "$1" 2>/dev/null | python3 -c 'import sys,json
p=json.load(sys.stdin)["result"]["pane"]
print("\x1f".join("" if p.get(key) is None else str(p.get(key)) for key in sys.argv[1:]))' "${@:2}"
}

# Prints "<foreground pid> <shell pid> <foreground process group>". The first
# two are equal only when the pane sits at its own shell prompt; the group id
# stays the same for as long as one started agent holds the foreground.
process_ids() {
  herdr pane process-info --pane "$1" 2>/dev/null | python3 -c 'import sys,json
d=json.load(sys.stdin)["result"]["process_info"]
f=d.get("foreground_processes") or []
print((f[0].get("pid") if f else None) or "-", d.get("shell_pid") or "-", d.get("foreground_process_group_id") or "-")'
}

at_shell() {
  local ids fg shell
  ids=$(process_ids "$1") || return 1
  read -r fg shell _ <<<"$ids"
  [[ $fg =~ ^[0-9]+$ && $fg == "$shell" ]]
}

same_repository() {
  local mine theirs
  if mine=$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
    theirs=$(git -C "$1" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) && [[ $theirs == "$mine" ]]
  else
    [[ $1 == "$repo" || $1 == "$repo"/* ]]
  fi
}

refuse() {
  echo "pane $pane $1; nothing was started or ended" >&2
  exit 2
}

forget() {
  local kept
  kept=$(awk -F'\t' -v pane="$pane" '$1 != pane' "$ledger")
  if [[ -n $kept ]]; then printf '%s\n' "$kept" >"$ledger"; else : >"$ledger"; fi
}

start() {
  local kind name model='' effort='' positional=() agent_args=()
  (($# >= 4)) || usage
  ledger=$1 pane=$2 kind=$3 name=$4
  shift 4
  while (($#)); do
    if [[ $1 == -- ]]; then
      shift
      agent_args=("$@")
      break
    fi
    positional+=("$1")
    shift
  done
  [[ -n $ledger && -n $pane && -n $kind ]] || usage
  ((${#positional[@]} <= 2)) || usage
  if ((${#positional[@]} >= 1)); then
    model=${positional[0]}
    one_line model "$model"
  fi
  if ((${#positional[@]} == 2)); then
    effort=${positional[1]}
    one_line effort "$effort"
  fi
  if [[ ! $name =~ ^[a-z][a-z0-9_-]{0,31}$ ]]; then
    echo "agent name must match [a-z][a-z0-9_-]{0,31}" >&2
    exit 2
  fi
  require_herdr
  require_permission

  local scope fields tab workspace agent cwd
  scope=$(resolve nested delegation.pane_scope tab tab workspace session) || exit 2
  if ! fields=$(pane_fields "$pane" tab_id workspace_id agent foreground_cwd); then
    echo "unknown pane: $pane" >&2
    exit 2
  fi
  IFS=$'\x1f' read -r tab workspace agent cwd <<<"$fields"
  [[ $pane != "${HERDR_PANE_ID-}" ]] || refuse "is the orchestrator's own pane"
  case $scope in
    tab) [[ -n ${HERDR_TAB_ID-} && $tab == "$HERDR_TAB_ID" ]] || refuse "is outside the orchestrator's tab (delegation.pane_scope: tab)" ;;
    workspace) [[ -n ${HERDR_WORKSPACE_ID-} && $workspace == "$HERDR_WORKSPACE_ID" ]] || refuse "is outside the orchestrator's workspace (delegation.pane_scope: workspace)" ;;
  esac
  [[ -z $agent ]] || refuse "already hosts the agent '$agent' — start agents only in a shell pane"
  at_shell "$pane" || refuse "is not at its shell prompt — a foreground program is running"
  same_repository "$cwd" || refuse "sits in '$cwd', outside the repository $repo — cd that shell into the repository first"

  # A half-typed command line would be prepended to the start command and
  # executed with it. ctrl+c at a shell prompt only discards that line.
  herdr pane send-keys "$pane" ctrl+c >/dev/null || refuse "did not accept keys"
  sleep "$settle_seconds"

  local rc=0 code ids pgid
  errors=$(mktemp "${TMPDIR:-/tmp}/herdr-lifecycle.XXXXXX")
  herdr agent start "$name" --kind "$kind" --pane "$pane" --timeout "$start_timeout_ms" \
    ${agent_args[@]+-- "${agent_args[@]}"} >/dev/null 2>"$errors" || rc=$?
  if ((rc != 0)) && at_shell "$pane"; then
    cat "$errors" >&2
    echo "herdr did not start '$kind' in pane $pane; nothing is running there" >&2
    exit 3
  fi

  ids=$(process_ids "$pane") || ids='- - -'
  pgid=${ids##* }
  mkdir -p -- "$(dirname -- "$ledger")"
  printf '%s\t%s\t%s\t%s\n' "$pane" "$kind" "$name" "$pgid" >>"$ledger"

  if ((rc != 0)); then
    code=$(python3 -c 'import sys,json
try:
    print(json.load(open(sys.argv[1]))["error"]["code"])
except Exception:
    print("unknown error")' "$errors")
    cat "$errors" >&2
    echo "pane $pane: '$kind' started but is not ready ($code). Read the pane and report it;" >&2
    echo "never answer a startup dialog on the user's behalf. It is recorded in $ledger." >&2
    exit 4
  fi

  if [[ -z $model ]]; then
    echo "started $kind ($name) in pane $pane"
    return 0
  fi
  local footer target=("$pane" "$model") deadline=$((SECONDS + verify_seconds))
  [[ -z $effort ]] || target+=("$effort")
  until footer=$(bash "$pane_model" "${target[@]}" 2>/dev/null); do
    if ((SECONDS >= deadline)); then
      bash "$pane_model" "${target[@]}" >&2 || true
      echo "pane $pane: '$kind' started, but its footer does not verify '$model${effort:+ (effort: $effort)}'." >&2
      echo "Launch arguments prove nothing. Read the pane: at its composer on other settings, end it with" >&2
      echo "'agent-lifecycle.sh stop $ledger $pane'; at a startup dialog, leave it and report it." >&2
      exit 5
    fi
    sleep 0.5
  done
  forget
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$pane" "$kind" "$name" "$pgid" "$model" "$effort" >>"$ledger"
  printf '%s\n' "$footer"
}

stop() {
  (($# == 2)) || usage
  ledger=$1 pane=$2
  [[ -n $ledger && -n $pane ]] || usage
  require_herdr
  require_permission

  local entry kind name pgid model effort ids fg shell current status keys deadline target
  entry=$(awk -F'\t' -v pane="$pane" '$1 == pane' "$ledger" 2>/dev/null | tail -n 1)
  if [[ -z $entry ]]; then
    echo "pane $pane is not in $ledger: this task did not start its agent, so it is not this task's to end" >&2
    exit 2
  fi
  IFS=$'\t' read -r _ kind name pgid model effort <<<"$entry"
  if ! ids=$(process_ids "$pane"); then
    echo "cannot read pane $pane; nothing was sent" >&2
    exit 2
  fi
  read -r fg shell current <<<"$ids"
  if [[ $fg =~ ^[0-9]+$ && $fg == "$shell" ]]; then
    forget
    echo "pane $pane is already at its shell; '$kind' ($name) had exited"
    return 0
  fi
  if [[ $current != "$pgid" ]]; then
    forget
    echo "pane $pane now runs a different process than the '$kind' this task started; it is left alone" >&2
    exit 2
  fi
  status=$(pane_fields "$pane" agent_status) || status=
  if [[ $status != idle && $status != done ]]; then
    echo "pane $pane is '$status' — never end a working or blocked agent; nothing was sent" >&2
    exit 2
  fi
  # Exit keys belong on the idle composer only. A dialog or picker hides the
  # footer that start verified, so its absence means: do not send keys.
  if [[ -n $model ]]; then
    target=("$pane" "$model")
    [[ -z $effort ]] || target+=("$effort")
    if ! bash "$pane_model" "${target[@]}" >/dev/null 2>&1; then
      echo "pane $pane: the footer no longer shows '$model${effort:+ $effort}', so '$kind' ($name) is not at its idle composer." >&2
      echo "Nothing was sent; it is left running — read the pane and report it." >&2
      exit 3
    fi
  fi

  # One send-keys call per kind, observed on an idle, empty composer (see
  # references/agent-lifecycle.md). Never repeat it: a late second ctrl+d
  # would reach the shell and close the pane.
  case $kind in
    claude) keys=(ctrl+c ctrl+c) ;;
    codex | opencode) keys=(ctrl+c) ;;
    cursor) keys=(ctrl+d) ;;
    *)
      echo "no verified exit keys for agent kind '$kind'; leave pane $pane running and report it" >&2
      exit 3
      ;;
  esac
  herdr pane send-keys "$pane" "${keys[@]}" >/dev/null
  deadline=$((SECONDS + exit_seconds))
  until at_shell "$pane"; do
    if ((SECONDS >= deadline)); then
      echo "pane $pane: '$kind' ($name) did not exit after ${keys[*]}; it is left running — report it" >&2
      exit 3
    fi
    sleep 0.5
  done
  forget
  echo "ended $kind ($name) in pane $pane"
}

list() {
  (($# == 1)) || usage
  ledger=$1
  [[ -f $ledger ]] || return 0
  local kind name pgid ids fg shell current state
  while IFS=$'\t' read -r pane kind name pgid _; do
    [[ -n $pane ]] || continue
    state=unknown
    if ids=$(process_ids "$pane"); then
      read -r fg shell current <<<"$ids"
      if [[ $fg =~ ^[0-9]+$ && $fg == "$shell" ]]; then
        state=exited
      elif [[ $current == "$pgid" ]]; then
        state=running
      else
        state=replaced
      fi
    fi
    printf '%s\t%s\t%s\t%s\n' "$pane" "$kind" "$name" "$state"
  done <"$ledger"
}

case ${1-} in
  policy)
    (($# == 1)) || usage
    policy
    ;;
  start | stop | list)
    command=$1
    shift
    "$command" "$@"
    ;;
  *) usage ;;
esac
