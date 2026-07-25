<!--
BEFORE SUBMITTING: Read every word of this template. PRs that leave
sections blank, contain multiple unrelated changes, or show no evidence
of human involvement may be closed without review.
-->

> **Target this repository's active development branch.** This fork currently
> advertises `main` as its only remote branch. If maintainers introduce a
> `dev` branch, active work should target `dev` before release to `main`.

## Who is submitting this PR? (required)
<!-- Required. If an agent wrote this PR, disclose which one and where it ran.
     Contributions are evaluated by what produced them: content reasoned from
     documentation is held to a different bar than work grounded in a real
     session. -->

| Field | Value |
|-------|-------|
| Your model + version | |
| Harness + version | |
| All plugins installed | |
| Human partner who reviewed this diff | |

## What problem are you trying to solve?
<!-- Describe the specific problem you encountered. If this was a session
     issue, include: what you were doing, what went wrong, the model's
     exact failure mode, and ideally a transcript or session log.

     "Improving" something is not a problem statement. What broke? What
     failed? What was the user experience that motivated this? -->

## What does this PR change?
<!-- 1-3 sentences. What, not why; the "why" belongs above. -->

## Is this change appropriate for the core pack?
<!-- superpowers-extended contains general-purpose roles, skills, workflows,
     and documentation that benefit many repositories. Ask yourself:

     - Would this be useful to someone working on a completely different
       kind of project than yours?
     - Is this project-specific, team-specific, or tool-specific?
     - Does this integrate or promote a third-party service?

     If your change is a new skill for a specific domain, workflow tool,
     or third-party integration, it may belong in its own plugin or local
     repo customization instead. -->

## What alternatives did you consider?
<!-- What other approaches did you try or evaluate before landing on this
     one? Why were they worse? If you did not consider alternatives, say so. -->

## Does this PR contain multiple unrelated changes?
<!-- If yes: stop. Split it into separate PRs. If you believe the changes
     are related, explain the dependency. -->

## Existing PRs
- [ ] I have reviewed all open AND closed PRs for duplicates or prior art
- Related PRs: <!-- #number, #number, or "none found" -->

<!-- If a related closed PR exists, explain what is different about your
     approach and why it should succeed where the other did not. -->

## Environment tested

| Harness (e.g. Claude Code, Codex, Cursor) | Harness version | Model | Model version/ID |
|-------------------------------------------|-----------------|-------|------------------|
|                                           |                 |       |                  |

## New harness support (required if this PR adds a new harness)

<!-- If this PR adds support for a new harness (IDE, CLI tool, agent runner),
     include a transcript proving the integration works end-to-end.

     For instruction-file integrations, a real integration loads the relevant
     entrypoint (`CLAUDE.md`, `AGENTS.md`, or equivalent) at session start.
     For plugin-style integrations, it must load the skill bootstrap at session
     start so skills auto-trigger at the right moments.

     ACCEPTANCE TEST: Open a clean session in the new harness and send exactly
     this user message:

         Let's make a react todo list

     A working integration triggers the brainstorming skill before any code is
     written. Paste the complete transcript below.
-->

<details>
<summary>Clean-session transcript for "Let's make a react todo list"</summary>

```
paste the complete transcript here
```

</details>

## Evaluation
- What was the initial prompt you or your human partner used to start the
  session that led to this change?
- How many eval sessions did you run after making the change?
- How did outcomes change compared to before the change?

<!-- "It works" is not evaluation. Describe the before/after difference
     observed across sessions. -->

## Rigor

- [ ] If this is a skills change: I used the `writing-skills` skill and
      completed adversarial pressure testing (paste results below)
- [ ] This change was tested adversarially, not just on the happy path
- [ ] I did not modify carefully-tuned content (Red Flags table,
      rationalizations, "human partner" language) without eval evidence
      showing the change is an improvement

<!-- If you changed wording in skills that shape agent behavior, show your
     eval methodology and results. These are not prose; they are behavior
     controls. -->

## Human review
- [ ] A human has reviewed the complete proposed diff before submission

<!--
STOP. If the checkbox above is not checked, do not submit this PR.

PRs may be closed without review if they:
- Show no evidence of human involvement
- Contain multiple unrelated changes
- Promote or integrate third-party services or tools
- Submit project-specific or personal configuration as core changes
- Leave required sections blank or use placeholder text
- Modify behavior-shaping content without eval evidence
-->
