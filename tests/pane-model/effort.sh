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
codex='GPT-6.2-Sol medium · weekly 99% left'
grok='Grok 4.7 (xhigh) · always-approve · 1.3K / 500K (0%) · ctrl+o transcript'
cursor='Muse Spark 1.3 1M Max'
agy='Gemini 3.8 Flash (High) | 5h: 100% | 7d: 100%'
opencode='Build · GPT-6.2 Sol OpenAI · max'
cursor_xhigh='Grok 4.7 256K Extra High'
cursor_fast='Grok 4.7 256K Max Fast'
cursor_plain='Composer 2.5'
cursor_badge='Grok 4.7 256K Extra High MAX'
cursor_unknown='Grok 4.7 256K High Turbo'
cursor_status='Claude Fable 5.2 300K Max | 5h: 43% | 7d: 28%'
cursor_max_mode='Grok 4.7 256K Extra High · MAX'
cursor_right='Grok 4.7 256K Extra High                 Run Everything'
cursor_effort_name='GPT-5.1 Codex Max High'
codex_xhigh='GPT-6.2-Sol xhigh · weekly 99% left'
grok_high='Grok 4.7 (high) · always-approve · 1.3K / 500K (0%) · ctrl+o transcript'
agy_extra_high='Gemini 3.8 Flash (Extra High) | 5h: 100% | 7d: 100%'
no_effort='GPT-6.2-Sol · plan Max · context Max · weekly 99% left'

# Model matching keeps the legacy case-insensitive substring contract; effort
# matching must use a complete semantic token from the live footer.
check 'observed medium effort matches case insensitively' 0 "$claude" claude.txt --kind claude 'oPUs 5.5' MEDIUM
check 'Codex model substring with exact effort' 0 "$codex" codex.txt --kind codex 'gPt-6.2' MeDiUm
check 'Antigravity observed High' 0 "$agy" agy.txt --kind agy 'Gemini 3.8 Flash' HIGH
check 'OpenCode observed max inside composer box' 0 "$opencode" opencode.txt --kind opencode 'GPT-6.2 Sol' MAX
check 'Grok observed xhigh' 0 "$grok" grok.txt --kind grok 'grok 4.7' XHIGH
check 'wrong effort preserves the footer on stdout' 1 "$claude" claude.txt --kind claude 'Opus 5.5' max
check 'matching effort cannot hide the wrong model' 1 "$codex" codex.txt --kind codex 'GPT-6.2-Astra' medium
check 'partial effort is not an exact token' 1 "$codex" codex.txt --kind codex 'GPT-6.2-Sol' med
check 'High does not match observed xhigh' 1 "$grok" grok.txt --kind grok 'Grok 4.7' High
check 'Extra High aliases observed xhigh' 0 "$grok" grok.txt --kind grok 'Grok 4.7' 'Extra High'
check 'High does not match synthetic Codex xhigh' 1 "$codex_xhigh" codex-xhigh.txt --kind codex 'GPT-6.2-Sol' high
check 'Codex xhigh accepts case-insensitive Extra High alias' 0 "$codex_xhigh" codex-xhigh.txt --kind codex 'GPT-6.2-Sol' 'eXtRa HiGh'
check 'xhigh does not match synthetic Grok high' 1 "$grok_high" grok-high.txt --kind grok 'Grok 4.7' xhigh
check 'Extra High does not match observed Antigravity High' 1 "$agy" agy.txt --kind agy 'Gemini 3.8 Flash' 'Extra High'
check 'High does not match synthetic Antigravity Extra High' 1 "$agy_extra_high" agy-extra-high.txt --kind agy 'Gemini 3.8 Flash' High
check 'xhigh aliases synthetic Antigravity Extra High' 0 "$agy_extra_high" agy-extra-high.txt --kind agy 'Gemini 3.8 Flash' xhigh

