#!/usr/bin/env node
// Offline herdr for agent-lifecycle.sh: panes live in a JSON state file, and
// every call is logged so a test can prove what was (not) sent.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
appendFileSync(process.env.HERDR_TEST_LOG, `${JSON.stringify(args)}\n`);
const stateFile = process.env.HERDR_TEST_STATE;
const state = JSON.parse(readFileSync(stateFile, 'utf8'));
const save = () => writeFileSync(stateFile, JSON.stringify(state));
const reply = (result) => process.stdout.write(`${JSON.stringify({ result })}\n`);
const fail = (code) => {
  process.stderr.write(`${JSON.stringify({ error: { code, message: code } })}\n`);
  process.exitCode = 1;
};
const unexpected = () => {
  process.stderr.write(`Unexpected offline Herdr call: ${JSON.stringify(args)}\n`);
  process.exitCode = 90;
};
const AGENT_PID = 4242;

const [resource, action, ...rest] = args;
if (resource === 'pane' && action === 'get' && rest.length === 1) {
  const pane = state.panes[rest[0]];
  if (!pane) fail('pane_not_found');
  else {
    reply({ pane: {
      pane_id: rest[0], tab_id: pane.tab, workspace_id: pane.workspace,
      ...(pane.agent ? { agent: pane.agent } : {}),
      agent_status: pane.status, cwd: pane.cwd, foreground_cwd: pane.cwd,
    } });
  }
} else if (resource === 'pane' && action === 'process-info' && rest[0] === '--pane' && state.panes[rest[1]]) {
  const pane = state.panes[rest[1]];
  reply({ process_info: {
    foreground_processes: [{ pid: pane.foreground }], shell_pid: pane.shell,
    foreground_process_group_id: pane.foreground,
  } });
} else if (resource === 'pane' && action === 'read' && state.panes[rest[0]]
    && rest.slice(1).join(' ') === '--source visible') {
  const { screen } = state.panes[rest[0]];
  process.stdout.write(screen ? readFileSync(screen, 'utf8') : '$ \n');
} else if (resource === 'pane' && action === 'send-keys' && state.panes[rest[0]] && rest.length > 1) {
  const pane = state.panes[rest[0]];
  const keys = rest.slice(1).join(' ');
  if (pane.foreground === pane.shell) {
    // Only the line-discarding ctrl+c may ever reach a shell prompt.
    if (keys !== 'ctrl+c') unexpected();
  } else if (keys === pane.exitKeys) {
    Object.assign(pane, { foreground: pane.shell, agent: null, status: 'unknown', screen: null });
  }
  save();
  if (!process.exitCode) reply({ type: 'ok' });
} else if (resource === 'agent' && action === 'start') {
  const [name, kindFlag, kind, paneFlag, id, timeoutFlag, timeout, ...agentArgs] = rest;
  const pane = state.panes[id];
  if (kindFlag !== '--kind' || paneFlag !== '--pane' || timeoutFlag !== '--timeout' || !pane
      || !/^\d+$/.test(timeout) || (agentArgs.length && agentArgs[0] !== '--')) {
    unexpected();
  } else if (state.start === 'rejected') {
    fail('pane_not_available');
  } else {
    const blocked = state.start === 'blocked';
    Object.assign(pane, {
      agent: kind, status: blocked ? 'blocked' : 'idle', foreground: AGENT_PID, screen: state.startScreen ?? null,
    });
    save();
    if (blocked) fail('agent_not_ready');
    else reply({ type: 'agent_started', agent: { name, agent: kind, pane_id: id }, argv: [kind, ...agentArgs.slice(1)] });
  }
} else {
  unexpected();
}
