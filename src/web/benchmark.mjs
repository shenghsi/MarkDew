import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const preview = process.argv.includes('--preview');
const unicode = process.argv.includes('--unicode');
const prose = process.argv.includes('--prose');
const offsets = process.argv.includes('--offsets');
const growth = process.argv.includes('--growth');
const test = growth ? 'tests/performance/preview-growth.test.ts' : offsets ? 'tests/performance/offsets.test.ts' : 'tests/performance/editor.test.ts';
const result = spawnSync(process.execPath, [resolve('node_modules/vitest/vitest.mjs'), 'run', test], { stdio: 'inherit', env: { ...process.env,
  MARKDEW_BENCH: preview || unicode || prose || offsets || growth ? '0' : '1', MARKDEW_PREVIEW_BENCH: preview ? '1' : '0',
  MARKDEW_GROWTH_BENCH: growth ? '1' : '0',
  MARKDEW_OFFSET_BENCH: offsets ? '1' : '0',
  MARKDEW_PROSE_BENCH: prose ? '1' : '0',
  MARKDEW_UNICODE_BENCH: unicode ? '1' : '0' } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
