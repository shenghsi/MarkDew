import { configDefaults, defineConfig } from 'vitest/config';
import { verifyStartupAssets } from './src/web/startup-assets.mjs';
export default defineConfig({
  plugins: [{ name: 'markdew-startup-dependencies', apply: 'build', generateBundle(_options, bundle) {
    const result = verifyStartupAssets(bundle);
    console.log(`Startup dependency check: HTML parser and print tools are deferred; ${result.staticChunks} static chunks, ${result.staticBytes} JS bytes at graph check.`);
  } }],
  test: { exclude: [...configDefaults.exclude, 'tests/node/**'] },
  server: { strictPort: true, watch: { ignored: ['**/src/desktop/target/**'] } },
});
