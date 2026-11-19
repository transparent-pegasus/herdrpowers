---
name: init
description: Initialize the current repository for herdrpowers by declaring repo-specific configuration in its instruction files
---

Antigravity plugins cannot ship commands, so this skill carries the herdrpowers `init` workflow. The workflow is `commands/init.md` at the plugin root: `../../../commands/init.md` from this skill's directory.

Read that whole file now and follow it as this skill's instructions. Treat anything the user typed after the skill name as the workflow's input.

If that file does not exist, `agy plugin import` converted this copy and dropped the plugin's `commands/` folder. Stop and tell the user to reinstall with `agy plugin install https://github.com/transparent-pegasus/herdrpowers`.
