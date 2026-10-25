import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const skills = fileURLToPath(new URL("../skills", import.meta.url))
const commands = fileURLToPath(new URL("../commands", import.meta.url))

// The payload uses single-line name/description scalars, not arbitrary YAML.
function markdown(path) {
  const text = readFileSync(path, "utf8")
  const [, front = "", content = text] = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/) ?? []
  const scalar = (key) => {
    const value = front.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1]
    if (value?.startsWith('"') && value.endsWith('"')) return JSON.parse(value)
    if (value?.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'")
    return value
  }
  return { name: scalar("name"), description: scalar("description"), content }
}

function workflows() {
  return readdirSync(commands).filter((name) => name.endsWith(".md")).map((file) => ({
    ...markdown(join(commands, file)),
    name: `herdrpowers:${file.slice(0, -3)}`,
  }))
}

// Workflows register as /herdrpowers:<name>, the names Claude Code gives them.
// The prefix also keeps commands/init.md from replacing opencode's built-in
// /init. OpenCode 1.18.29+ calls the default export's server adapter; retain the
// named function for direct imports.
export const Herdrpowers = async () => ({
  config: async (config) => {
    config.skills ??= {}
    config.skills.paths ??= []
    if (!config.skills.paths.includes(skills)) config.skills.paths.push(skills)
    config.command ??= {}
    for (const workflow of workflows()) {
      config.command[workflow.name] ??= {
        template: workflow.content,
        description: workflow.description,
      }
    }
  },
})

// Plugin.define is an identity helper. This plain JavaScript definition uses
// the V2 contract directly, keeping the package free of runtime dependencies.
export default {
  id: "herdrpowers",
  server: Herdrpowers,
  async setup(ctx) {
    const bundledSkills = readdirSync(skills, { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => {
        const path = join(skills, entry.name, "SKILL.md")
        const skill = markdown(path)
        return { ...skill, id: entry.name, name: skill.name ?? entry.name, path, content: skill.content.trim() }
      })
    const bundledWorkflows = workflows()
    const existingCommands = new Set((await ctx.command.list()).data.map((command) => command.name))

    await ctx.skill.transform((editor) => {
      for (const skill of bundledSkills) {
        if (!editor.get(skill.id)) editor.add(skill)
      }
    })
    await ctx.command.transform((editor) => {
      for (const workflow of bundledWorkflows) {
        if (existingCommands.has(workflow.name)) continue
        editor.add({
          name: workflow.name,
          description: workflow.description,
          async execute({ sessionID, prompt, delivery }) {
            await ctx.session.prompt({
              ...prompt,
              sessionID,
              text: [workflow.content.trim(), prompt.text].filter(Boolean).join("\n\n"),
              delivery,
            })
          },
        })
      }
    })
  },
}
