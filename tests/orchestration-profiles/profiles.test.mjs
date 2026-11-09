import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const profiles = join(root, '.herdrpowers/profiles');
const names = [
  'astra-sol.yaml',
  'fable-opus-panel.yaml',
  'fable-opus.yaml',
  'fable-sol-panel.yaml',
  'opus-solo.yaml',
  'sol-solo.yaml',
];

// A missing template breaks profile selection; a missing package entry breaks
// installed users even if every file exists in a developer's checkout.
test('the six named profile templates are available as files', () => {
  assert.ok(existsSync(profiles), 'missing shipped .herdrpowers/profiles directory');
  assert.deepEqual(readdirSync(profiles).filter((name) => name.endsWith('.yaml')).sort(), names);
  for (const name of names) assert.ok(statSync(join(profiles, name)).isFile(), `${name} must be a file`);
});

test('npm distribution includes all six orchestration profiles', () => {
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
    const shipped = pack.files.map((file) => file.path)
      .filter((path) => path.startsWith('.herdrpowers/profiles/') && path.endsWith('.yaml')).sort();
    assert.deepEqual(shipped, names.map((name) => `.herdrpowers/profiles/${name}`));
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});
