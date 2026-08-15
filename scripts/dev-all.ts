import { spawn } from 'node:child_process';

const workspaces = [
  '@quality-gate/react-app',
  '@quality-gate/angular-app',
  '@quality-gate/html-app',
];

const children = workspaces.map((workspace) => spawn(
  'npm',
  ['run', 'dev', '--workspace', workspace],
  { stdio: 'inherit', shell: process.platform === 'win32' },
));

function stop(): void {
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
