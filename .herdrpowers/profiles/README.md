# プロファイル

名前は owner-coder（司令塔-実装担当）。`panel` は外部レビュワー4体、`solo` は別 coder なし。

| ファイル | 配役・意図 |
|---|---|
| `opus-sol-panel.yaml` | `Opus 5.5` owner、`GPT-6.1-Sol` coder、外部4レビュー。最重量。 |
| `opus-opus-panel.yaml` | `Opus 5.5` owner、別の `Opus 5.5` coder、外部4レビュー。最重量。 |
| `astra-sol.yaml` | `GPT-6-Astra` owner、`GPT-6.1-Sol` coder、owner レビュー。Codex 側の節約構成。 |
| `fable-opus.yaml` | `Fable 5.1` owner、`Opus 5.5` coder、owner レビュー。Claude 側の節約構成。 |
| `sol-solo.yaml` | `GPT-6.1-Sol` 単体。 |
| `opus-solo.yaml` | `Opus 5.5` 単体。 |

最重量の2構成は、契約で使えるトークン量が多い側を coder に選ぶ。
節約構成は owner がレビューし、重い作業のレビュー用トークンを残す。
`solo` は複雑な意思決定もコーディングも不要な作業向け。

- 選択は `.herdrpowers/config.yaml` の `profile` に拡張子なしのファイル名を指定。
  プロファイルには `orchestrator`・`coder`・`reviewers` の配役だけを書く。
  選択と `allow_agent_lifecycle` は config 側。既定 `false` ではエージェントの起動・終了・再起動不可。
  省略した配役は解決済み roles を使う。
- target のキーは `herdr pane list` の `agent` に出る種別名（`claude`、`codex` など）。`hp-coder` 等のペイン別名やペイン ID は不可。
  形式は `coder: {codex: {model: GPT-6.1-Sol, effort: max}}`。
  settings は入れ子。`model`・`effort` は省略可、指定時は空でない文字列。`effort` には `model` が必須。
  fallback 以外に新しい `kind@model` を書かない。
- `model`・`effort` はペインのフッター表示に合わせる。プロバイダー名から推測しない。
  文脈使用量やプランの `Max` は推論量の証拠にならない。テンプレートの文字列を勝手に直さない。
- `null` は標準 YAML の null。配布テンプレートでも維持。裸の `none` は対応するリテラル別名で、YAML null ではない。
  `coder: null` / `[]` / `none` は別 coder なし。
  `reviewers: []` / `null` / `none` は owner レビュー。レビュー無効化ではない。
- `delegate` は owner 宛でも毎回 fresh subagent が必須。空の配役でも省略不可。
  無効化したゲートは無効のまま。配役の選択で mode やゲートを変えない。
- 受付ペインと owner が不一致なら、引き継ぎ・起動前に受付を `unused` / `relay` のどちらにするか必ず確認。
- fallback の文字列は config / 既定 roles 側。元 target の `effort` は継承しない。
  `Calude`、`muse-1.0-wonder` と `muse-wonder-1.0` は原文どおり。異なる名前を曖昧一致や誤字修正で統合しない。

詳細は[配役・選択・引き継ぎの契約](https://github.com/transparent-pegasus/herdrpowers/blob/main/skills/orchestration/references/profiles.md)。
