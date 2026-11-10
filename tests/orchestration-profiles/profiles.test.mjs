import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const profiles = join(root, '.herdrpowers/profiles');
const names = [
  'fable-opus-ultra.yaml',
  'fable-sol-ultra.yaml',
  'opus-fable.yaml',
  'opus-solo.yaml',
  'sol-astra.yaml',
  'sol-solo.yaml',
];

// A missing template breaks profile selection; a missing package entry breaks
// installed users even if every file exists in a developer's checkout.
test('the six named profile templates are available as files', () => {
  assert.ok(existsSync(profiles), 'missing shipped .herdrpowers/profiles directory');
  assert.deepEqual(readdirSync(profiles).filter((name) => name.endsWith('.yaml')).sort(), names);
  for (const name of names) assert.ok(statSync(join(profiles, name)).isFile(), `${name} must be a file`);
});

test('every shipped profile starts with planning-design and ends with the owner generalist', () => {
  for (const name of names) {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.match(source, /^planning-design:/, name);
    assert.ok(source.endsWith('generalist: orchestrator\n'), name);
  }
});

for (const [name, kind, owner, model] of [
  ['sol-astra.yaml', 'codex', 'GPT-6.1-Sol', 'GPT-6-Astra'],
  ['opus-fable.yaml', 'claude', 'Opus 5.5', 'Fable 5.2'],
]) {
  test(`${name} delegates planning and review while keeping execution with its cheaper owner`, () => {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.equal(source, `planning-design:
  ${kind}:
    model: ${model}
    effort: max
orchestrator:
  ${kind}:
    model: ${owner}
    effort: max
coder: orchestrator
reviewers:
  - ${kind}:
      model: ${model}
      effort: max
assignments:
  plan-and-design:
    mode: delegate
generalist: orchestrator
`);
  });
}

test('ultra and solo profiles keep planning with their selected owner', () => {
  for (const name of names.filter((name) => /-(ultra|solo)\.yaml$/.test(name))) {
    assert.match(readFileSync(join(profiles, name), 'utf8'), /^planning-design: orchestrator\n/, name);
  }
});

test('the profile contract binds coder and generalist orchestrator or none to the owner', () => {
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  for (const key of ['planning-design', 'generalist', 'coder']) {
    assert.match(contract, new RegExp(`\\| \`${key}\` \\|[^\\n]*bare \`orchestrator\`, null, \`\\[\\]\`, or literal \`none\` binds it to the active owner`));
  }
});

test('solo profiles bind coder and reviewers to the orchestrator alias', () => {
  for (const name of ['opus-solo.yaml', 'sol-solo.yaml']) {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.match(source, /^coder: orchestrator$/m, name);
    assert.match(source, /^reviewers: \[orchestrator\]$/m, name);
  }
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  assert.match(contract, /\| `reviewers` \|[^\n]*`\[orchestrator\]`, `\[\]`, null, or literal `none` binds it to the active owner/);
});

test('npm distribution includes the six orchestration profiles and their README, nothing else local', () => {
  const cache = mkdtempSync(join(tmpdir(), 'herdr-profile-pack-'));
  try {
    const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, npm_config_cache: cache, npm_config_offline: 'true', npm_config_update_notifier: 'false' },
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const [pack] = JSON.parse(result.stdout);
    const shipped = pack.files.map((file) => file.path).filter((path) => path.startsWith('.herdrpowers/')).sort();
    // Exactly the templates and their README: no local config or run scratch.
    assert.deepEqual(shipped, ['README.md', ...names].map((name) => `.herdrpowers/profiles/${name}`));
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});
