import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';
import { pairedSource } from './paired.mjs';

// This configuration serves one inactive experiment. Production never uses it.
export default defineConfig({
  optimizeDeps: { force: true },
  server: { host: '127.0.0.1', strictPort: true, watch: { ignored: ['**/src/desktop/target/**'] } },
  plugins: [{ name: 'markdew-inactive-paired-state', apply: 'serve',
    resolveId(id) { if (id === '/__markdew_paired_state__.mjs') return '\0markdew-paired-state'; },
    async load(id) {
      if (id !== '\0markdew-paired-state') return;
      const resolve = createRequire(import.meta.url).resolve;
      const packageURL = new URL('../package.json', pathToFileURL(resolve('@codemirror/state')));
      const info = JSON.parse(await readFile(packageURL, 'utf8'));
      assert.equal(info.version, '6.7.6');
      const source = await readFile(new URL(info.exports.import, packageURL), 'utf8');
      const hash = createHash('sha256').update(source).digest('hex');
      assert.equal(hash, 'cf4ffe7d177bf2c7c5da66c49be0811cc79a29e12cb658238876bbdcef12939c');
      return pairedSource(source) + `\nexport const packageVersion = ${JSON.stringify(info.version)};\nexport const sourceSHA256 = ${JSON.stringify(hash)};\n`;
    },
  }],
});
