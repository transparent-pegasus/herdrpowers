# OpenCode

The package supports OpenCode 2 and OpenCode 1.18.29 or later. It registers
the same 16 skills and seven namespaced workflows on both versions.

## Install

For OpenCode 2:

```bash
opencode plugin add git+https://github.com/transparent-pegasus/herdrpowers.git
opencode plugin list
```

If your v2 binary is named `opencode2`, substitute that name in these commands.
For OpenCode 1:

```bash
opencode plugin -g herdrpowers@git+https://github.com/transparent-pegasus/herdrpowers.git
```

Then run `/herdrpowers:init` once per repository. OpenCode's own `/init`
remains available for its AGENTS.md setup. V2 discovers `AGENTS.md`, so keep
the repository's Herdrpowers Configuration there.

## Use a local checkout with V2

In the project's `opencode.json` or `opencode.jsonc`, point `plugins` at the
checkout's entrypoint **directory**:

```json
{
  "plugins": ["/absolute/path/to/herdrpowers/.opencode-plugin"]
}
```

Configured local plugins must be directories in V2. Installed Git packages
resolve the entrypoint through `package.json`'s `main` instead.

## Registration

V1 calls the default export's `server()` adapter, whose config hook adds
`skills.paths` and `command` entries. The named `Herdrpowers` function stays
available for direct imports. V2 calls `setup(ctx)`, which uses
`ctx.skill.transform` and `ctx.command.transform`.

Skills retain their absolute `SKILL.md` paths and Markdown bodies, so relative
scripts and references stay beside the installed skill. Existing skills with
the same ID and commands with the same names take precedence when the plugin
loads. Workflows use `/herdrpowers:<name>` and submit in the current session;
arguments are appended verbatim after the workflow, and attachments and
queue/steer delivery are preserved.

The entrypoint uses only Node built-ins. It does not change the package's
module type; CommonJS support scripts remain usable. The npm package includes
the payload, its supporting files, and `LICENSE`/`NOTICE`.

## Verify changes

```bash
node --test tests/opencode/plugin.test.mjs
node --input-type=module -e 'import { Herdrpowers } from "./.opencode-plugin/index.mjs"; const c = {}; await (await Herdrpowers()).config(c); console.log(c.skills.paths, Object.keys(c.command))'
```

With a V2 server running in a test project, `opencode api plugin.list`,
`opencode api skill.list`, and `opencode api command.list` show the active
plugin, the skills, and the workflows. Check that `herdrpowers` is active and
that built-in `init` and `review` remain available. Test the packed package as
well as the checkout when changing entrypoint or packaging behavior.

Plugin loading and herdr composer automation are separate integration points.
After upgrading an agent CLI used as a delegation target, run the
`probe-composer.sh` check described in [the README](../README.md#requirements).

API references: [V2 plugin lifecycle and transforms](https://opencode.ai/v2/docs/build/plugins),
[supporting V1 and V2 together](https://opencode.ai/v2/docs/build/plugins#support-v1),
and [V2 plugin installation](https://opencode.ai/v2/docs/plugins/).
