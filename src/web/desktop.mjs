import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const command = process.argv[2] || 'dev';
const executable = resolve('node_modules/@tauri-apps/cli/tauri.js');
const child = spawn(process.execPath, [executable, command, ...process.argv.slice(3)], {
  cwd: resolve('src/desktop'), stdio: 'inherit', env: process.env,
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