# Cursor's footer is the model's display name: the base name, then one label
# per set parameter (context, effort, Fast, No Thinking). Max Mode is not one.
check 'Cursor observed Extra High aliases xhigh' 0 "$cursor_xhigh" cursor-extra-high.txt --kind cursor 'Grok 4.7' xhigh
check 'Cursor observed Extra High matches itself' 0 "$cursor_xhigh" cursor-extra-high.txt --kind cursor 'grok 4.7' 'extra HIGH'
check 'Cursor observed Extra High is not High' 1 "$cursor_xhigh" cursor-extra-high.txt --kind cursor 'Grok 4.7' High
check 'Cursor context size is not effort' 1 "$cursor_xhigh" cursor-extra-high.txt --kind cursor 'Grok 4.7' 256K
check 'Cursor effort words cannot be claimed as the model' 1 "$cursor_xhigh" cursor-extra-high.txt --kind cursor 'Grok 4.7 256K Extra High' xhigh
check 'Cursor observed trailing Max is its effort' 0 "$cursor" cursor.txt --kind cursor 'Muse Spark' MAX
check 'Cursor trailing Max does not satisfy High' 1 "$cursor" cursor.txt --kind cursor 'Muse Spark' High
check 'Cursor model-only matching is unchanged' 0 "$cursor" cursor.txt --kind cursor 'muse spark'
check 'Cursor Fast after Max still reads Max' 0 "$cursor_fast" cursor-synthetic-fast.txt --kind cursor 'Grok 4.7' max
check 'Cursor model without an effort parameter fails closed' 1 "$cursor_plain" cursor-synthetic-no-effort.txt --kind cursor 'Composer 2.5' max
check 'Cursor two effort labels fail closed' 1 "$cursor_badge" cursor-synthetic-two-efforts.txt --kind cursor 'Grok 4.7' xhigh
check 'Cursor unknown trailing label fails closed' 1 "$cursor_unknown" cursor-synthetic-unknown-label.txt --kind cursor 'Grok 4.7' high
check 'Cursor statusLine fields after the name are ignored' 0 "$cursor_status" cursor-synthetic-statusline.txt --kind cursor 'Claude Fable 5.2' max
check 'Cursor Max Mode marker is not an effort' 0 "$cursor_max_mode" cursor-synthetic-max-mode.txt --kind cursor 'Grok 4.7' xhigh
check 'Cursor Max Mode marker does not satisfy max' 1 "$cursor_max_mode" cursor-synthetic-max-mode.txt --kind cursor 'Grok 4.7' max
check 'Cursor right-aligned footer label is ignored' 0 "$cursor_right" cursor-synthetic-right-label.txt --kind cursor 'Grok 4.7' xhigh
check 'Cursor effort word inside the requested model stays model' 0 "$cursor_effort_name" cursor-synthetic-name-ends-in-effort.txt --kind cursor 'Codex Max' high
check 'Cursor effort word inside the requested model is not its effort' 1 "$cursor_effort_name" cursor-synthetic-name-ends-in-effort.txt --kind cursor 'GPT-5.1 Codex Max' max

# Effort `any` leaves the choice to the orchestrator: no effort is verified,
# but the model still is.
check 'effort any accepts the observed effort' 0 "$codex" codex.txt --kind codex 'GPT-6.2-Sol' any
check 'effort any accepts a footer without effort' 0 "$cursor_plain" cursor-synthetic-no-effort.txt --kind cursor 'Composer 2.5' ANY
check 'effort any still requires the model' 1 "$codex" codex.txt --kind codex 'GPT-6.2-Astra' any

# Header, transcript, composer content, and an older footer cannot satisfy a
# request when the last composer's footer differs or omits effort.
check 'Claude stale header max is ignored' 1 "$claude" claude-stale-effort.txt --kind claude 'Opus 5.5' max
check 'Claude current medium wins over stale header' 0 "$claude" claude-stale-effort.txt --kind claude 'Opus 5.5' medium
check 'Codex stale header and older footer max are ignored' 1 "$codex" codex-stale-effort.txt --kind codex 'GPT-6.2-Sol' max
check 'Codex transcript and wrapped composer Extra High are ignored' 1 "$codex" codex-stale-effort.txt --kind codex 'GPT-6.2-Sol' 'Extra High'
check 'Codex latest footer medium wins' 0 "$codex" codex-stale-effort.txt --kind codex 'GPT-6.2-Sol' medium
check 'missing effort cannot borrow plan context or stale header Max' 1 "$no_effort" codex-no-effort.txt --kind codex 'GPT-6.2-Sol' max
check 'effort cannot be inferred from a hidden Claude statusLine' 1 '*' claude-no-statusline.txt --kind claude 'Opus 5.5' medium
check 'effort cannot be inferred from a model picker' 1 '*' cursor-model-picker.txt --kind cursor 'Muse Spark' max
check 'missing composer fails closed with effort' 1 '' cursor.txt --kind codex 'Muse Spark' max
check 'empty screen fails closed with effort' 1 '' - --kind codex 'GPT-6.2-Sol' medium
check 'unknown kind keeps exit 3 with effort' 3 '' codex.txt --kind unknown 'GPT-6.2-Sol' medium

# Invalid arguments are usage errors, distinct from footer mismatch.
check 'kind mode rejects effort without a model' 2 '' codex.txt --kind codex '' medium
check 'kind mode rejects empty effort' 2 '' codex.txt --kind codex 'GPT-6.2-Sol' ''
check 'kind mode rejects multiline effort' 2 '' codex.txt --kind codex 'GPT-6.2-Sol' $'high\nmax'
check 'kind mode rejects multiline model with effort' 2 '' codex.txt --kind codex $'GPT-6.2-Sol\nOther' medium
check 'kind mode rejects a fifth argument' 2 '' codex.txt --kind codex 'GPT-6.2-Sol' medium extra
check 'kind mode rejects empty kind with effort' 2 '' codex.txt --kind '' 'GPT-6.2-Sol' medium

printf '\n%s pane-model effort check(s) failed\n' "$fails"
exit $((fails > 0))
