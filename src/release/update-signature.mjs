import { createHash, createPublicKey, verify } from 'node:crypto';

// Tauri wraps Minisign text in base64. Verify both the package signature and
// its trusted comment, as minisign-verify does in the native updater.
export function verifyUpdateSignature(bytes, encodedSignature, encodedKey, version) {
  const keyLines = Buffer.from(encodedKey.trim(), 'base64').toString('utf8').trim().split('\n');
  const lines = Buffer.from(encodedSignature.trim(), 'base64').toString('utf8').trim().split('\n');
  const key = Buffer.from(keyLines[1] ?? '', 'base64');
  const signature = Buffer.from(lines[1] ?? '', 'base64');
  const global = Buffer.from(lines[3] ?? '', 'base64');
  if (key.length !== 42 || key.subarray(0, 2).toString() !== 'Ed' || signature.length !== 74 ||
      signature.subarray(0, 2).toString() !== 'ED' || global.length !== 64 ||
      !key.subarray(2, 10).equals(signature.subarray(2, 10)) || !lines[2]?.startsWith('trusted comment: '))
    throw new Error('Invalid update signature or signing key');
  const publicKey = createPublicKey({ key: Buffer.concat([
    Buffer.from('302a300506032b6570032100', 'hex'), key.subarray(10),
  ]), format: 'der', type: 'spki' });
  const comment = lines[2].slice('trusted comment: '.length);
  if (!verify(null, createHash('blake2b512').update(bytes).digest(), publicKey, signature.subarray(10)) ||
      !verify(null, Buffer.concat([signature.subarray(10), Buffer.from(comment)]), publicKey, global) ||
      !comment.split('\t').includes(`version:${version}`))
    throw new Error('Update signature does not match its bytes, key, or version');
}
