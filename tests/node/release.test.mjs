import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { collect as releaseCollect, validateTag } from '../../src/release/release.mjs';

const signingKey = generateKeyPairSync('ed25519');
const keyId = Buffer.from('1122334455667788', 'hex');
const publicBytes = signingKey.publicKey.export({type: 'spki', format: 'der'}).subarray(-32);
const publicKey = Buffer.from(`untrusted comment: test key\n${Buffer.concat([Buffer.from('Ed'), keyId, publicBytes]).toString('base64')}\n`).toString('base64');
function signatureFor(bytes, version = '1.0.0') {
  const signature = sign(null, createHash('blake2b512').update(bytes).digest(), signingKey.privateKey);
  const comment = `timestamp:1\tversion:${version}`;
  const global = sign(null, Buffer.concat([signature, Buffer.from(comment)]), signingKey.privateKey);
  return Buffer.from(`untrusted comment: test signature\n${Buffer.concat([Buffer.from('ED'), keyId, signature]).toString('base64')}\ntrusted comment: ${comment}\n${global.toString('base64')}\n`).toString('base64');
}
const collect = (input, output, tag, sha) => releaseCollect(input, output, tag, sha, undefined, publicKey);

const sha = 'a'.repeat(40), tag = 'v1.0.0-beta.1', stableTag = 'v1.0.0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'markdew-release-')), input = join(root, 'release-input'); mkdirSync(input);
  for (const [os, arch, format, signing, suffix] of [
    ['macOS', 'ARM64', 'dmg', 'ad-hoc', '.dmg'], ['macOS', 'X64', 'dmg', 'ad-hoc', '.dmg'],
    ['Linux', 'X64', 'deb', 'unsigned', '.deb'], ['Windows', 'X64', 'nsis', 'unsigned', '.exe'],
  ]) {
    const folder = join(input, `${os}-${arch}`); mkdirSync(folder);
    const name = 'MarkDew' + suffix, bytes = Buffer.from(`${os}-${arch} package`); writeFileSync(join(folder, name), bytes);
    const updateName = format === 'dmg' ? 'MarkDew.app.tar.gz' : name;
    const signature = Buffer.from(signatureFor(bytes));
    writeFileSync(join(folder, updateName), bytes);
    writeFileSync(join(folder, updateName + '.sig'), signature);
    writeFileSync(join(folder, 'manifest.json'), JSON.stringify({ schema: 1, checkout: sha, os, arch, format, signing,
      unsigned: true, packages: [{ name, bytes: bytes.length, sha256: hash(bytes) }],
      update: {package: {name: updateName, bytes: bytes.length, sha256: hash(bytes)},
        signature: {name: updateName + '.sig', bytes: signature.length, sha256: hash(signature)}} }));
  }
  return { root, input, output: join(root, 'output') };
}
test('release tags require matching versions and reject invalid names', () => {
  assert.equal(validateTag(tag, ['1.0.0', '1.0.0', '1.0.0']), '1.0.0');
  assert.equal(validateTag(stableTag, ['1.0.0', '1.0.0', '1.0.0']), '1.0.0');
  for (const value of ['v1.0.0-beta.0', 'v1.0.0-beta.01', 'v01.1.0-beta.1', 'v01.0.0', '1.0.0', 'v1.0.0-alpha.1', 'v1.0.0-rc.1', 'v1.0.0;echo bad', undefined, ''])
    assert.throws(() => validateTag(value, ['1.0.0']));
  assert.throws(() => validateTag(tag, ['1.0.0', '1.2.0']));
  assert.throws(() => validateTag(stableTag, ['1.0.0', '1.2.0']));
});
test('four-platform collection produces unique packages and verifiable checksum entries', () => {
  const f = fixture();
  try {
    const assets = collect(f.input, f.output, tag, sha); assert.equal(assets.length, 18);
    const sums = readFileSync(join(f.output, 'SHA256SUMS'), 'utf8').trim().split('\n'); assert.equal(sums.length, 17);
    for (const entry of sums) { const [digest, name] = entry.split('  '); assert.equal(hash(readFileSync(join(f.output, name))), digest); }
    assert.ok(assets.some(path => path.endsWith('macos-arm64.dmg'))); assert.ok(assets.some(path => path.endsWith('macos-x64.dmg')));
    const latest = JSON.parse(readFileSync(join(f.output, 'latest.json')));
    assert.equal(latest.version, '1.0.0');
    assert.deepEqual(Object.keys(latest.platforms).sort(), ['darwin-aarch64', 'darwin-x86_64', 'linux-x86_64', 'windows-x86_64']);
    for (const platform of Object.values(latest.platforms)) {
      assert.ok(platform.signature);
      assert.ok(assets.some(path => path.endsWith(new URL(platform.url).pathname.split('/').pop())));
    }
    assert.ok(assets.some(path => path.endsWith('markdew-installer.sh'))); assert.ok(assets.some(path => path.endsWith('markdew-installer.ps1')));
    assert.throws(() => collect(f.input, f.output, tag, sha));
  } finally { rmSync(f.root, { recursive: true }); }
});
for (const fault of ['missing', 'changed', 'duplicate', 'checkout', 'signing', 'unexpected', 'traversal', 'empty', 'update-missing', 'update-changed', 'signature-changed', 'signature-wrong-version']) {
  test(`rejects ${fault} artifacts before creating release output`, () => {
    const f = fixture();
    try {
      const folder = join(f.input, 'Linux-X64'), manifestPath = join(folder, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (fault === 'missing') rmSync(folder, { recursive: true });
      else if (fault === 'changed') writeFileSync(join(folder, 'MarkDew.deb'), 'changed');
      else if (fault === 'unexpected') writeFileSync(join(folder, 'extra'), 'extra');
      else {
        if (fault === 'update-missing') delete manifest.update;
        if (fault === 'update-changed') writeFileSync(join(folder, manifest.update.package.name), 'bad update');
        if (fault === 'signature-changed' || fault === 'signature-wrong-version') {
          const record = manifest.update.signature;
          const bytes = Buffer.from(fault === 'signature-changed' ? 'invalid signature' : signatureFor(readFileSync(join(folder, manifest.update.package.name)), '9.0.0'));
          writeFileSync(join(folder, record.name), bytes); record.bytes = bytes.length; record.sha256 = hash(bytes);
        }
        if (fault === 'duplicate') { manifest.os = 'macOS'; manifest.arch = 'X64'; }
        if (fault === 'checkout') manifest.checkout = 'b'.repeat(40);
        if (fault === 'signing') manifest.signing = 'Developer ID';
        if (fault === 'traversal') manifest.packages[0].name = '../outside.deb';
        if (fault === 'empty') { writeFileSync(join(folder, 'MarkDew.deb'), ''); manifest.packages[0].bytes = 0; manifest.packages[0].sha256 = hash(''); }
        writeFileSync(manifestPath, JSON.stringify(manifest));
      }
      assert.throws(() => collect(f.input, f.output, tag, sha));
      assert.throws(() => readFileSync(join(f.output, 'SHA256SUMS')));
    } finally { rmSync(f.root, { recursive: true }); }
  });
}
test('linked package files are rejected', { skip: process.platform === 'win32' }, () => {
  const f = fixture();
  try {
    const path = join(f.input, 'Linux-X64', 'MarkDew.deb'), bytes = readFileSync(path);
    writeFileSync(join(f.root, 'actual.deb'), bytes); rmSync(path); symlinkSync(join(f.root, 'actual.deb'), path);
    assert.throws(() => collect(f.input, f.output, tag, sha));
  } finally { rmSync(f.root, { recursive: true }); }
});

const program = fileURLToPath(new URL('../../src/release/release.mjs', import.meta.url));
function checkout(f, checkoutTag = tag) {
  mkdirSync(join(f.root, 'src/desktop'), { recursive: true });
  mkdirSync(join(f.root, 'src/release/installers'), { recursive: true });
  writeFileSync(join(f.root, 'src/release/installers/markdew-installer.sh'), '#!/bin/sh\necho install\n');
  writeFileSync(join(f.root, 'src/release/installers/markdew-installer.ps1'), '# PowerShell\nWrite-Host install\n');
  writeFileSync(join(f.root, 'package.json'), JSON.stringify({ version: '1.0.0' }));
  writeFileSync(join(f.root, 'package-lock.json'), JSON.stringify({ version: '1.0.0', packages: { '': { version: '1.0.0' } } }));
  writeFileSync(join(f.root, 'src/desktop/tauri.conf.json'), JSON.stringify({ version: '1.0.0', plugins: {updater: {pubkey: publicKey}} }));
  writeFileSync(join(f.root, 'src/desktop/Cargo.toml'), '[package]\nname="markdew-desktop"\nversion="1.0.0"\n');
  writeFileSync(join(f.root, 'BETA_RELEASE.md'), 'Test build. Native acceptance remains open.\n');
  writeFileSync(join(f.root, 'RELEASE.md'), 'MarkDew stable release notes.\n');
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: f.root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  git('init', '-q'); git('add', 'package.json', 'package-lock.json', 'src/desktop', 'src/release', 'BETA_RELEASE.md', 'RELEASE.md');
  git('-c', 'user.name=Release test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture');
  const checkoutSha = git('rev-parse', 'HEAD'); git('tag', checkoutTag);
  for (const platform of ['macOS-ARM64', 'macOS-X64', 'Linux-X64', 'Windows-X64']) {
    const path = join(f.input, platform, 'manifest.json'), manifest = JSON.parse(readFileSync(path));
    manifest.checkout = checkoutSha; writeFileSync(path, JSON.stringify(manifest));
  }
  const run = (mode, extra = {}) => spawnSync(process.execPath, [program, mode], { cwd: f.root, encoding: 'utf8',
    env: { ...process.env, RELEASE_TAG: checkoutTag, CI_CHECKOUT_SHA: checkoutSha, GH_REPO: 'example/MarkDew', ...extra } });
  return { run, checkoutSha };
}
test('CLI validates source versions and exact tag checkout before any release command', () => {
  const f = fixture();
  try {
    const { run } = checkout(f); assert.equal(run('validate').status, 0);
    assert.notEqual(run('validate', { CI_CHECKOUT_SHA: sha }).status, 0);
    assert.notEqual(run('validate', { RELEASE_TAG: 'v1.0.0-beta.2' }).status, 0);
    writeFileSync(join(f.root, 'src/desktop/tauri.conf.json'), JSON.stringify({ version: '1.2.0' }));
    assert.notEqual(run('validate').status, 0);
  } finally { rmSync(f.root, { recursive: true }); }
});
for (const state of ['success', 'existing', 'offline', 'upload-failed', 'missing-assets', 'wrong-state', 'wrong-digest']) {
  test(`draft creation handles ${state} without publishing or overwriting`, { skip: process.platform === 'win32' }, () => {
    const f = fixture();
    try {
      const { run } = checkout(f), bin = join(f.root, 'bin'); mkdirSync(bin);
      // A local fake CLI records writes. This test cannot contact GitHub.
      writeFileSync(join(bin, 'gh'), `#!/usr/bin/env node
const fs=require('node:fs'),args=process.argv.slice(2);fs.appendFileSync('calls.jsonl',JSON.stringify(args)+'\\n');
if(args[1]==='view'&&args.includes('--json')){let assets=fs.readdirSync('release-output').map(name=>{const bytes=fs.readFileSync('release-output/'+name);return {name,size:bytes.length,state:'uploaded',digest:'sha256:'+require('node:crypto').createHash('sha256').update(bytes).digest('hex')};});if(process.env.TEST_STATE==='missing-assets')assets.pop();if(process.env.TEST_STATE==='wrong-digest')assets[0].digest='sha256:bad';const isPre=args[2].includes('-beta.');console.log(JSON.stringify({tagName:args[2],isDraft:process.env.TEST_STATE!=='wrong-state',isPrerelease:isPre,assets}));process.exit(0);}
if(args[1]==='view'){if(process.env.TEST_STATE==='existing')process.exit(0);console.error(process.env.TEST_STATE==='offline'?'network unavailable':'release not found');process.exit(1);}
if(args[1]==='create'&&process.env.TEST_STATE==='upload-failed'){console.error('upload failed');process.exit(1);}
`, { mode: 0o755 });
      const result = run('create', { PATH: `${bin}:${process.env.PATH}`, TEST_STATE: state });
      const calls = readFileSync(join(f.root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      if (state === 'success') {
        assert.equal(result.status, 0, result.stderr); assert.equal(calls.length, 4);
        const create = calls[1]; for (const flag of ['--draft', '--prerelease', '--verify-tag', '--latest=false']) assert.ok(create.includes(flag));
        assert.equal(create.filter(arg => arg.startsWith('release-output/')).length, 18);
        assert.equal(calls[2][1], 'view'); assert.equal(calls[3][1], 'edit'); assert.ok(calls[3].includes('release-notes.md'));
      } else {
        assert.notEqual(result.status, 0); assert.equal(calls.length, state === 'upload-failed' ? 2 : ['existing','offline'].includes(state) ? 1 : 3);
        if (!['existing','offline'].includes(state)) assert.match(readFileSync(join(f.root, 'release-incomplete.md'), 'utf8'), /INCOMPLETE DRAFT/);
      }
      for (const args of calls) { assert.ok(!args.includes('--clobber')); assert.ok(!args.includes('--draft=false')); }
    } finally { rmSync(f.root, { recursive: true }); }
  });
}
test('draft creation handles stable release tag v1.0.0', { skip: process.platform === 'win32' }, () => {
  const f = fixture();
  try {
    const { run } = checkout(f, stableTag), bin = join(f.root, 'bin'); mkdirSync(bin);
    writeFileSync(join(bin, 'gh'), `#!/usr/bin/env node
const fs=require('node:fs'),args=process.argv.slice(2);fs.appendFileSync('calls.jsonl',JSON.stringify(args)+'\\n');
if(args[1]==='view'&&args.includes('--json')){let assets=fs.readdirSync('release-output').map(name=>{const bytes=fs.readFileSync('release-output/'+name);return {name,size:bytes.length,state:'uploaded',digest:'sha256:'+require('node:crypto').createHash('sha256').update(bytes).digest('hex')};});const isPre=args[2].includes('-beta.');console.log(JSON.stringify({tagName:args[2],isDraft:true,isPrerelease:isPre,assets}));process.exit(0);}
if(args[1]==='view'){console.error('release not found');process.exit(1);}
`, { mode: 0o755 });
    const result = run('create', { PATH: `${bin}:${process.env.PATH}` });
    assert.equal(result.status, 0, result.stderr);
    const calls = readFileSync(join(f.root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(calls.length, 4);
    const create = calls[1];
    for (const flag of ['--draft', '--verify-tag', '--latest=true']) assert.ok(create.includes(flag));
    assert.ok(!create.includes('--prerelease'));
    assert.equal(calls[3][1], 'edit');
    const notesContent = readFileSync(join(f.root, 'release-notes.md'), 'utf8');
    assert.match(notesContent, /MarkDew stable release notes/);
  } finally { rmSync(f.root, { recursive: true }); }
});
