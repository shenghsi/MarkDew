import { createHash } from 'node:crypto';
import { verifyUpdateSignature } from './update-signature.mjs';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function parseTag(tag) {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:-beta\.([1-9]\d*))?$/.exec(tag || '');
  if (!match) return null;
  return {
    baseVersion: match[1],
    isPrerelease: Boolean(match[2]),
  };
}

export function validateTag(tag, versions) {
  const parsed = parseTag(tag);
  if (!parsed || versions.some(version => version !== parsed.baseVersion))
    throw new Error('Use vVERSION or vVERSION-beta.N with the same base version in npm, Cargo, and Tauri');
  return parsed.baseVersion;
}
function regular(path) {
  if (!lstatSync(path).isFile()) throw new Error(`Expected regular file: ${path}`);
  return readFileSync(path);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = new Map([
  ['macOS-ARM64', { format: 'dmg', signing: 'ad-hoc', suffix: '.dmg', name: 'macos-arm64', target: 'darwin-aarch64', updateSuffix: '.app.tar.gz' }],
  ['macOS-X64', { format: 'dmg', signing: 'ad-hoc', suffix: '.dmg', name: 'macos-x64', target: 'darwin-x86_64', updateSuffix: '.app.tar.gz' }],
  ['Linux-X64', { format: 'deb', signing: 'unsigned', suffix: '.deb', name: 'linux-x64', target: 'linux-x86_64', updateSuffix: '.deb' }],
  ['Windows-X64', { format: 'nsis', signing: 'unsigned', suffix: '.exe', name: 'windows-x64', target: 'windows-x86_64', updateSuffix: '.exe' }],
]);

const expectedInstallers = ['markdew-installer.sh', 'markdew-installer.ps1'];

export function collect(input, output, tag, sha, installersDir = 'src/release/installers', publicKey = JSON.parse(regular('src/desktop/tauri.conf.json')).plugins.updater.pubkey, repo = 'shenghsi/MarkDew') {
  const parsed = parseTag(tag);
  if (!parsed) throw new Error('Invalid release tag');
  validateTag(tag, [parsed.baseVersion]);
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Expected full checkout SHA');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Invalid update repository');
  const seen = new Set(), rows = [], platforms = {};
  const folders = readdirSync(input).sort();
  if (folders.length !== expected.size) throw new Error('Expected exactly four platform artifacts');
  for (const folder of folders) {
    const path = join(input, folder);
    if (!lstatSync(path).isDirectory()) throw new Error('Expected artifact directory');
    const manifestBytes = regular(join(path, 'manifest.json'));
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const platform = `${manifest.os}-${manifest.arch}`, spec = expected.get(platform);
    if (!spec || seen.has(platform) || manifest.schema !== 1 || manifest.checkout !== sha ||
        manifest.format !== spec.format || manifest.signing !== spec.signing || manifest.unsigned !== true ||
        !Array.isArray(manifest.packages) || manifest.packages.length !== 1)
      throw new Error('Invalid, duplicate, or wrong-checkout package manifest');
    seen.add(platform);
    const pkg = manifest.packages[0];
    if (typeof pkg.name !== 'string' || basename(pkg.name) !== pkg.name ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(pkg.name) || !pkg.name.endsWith(spec.suffix))
      throw new Error('Invalid package filename');
    const update = manifest.update;
    if (!update?.package || !update?.signature) throw new Error('Missing signed update package');
    const entries = readdirSync(path).sort();
    const expectedEntries = [...new Set(['manifest.json', pkg.name, update.package.name, update.signature.name])].sort();
    if (JSON.stringify(entries) !== JSON.stringify(expectedEntries))
      throw new Error('Unexpected package artifact files');
    const bytes = regular(join(path, pkg.name));
    if (!bytes.length || pkg.bytes !== bytes.length || pkg.sha256 !== hash(bytes))
      throw new Error('Package bytes do not match the manifest');
    const name = `MarkDew-${tag}-${spec.name}`;
    rows.push({ source: join(path, pkg.name), name: name + spec.suffix, sha256: hash(bytes) },
      { source: join(path, 'manifest.json'), name: name + '-manifest.json', sha256: hash(manifestBytes) });
    const updateBytes = record => {
      if (typeof record.name !== 'string' || basename(record.name) !== record.name ||
          !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(record.name)) throw new Error('Invalid update filename');
      const bytes = regular(join(path, record.name));
      if (!bytes.length || bytes.length !== record.bytes || hash(bytes) !== record.sha256)
        throw new Error('Update bytes do not match the manifest');
      return bytes;
    };
    if (!update.package.name.endsWith(spec.updateSuffix) || update.signature.name !== `${update.package.name}.sig` ||
        (spec.format !== 'dmg' && update.package.name !== pkg.name)) throw new Error('Wrong update package format');
    const packageBytes = updateBytes(update.package), signatureBytes = updateBytes(update.signature);
    verifyUpdateSignature(packageBytes, signatureBytes.toString('utf8'), publicKey, parsed.baseVersion);
    const updateName = spec.format === 'dmg' ? name + '.app.tar.gz' : name + spec.suffix;
    if (spec.format === 'dmg') rows.push({source: join(path, update.package.name), name: updateName, sha256: hash(packageBytes)});
    rows.push({source: join(path, update.signature.name), name: `${updateName}.sig`, sha256: hash(signatureBytes)});
    platforms[spec.target] = {url: `https://github.com/${repo}/releases/download/${tag}/${updateName}`,
      signature: signatureBytes.toString('utf8').trim()};
  }
  for (const installer of expectedInstallers) {
    const installerPath = join(installersDir, installer);
    const bytes = regular(installerPath);
    if (!bytes.length) throw new Error(`Empty installer script: ${installer}`);
    rows.push({ source: installerPath, name: installer, sha256: hash(bytes) });
  }
  const latest = Buffer.from(JSON.stringify({ version: parsed.baseVersion, notes: `MarkDew ${tag}`, platforms }, null, 2) + '\n');
  rows.push({ name: 'latest.json', bytes: latest, sha256: hash(latest) });
  // Validate the whole set before creating output. Existing output is rejected.
  mkdirSync(output);
  for (const row of rows) {
    if (row.bytes) writeFileSync(join(output, row.name), row.bytes);
    else copyFileSync(row.source, join(output, row.name));
  }
  writeFileSync(join(output, 'SHA256SUMS'), rows.map(row => `${row.sha256}  ${row.name}\n`).join(''));
  return [...rows.map(row => join(output, row.name)), join(output, 'SHA256SUMS')];
}

