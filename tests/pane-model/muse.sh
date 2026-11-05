#!/usr/bin/env bash
set -uo pipefail

# Offline Muse checks from muse-evidence.md (2026-11-06), never a live pane.
# muse-observed-startup.txt preserves the normalized Muse Code 1.4.14 screen
# seen before the login redirect. Every muse-synthetic-* fixture is synthetic;
# the echo variation uses the separately observed echo footer. None establishes
# authenticated live delegation or any other Muse model/layout support.
#
# usage: bash tests/pane-model/muse.sh
# exit 0 every case passed; exit 1 otherwise

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
pane_model=$here/../../skills/using-herdr-sibling-panes/scripts/pane-model.sh
fixtures=$here/fixtures
fails=0

# check <name> <exit> <footer, or empty for no stdout> <fixture, or -> <args...>
check() {
  local name=$1 want_rc=$2 want_out=$3 fixture=$4 out rc=0 input=/dev/null
  shift 4
  if [[ $fixture != - ]]; then
    input=$fixtures/$fixture
  fi
  # Preserve trailing newlines so stdout is checked exactly, including the
  # footer's final newline. A matcher must not drop or reconstruct its fields.
  out=$(
    bash "$pane_model" "$@" <"$input" 2>/dev/null
    rc=$?
    printf '\034'
    exit "$rc"
  ) || rc=$?
  out=${out%$'\034'}
  if [[ -n $want_out ]]; then
    want_out+=$'\n'
  fi
  if [[ $rc == "$want_rc" && $out == "$want_out" ]]; then
    printf 'PASS  %s\n' "$name"
  else
    printf 'FAIL  %s (exit %s, stdout %q; want exit %s, stdout %q)\n' \
      "$name" "$rc" "$out" "$want_rc" "$want_out"
    fails=$((fails + 1))
  fi
}

observed='muse-1.0-wonder · max · /tmp/herdrpowers-muse-fixture-pBoS7Z · Auto-review'
high='muse-1.0-wonder · high · /tmp/herdrpowers-muse-fixture-pBoS7Z · Auto-review'
missing='muse-1.0-wonder · /tmp/herdrpowers-muse-fixture-pBoS7Z · Auto-review'
echo_footer='echo · /tmp/herdrpowers-muse-fixture-pBoS7Z · Auto-review'

# The observed footer must support both legacy invocations and MODEL EFFORT.
check 'observed startup: print-only preserves footer' 0 "$observed" muse-observed-startup.txt --kind muse
check 'observed startup: legacy model-only matches' 0 "$observed" muse-observed-startup.txt --kind muse muse-1.0-wonder
check 'observed startup: requested model and max match' 0 "$observed" muse-observed-startup.txt --kind muse muse-1.0-wonder max
check 'observed startup: different model mismatches' 1 "$observed" muse-observed-startup.txt --kind muse echo max
check 'observed startup: different requested effort mismatches' 1 "$observed" muse-observed-startup.txt --kind muse muse-1.0-wonder high

# Synthetic variations: ignoring effort, or accepting its absence, is a bug.
check 'synthetic high: cannot satisfy max' 1 "$high" muse-synthetic-high.txt --kind muse muse-1.0-wonder max
check 'synthetic missing effort: cannot satisfy max' 1 "$missing" muse-synthetic-missing-effort.txt --kind muse muse-1.0-wonder max
check 'synthetic missing effort: legacy model-only still matches' 0 "$missing" muse-synthetic-missing-effort.txt --kind muse muse-1.0-wonder
check 'synthetic echo screen: composer without effort cannot satisfy max' 1 "$echo_footer" muse-synthetic-echo.txt --kind muse echo max
check 'synthetic echo screen: legacy model-only still matches' 0 "$echo_footer" muse-synthetic-echo.txt --kind muse echo

# Requested values in transcript/composer text cannot override the high footer.
check 'synthetic deceptive transcript and composer: cannot satisfy max' 1 "$high" muse-synthetic-transcript.txt --kind muse muse-1.0-wonder max

# Footer-looking text on a synthetic login screen is not a current composer.
check 'synthetic login without composer: model and effort do not match' 1 '' muse-synthetic-login.txt --kind muse muse-1.0-wonder max
check 'synthetic login without composer: legacy model-only does not match' 1 '' muse-synthetic-login.txt --kind muse muse-1.0-wonder
check 'synthetic login without composer: print-only extracts nothing' 1 '' muse-synthetic-login.txt --kind muse
check 'empty screen: extracts nothing for model and effort' 1 '' - --kind muse muse-1.0-wonder max

# Invalid invocation remains distinct from a supported kind's mismatch (1).
check 'invalid: no arguments' 2 '' -
check 'invalid: no kind value' 2 '' - --kind
check 'invalid: model without kind' 2 '' - muse-1.0-wonder max
check 'invalid: empty model' 2 '' - --kind muse ''
check 'invalid: effort with empty model' 2 '' - --kind muse '' max
check 'invalid: empty effort' 2 '' - --kind muse muse-1.0-wonder ''
check 'invalid: extra positional argument' 2 '' - --kind muse muse-1.0-wonder max extra

printf '\n'
if ((fails == 0)); then
  printf 'all Muse pane-model.sh checks passed\n'
else
  printf '%s Muse pane-model.sh check(s) failed\n' "$fails"
fi
exit $((fails > 0))
