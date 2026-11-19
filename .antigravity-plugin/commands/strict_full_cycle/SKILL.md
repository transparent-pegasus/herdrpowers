---
name: strict_full_cycle
description: Interactive workflow for the entire development cycle with every review gate forced on, ignoring the reviews a repository disabled in its configuration
---

Antigravity plugins cannot ship commands, so this skill carries the herdrpowers `strict_full_cycle` workflow. The workflow is `commands/strict_full_cycle.md` at the plugin root: `../../../commands/strict_full_cycle.md` from this skill's directory.

Read that whole file now and follow it as this skill's instructions. Treat anything the user typed after the skill name as the workflow's input.

If that file does not exist, `agy plugin import` converted this copy and dropped the plugin's `commands/` folder. Stop and tell the user to reinstall with `agy plugin install https://github.com/transparent-pegasus/herdrpowers`.
