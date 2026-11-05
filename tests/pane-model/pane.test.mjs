import assert from 'node:assert/strict';
import test from 'node:test';
import { mutatingCalls, runHelper } from '../composer-submit/harness.mjs';

const codex = 'GPT-5.6-Luna medium · weekly 99% left\n';
const grok = 'Grok 4.7 (xhigh) · always-approve · 1.3K / 500K (0%) · ctrl+o transcript\n';

// Exercise PANE as well as --kind: a correct stdin-only implementation must
// not conceal a missing effort argument or stale capture in the live path.
for (const scenario of [
  { name: 'legacy unpinned pane', args: [], status: 0, stdout: codex },
  { name: 'legacy model substring', args: ['gPt-5.6'], status: 0, stdout: codex },
  { name: 'model and effort match', args: ['GPT-5.6-Luna', 'MEDIUM'], status: 0, stdout: codex },
  { name: 'effort mismatch', args: ['GPT-5.6-Luna', 'max'], status: 1, stdout: codex },
  { name: 'model mismatch despite matching effort', args: ['GPT-6-Astra', 'medium'], status: 1, stdout: codex },
  { name: 'High is not xhigh', args: ['Grok 4.7', 'High'], kind: 'grok', before: 'grok.txt', status: 1, stdout: grok },
  { name: 'Extra High aliases xhigh', args: ['Grok 4.7', 'eXtRa HiGh'], kind: 'grok', before: 'grok.txt', status: 0, stdout: grok },
  { name: 'Cursor bare Max fails closed', args: ['Muse Spark', 'max'], kind: 'cursor', before: 'cursor.txt', status: 1,
    stdout: 'Muse Spark 1.3 1M Max\n' },
  { name: 'stale header and transcript are ignored', args: ['GPT-5.6-Luna', 'max'], before: 'codex-stale-effort.txt', status: 1, stdout: codex },
  { name: 'missing footer effort fails closed', args: ['GPT-5.6-Luna', 'max'], before: 'codex-no-effort.txt', status: 1,
    stdout: 'GPT-5.6-Luna · plan Max · context Max · weekly 99% left\n' },
]) {
  test(`PANE: ${scenario.name}`, () => {
    const result = runHelper('pane-model.sh', ['test-pane', ...scenario.args], scenario);
    assert.equal(result.status, scenario.status, result.stderr);
    assert.equal(result.stdout, scenario.stdout);
    assert.ok(result.calls.some((call) => call[1] === 'get'), 'look up the current pane kind');
    const reads = result.calls.filter((call) => call[1] === 'read');
    assert.ok(reads.length > 0, 'read the live footer');
    for (const call of reads) {
      assert.deepEqual(call, ['pane', 'read', 'test-pane', '--source', 'visible'],
        'read only the current visible pane, never transcript or config');
    }
    assert.deepEqual(mutatingCalls(result), []);
  });
}

for (const [name, args] of [
  ['no arguments', []],
  ['empty pane', ['']],
  ['empty model', ['test-pane', '']],
  ['effort without model', ['test-pane', '', 'medium']],
  ['empty effort', ['test-pane', 'GPT-5.6-Luna', '']],
  ['multiline effort', ['test-pane', 'GPT-5.6-Luna', 'high\nmax']],
  ['multiline model', ['test-pane', 'GPT-5.6-Luna\nOther', 'medium']],
  ['too many arguments', ['test-pane', 'GPT-5.6-Luna', 'medium', 'extra']],
]) {
  test(`PANE: ${name} returns usage code 2`, () => {
    const result = runHelper('pane-model.sh', args);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, '');
    assert.deepEqual(mutatingCalls(result), []);
  });
}
