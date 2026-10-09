import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const skills = fileURLToPath(new URL("../skills", import.meta.url))
const commands = fileURLToPath(new URL("../commands", import.meta.url))

// Workflows register as /herdrpowers:<name>, the names Claude Code gives them.
// The prefix also keeps commands/init.md from replacing opencode's built-in
// /init, which config commands override.
export const Herdrpowers = async () => ({
  config: async (config) => {
    config.skills ??= {}
    config.skills.paths = [...(config.skills.paths ?? []), skills]
    config.command ??= {}
    for (const file of readdirSync(commands).filter((name) => name.endsWith(".md"))) {
      const text = readFileSync(join(commands, file), "utf8")
      const [, front = "", template = text] = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/) ?? []
      config.command[`herdrpowers:${file.slice(0, -3)}`] ??= {
        template,
        description: front.match(/^description:\s*(.+?)\s*$/m)?.[1],
      }
    }
  },
})
