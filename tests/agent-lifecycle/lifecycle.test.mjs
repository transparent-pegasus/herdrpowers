// allow_agent_lifecycle must work at runtime: false sends nothing, true starts
// and ends only what the guards allow. The real helper runs against an
// offline herdr stub; LEDGER, REPO and ELSEWHERE are replaced per test.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const helper = resolve(here, '../../skills/using-herdr-sibling-panes/scripts/agent-lifecycle.sh');
const fixture = (name) => resolve(here, '../pane-model/fixtures', name);
const ALLOW = 'allow_agent_lifecycle: true\n';
const AGENT_PID = 4242;

function lifecycle(args, { config, panes = {}, start = 'ready', startScreen, ledger, git = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'herdr-lifecycle-test-'));
  try {
    const repo = join(dir, 'repo');
    const elsewhere = join(dir, 'elsewhere');
    const ledgerFile = join(repo, '.herdrpowers/pdd/run/agents.tsv');
    const place = (text) => text.replace('LEDGER', ledgerFile).replace('ELSEWHERE', elsewhere).replace('REPO', repo);
    for (const path of [join(repo, '.herdrpowers/pdd/run'), join(repo, 'sub'), elsewhere, join(dir, 'bin')]) {
      mkdirSync(path, { recursive: true });
    }
    if (git) for (const path of [repo, elsewhere]) assert.equal(spawnSync('git', ['init', '-q', path]).status, 0);
    symlinkSync(join(here, 'herdr-stub.mjs'), join(dir, 'bin/herdr'));
    if (config !== undefined) writeFileSync(join(repo, '.herdrpowers/config.yaml'), config);
    if (ledger !== undefined) writeFileSync(ledgerFile, ledger);
    const state = { start, startScreen, panes: {} };
    for (const [id, pane] of Object.entries(panes)) {
      state.panes[id] = {
        tab: 'w1:t1', workspace: 'w1', agent: null, status: 'unknown', shell: 100, foreground: 100, ...pane,
        cwd: place(pane.cwd ?? 'REPO'),
      };
    }
    const log = join(dir, 'calls.jsonl');
    writeFileSync(log, '');
    writeFileSync(join(dir, 'state.json'), JSON.stringify(state));
    const result = spawnSync('bash', [helper, ...args.map(place)], {
      encoding: 'utf8',
      timeout: 20000,
      env: {
        ...process.env,
        PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
        TMPDIR: dir,
        HERDR_ENV: '1',
        HERDR_PANE_ID: 'w1:p1',
        HERDR_TAB_ID: 'w1:t1',
        HERDR_WORKSPACE_ID: 'w1',
        HERDRPOWERS_REPO_ROOT: repo,
        HERDR_TEST_LOG: log,
        HERDR_TEST_STATE: join(dir, 'state.json'),
        HERDR_LIFECYCLE_SETTLE_SECONDS: '0',
        HERDR_LIFECYCLE_VERIFY_SECONDS: '1',
        HERDR_LIFECYCLE_EXIT_SECONDS: '1',
      },
    });
    assert.ifError(result.error);
    assert.doesNotMatch(result.stderr, /Unexpected offline Herdr call/);
    const calls = readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    return {
      ...result,
      // Everything that types into a pane or launches a process.
      sent: calls.filter(([resource, action]) => action === 'send-keys' || (resource === 'agent' && action === 'start')),
      ledger: existsSync(ledgerFile) ? readFileSync(ledgerFile, 'utf8') : '',
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const shell = { 'w1:p2': {} };
const startCodex = ['start', 'LEDGER', 'w1:p2', 'codex', 'hp-coder'];
const discardLine = ['pane', 'send-keys', 'w1:p2', 'ctrl+c'];
const agentStart = (kind, ...native) => ['agent', 'start', 'hp-coder', '--kind', kind, '--pane', 'w1:p2', '--timeout', '60000', ...native];
const running = (kind, pane = {}) => ({ 'w1:p2': { agent: kind, status: 'idle', foreground: AGENT_PID, ...pane } });
const entry = (kind, ...settings) => `${['w1:p2', kind, 'hp-coder', AGENT_PID, ...settings].join('\t')}\n`;

for (const [name, config, expected] of [
  ['no repository config uses the shipped false', undefined, 'false'],
  ['an explicit false', 'allow_agent_lifecycle: false\n', 'false'],
  ['true with a trailing comment', 'profile: null\nallow_agent_lifecycle: true # owner may start agents\n', 'true'],
  ['a key nested under delegation grants nothing', 'delegation:\n  allow_agent_lifecycle: true\n', 'false'],
]) {
  test(`policy: ${name}`, () => {
    const result = lifecycle(['policy'], { config });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${expected}\n`);
  });
}

for (const [name, value] of [['a quoted string', '"true"'], ['a YAML 1.1 yes', 'yes'], ['null', ''], ['a capitalized True', 'True']]) {
  test(`policy: ${name} is an error, and start sends nothing`, () => {
    const config = `allow_agent_lifecycle: ${value}\n`;
    assert.equal(lifecycle(['policy'], { config }).status, 2);
    const result = lifecycle(startCodex, { config, panes: shell });
    assert.equal(result.status, 6, result.stderr);
    assert.deepEqual(result.sent, []);
  });
}

test('policy: a duplicated key is an error', () => {
  assert.equal(lifecycle(['policy'], { config: ALLOW + ALLOW }).status, 2);
});

for (const [name, config] of [['shipped default', undefined], ['explicit false', 'allow_agent_lifecycle: false\n']]) {
  test(`${name}: start and stop exit 6 without touching any pane`, () => {
    const start = lifecycle(startCodex, { config, panes: shell });
    assert.equal(start.status, 6, start.stderr);
    assert.deepEqual(start.sent, []);
    assert.equal(start.ledger, '');
    const stop = lifecycle(['stop', 'LEDGER', 'w1:p2'], { config, panes: running('codex', { exitKeys: 'ctrl+c' }), ledger: entry('codex') });
    assert.equal(stop.status, 6, stop.stderr);
    assert.deepEqual(stop.sent, []);
    assert.equal(stop.ledger, entry('codex'));
  });
}

for (const [name, pane, config = ALLOW, target = 'w1:p2'] of [
  ['a pane in another tab', { tab: 'w1:t9' }],
  ['a pane in another workspace under workspace scope', { tab: 'w2:t1', workspace: 'w2' }, `${ALLOW}delegation:\n  pane_scope: workspace\n`],
  ['a pane that already hosts an agent', { agent: 'codex', status: 'idle', foreground: AGENT_PID }],
  ['a shell pane running a foreground program', { foreground: 555 }],
  ['a shell outside the repository', { cwd: 'ELSEWHERE' }],
  ['the orchestrator pane itself', {}, ALLOW, 'w1:p1'],
  ['an unknown pane', {}, ALLOW, 'w1:p7'],
]) {
  test(`start refuses ${name} with exit 2 and sends nothing`, () => {
    const args = ['start', 'LEDGER', target, 'codex', 'hp-coder'];
    const result = lifecycle(args, { config, panes: { 'w1:p2': pane, 'w1:p1': {} } });
    assert.equal(result.status, 2, result.stderr);
    assert.deepEqual(result.sent, []);
    assert.equal(result.ledger, '');
  });
}

test('an invalid delegation.pane_scope refuses the start', () => {
  const result = lifecycle(startCodex, { config: `${ALLOW}delegation:\n  pane_scope: everywhere\n`, panes: shell });
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(result.sent, []);
});

test('workspace scope permits a shell pane in another tab of the same workspace', () => {
  const config = `${ALLOW}delegation:\n  pane_scope: workspace # this project spans tabs\n  execution: serial\n`;
  const result = lifecycle(startCodex, { config, panes: { 'w1:p2': { tab: 'w1:t9' } } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.sent, [discardLine, agentStart('codex')]);
});

for (const [name, cwd, status] of [['a subdirectory of the same git repository', 'REPO/sub', 0], ['a different git repository', 'ELSEWHERE', 2]]) {
  test(`git: start in ${name} exits ${status}`, () => {
    const result = lifecycle(startCodex, { config: ALLOW, git: true, panes: { 'w1:p2': { cwd } } });
    assert.equal(result.status, status, result.stderr);
    assert.equal(result.sent.length, status === 0 ? 2 : 0);
  });
}

for (const [name, args] of [
  ['no subcommand', []],
  ['an unknown subcommand', ['restart', 'LEDGER', 'w1:p2']],
  ['start without a name', ['start', 'LEDGER', 'w1:p2', 'codex']],
  ['a name herdr would reject', ['start', 'LEDGER', 'w1:p2', 'codex', 'HP_Coder']],
  ['an empty model', [...startCodex, '']],
  ['an empty effort', [...startCodex, 'GPT-5.6-Luna', ' ']],
  ['a multiline model', [...startCodex, 'GPT-5.6-Luna\nOther']],
  ['three settings', [...startCodex, 'GPT-5.6-Luna', 'medium', 'extra']],
  ['stop without a pane', ['stop', 'LEDGER']],
  ['policy with an argument', ['policy', 'now']],
]) {
  test(`${name} exits 2 without sending a key`, () => {
    const result = lifecycle(args, { config: ALLOW, panes: shell });
    assert.equal(result.status, 2, result.stderr);
    assert.deepEqual(result.sent, []);
  });
}

test('start discards the prompt line, starts the agent with its native arguments, verifies the footer, and records it', () => {
  const native = ['--', '-m', 'gpt-5.6-luna', '-c', 'model_reasoning_effort="medium"'];
  const result = lifecycle([...startCodex, 'gpt-5.6-LUNA', 'Medium', ...native],
    { config: ALLOW, panes: shell, startScreen: fixture('codex.txt') });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.sent, [discardLine, agentStart('codex', ...native)]);
  assert.equal(result.ledger, entry('codex', 'gpt-5.6-LUNA', 'Medium'));
  assert.match(result.stdout, /^GPT-5\.6-Luna medium/);
});

test('a kind-only start needs no footer and records no model', () => {
  const result = lifecycle(startCodex, { config: ALLOW, panes: shell });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.sent, [discardLine, agentStart('codex')]);
  assert.equal(result.ledger, entry('codex'));
});

for (const [name, settings, startScreen] of [
  ['another model', ['GPT-6-Astra', 'medium'], 'codex.txt'],
  ['another effort', ['GPT-5.6-Luna', 'max'], 'codex.txt'],
  ['a Claude footer without a statusLine', ['Opus 5.5', 'medium'], 'claude-no-statusline.txt'],
  ['Cursor\'s bare Max', ['Muse Spark', 'max'], 'cursor.txt'],
]) {
  test(`start exits 5 on ${name}: launch arguments are not evidence`, () => {
    const result = lifecycle([...startCodex, ...settings, '--', '--model', 'whatever'],
      { config: ALLOW, panes: shell, startScreen: fixture(startScreen) });
    assert.equal(result.status, 5, result.stderr);
    assert.equal(result.ledger, entry('codex'), 'the started agent stays recorded, without a verified model');
  });
}

test('a startup dialog exits 4 and the blocked agent is recorded, not answered', () => {
  const result = lifecycle([...startCodex, 'GPT-5.6-Luna'], { config: ALLOW, panes: shell, start: 'blocked' });
  assert.equal(result.status, 4, result.stderr);
  assert.deepEqual(result.sent, [discardLine, agentStart('codex')]);
  assert.equal(result.ledger, entry('codex'));
});

test('a start herdr rejects exits 3 and records nothing', () => {
  const result = lifecycle(startCodex, { config: ALLOW, panes: shell, start: 'rejected' });
  assert.equal(result.status, 3, result.stderr);
  assert.equal(result.ledger, '');
});

for (const [kind, keys] of [['claude', ['ctrl+c', 'ctrl+c']], ['codex', ['ctrl+c']], ['opencode', ['ctrl+c']], ['cursor', ['ctrl+d']]]) {
  test(`stop ends an idle ${kind} this task started with one ${keys.join(' ')} call`, () => {
    const result = lifecycle(['stop', 'LEDGER', 'w1:p2'],
      { config: ALLOW, panes: running(kind, { exitKeys: keys.join(' ') }), ledger: entry(kind) });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.sent, [['pane', 'send-keys', 'w1:p2', ...keys]]);
    assert.equal(result.ledger, '');
  });
}

test('stop re-verifies the recorded footer, then ends the agent', () => {
  const result = lifecycle(['stop', 'LEDGER', 'w1:p2'], {
    config: ALLOW,
    panes: running('claude', { exitKeys: 'ctrl+c ctrl+c', screen: fixture('claude.txt') }),
    ledger: entry('claude', 'Opus 5.5', 'medium'),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.sent.length, 1);
  assert.equal(result.ledger, '');
});

for (const [name, status, pane, ledger, kept = ledger] of [
  ['a pane this task did not start', 2, running('codex'), ''],
  ['a working agent', 2, running('codex', { status: 'working' }), entry('codex')],
  ['a blocked agent', 2, running('codex', { status: 'blocked' }), entry('codex')],
  ['a pane whose process is no longer the one started', 2, running('codex', { foreground: 9999 }), entry('codex'), ''],
  ['an agent kind without verified exit keys', 3, running('agy'), entry('agy')],
  ['an agent whose verified footer is hidden by a dialog', 3,
    running('claude', { screen: fixture('claude-no-statusline.txt') }), entry('claude', 'Opus 5.5', 'medium')],
]) {
  test(`stop leaves ${name} alone: exit ${status}, no key sent`, () => {
    const result = lifecycle(['stop', 'LEDGER', 'w1:p2'], { config: ALLOW, panes: pane, ledger });
    assert.equal(result.status, status, result.stderr);
    assert.deepEqual(result.sent, []);
    assert.equal(result.ledger, kept);
  });
}

test('stop sends the exit keys once and reports an agent that ignores them', () => {
  const result = lifecycle(['stop', 'LEDGER', 'w1:p2'],
    { config: ALLOW, panes: running('cursor', { exitKeys: 'never' }), ledger: entry('cursor') });
  assert.equal(result.status, 3, result.stderr);
  assert.deepEqual(result.sent, [['pane', 'send-keys', 'w1:p2', 'ctrl+d']], 'a repeated ctrl+d would close the shell');
  assert.equal(result.ledger, entry('cursor'));
});

test('stop forgets an agent that already exited, without sending a key', () => {
  const result = lifecycle(['stop', 'LEDGER', 'w1:p2'], { config: ALLOW, panes: shell, ledger: entry('codex') });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.sent, []);
  assert.equal(result.ledger, '');
});

test('list reports which recorded agents still run, needing no permission', () => {
  const panes = { ...running('codex'), 'w1:p3': {}, 'w1:p4': { agent: 'claude', status: 'idle', foreground: 9999 } };
  const ledger = entry('codex') + entry('cursor').replace('w1:p2', 'w1:p3') + entry('claude').replace('w1:p2', 'w1:p4');
  const result = lifecycle(['list', 'LEDGER'], { panes, ledger });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'w1:p2\tcodex\thp-coder\trunning\nw1:p3\tcursor\thp-coder\texited\nw1:p4\tclaude\thp-coder\treplaced\n');
  assert.deepEqual(result.sent, []);
});
