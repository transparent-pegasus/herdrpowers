// Shared offline boundary for the real pane-model and composer-submit scripts.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = resolve(here, '../../skills/using-herdr-sibling-panes/scripts');
const fixtures = resolve(here, '../pane-model/fixtures');

// composer-submit measures /proc/PID/fd/0. Give it a real, local 120-column
// PTY owned by this short-lived wrapper; do not mock Python or width checks.
const terminal = `
import fcntl, os, pty, struct, subprocess, sys, termios
master, slave = pty.openpty()
try:
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 40, 120, 0, 0))
    os.dup2(slave, 0)
    os.environ['HERDR_TEST_FOREGROUND_PID'] = str(os.getpid())
    os.environ['HERDR_TEST_SHELL_PID'] = str(os.getppid())
    result = subprocess.run(sys.argv[1:], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    sys.stdout.buffer.write(result.stdout)
    sys.stderr.buffer.write(result.stderr)
finally:
    os.close(master)
    os.close(slave)
sys.exit(result.returncode)
`;

export function runHelper(script, args, {
  kind = 'codex', before = 'codex.txt', after = before, withTerminal = false, agentExits = '',
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'herdr-helper-test-'));
  try {
    mkdirSync(join(dir, 'bin'));
    symlinkSync(join(here, 'herdr-stub.mjs'), join(dir, 'bin/herdr'));
    const log = join(dir, 'calls.jsonl');
    writeFileSync(log, '');
    const command = ['bash', join(scripts, script), ...args];
    const result = spawnSync(withTerminal ? 'python3' : command[0],
      withTerminal ? ['-c', terminal, ...command] : command.slice(1), {
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
          TMPDIR: dir,
          HERDR_TEST_LOG: log,
          HERDR_TEST_STATE: join(dir, 'state.json'),
          HERDR_TEST_KIND: kind,
          HERDR_TEST_AGENT_EXITS: agentExits,
          HERDR_TEST_BEFORE: join(fixtures, before),
          HERDR_TEST_AFTER: join(fixtures, after),
          HERDR_COMPOSER_INPUT_SETTLE_SECONDS: '0',
          HERDR_COMPOSER_CLEAR_SETTLE_SECONDS: '0',
          HERDR_COMPOSER_CONFIRM_TIMEOUT_SECONDS: '1',
          HERDR_COMPOSER_MIN_COLS: '40',
        },
      });
    assert.ifError(result.error);
    const calls = readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    assert.ok(calls.every((call) => call[0] === 'pane'), 'every Herdr call stays inside the offline pane stub');
    assert.doesNotMatch(result.stderr, /Unexpected offline Herdr call/, 'unsupported stub calls must not masquerade as an expected mismatch');
    return { ...result, calls };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function mutatingCalls(result) {
  return result.calls.filter((call) => ['send-keys', 'send-text', 'zoom'].includes(call[1]));
}
