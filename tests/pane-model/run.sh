#!/usr/bin/env bash
set -uo pipefail

# Offline checks for skills/using-herdr-sibling-panes/scripts/pane-model.sh.
# The fixtures are real `herdr pane read --source visible` captures (herdr
# 0.9.3, 2026-10-09), plus three derived from them: codex-transcript-mentions-
# grok, codex-wrapped-composer, and claude-no-statusline.
#
# usage: bash tests/pane-model/run.sh
# exit 0 every case passed; exit 1 otherwise

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
pane_model=$here/../../skills/using-herdr-sibling-panes/scripts/pane-model.sh
fixtures=$here/fixtures
fails=0

# check <name> <exit> <stdout, or * for any> <fixture, or - for none> -- <pane-model.sh args...>
check() {
  local name=$1 want_rc=$2 want_out=$3 fixture=$4 out rc=0
  shift 5
  if [[ $fixture == - ]]; then
    out=$(bash "$pane_model" "$@" </dev/null 2>/dev/null) || rc=$?
  else
    out=$(bash "$pane_model" "$@" <"$fixtures/$fixture" 2>/dev/null) || rc=$?
  fi
  if [[ $rc == "$want_rc" && ($want_out == '*' || $out == "$want_out") ]]; then
    printf 'PASS  %s\n' "$name"
  else
    printf 'FAIL  %s (exit %s, stdout %q; want exit %s, stdout %q)\n' "$name" "$rc" "$out" "$want_rc" "$want_out"
    fails=$((fails + 1))
  fi
}

claude='Opus 5.5 medium'
codex='GPT-5.6-Luna medium · weekly 99% left'
opencode='Build · GPT-6.1 Sol OpenAI · max'
cursor='Muse Spark 1.3 1M Max'
agy='Gemini 3.8 Flash (High) | 5h: 100% | 7d: 100%'
grok='Grok 4.7 (xhigh) · always-approve · 1.3K / 500K (0%) · ctrl+o transcript'

check 'claude footer' 0 "$claude" claude.txt -- --kind claude
check 'codex footer' 0 "$codex" codex.txt -- --kind codex
check 'opencode footer, inside the composer box' 0 "$opencode" opencode.txt -- --kind opencode
check 'cursor footer' 0 "$cursor" cursor.txt -- --kind cursor
check 'agy footer, under an earlier "> /model" line' 0 "$agy" agy.txt -- --kind agy
check 'grok footer' 0 "$grok" grok.txt -- --kind grok

# A match is a case-insensitive substring of the model line.
check 'claude match' 0 "$claude" claude.txt -- --kind claude 'opus 5.5'
check 'codex match' 0 "$codex" codex.txt -- --kind codex 'gpt-5.6-luna'
check 'opencode match' 0 "$opencode" opencode.txt -- --kind opencode 'gpt-6.1 sol'
check 'cursor match' 0 "$cursor" cursor.txt -- --kind cursor 'MUSE SPARK 1.3'
check 'agy match' 0 "$agy" agy.txt -- --kind agy 'gemini 3.8 flash'
check 'grok match' 0 "$grok" grok.txt -- --kind grok 'grok 4.7'
check 'cursor runs another model' 1 "$cursor" cursor.txt -- --kind cursor 'Grok'

# The splash header still says Grok 4.6 after /model switched the pane to 4.7.
check 'grok stale splash header' 1 "$grok" grok.txt -- --kind grok 'Grok 4.6'

# An open model picker hides the footer; the highlighted entry never matches.
check 'grok model picker' 1 '*' grok-model-picker.txt -- --kind grok 'Grok 4.7'
check 'cursor model picker' 1 '*' cursor-model-picker.txt -- --kind cursor 'Muse Spark'

# Text above or inside the composer never becomes the model line.
check 'transcript mentions above the codex composer' 1 "$codex" codex-transcript-mentions-grok.txt -- --kind codex 'grok'
check 'cursor composer wrapped onto two lines' 0 "$cursor" cursor-wrapped-composer.txt -- --kind cursor 'Muse Spark 1.3'
check 'codex composer wrapped onto two lines' 0 "$codex" codex-wrapped-composer.txt -- --kind codex 'GPT-5.6-Luna'

# Claude shows a model line only through a statusLine that prints one.
check 'claude without that statusLine' 1 '*' claude-no-statusline.txt -- --kind claude 'Opus'

check 'no composer line for the kind' 1 '' cursor.txt -- --kind codex
check 'kind without a rule' 3 '' cursor.txt -- --kind gemini
check 'empty screen' 1 '' - -- --kind cursor
check 'no arguments' 2 '' - --
check 'no kind' 2 '' - -- --kind
check 'empty model' 2 '' - -- --kind cursor ''

echo
if ((fails == 0)); then
  echo "all pane-model.sh checks passed"
else
  echo "$fails pane-model.sh check(s) failed"
fi
exit $((fails > 0))
