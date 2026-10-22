import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const program = fileURLToPath(new URL('../../src/web/ci-assets.mjs', import.meta.url));
test('frontend artifact verification rejects changed, extra, and wrong-checkout files', () => {
  const folder = mkdtempSync(join(tmpdir(), 'markdew-assets-'));
  try {
    mkdirSync(join(folder, 'dist'));
    writeFileSync(join(folder, 'dist/index.html'), '<p>One</p>');
    const run = (command, sha = 'a'.repeat(40)) => spawnSync(process.execPath, [program, command], {
      cwd: folder, env: { ...process.env, CI_CHECKOUT_SHA: sha }, encoding: 'utf8',
    });
    assert.equal(run('record').status, 0); assert.equal(run('verify').status, 0);
    assert.notEqual(run('verify', 'b'.repeat(40)).status, 0);
    assert.notEqual(run('verify', '').status, 0);
    writeFileSync(join(folder, 'dist/index.html'), '<p>Two</p>'); assert.notEqual(run('verify').status, 0);
    writeFileSync(join(folder, 'dist/index.html'), '<p>One</p>');
    writeFileSync(join(folder, 'dist/extra.js'), 'extra'); assert.notEqual(run('verify').status, 0);
  } finally { rmSync(folder, { recursive: true }); }
});
test('frontend recording rejects a missing entry point', () => {
  const folder = mkdtempSync(join(tmpdir(), 'markdew-assets-'));
  try {
    mkdirSync(join(folder, 'dist'));
    assert.notEqual(spawnSync(process.execPath, [program, 'record'], { cwd: folder,
      env: { ...process.env, CI_CHECKOUT_SHA: 'a'.repeat(40) } }).status, 0);
  } finally { rmSync(folder, { recursive: true }); }
});
test('frontend recording rejects symlinks', { skip: process.platform === 'win32' }, () => {
  const folder = mkdtempSync(join(tmpdir(), 'markdew-assets-'));
  try {
    mkdirSync(join(folder, 'dist')); writeFileSync(join(folder, 'actual.html'), 'actual');
    symlinkSync(join(folder, 'actual.html'), join(folder, 'dist/index.html'));
    assert.notEqual(spawnSync(process.execPath, [program, 'record'], { cwd: folder,
      env: { ...process.env, CI_CHECKOUT_SHA: 'a'.repeat(40) } }).status, 0);
  } finally { rmSync(folder, { recursive: true }); }
});
