import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const profiles = join(root, '.herdrpowers/profiles');
const names = ['fable.yaml', 'neon-fable.yaml', 'solo.yaml'];

// A missing template breaks profile selection; a missing package entry breaks
// installed users even if every file exists in a developer's checkout.
test('the named profile templates are available as files', () => {
  assert.ok(existsSync(profiles), 'missing shipped .herdrpowers/profiles directory');
  assert.deepEqual(readdirSync(profiles).filter((name) => name.endsWith('.yaml')).sort(), names);
  for (const name of names) assert.ok(statSync(join(profiles, name)).isFile(), `${name} must be a file`);
});

test('every shipped profile orders owner, then roles from planning through decision-maker to generalist, then overrides', () => {
  for (const name of names) {
    const source = readFileSync(join(profiles, name), 'utf8');
    const keys = [...source.matchAll(/^([a-z-]+):/gm)].map((match) => match[1]);
    const first = keys.includes('orchestrator') ? ['orchestrator', 'roles'] : ['roles'];
    assert.ok(source.startsWith(`${first[0]}:`), name);
    assert.deepEqual(keys.slice(0, first.length), first, name);
    assert.ok(keys.slice(first.length).every((key) => ['fallbacks', 'delegation', 'assignments'].includes(key)), name);
    const block = source.slice(source.indexOf('roles:\n')).split(/\n(?=[a-z])/)[0];
    const roles = [...block.matchAll(/^  ([a-z-]+):/gm)].map((match) => match[1]);
    assert.ok(!roles.includes('orchestrator'), name);
    assert.equal(roles[0], 'planning-design', name);
    assert.equal(roles[1], 'decision-maker', name);
    assert.equal(roles.at(-1), 'generalist', name);
  }
});

test('fable and neon-fable give generalist work to Gemini 4 Hydrogen at an owner-chosen effort while solo keeps it with the owner', () => {
  for (const name of ['fable.yaml', 'neon-fable.yaml']) {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.match(source, /^  generalist:\n    agy:\n      model: Gemini 4 Hydrogen\n      effort: any$/m, name);
  }
  assert.match(readFileSync(join(profiles, 'solo.yaml'), 'utf8'), /^  generalist: orchestrator$/m);
});

test('neon-fable delegates planning and decisions to Fable while the task names its coder', () => {
  const source = readFileSync(join(profiles, 'neon-fable.yaml'), 'utf8');
  for (const role of ['planning-design', 'decision-maker']) {
    assert.match(source, new RegExp(`^  ${role}:\\n    claude:\\n      model: Fable 5.2\\n      effort: max$`, 'm'), role);
  }
  assert.match(source, /^  coder: any$/m);
  assert.ok(source.endsWith('assignments:\n  plan-and-design:\n    mode: delegate\n  decision-making:\n    mode: delegate\n'));
});

test('fable and solo keep planning and decisions with their selected owner', () => {
  for (const name of ['fable.yaml', 'solo.yaml']) {
    const source = readFileSync(join(profiles, name), 'utf8');
    assert.match(source, /^  planning-design: orchestrator$/m, name);
    assert.match(source, /^  decision-maker: orchestrator$/m, name);
  }
});

test('the profile contract binds single-target roles orchestrator or none to the owner', () => {
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  for (const key of ['planning-design', 'decision-maker', 'generalist', 'coder']) {
    assert.match(contract, new RegExp(`\\| \`roles.${key}\` \\|[^\\n]*bare \`orchestrator\`, null, \`\\[\\]\`, or literal \`none\` binds it to the active owner`));
  }
});

test('solo binds coder and reviewers to the orchestrator alias', () => {
  const source = readFileSync(join(profiles, 'solo.yaml'), 'utf8');
  assert.match(source, /^  coder: orchestrator$/m);
  assert.match(source, /^  reviewers: \[orchestrator\]$/m);
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  assert.match(contract, /\| `roles.reviewers` \|[^\n]*`\[orchestrator\]`, `\[\]`, null, or literal `none` binds it to the active owner/);
});

