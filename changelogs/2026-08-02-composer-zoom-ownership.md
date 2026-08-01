---
change_type: pack-native
pack_version: 1.5.2
previous_pack_version: 1.5.1
date: 2026-08-02
---

# v1.5.2 — Composer zoom ownership from tab state, serialized per tab

## Summary

`composer-submit.sh` widens a pane below the composer width floor with `herdr pane zoom --on`, and decided whether it owed a cleanup unzoom by reading `zoom_changed` off that call's response. herdr's zoom is one slot per tab: `--on` against an already-zoomed tab *moves* the zoom onto the target pane but reports `zoom_changed: false` with `reason: "already_zoomed"`. The helper read that as "I changed nothing, so I own nothing", submitted successfully, and exited leaving the tab zoomed. The leak was self-perpetuating — every later submission saw the leaked zoom, got `zoom_changed: false` in turn, and disclaimed it again — so a single stray zoom (a user zoom, or one leaked run) left every subsequent delegation reporting success with the zoom stuck on.

The same single slot also raced under parallel delegation, which `/full_cycle` now defaults to: two submissions into one tab traded the zoom between them, and the first one's exit-time unzoom dropped the second pane back under the width floor mid-paste, while that second script skipped its own pre-Enter width check because it believed it had taken no zoom.

Ownership now comes from the tab's actual state instead of a report flag, and the measure/zoom/submit window is serialized per tab.

## Changes

- `skills/using-herdr-sibling-panes/scripts/composer-submit.sh`
  - Reads the tab's zoom state with `herdr pane layout` before zooming, and restores exactly that state on exit: unzoomed if it was unzoomed, re-zoomed onto the previously zoomed pane if another pane held the slot. The `zoom_changed` / `changed` JSON parse is gone.
  - Refuses with exit `4` before zooming when the tab's zoom state cannot be read — it will not zoom what it cannot restore. This replaces the old "zoom succeeded but did not report whether it changed the layout" refusal, which could exit with the zoom already taken and disclaimed.
  - Holds a per-tab `flock` across the width measurement, the zoom, and the Enter, so concurrent submissions into one tab cannot trade the zoom slot or resize each other's composer. Skipped where `flock` is unavailable. Delegated work still runs concurrently; only the few-second submission window orders.
  - The width measurement itself moved inside the lock: a pane measured while another script holds the tab's zoom reports a stale wide value, which would have skipped the zoom entirely and then submitted into a narrow composer.

- `skills/using-herdr-sibling-panes/SKILL.md`
  - "Width is a precondition" now states that the tab's prior zoom is restored, not merely that a taken zoom is removed, and documents the one-slot-per-tab behaviour and the serialization.
  - New "A wrapped `run ` line pins a cursor pane at `blocked`" section, plus a pointer from the `blocked` row of the failure table and a wording rule in the task contract. herdr's embedded cursor detection rules include an approval-prompt pattern matching any line that begins with `run ` (`^\s*(run |...)`, state `blocked`, priority 300, region `whole_recent`). It targets cursor's `run (once) (y)` confirmation but is anchored to nothing, and the echoed instruction is part of the scrollback it scans — so in a narrow pane, any wrap that puts `run` at the start of a line pins the pane at `blocked` for the rest of its session. The `run` need not begin a sentence; only the wrap position matters, and the wrap is unpredictable because the helper zooms to submit and restores the layout afterwards.
  - The task contract now tells instruction authors to keep the word `run` out of instruction prose (`execute`, `invoke`, or name the command), and the worked example changed from `Please run rtk make lint ...` to `Execute rtk make lint ...`. No other submitted-instruction template in the payload contained the word.
  - The status gate is deliberately left strict — a genuine approval prompt must not be reset out from under the user — so a false positive is reported and named, not cleared, and it never counts as agent-type exhaustion.

## Delegation guardrails from field reports

Seven operator memories covering pane-delegation failures were reviewed against the payload. Most were already covered — the `ctrl+c`-kills-Codex ban, the submit-then-confirm-`working` retry, the exit-`3` retry and two-pane exhaustion rules, config-over-`roles.yaml` routing, file-backed reports, confirm-`idle`-after-marker, and the one-implementation-pane-per-worktree rule are all in place. One reported limit did not reproduce and no change was made: `herdr wait output --timeout` accepted `900001`, `1800000`, and `3600000` ms on herdr 0.7.1 without the early exit that report described, so the briefs keep their 30-minute waits. Four gaps were real:

- **Destructive git commands were never forbidden.** A pane doing "read-only" link checks ran `git checkout -- package.json aube-lock.yaml`, deciding a sibling's in-flight dependency work was unexpected churn, and wiped it mid-verify. The payload contained no prohibition anywhere. `git checkout`, `git restore`, `git stash`, `git clean`, and `git reset` are now banned by name in the task contract and in all four brief templates plus the standalone review brief, each with the reason: sibling edits may be in flight, and a dirty tree is a finding to report, not a problem to fix. The review briefs said "read-only … do not mutate the working tree", which a pane rationalized around by treating restoration as cleanup rather than mutation.
- **No scope check before integrating.** A pane whose task file named a dedicated worktree edited the main checkout instead, and it surfaced only when `git merge` refused. `finishing-a-development-branch` now runs `git status --short` before the merge and treats every unexpected modification as a scope violation: save the patch, restore the file, surface it as its own decision, never let it ride into the merge commit.
- **Exit `4` recovery pointed only at the layout.** The 40-column floor is a conservative default, not a measured cliff, so the failure table now names `HERDR_COMPOSER_MIN_COLS` as the first move — resubmit to the same pane with a lower floor before rearranging panes.
- **Marker guidance was one-sided.** It warned about wrapping splitting a marker, which `wait output` tolerates because it matches unwrapped, but not about the opposite: two marker fragments named adjacently in the instruction rendered side by side in a narrow pane and fired the match the moment the prompt echoed. The task contract now says to keep the fragments apart in the sentence, and adds report-file polling as the completion signal for long delegations — with the caveat that a report rewritten in place vanishes mid-write, so the pane must write it once or write-and-rename, and the task counts as done only when the file exists *and* the pane is `idle` or `done`.

