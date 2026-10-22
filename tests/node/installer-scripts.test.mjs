import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const installersDir = 'src/release/installers';
const shScriptPath = join(installersDir, 'markdew-installer.sh');
const psScriptPath = join(installersDir, 'markdew-installer.ps1');

test('installer script files exist and are not empty', () => {
  assert.ok(existsSync(shScriptPath), 'markdew-installer.sh exists');
  assert.ok(existsSync(psScriptPath), 'markdew-installer.ps1 exists');
  const shBytes = readFileSync(shScriptPath);
  const psBytes = readFileSync(psScriptPath);
  assert.ok(shBytes.length > 500, 'markdew-installer.sh has substantial content');
  assert.ok(psBytes.length > 500, 'markdew-installer.ps1 has substantial content');
});

test('markdew-installer.sh is valid POSIX shell syntax', { skip: process.platform === 'win32' }, () => {
  const result = spawnSync('sh', ['-n', shScriptPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('markdew-installer.sh implements security and tamper-resistance invariants', () => {
  const content = readFileSync(shScriptPath, 'utf8');

  // Truncation defense: execution wrapped in main
  assert.match(content, /main\s*\(\)\s*\{/);
  assert.match(content, /main\s+"\$@"\s*$/m);

  // POSIX cleanup trap
  assert.match(content, /trap cleanup EXIT INT TERM/);

  // Redirection tag resolution to avoid GitHub API 60-req/hr rate limits
  assert.match(content, /releases\/latest/);
  assert.match(content, /url_effective/);

  // Checksum verification
  assert.match(content, /verify_sha256/);
  assert.match(content, /SHA256SUMS/);

  // macOS installation safeguards: ditto, xattr -cr, hdiutil detach
  assert.match(content, /ditto\s+"\$\{?source_app\}?"\s+"\$\{?target_app\}?"/);
  assert.match(content, /xattr -cr/);
  assert.match(content, /hdiutil attach/);
  assert.match(content, /hdiutil detach/);
  assert.match(content, /pgrep -x MarkDew/);
});

test('markdew-installer.ps1 implements PowerShell invariants and security checks', () => {
  const content = readFileSync(psScriptPath, 'utf8');

  // Truncation defense: execution wrapped in invocation block
  assert.match(content, /^&\s*\{/);

  // TLS 1.2 protocol enforcement
  assert.match(content, /\[Net\.SecurityProtocolType\]::Tls12/);

  // Architecture validation
  assert.match(content, /PROCESSOR_ARCHITECTURE/);

  // Running process check
  assert.match(content, /Get-Process -Name "MarkDew"/);

  // Redirection tag resolution
  assert.match(content, /releases\/latest/);

  // SHA-256 hash check
  assert.match(content, /Get-FileHash -Path \$packageFile -Algorithm SHA256/);

  // NSIS silent installer execution
  assert.match(content, /Start-Process -FilePath \$packageFile -ArgumentList "\/S"/);
});
