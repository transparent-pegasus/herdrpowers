#!/usr/bin/env node
// The real helpers call this offline boundary instead of a live Herdr service.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
appendFileSync(process.env.HERDR_TEST_LOG, `${JSON.stringify(args)}\n`);
const [resource, action, pane, ...rest] = args;
const reply = (result) => process.stdout.write(`${JSON.stringify({ result })}\n`);
const stateFile = process.env.HERDR_TEST_STATE;
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
const save = () => writeFileSync(stateFile, JSON.stringify(state));
const kind = process.env.HERDR_TEST_KIND;
const unexpected = () => {
  process.stderr.write(`Unexpected offline Herdr call: ${JSON.stringify(args)}\n`);
  process.exitCode = 90;
};

if (resource === 'pane' && action === 'get' && pane === 'test-pane' && rest.length === 0) {
  reply({ pane: { id: pane, tab_id: 'test-tab', agent: kind, agent_status: state.submitted ? 'working' : 'idle' } });
} else if (resource === 'pane' && action === 'read' && pane === 'test-pane'
    && rest.join(' ') === '--source visible') {
  process.stdout.write(readFileSync(state.reset ? process.env.HERDR_TEST_AFTER : process.env.HERDR_TEST_BEFORE, 'utf8'));
} else if (resource === 'pane' && action === 'read' && pane === 'test-pane'
    && rest.join(' ') === '--source recent --lines 40') {
  process.stdout.write('Working on the supplied task\n');
} else if (resource === 'pane' && action === 'process-info' && pane === '--pane'
    && rest.length === 1 && rest[0] === 'test-pane') {
  reply({ process_info: {
    foreground_processes: [{ pid: Number(process.env.HERDR_TEST_FOREGROUND_PID) }],
    shell_pid: Number(process.env.HERDR_TEST_SHELL_PID),
  } });
} else if (resource === 'pane' && action === 'send-text' && pane === 'test-pane' && rest.length === 1) {
  state.composer = rest[0];
  save();
  reply({});
} else if (resource === 'pane' && action === 'send-keys' && pane === 'test-pane' && rest.length === 1) {
  switch (rest[0]) {
    case 'ctrl+u': state.composer = ''; break;
    case 'esc': break;
    case 'ctrl+x': state.leader = true; break;
    case 'n':
      if (kind !== 'opencode' || !state.leader) { unexpected(); break; }
      state.reset = true;
      state.composer = '';
      state.leader = false;
      break;
    case 'enter':
      if (state.composer === '/clear') {
        state.reset = true;
        state.composer = '';
      } else if (state.composer) {
        state.submitted = true;
      } else {
        unexpected();
      }
      break;
    default: unexpected();
  }
  save();
  if (!process.exitCode) reply({});
} else {
  unexpected();
}