## Shell-prompt guard and approval stalls

A second set of field reports covered panes that were not running what herdr said they were running. Two more gaps, one of them the most dangerous in either set:

- **A pane at a shell prompt was still a valid delegation target.** `ctrl+c` on an idle Codex composer exits the TUI and drops the pane to a bare shell — the reason the helper uses `ctrl+u` — but nothing stopped a *later* delegation from being sent to that pane. herdr's `agent` field can still name the exited CLI, so the helper's existing `agent`-is-non-empty check passes, and `send-text` then types the instruction onto a command line where `enter` executes it, together with anything the previous occupant left on the prompt. That is not hypothetical: three Codex panes were dropped this way in one session, and one of them had `rm -rf <file>` sitting on its prompt.

  `composer-submit.sh` now compares the pane's foreground pid against its shell pid from `herdr pane process-info` and exits `2` when they are equal, before any text is sent. The two are equal only when the pane is sitting at its own shell — verified across four panes: both agent panes reported distinct pids, both shell panes reported identical ones. This check does not depend on herdr's `agent` field and so survives the field being stale. The workflow, the exit-code list, and the "crashed" row of the failure table were updated to match, and the by-hand fallback sequence now spells out what it gives up (no shell check, no width floor, no started confirmation) plus the `pane read` confirmation to do first and the lowercase-`enter`-is-a-key point.

- **Approval prompts were not a documented outcome.** A delegated cursor pane stopping at `Run this MCP tool?` or `Run (once) (y)` reported `blocked` on one pane and `idle` on another in the same double review, so status alone read as "stuck" and "finished" for the same condition, and the review degraded to a single reviewer with no marker and no error. New section plus a "stalled on an approval" row in the failure table: prevent it by granting the delegate CLI its permissions up front, detect it by polling `pane read` alongside the marker wait, and report the pane and prompt to the user rather than answering a shell approval on their behalf. The keys are documented for when the user authorizes them (`tab` allowlists an MCP tool for the session; `y` approves one shell command). This is the same herdr rule discussed below — `Run (once) (y)` in the scrollback is what sets `blocked` — so `pane read`, never `agent_status`, is the arbiter in both directions.

The tab-scoped delegation rule from these reports was already shipped in 1.5.1 (`delegation.pane_scope`, default `tab`) and needed no change. The adjacent cross-repository rule did: an absolute path in the instruction does not make a cross-repository pane safe, because that pane's agent loads its own repository's instruction files and configuration first. The delegation-scope section now says so, and says to confirm the target with the user before delegating or editing when the task turns out to target another repository.

## README lineage

`README.md` now states the pack's lineage against [obra/superpowers](https://github.com/obra/superpowers) alone. "What Changed in the Merge" — which described the delta against the intermediate `superpowers-extended` fork and so silently assumed the reader knew that fork — became "What Changed from Superpowers", a direct diff against upstream: the pane-versus-subagent dispatch model, the `commands/` workflow layer upstream does not have at all, configurable routing, `test-authoring` as a setting rather than always-the-implementer, review independence from the session reset instead of a reviewer persona, honest degradation, and the skills added and dropped. `NOTICE` is unchanged: it is the legal attribution chain and must keep the intermediate fork. `CLAUDE.md`'s validation note was updated to match, since `README.md` is no longer an expected hit for the pre-merge-reference grep.

## Verification notes

Reproduced and re-tested against herdr 0.7.1 in a tab holding codex 0.146.0 (31 cols) and cursor-agent 2026.07.23 (30 cols), both below the default 40-column floor:

- Before the change, with the tab pre-zoomed on the cursor pane, a submission to the codex pane returned `0` and left `layout.zoomed = true` on the codex pane.
- After the change, the same case returns `0` and restores `zoomed = true` on the original cursor pane; an unzoomed tab returns to `zoomed = false`.
- Three rounds of concurrent codex + cursor submission into one tab: both returned `0`, both completion markers appeared, and the tab was left unzoomed each round.

The cursor `blocked` behaviour was isolated on the same pane by varying only the wording, with the helper and pane width held constant:

- `... Make no edits and run no commands.` wraps to a line reading `run no commands.` — pane reports `blocked` from the moment the prompt echoes and never returns to idle.
- `... Make no edits and execute no shell commands.` — pane reports `working`, then `idle`, and stays reusable.

That behaviour is unchanged by this release: the loose regex is a herdr-side detection defect, addressed here by instruction wording and documentation rather than by weakening the submission gate.
