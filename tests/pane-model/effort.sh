#!/usr/bin/env bash
set -uo pipefail

# Offline effort assertions against observed footer captures and variants whose
# first line explicitly labels them SYNTHETIC. These are parser contracts, not
# evidence that a live CLI currently exposes the synthetic reasoning fields.
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
pane_model=$here/../../skills/using-herdr-sibling-panes/scripts/pane-model.sh
fails=0

check() {
  local name=$1 want_rc=$2 want_out=$3 fixture=$4 out rc=0
  shift 4
  if [[ $fixture == - ]]; then
    out=$(bash "$pane_model" "$@" </dev/null 2>/dev/null) || rc=$?
  else
    out=$(bash "$pane_model" "$@" <"$here/fixtures/$fixture" 2>/dev/null) || rc=$?
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
grok='Grok 4.7 (xhigh) · always-approve · 1.3K / 500K (0%) · ctrl+o transcript'
cursor='Muse Spark 1.3 1M Max'
agy='Gemini 3.8 Flash (High) | 5h: 100% | 7d: 100%'
opencode='Build · GPT-6.1 Sol OpenAI · max'
cursor_high='Grok 4.7 1M Max · Reasoning: High'
cursor_extra_high='Grok 4.7 1M Max · Reasoning: Extra High'
cursor_max='Grok 4.7 1M Max · Reasoning: Max'
cursor_unknown='Grok 4.7 1M Max · Reasoning: Unknown'
codex_xhigh='GPT-5.6-Luna xhigh · weekly 99% left'
grok_high='Grok 4.7 (high) · always-approve · 1.3K / 500K (0%) · ctrl+o transcript'
agy_extra_high='Gemini 3.8 Flash (Extra High) | 5h: 100% | 7d: 100%'
no_effort='GPT-5.6-Luna · plan Max · context Max · weekly 99% left'

# Model matching keeps the legacy case-insensitive substring contract; effort
# matching must use a complete semantic token from the live footer.
check 'observed medium effort matches case insensitively' 0 "$claude" claude.txt --kind claude 'oPUs 5.5' MEDIUM
check 'Codex model substring with exact effort' 0 "$codex" codex.txt --kind codex 'gPt-5.6' MeDiUm
check 'Antigravity observed High' 0 "$agy" agy.txt --kind agy 'Gemini 3.8 Flash' HIGH
check 'OpenCode observed max inside composer box' 0 "$opencode" opencode.txt --kind opencode 'GPT-6.1 Sol' MAX
check 'Grok observed xhigh' 0 "$grok" grok.txt --kind grok 'grok 4.7' XHIGH
check 'wrong effort preserves the footer on stdout' 1 "$claude" claude.txt --kind claude 'Opus 5.5' max
check 'matching effort cannot hide the wrong model' 1 "$codex" codex.txt --kind codex 'GPT-6-Astra' medium
check 'partial effort is not an exact token' 1 "$codex" codex.txt --kind codex 'GPT-5.6-Luna' med
check 'High does not match observed xhigh' 1 "$grok" grok.txt --kind grok 'Grok 4.7' High
check 'Extra High aliases observed xhigh' 0 "$grok" grok.txt --kind grok 'Grok 4.7' 'Extra High'
check 'High does not match synthetic Codex xhigh' 1 "$codex_xhigh" codex-xhigh.txt --kind codex 'GPT-5.6-Luna' high
check 'Codex xhigh accepts case-insensitive Extra High alias' 0 "$codex_xhigh" codex-xhigh.txt --kind codex 'GPT-5.6-Luna' 'eXtRa HiGh'
check 'xhigh does not match synthetic Grok high' 1 "$grok_high" grok-high.txt --kind grok 'Grok 4.7' xhigh
check 'Extra High does not match observed Antigravity High' 1 "$agy" agy.txt --kind agy 'Gemini 3.8 Flash' 'Extra High'
check 'High does not match synthetic Antigravity Extra High' 1 "$agy_extra_high" agy-extra-high.txt --kind agy 'Gemini 3.8 Flash' High
check 'xhigh aliases synthetic Antigravity Extra High' 0 "$agy_extra_high" agy-extra-high.txt --kind agy 'Gemini 3.8 Flash' xhigh

# Bare Max is plan/context evidence. Only an explicit reasoning label makes it
# usable as Cursor effort; do not mine other words in the same footer.
check 'Cursor bare Max is not reasoning evidence' 1 "$cursor" cursor.txt --kind cursor 'Muse Spark' max
check 'Cursor bare Max does not affect legacy model-only matching' 0 "$cursor" cursor.txt --kind cursor 'muse spark'
check 'Cursor labeled High matches' 0 "$cursor_high" cursor-reasoning-high.txt --kind cursor 'grok 4.7' high
check 'Cursor labeled High cannot borrow context Max' 1 "$cursor_high" cursor-reasoning-high.txt --kind cursor 'Grok 4.7' max
check 'Cursor labeled High cannot borrow transcript Extra High' 1 "$cursor_high" cursor-reasoning-high.txt --kind cursor 'Grok 4.7' 'Extra High'
check 'Cursor labeled Extra High matches itself' 0 "$cursor_extra_high" cursor-reasoning-extra-high.txt --kind cursor 'Grok 4.7' 'extra HIGH'
check 'Cursor labeled Extra High aliases xhigh' 0 "$cursor_extra_high" cursor-reasoning-extra-high.txt --kind cursor 'Grok 4.7' xhigh
check 'Cursor labeled Extra High is not High' 1 "$cursor_extra_high" cursor-reasoning-extra-high.txt --kind cursor 'Grok 4.7' High
check 'Cursor labeled Extra High cannot borrow context Max' 1 "$cursor_extra_high" cursor-reasoning-extra-high.txt --kind cursor 'Grok 4.7' max
check 'Cursor labeled Max is positive reasoning evidence' 0 "$cursor_max" cursor-reasoning-max.txt --kind cursor 'Grok 4.7' MAX
check 'Cursor labeled Max does not satisfy High' 1 "$cursor_max" cursor-reasoning-max.txt --kind cursor 'Grok 4.7' High
check 'Cursor unknown reasoning cannot borrow context Max' 1 "$cursor_unknown" cursor-unknown-reasoning.txt --kind cursor 'Grok 4.7' max

# Header, transcript, composer content, and an older footer cannot satisfy a
# request when the last composer's footer differs or omits effort.
check 'Claude stale header max is ignored' 1 "$claude" claude-stale-effort.txt --kind claude 'Opus 5.5' max
check 'Claude current medium wins over stale header' 0 "$claude" claude-stale-effort.txt --kind claude 'Opus 5.5' medium
check 'Codex stale header and older footer max are ignored' 1 "$codex" codex-stale-effort.txt --kind codex 'GPT-5.6-Luna' max
check 'Codex transcript and wrapped composer Extra High are ignored' 1 "$codex" codex-stale-effort.txt --kind codex 'GPT-5.6-Luna' 'Extra High'
check 'Codex latest footer medium wins' 0 "$codex" codex-stale-effort.txt --kind codex 'GPT-5.6-Luna' medium
check 'missing effort cannot borrow plan context or stale header Max' 1 "$no_effort" codex-no-effort.txt --kind codex 'GPT-5.6-Luna' max
check 'effort cannot be inferred from a hidden Claude statusLine' 1 '*' claude-no-statusline.txt --kind claude 'Opus 5.5' medium
check 'effort cannot be inferred from a model picker' 1 '*' cursor-model-picker.txt --kind cursor 'Muse Spark' max
check 'missing composer fails closed with effort' 1 '' cursor.txt --kind codex 'Muse Spark' max
check 'empty screen fails closed with effort' 1 '' - --kind codex 'GPT-5.6-Luna' medium
check 'unknown kind keeps exit 3 with effort' 3 '' codex.txt --kind unknown 'GPT-5.6-Luna' medium

# Invalid arguments are usage errors, distinct from footer mismatch.
check 'kind mode rejects effort without a model' 2 '' codex.txt --kind codex '' medium
check 'kind mode rejects empty effort' 2 '' codex.txt --kind codex 'GPT-5.6-Luna' ''
check 'kind mode rejects multiline effort' 2 '' codex.txt --kind codex 'GPT-5.6-Luna' $'high\nmax'
check 'kind mode rejects multiline model with effort' 2 '' codex.txt --kind codex $'GPT-5.6-Luna\nOther' medium
check 'kind mode rejects a fifth argument' 2 '' codex.txt --kind codex 'GPT-5.6-Luna' medium extra
check 'kind mode rejects empty kind with effort' 2 '' codex.txt --kind '' 'GPT-5.6-Luna' medium

printf '\n%s pane-model effort check(s) failed\n' "$fails"
exit $((fails > 0))
