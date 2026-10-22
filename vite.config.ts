import { configDefaults, defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { verifyStartupAssets } from './src/web/startup-assets.mjs';
// The app shows and compares this version, so package.json stays its single source in the web code.
const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [{ name: 'markdew-startup-dependencies', apply: 'build', generateBundle(_options, bundle) {
    const result = verifyStartupAssets(bundle);
    console.log(`Startup dependency check: HTML parser and print tools are deferred; ${result.staticChunks} static chunks, ${result.staticBytes} JS bytes at graph check.`);
  } }],
  test: { exclude: [...configDefaults.exclude, 'tests/node/**'] },
  server: { strictPort: true, watch: { ignored: ['**/src/desktop/target/**'] } },
});
