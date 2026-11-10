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

test('every shipped profile orders owner, then roles from planning to generalist, then overrides', () => {
  for (const name of names) {
    const source = readFileSync(join(profiles, name), 'utf8');
    const keys = [...source.matchAll(/^([a-z-]+):/gm)].map((match) => match[1]);
    const first = keys.includes('orchestrator') ? ['orchestrator', 'roles'] : ['roles'];
    assert.ok(source.startsWith(`${first[0]}:`), name);
    assert.deepEqual(keys.slice(0, first.length), first, name);
    assert.ok(keys.slice(first.length).every((key) => ['fallbacks', 'delegation', 'assignments'].includes(key)), name);
    const block = source.slice(source.indexOf('roles:\n')).split(/\n(?=[a-z])/)[0];
    const roles = [...block.matchAll(/^  ([a-z-]+):/gm)].map((match) => match[1]);
    assert.equal(roles[0], 'planning-design', name);
    assert.equal(roles.at(-1), 'generalist', name);
    assert.match(source, /^  generalist: orchestrator$/m, name);
  }
});

for (const [name, kind, owner, model] of [
  ['sol-astra.yaml', 'codex', 'GPT-6.1-Sol', 'GPT-6-Astra'],
  ['opus-fable.yaml', 'claude', 'Opus 5.5', 'Fable 5.2'],
]) {
  test(`${name} delegates planning and review while keeping execution with its cheaper owner`, () => {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.equal(source, `orchestrator:
  ${kind}:
    model: ${owner}
    effort: max
roles:
  planning-design:
    ${kind}:
      model: ${model}
      effort: max
  coder: orchestrator
  reviewers:
    - ${kind}:
        model: ${model}
        effort: max
  generalist: orchestrator
assignments:
  plan-and-design:
    mode: delegate
`);
  });
}

test('ultra and solo profiles keep planning with their selected owner', () => {
  for (const name of names.filter((name) => /-(ultra|solo)\.yaml$/.test(name))) {
    assert.match(readFileSync(join(profiles, name), 'utf8'), /^  planning-design: orchestrator$/m, name);
  }
});

test('the profile contract binds coder and generalist orchestrator or none to the owner', () => {
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  for (const key of ['planning-design', 'generalist', 'coder']) {
    assert.match(contract, new RegExp(`\\| \`roles.${key}\` \\|[^\\n]*bare \`orchestrator\`, null, \`\\[\\]\`, or literal \`none\` binds it to the active owner`));
  }
});

test('solo profiles bind coder and reviewers to the orchestrator alias', () => {
  for (const name of ['opus-solo.yaml', 'sol-solo.yaml']) {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.match(source, /^  coder: orchestrator$/m, name);
    assert.match(source, /^  reviewers: \[orchestrator\]$/m, name);
  }
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  assert.match(contract, /\| `roles.reviewers` \|[^\n]*`\[orchestrator\]`, `\[\]`, null, or literal `none` binds it to the active owner/);
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

test('shipped roles use direct values under roles with a description comment per key', () => {
  const source = readFileSync(join(root, 'skills/orchestration/roles.yaml'), 'utf8');
  const block = source.slice(source.indexOf('\nroles:\n'), source.indexOf('\nfallbacks:'));
  const keys = [...block.matchAll(/^  ([a-z-]+):(.*)$/gm)];
  assert.deepEqual(keys.map((match) => match[1]), ['planning-design', 'reviewers', 'coder', 'generalist']);
  for (const [, key, rest] of keys) assert.match(rest, / # \S/, key);
  assert.doesNotMatch(block, /^\s+(agent|agents|description):/m);
  assert.doesNotMatch(source, /role: reviewer$/m);
});

test('the profile contract accepts custom roles under roles and rejects unknown top-level keys', () => {
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  assert.match(contract, /\| `roles.<custom>` \|/);
  assert.match(contract, /any other top-level key is an error/);
});