test('npm distribution includes the orchestration profiles and their README, nothing else local', () => {
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

// `any` is filled per run; in a list it would break slot independence.
test('profiles write any only for the owner or a single-target role, and the task fills it', () => {
  for (const name of names) {
    const source = readFileSync(join(profiles, name), 'utf8');
    for (const [line] of source.matchAll(/^.*\bany\b.*$/gm)) {
      // Effort `any` is a setting of one target, not an `any` slot.
      if (/^ +effort: any$/.test(line)) continue;
      assert.match(line, /^(orchestrator|  (planning-design|decision-maker|coder|generalist)): any$/, `${name}: ${line}`);
    }
  }
  assert.match(readFileSync(join(profiles, 'solo.yaml'), 'utf8'), /^orchestrator: any$/m);
  assert.match(readFileSync(join(profiles, 'fable.yaml'), 'utf8'), /^  coder: any$/m);
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  for (const key of ['orchestrator', 'roles.planning-design', 'roles.decision-maker', 'roles.coder', 'roles.generalist']) {
    assert.match(contract, new RegExp(`^\\| \`${key}\` \\|[^\\n]*\\| One nested target or \`any\` `, 'm'), key);
  }
  assert.doesNotMatch(contract.match(/^\| `roles.reviewers` \|.*$/m)[0], /`any`/);
  assert.match(contract, /^## `any` slots$/m);
  for (const example of ['`solo Opus 5.5 max`', '`neon-fable coder: codex`']) assert.ok(contract.includes(example), example);
});

test('effort any leaves the effort to the owner and still verifies the model', () => {
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  assert.match(contract, /Effort\n`any` \(any case\) fixes no effort: the active owner picks it/);
  assert.match(readFileSync(join(root, 'skills/orchestration/SKILL.md'), 'utf8'), /effort `any` leaves the effort to the active owner/);
  assert.match(readFileSync(join(root, 'skills/using-herdr-sibling-panes/scripts/pane-model.sh'), 'utf8'), /canonical_effort\(effort\) != "any"/);
});

test('an unavailable target falls back to a subagent of the owner kind by default', () => {
  const source = readFileSync(join(root, 'skills/orchestration/roles.yaml'), 'utf8');
  const delegation = source.slice(source.indexOf('\ndelegation:\n'), source.indexOf('\nassignments:'));
  assert.match(delegation, /^  subagent_fallback: true$/m);
  assert.match(readFileSync(join(root, 'skills/orchestration/references/routing.md'), 'utf8'), /^## Subagent fallback$/m);
  assert.match(readFileSync(join(root, 'skills/orchestration/SKILL.md'), 'utf8'), /^## Unavailable targets and the subagent fallback$/m);
  for (const path of ['commands/init.md', 'docs/roles.md', 'skills/orchestration/references/profiles.md']) {
    assert.match(readFileSync(join(root, path), 'utf8'), /subagent_fallback/, path);
  }
});

test('shipped roles use direct values under roles with a description comment per key', () => {
  const source = readFileSync(join(root, 'skills/orchestration/roles.yaml'), 'utf8');
  const block = source.slice(source.indexOf('\nroles:\n'), source.indexOf('\nfallbacks:'));
  const keys = [...block.matchAll(/^  ([a-z-]+):(.*)$/gm)];
  assert.deepEqual(keys.map((match) => match[1]), ['planning-design', 'decision-maker', 'reviewers', 'coder', 'generalist']);
  for (const [, key, rest] of keys) assert.match(rest, / # \S/, key);
  assert.match(block, /^  decision-maker: orchestrator # /m);
  assert.doesNotMatch(block, /^\s+(agent|agents|description):/m);
  assert.doesNotMatch(source, /role: reviewer$/m);
  const assignments = source.slice(source.indexOf('\nassignments:\n'));
  assert.match(assignments, /\n  decision-making:\n[\s\S]*?\n    role: decision-maker\n    mode: orchestrator\b/);
});

test('the profile contract accepts custom roles under roles and rejects unknown top-level keys', () => {
  const contract = readFileSync(join(root, 'skills/orchestration/references/profiles.md'), 'utf8');
  assert.match(contract, /\| `roles.<custom>` \|/);
  assert.match(contract, /any other top-level key is an error/);
});

test('orchestration docs, init, workflows, and briefs route decisions to decision-maker', () => {
  for (const path of [
    'skills/orchestration/SKILL.md',
    'commands/init.md',
    'docs/roles.md',
  ]) {
    const content = readFileSync(join(root, path), 'utf8');
    assert.match(content, /^\| `decision-making` \|/m, path);
  }
  const initDoc = readFileSync(join(root, 'commands/init.md'), 'utf8');
  const initRoleIndex = initDoc.indexOf('| `planning-design` |');
  const initDecisionIndex = initDoc.indexOf('| `decision-maker` |');
  const initGeneralistIndex = initDoc.indexOf('| `generalist` |');
  assert.ok(initRoleIndex >= 0 && initDecisionIndex > initRoleIndex && initGeneralistIndex > initDecisionIndex);

  const rolesDoc = readFileSync(join(root, 'docs/roles.md'), 'utf8');
  assert.match(rolesDoc, /reviewers advise, the `decision-maker` decides\./);
  assert.doesNotMatch(rolesDoc, /reviewers advise, the orchestrator decides/i);

  const planCmd = readFileSync(join(root, 'commands/plan.md'), 'utf8');
  assert.match(planCmd, /reviewers advise, the `decision-maker` judges\./);
  assert.doesNotMatch(planCmd, /reviewers advise, the orchestrator judges/i);

  const reviewBrief = readFileSync(join(root, 'skills/requesting-code-review/review-brief.md'), 'utf8');
  assert.match(reviewBrief, /`decision-maker`\s+rules on each line/);
  assert.doesNotMatch(reviewBrief, /orchestrator\s+rules on each line/i);

  for (const path of [
    'skills/orchestration/SKILL.md',
    'skills/orchestration/references/profiles.md',
    'commands/execute.md',
    'commands/execute_parallel.md',
  ]) {
    const content = readFileSync(join(root, path), 'utf8');
    assert.doesNotMatch(content, /final synthesis stays with (the )?(active owner|orchestrator)/i, path);
    assert.doesNotMatch(content, /active owner keeps final synthesis and decisions/i, path);
    assert.doesNotMatch(content, /active owner keeps synthesis\s+and decisions/i, path);
  }
  assert.ok(existsSync(join(root, 'skills/pane-driven-development/decision-maker-brief.md')));
});
