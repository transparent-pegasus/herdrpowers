# Task Contract and Completion

This reference belongs to `using-herdr-sibling-panes`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

## Task contract

Every instruction must include the **absolute working directory** (a pane does not inherit the orchestrator's cwd — when the work happens in a worktree, give the worktree path and require the pane to confirm it is there before doing anything else), the exact command or path, the edit policy, the report format, and a unique final completion marker that `pane wait-output` can match.

**Reports go to files.** Terminal scrollback is lossy — an agent on the alternate screen loses rows that `pane read` cannot always recover. Name a report file path in every brief (under `<REPORT_DIRECTORY>`, or the worktree's scratch directory) and require the pane to write its full report there and reply with that path plus the marker. Read the file; do not reconstruct the result from scrollback.

**Verify claims, do not trust them.** A pane reporting "verified" or "tests pass" is a claim. Re-execute the decisive command, or read the quoted output in the report file, before accepting it.

**Never let a delegated pane undo work it did not do.** Sibling panes can have edits in flight, and a pane that decides a dirty tree is "unexpected churn" will clean it. One did: a read-only link-checking pane ran `git checkout -- package.json aube-lock.yaml` and wiped a sibling's dependency work mid-verify. Every instruction gets an explicit clause: make no edits outside the stated scope, and never execute `git checkout`, `git restore`, `git stash`, `git clean`, or `git reset` — sibling edits may be in flight, and a dirty tree is not evidence of a problem. State the same for the orchestrator's own repository when the pane works in a worktree.

**Check the tree before integrating.** A pane whose task file named a dedicated worktree still edited the orchestrator's main worktree, and it surfaced only when `git merge` refused. Before any merge or integration step, `git status --short` in the integration tree and treat every unexpected modification as a scope violation: save it (`git diff > <scratch>/stray-<task>.patch`), restore the file, and surface it to the user as its own decision. Never let it ride along in a merge commit.

**Marker rules.** Keep the marker at 16 ASCII characters or fewer. `pane wait-output` matches across soft wraps, so a marker split across lines by a narrow pane still matches — the failure mode is the opposite one. The complete marker must not occur verbatim in the submitted prompt, because `pane wait-output` searches the snapshot as it already stands — echoed user text included — before it polls; describe it as two fragments the delegated agent concatenates, and keep those fragments apart in the sentence. Naming them adjacently ("end with PLANREV followed by _A1C7") has rendered them side by side in a narrow pane and fired the match the moment the prompt echoed, before any work happened.

**On a long delegation, poll for the report file.** The marker is the completion signal for short work. For anything measured in tens of minutes, a `pane wait-output` that times out tells you nothing — the pane may still be working, may have died, or may have printed its marker on the alternate screen, where a redraw drops rows that never reach herdr's scrollback. Poll for the report file the instruction named instead, and require the pane to write it in one final write (or to a temporary path and rename), because a file rewritten in place disappears mid-write and turns an existence check into a false negative. Treat the task as done only when the report file is present *and* the pane reports `idle` or `done`. Keep the instruction on a single line — the helper rejects embedded newlines. Keep bare `/word` tokens out of the text for the same reason: the helper rejects them with exit `2`, because they open the composer's slash popup mid-paste and corrupt the submission. Absolute paths are fine; a step name like `/run` must be reworded or backtick-wrapped. Keep the word `run` out of instruction prose entirely — write `execute`, `invoke`, or name the command — because a wrap that puts `run` at the start of a line pins a cursor pane at `blocked` for the rest of its session; see "A wrapped `run ` line pins a cursor pane at `blocked`".

**Wait in bounded stretches, and reconcile between them.** Never poll with short
timeouts, and never sit in one silent open-ended wait either. While you have
local work — reading a report that already came back, packaging the next
delegation, updating a ledger — do it; delegated panes finish on their own.
When you are genuinely idle, replace one long `pane wait-output` with stretches of
five to ten minutes, and between stretches check the report file and re-read
`pane list` for every live delegation. That between-stretch check is not
optional: each stretch searches the snapshot as it stands, and an agent on the
alternate screen redraws and drops rows, so a marker printed between stretches
can be gone before the next one looks — the report file is what proves the work
finished. A pane back at `idle` or `done` with no marker and no report has
already failed — diagnosing it now costs minutes instead of the rest of the
session. The exception is agy and grok, which herdr can report `idle` while
their work is still running; see **still running** under "Failure handling".

**A long brief can be pasted and never submitted, and the helper still exits `0`.** Composers split a large paste: an instruction beyond a few hundred characters can land in the composer as `[Pasted Content 1024 chars] #2 #3` and sit there unsent. The helper still returns `0`, because the pane flickers to `working` while the paste lands and passes the `started()` `working|blocked` check — so you wait on a delegation that never began. Observed 2026-08-22 at roughly 3000 characters. Put a long brief in a file under `<REPORT_DIRECTORY>` (or the worktree's scratch directory) and submit a single line pointing at it: `Read <absolute path> and carry out exactly what it says, starting by confirming the worktree it names.` And never take exit `0` as evidence of completion: a few minutes in, confirm real movement with `git status` in the worktree or the report file the brief named, and if nothing has changed, `pane read` the pane and look at the composer.

**Write a brief as the defender's invariant, not as an attack.** Work that hardens your own code against resource exhaustion is refused when the brief reads as an attack recipe: the delegated pane prints a cybersecurity policy message and stops. Observed 2026-08-22 on a codex pane. "A request whose body never finishes must not hold a worker thread indefinitely; give the socket a read deadline" passes where "a client can declare gigabytes, dribble bytes, and pin a thread" does not. The same applies to denial of service generally — state the invariant ("never hold indefinitely", "discard past a cap", "measure by idle time") rather than laying out the attacker's viewpoint as reproduction steps. When a pane does refuse, look at the worktree before discarding anything: the refusal can land after the work is done — observed with 374 lines of tests already written and only the commit-and-report step refused. This is not exhaustion. Do not send it to a fallback; reword the brief and re-delegate to the same pane.

```bash
PANE=w2:p18
INSTRUCTION="Execute make lint in /path/to/repo. Make no edits. Report the command, exit code, and errors. End with LINT_OK immediately followed by _7F3A."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"
submit_rc=0
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION" || submit_rc=$?
case "$submit_rc" in
  0) ;;
  4) echo "composer submission needs a wider layout; fix it and retry" >&2; exit 4 ;;
  *) echo "composer submission failed with exit $submit_rc; diagnose it before waiting" >&2; exit "$submit_rc" ;;
esac
herdr pane wait-output "$PANE" --match "LINT_OK_7F3A" --timeout 300000
herdr pane list
# If the target is still working:
herdr agent wait "$PANE" --until idle --until done --timeout 300000
herdr pane read "$PANE" --source recent --lines 120
```

Re-read pane ids after panes close because ids can compact. Do not send work to `working` or `blocked` panes, and do not rely on a single terminal status name for completion.
