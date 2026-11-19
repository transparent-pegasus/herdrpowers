import assert from 'node:assert/strict';
import test from 'node:test';
import { mutatingCalls, runHelper } from './harness.mjs';

const instruction = 'Review the supplied task at /tmp/example/task.md';
const key = (value) => ['pane', 'send-keys', 'test-pane', value];
const text = (value) => ['pane', 'send-text', 'test-pane', value];
const clear = [key('ctrl+u'), text('/clear'), key('esc'), key('enter')];
const sendInstruction = [key('ctrl+u'), text(instruction), key('esc'), key('enter')];
const visibleRead = (call) => call[1] === 'read' && call[3] === '--source' && call[4] === 'visible';

function submit(args, options) {
  return runHelper('composer-submit.sh', args, { withTerminal: true, ...options });
}

test('effort mismatch exits 5 before any key or text is sent', () => {
  const result = submit(['test-pane', instruction, 'GPT-6.2-Sol', 'max']);
  assert.equal(result.status, 5, result.stderr);
  assert.deepEqual(mutatingCalls(result), []);
  assert.ok(result.calls.some(visibleRead), 'the visible footer was checked');
});

for (const scenario of [
  { name: 'model mismatch', model: 'GPT-6.2-Astra', effort: 'medium' },
  { name: 'missing effort evidence', model: 'GPT-6.2-Sol', effort: 'max', before: 'codex-no-effort.txt' },
  { name: 'stale header and transcript max', model: 'GPT-6.2-Sol', effort: 'max', before: 'codex-stale-effort.txt' },
  { name: 'High versus xhigh', model: 'Grok 4.7', effort: 'High', kind: 'grok', before: 'grok.txt' },
  { name: 'Cursor Max requested as High', model: 'Muse Spark', effort: 'high', kind: 'cursor', before: 'cursor.txt' },
  { name: 'Cursor with two effort labels', model: 'Grok 4.7', effort: 'xhigh', kind: 'cursor', before: 'cursor-synthetic-two-efforts.txt' },
]) {
  test(`${scenario.name} blocks submission before the first key`, () => {
    const result = submit(['test-pane', instruction, scenario.model, scenario.effort], scenario);
    assert.equal(result.status, 5, result.stderr);
    assert.deepEqual(mutatingCalls(result), []);
    assert.ok(result.calls.some(visibleRead));
  });
}

for (const scenario of [
  { name: 'effort changes', model: 'GPT-6.2-Sol', effort: 'medium', after: 'codex-xhigh.txt' },
  { name: 'effort disappears', model: 'GPT-6.2-Sol', effort: 'medium', after: 'codex-no-effort.txt' },
  { name: 'model changes', model: 'GPT-6.2-Sol', effort: 'medium', after: 'codex-other-model.txt' },
  { name: 'Cursor Extra High becomes Max', model: 'Grok 4.7', effort: 'xhigh', kind: 'cursor',
    before: 'cursor-extra-high.txt', after: 'cursor-synthetic-fast.txt' },
]) {
  test(`${scenario.name} after reset blocks the instruction with exit 5`, () => {
    const result = submit(['test-pane', instruction, scenario.model, scenario.effort], scenario);
    assert.equal(result.status, 5, result.stderr);
    assert.deepEqual(mutatingCalls(result), clear, 'only the reset may be sent');
    const firstKey = result.calls.findIndex((call) => call[1] === 'send-keys');
    const resetEnter = result.calls.findIndex((call) => call[1] === 'send-keys' && call[3] === 'enter');
    assert.ok(result.calls.slice(0, firstKey).some(visibleRead), 'check the footer before the reset keys');
    assert.ok(result.calls.slice(resetEnter + 1).some(visibleRead), 're-read the footer after reset');
  });
}

for (const scenario of [
  { name: 'case-insensitive model substring and medium', model: 'gPt-6.2', effort: 'MeDiUm' },
  { name: 'Extra High alias of observed xhigh', model: 'gRoK 4.7', effort: 'Extra High', kind: 'grok', before: 'grok.txt' },
  { name: 'xhigh alias of observed Cursor Extra High', model: 'Grok 4.7', effort: 'XHIGH', kind: 'cursor', before: 'cursor-extra-high.txt' },
  { name: 'Cursor trailing Max', model: 'Muse Spark', effort: 'max', kind: 'cursor', before: 'cursor.txt' },
  { name: 'effort any left to the orchestrator', model: 'GPT-6.2-Sol', effort: 'any' },
]) {
  test(`${scenario.name} resets then submits exactly once`, () => {
    const result = submit(['test-pane', instruction, scenario.model, scenario.effort], scenario);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(mutatingCalls(result), [...clear, ...sendInstruction]);
    const firstKey = result.calls.findIndex((call) => call[1] === 'send-keys');
    const resetEnter = result.calls.findIndex((call) => call[1] === 'send-keys' && call[3] === 'enter');
    const instructionIndex = result.calls.findIndex((call) => call[1] === 'send-text' && call[3] === instruction);
    assert.ok(result.calls.slice(0, firstKey).some(visibleRead));
    assert.ok(result.calls.slice(resetEnter + 1, instructionIndex).some(visibleRead));
    assert.ok(result.stdout.endsWith('Working on the supplied task\n'), 'the final recent pane screen is printed');
  });
}

