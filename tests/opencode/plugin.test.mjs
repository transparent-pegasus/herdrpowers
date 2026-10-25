import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import plugin, { Herdrpowers } from "../../.opencode-plugin/index.mjs"

const root = fileURLToPath(new URL("../../", import.meta.url))
const skillsPath = join(root, "skills")
const workflows = readdirSync(join(root, "commands")).filter((name) => name.endsWith(".md"))
const skillNames = readdirSync(skillsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name)
const body = (path) => readFileSync(path, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim()

function context() {
  const skills = new Map()
  const commands = new Map([
    ["init", { name: "init", description: "OpenCode init" }],
    ["review", { name: "review", description: "OpenCode review" }],
    ["herdrpowers:quick", { name: "herdrpowers:quick", description: "User override" }],
  ])
  const prompts = []
  const transforms = []
  return {
    skills, commands, prompts, transforms,
    ctx: {
      skill: { transform: async (fn) => {
        const apply = () => fn({ get: (id) => skills.get(id), add: (skill) => skills.set(skill.id, skill) })
        transforms.push(apply)
        apply()
      } },
      command: {
        list: async () => ({ data: [...commands.values()] }),
        transform: async (fn) => {
          const apply = () => fn({ add: (command) => commands.set(command.name, command) })
          transforms.push(apply)
          apply()
        },
      },
      session: { prompt: async (input) => { prompts.push(input) } },
    },
  }
}

test("one default definition supports V2 setup and the V1 server adapter", () => {
  assert.equal(plugin.id, "herdrpowers")
  assert.equal(typeof plugin.setup, "function")
  assert.equal(plugin.server, Herdrpowers)
})

test("V1 registers all workflows and preserves existing configuration on repeated calls", async () => {
  const override = { template: "User override" }
  const config = {
    skills: { paths: ["/user/skills"] },
    command: { init: { template: "Built-in init" }, "herdrpowers:quick": override },
  }
  const hooks = await plugin.server()
  await hooks.config(config)
  await hooks.config(config)
  assert.deepEqual(config.skills.paths, ["/user/skills", skillsPath])
  assert.equal(config.command["herdrpowers:quick"], override)
  assert.equal(config.command.init.template, "Built-in init")
  for (const file of workflows) {
    const name = `herdrpowers:${file.slice(0, -3)}`
    if (name === "herdrpowers:quick") continue
    assert.equal(config.command[name].template.trim(), body(join(root, "commands", file)))
    assert.ok(config.command[name].description)
  }
})

test("V2 registers every skill with its real file path and decoded metadata", async () => {
  const { ctx, skills, transforms } = context()
  const override = { id: "systematic-debugging", content: "User override" }
  skills.set(override.id, override)
  await plugin.setup(ctx)
  for (const apply of transforms) apply()
  assert.deepEqual([...skills.keys()].sort(), skillNames.sort())
  assert.equal(skills.get(override.id), override)
  for (const name of skillNames) {
    if (name === override.id) continue
    const skill = skills.get(name)
    assert.equal(skill.name, name)
    assert.equal(skill.path, join(skillsPath, name, "SKILL.md"))
    assert.equal(skill.content, body(skill.path))
    assert.ok(skill.description)
    assert.ok(!skill.description.startsWith('"'), "YAML quoting must not appear in the description")
  }
})

test("V2 registers namespaced workflows without replacing configured or built-in commands", async () => {
  const { ctx, commands, transforms } = context()
  const originals = new Map(commands)
  await plugin.setup(ctx)
  for (const apply of transforms) apply()
  assert.equal(commands.size, workflows.length + 2)
  for (const [name, definition] of originals) assert.equal(commands.get(name), definition)
  for (const file of workflows) {
    const command = commands.get(`herdrpowers:${file.slice(0, -3)}`)
    assert.ok(command.description)
    if (command.name !== "herdrpowers:quick") assert.equal(typeof command.execute, "function")
  }
})

test("V2 workflow execution appends literal arguments and preserves session, attachments, and delivery", async () => {
  const { ctx, commands, prompts } = context()
  await plugin.setup(ctx)
  const prompt = {
    text: 'Fix path/to/file.ts with $ARGUMENTS and `literal text`',
    files: [{ uri: "file:///tmp/brief.md", name: "brief.md" }],
    agents: [{ name: "build" }],
    skills: [{ id: "orchestration" }],
  }
  const template = body(join(root, "commands", "plan.md"))
  await commands.get("herdrpowers:plan").execute({ sessionID: "session-1", prompt, delivery: "queue" })
  assert.deepEqual(prompts, [{ ...prompt, sessionID: "session-1", text: `${template}\n\n${prompt.text}`, delivery: "queue" }])
  await commands.get("herdrpowers:plan").execute({ sessionID: "session-2", prompt: { text: "" }, delivery: "steer" })
  assert.deepEqual(prompts[1], { sessionID: "session-2", text: template, delivery: "steer" })
})

test("V2 propagates prompt failures to the caller", async () => {
  const { ctx, commands } = context()
  ctx.session.prompt = async () => { throw new Error("session unavailable") }
  await plugin.setup(ctx)
  await assert.rejects(
    commands.get("herdrpowers:plan").execute({ sessionID: "session-1", prompt: { text: "" }, delivery: "steer" }),
    /session unavailable/,
  )
})
