# Builder Check Brief Template

The builder check is the `plan-review` gate, resolved through `orchestration` like any review. Under `mode: delegate` it runs in a **sibling pane via a reset-backed submit** — one pane per entry of the resolved role. Under `mode: orchestrator` a fresh subagent the orchestrator spawns gets the same contract. Write the contract below to a file under `<REPORT_DIRECTORY>`, filling in the domain and the document path, and submit a one-line instruction that points at it; the contract itself never goes through the composer.

**Purpose:** someone who will build from the written design, and cannot talk to its author, lists what they would still need to ask.

**Dispatch after:** the written design exists, before the user reads it.

## 1. The submitted instruction (one line)

```bash
INSTRUCTION="Work in /abs/path/to/repo — confirm you are there before anything else. Read-only task: make no edits and do not mutate the working tree, index, HEAD, or branch state. Read /abs/path/to/builder-check-brief.md; it is your complete contract and names the design document. Write your questions to /abs/path/to/builder-check-1.md and reply with how many you found and that path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with BLDCHK immediately followed by _<4-hex>."
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
herdr pane wait-output "$PANE" --match "BLDCHK_<4-hex>" --timeout 900000
```

## 2. The builder-check contract (write to the brief file)

```markdown
You are a talented [DOMAIN, e.g. "software engineer", "event planner",
"bakery consultant"]. You've been handed a design document and asked to
put together a plan to build what it describes. You will not be able to
talk to the person who wrote it.

Read [DOCUMENT_PATH].

Report only the questions you'd still need answered before you could plan
this well: places where you'd have to guess and a wrong guess would
matter. For each, give the question and why the answer changes the plan.
Rank them by importance.

Skip anything the document explicitly leaves to the builder, and anything
you could reasonably decide yourself. Skip nitpicks about wording.

If nothing important is left, say "nothing important left".

Do all of this yourself: never hand any of it to another pane, and never
open one for a second opinion. Make no edits. Never execute
`git checkout`, `git restore`, `git stash`, `git clean`, or `git reset`:
other panes may have edits in flight, and a dirty tree is not yours to
clean. Write your report to [REPORT_PATH] in one final write.
```

**Placeholders:**
- **repository path** — REQUIRED, absolute; the pane does not inherit the orchestrator's cwd
- `[DOMAIN]` — the builder the document is written for, in the domain's own words
- `[DOCUMENT_PATH]` — the written design, absolute (it usually sits uncommitted under `<DESIGN_DOC_PATH_PATTERN>`)
- `[REPORT_PATH]` — one file per reader under `<REPORT_DIRECTORY>`; the one-line instruction names the same path
- **marker** — REQUIRED, unique per delegation, ≤16 chars, split into fragments in the instruction