test('OpenCode checks max before and after its keybound new session', () => {
  const result = submit(['test-pane', instruction, 'GPT-6.2 Sol', 'max'], {
    kind: 'opencode', before: 'opencode.txt',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(mutatingCalls(result), [key('ctrl+x'), key('n'), ...sendInstruction]);
  const resetKey = result.calls.findIndex((call) => call[1] === 'send-keys' && call[3] === 'n');
  const instructionIndex = result.calls.findIndex((call) => call[1] === 'send-text' && call[3] === instruction);
  assert.ok(result.calls.slice(0, resetKey - 1).some(visibleRead));
  assert.ok(result.calls.slice(resetKey + 1, instructionIndex).some(visibleRead));
});

test('OpenCode effort loss after keybound reset sends no instruction', () => {
  const result = submit(['test-pane', instruction, 'GPT-6.2 Sol', 'max'], {
    kind: 'opencode', before: 'opencode.txt', after: 'opencode-no-effort.txt',
  });
  assert.equal(result.status, 5, result.stderr);
  assert.deepEqual(mutatingCalls(result), [key('ctrl+x'), key('n')]);
});

for (const modelArgs of [[], ['gpt-6.2-sol']]) {
  test(`legacy composer invocation with ${modelArgs.length ? 'model only' : 'no model'} still submits`, () => {
    const result = submit(['test-pane', instruction, ...modelArgs]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(mutatingCalls(result), [...clear, ...sendInstruction]);
    assert.ok(result.stdout.endsWith('Working on the supplied task\n'), 'the final recent pane screen is printed');
  });
}

// Muse Code 1.4.15 exits about two seconds after /clear on a session that did
// substantial work; its shell then receives every later key.
test('an agent that exits during the reset gets no instruction', () => {
  const result = submit(['test-pane', instruction], { kind: 'muse', agentExits: 'reset' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /left the foreground after the session reset/);
  assert.deepEqual(mutatingCalls(result), [...clear, key('ctrl+c')], 'the reset, then the shell line is discarded');
});

test('an agent that exits before Enter never gets Enter in its shell', () => {
  const result = submit(['test-pane', instruction], { agentExits: 'typed' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /left the foreground before Enter/);
  assert.deepEqual(mutatingCalls(result),
    [...clear, key('ctrl+u'), text(instruction), key('esc'), key('ctrl+c')],
    'no Enter after the instruction text, and ctrl+c, not ctrl+u, discards the shell line after esc');
});

// A Claude Code reset restarts its MCP servers and hooks inside the agent's own
// process group. A reading taken then may list a helper first, or nothing at
// all; neither is an exit, so the instruction still goes through.
for (const afterReset of ['reordered', 'unreadable']) {
  test(`a reset whose process reading is ${afterReset} still submits once`, () => {
    const result = submit(['test-pane', instruction], { kind: 'claude', before: 'claude.txt', afterReset });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(mutatingCalls(result), [...clear, ...sendInstruction]);
  });
}

test('legacy model-only mismatch is rejected before any key', () => {
  const result = submit(['test-pane', instruction, 'GPT-6.2-Astra']);
  assert.equal(result.status, 5, result.stderr);
  assert.deepEqual(mutatingCalls(result), []);
  assert.ok(result.calls.some(visibleRead));
});

test('legacy model-only change after reset sends only the reset', () => {
  const result = submit(['test-pane', instruction, 'GPT-6.2-Sol'], { after: 'codex-other-model.txt' });
  assert.equal(result.status, 5, result.stderr);
  assert.deepEqual(mutatingCalls(result), clear);
  const resetEnter = result.calls.findIndex((call) => call[1] === 'send-keys' && call[3] === 'enter');
  assert.ok(result.calls.slice(resetEnter + 1).some(visibleRead));
});

test('legacy OpenCode model-only invocation uses its keybound reset', () => {
  const result = submit(['test-pane', instruction, 'GPT-6.2 Sol'], { kind: 'opencode', before: 'opencode.txt' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(mutatingCalls(result), [key('ctrl+x'), key('n'), ...sendInstruction]);
});

for (const [name, args] of [
  ['no arguments', []],
  ['missing instruction', ['test-pane']],
  ['empty pane', ['', instruction, 'GPT-6.2-Sol', 'medium']],
  ['empty instruction', ['test-pane', '', 'GPT-6.2-Sol', 'medium']],
  ['effort without model', ['test-pane', instruction, '', 'medium']],
  ['empty effort', ['test-pane', instruction, 'GPT-6.2-Sol', '']],
  ['multiline effort', ['test-pane', instruction, 'GPT-6.2-Sol', 'high\nmax']],
  ['multiline model', ['test-pane', instruction, 'GPT-6.2-Sol\nOther', 'medium']],
  ['too many arguments', ['test-pane', instruction, 'GPT-6.2-Sol', 'medium', 'extra']],
  ['multiline instruction', ['test-pane', 'Review\nthen edit', 'GPT-6.2-Sol', 'medium']],
  ['slash popup trigger', ['test-pane', 'Run /clear before work', 'GPT-6.2-Sol', 'medium']],
]) {
  test(`${name} exits 2 without sending a key`, () => {
    const result = submit(args);
    assert.equal(result.status, 2, result.stderr);
    assert.deepEqual(mutatingCalls(result), []);
  });
}
