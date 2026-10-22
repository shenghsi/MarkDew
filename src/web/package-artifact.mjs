import { createHash } from 'node:crypto';
import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Record build artifacts only. This command does not sign, install, or publish.
const kind = process.argv[2];
const formats = { dmg: ['src/desktop/target/release/bundle/dmg', '.dmg'], deb: ['src/desktop/target/release/bundle/deb', '.deb'], nsis: ['src/desktop/target/release/bundle/nsis', '.exe'] };
if (!Object.hasOwn(formats, kind)) throw new Error('Expected dmg, deb, or nsis');
const sha = process.env.CI_CHECKOUT_SHA;
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Expected complete checkout SHA');
const [folder, suffix] = formats[kind];
const files = readdirSync(folder).filter(name => name.endsWith(suffix)).sort();
if (!files.length) throw new Error('No package produced');
if (files.length !== 1) throw new Error('Expected exactly one package');
let signing = 'unsigned';
if (kind === 'dmg') {
  const dmg = join(folder, files[0]);
  spawnSync('codesign', ['--force', '--sign', '-', dmg], { encoding: 'utf8' });
  const verify = spawnSync('codesign', ['--verify', '--strict', dmg], { encoding: 'utf8' });
  const describe = spawnSync('codesign', ['--display', '--verbose=4', dmg], { encoding: 'utf8' });
  if (verify.status !== 0 || describe.status !== 0 || !/Signature=adhoc/.test(describe.stderr))
    throw new Error('Expected a verified ad-hoc macOS dmg');
  signing = 'ad-hoc';
}
mkdirSync('desktop-package', { recursive: true });
const packages = files.map(name => {
  const source = join(folder, name);
  if (!lstatSync(source).isFile()) throw new Error('Package must be a regular file');
  const bytes = readFileSync(source);
  if (!bytes.length) throw new Error('Empty package');
  copyFileSync(source, join('desktop-package', name));
  return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
let update;
if (process.env.MARKDEW_SIGNED_UPDATES === '1') {
  const updateFolder = kind === 'dmg' ? 'src/desktop/target/release/bundle/macos' : folder;
  const updateSuffix = kind === 'dmg' ? '.app.tar.gz' : suffix;
  const names = readdirSync(updateFolder).filter(name => name.endsWith(updateSuffix));
  if (names.length !== 1) throw new Error('Expected exactly one signed update package');
  const name = names[0], signatureName = `${name}.sig`;
  const record = filename => {
    const path = join(updateFolder, filename);
    if (!lstatSync(path).isFile()) throw new Error('Update files must be regular files');
    const bytes = readFileSync(path);
    if (!bytes.length) throw new Error('Empty update file');
    copyFileSync(path, join('desktop-package', filename));
    return { name: filename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  update = { package: record(name), signature: record(signatureName) };
}
writeFileSync('desktop-package/manifest.json', JSON.stringify({ schema: 1, checkout: sha,
  os: process.env.RUNNER_OS ?? process.platform, arch: process.env.RUNNER_ARCH ?? process.arch,
  format: kind, unsigned: true, signing, packages, update }, null, 2) + '\n');