function command(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'GitHub command failed');
  return result.stdout;
}
function validateCheckout(tag, sha) {
  const npm = JSON.parse(regular('package.json')), lock = JSON.parse(regular('package-lock.json'));
  const tauri = JSON.parse(regular('src/desktop/tauri.conf.json'));
  const cargo = regular('src/desktop/Cargo.toml').toString('utf8').split(/\n\[/)[0];
  const version = /^version\s*=\s*"([^"]+)"/m.exec(cargo)?.[1];
  validateTag(tag, [npm.version, lock.version, lock.packages?.['']?.version, tauri.version, version]);
  const git = ref => {
    const result = spawnSync('git', ['rev-parse', '--verify', ref], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Cannot resolve release checkout or tag');
    return result.stdout.trim();
  };
  if (!/^[a-f0-9]{40}$/.test(sha || '') || git('HEAD') !== sha || git(`refs/tags/${tag}^{commit}`) !== sha)
    throw new Error('Release checkout and tag commit must match');
}

function main() {
  const tag = process.env.RELEASE_TAG, sha = process.env.CI_CHECKOUT_SHA;
  validateCheckout(tag, sha);
  if (process.argv[2] === 'validate') { console.log(`Validated ${tag} at ${sha}`); return; }
  if (process.argv[2] !== 'create') throw new Error('Use validate or create');
  const repo = process.env.GH_REPO;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) throw new Error('Expected GitHub repository');
  const existing = spawnSync('gh', ['release', 'view', tag, '--repo', repo], { encoding: 'utf8' });
  if (existing.status === 0) throw new Error('Release exists; do not replace it');
  if (!/release not found/i.test(existing.stderr || '')) throw new Error('Cannot confirm release absence');
  const assets = collect('release-input', 'release-output', tag, sha, undefined, undefined, repo);
  const parsed = parseTag(tag);
  const isPrerelease = parsed?.isPrerelease ?? false;
  writeFileSync('release-incomplete.md', 'INCOMPLETE DRAFT: package upload or final verification has not completed. Do not publish.\n');
  const notesPath = !isPrerelease && existsSync('RELEASE.md') ? 'RELEASE.md' : 'BETA_RELEASE.md';
  const notes = regular(notesPath);
  writeFileSync('release-notes.md', `# MarkDew ${tag}\n\nCheckout: ${sha}\n\n${notes.toString('utf8')}`);
  const releaseFlags = isPrerelease
    ? ['--draft', '--prerelease', '--latest=false']
    : ['--draft', '--latest=true'];
  command(['release', 'create', tag, ...assets, '--repo', repo, '--verify-tag', ...releaseFlags,
    '--title', `MarkDew ${tag}`, '--notes-file', 'release-incomplete.md']);
  const uploaded = JSON.parse(command(['release', 'view', tag, '--repo', repo, '--json', 'tagName,isDraft,isPrerelease,assets']));
  if (uploaded.tagName !== tag || uploaded.isDraft !== true || uploaded.isPrerelease !== isPrerelease ||
      !Array.isArray(uploaded.assets) || uploaded.assets.length !== assets.length)
    throw new Error('Incomplete upload or wrong release state; keep the draft unpublished');
  const remaining = new Map(assets.map(path => [basename(path), regular(path)]));
  for (const asset of uploaded.assets) {
    const bytes = remaining.get(asset.name);
    if (!bytes || asset.size !== bytes.length || asset.state !== 'uploaded' ||
        (asset.digest != null && asset.digest !== `sha256:${hash(bytes)}`))
      throw new Error('Uploaded assets do not match; keep the draft unpublished');
    remaining.delete(asset.name);
  }
  if (remaining.size) throw new Error('Missing release assets; keep the draft unpublished');
  command(['release', 'edit', tag, '--repo', repo, '--notes-file', 'release-notes.md']);
  console.log(`Created draft ${isPrerelease ? 'prerelease' : 'release'} ${tag}; manual review is required before publication.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
