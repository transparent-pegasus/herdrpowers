import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

// Antigravity plugins cannot ship commands, so each workflow reaches Antigravity
// through a wrapper skill that points the agent at commands/<name>.md.
const root = fileURLToPath(new URL("../../", import.meta.url))
const workflows = readdirSync(join(root, "commands"))
  .filter((file) => file.endsWith(".md")).map((file) => file.slice(0, -3)).sort()
const read = (...path) => readFileSync(join(root, ...path), "utf8")
const manifest = () => JSON.parse(read(".antigravity-plugin", "plugin.json"))
const wrapperDir = (name) => join(root, ".antigravity-plugin", "commands", name)

function frontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ""
  return Object.fromEntries([...block.matchAll(/^([\w-]+): (.*)$/gm)].map(([, key, value]) => [key, value]))
}

// The name is the `/herdrpowers:` prefix of every skill in Antigravity's menus.
test("the manifest carries the pack's name and version", () => {
  const { name, version } = manifest()
  const pack = JSON.parse(read("package.json"))
  assert.deepEqual({ name, version }, { name: pack.name, version: pack.version })
})

test("the manifest's skills path holds one wrapper per workflow", () => {
  const dir = resolve(root, manifest().skills)
  const wrappers = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => existsSync(join(dir, entry.name, "SKILL.md"))).map((entry) => entry.name).sort()
  assert.deepEqual(wrappers, workflows)
})

for (const name of workflows) {
  test(`the ${name} wrapper advertises commands/${name}.md`, () => {
    const wrapper = frontmatter(readFileSync(join(wrapperDir(name), "SKILL.md"), "utf8"))
    assert.equal(wrapper.name, name)
    assert.equal(wrapper.description, frontmatter(read("commands", `${name}.md`)).description)
  })

  test(`the ${name} wrapper points at commands/${name}.md`, () => {
    const body = readFileSync(join(wrapperDir(name), "SKILL.md"), "utf8")
    const target = body.match(/`(\.\.\/[^`]+)`/)?.[1]
    assert.equal(target && resolve(wrapperDir(name), target), join(root, "commands", `${name}.md`))
  })
}
