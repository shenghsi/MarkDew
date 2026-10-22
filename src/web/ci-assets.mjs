import { readdirSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const sha = process.env.CI_CHECKOUT_SHA;
if (!sha || !/^[a-f0-9]{40,64}$/.test(sha)) throw new Error('Set CI_CHECKOUT_SHA to the checked-out commit.');
function files(folder = 'dist', prefix = '') {
  return readdirSync(folder).sort().flatMap(name => {
    const path = join(folder, name), relative = prefix + name, stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Frontend symlink: ${relative}`);
    if (stat.isDirectory()) return files(path, relative + '/');
    if (!stat.isFile()) throw new Error(`Unsupported frontend entry: ${relative}`);
    return [{ path: relative, bytes: stat.size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }];
  });
}
const manifest = { schema: 1, checkout: sha, files: files() };
if (!manifest.files.some(file => file.path === 'index.html')) throw new Error('The frontend has no index.html.');
if (process.argv[2] === 'record') writeFileSync('frontend-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
else if (process.argv[2] === 'verify') {
  const recorded = JSON.parse(readFileSync('frontend-manifest.json', 'utf8'));
  if (JSON.stringify(recorded) !== JSON.stringify(manifest)) throw new Error('Frontend files or checkout do not match the artifact manifest.');
} else throw new Error('Use record or verify.');
console.log(`${process.argv[2]}: ${manifest.files.length} frontend files for ${sha}`);
