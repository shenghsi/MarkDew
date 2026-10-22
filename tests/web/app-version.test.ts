// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { showAboutDialog } from '../../src/web/settings';

const version: string = JSON.parse(readFileSync('package.json', 'utf8')).version;

it('shows the version of package.json in About', () => {
  document.body.replaceChildren();
  const dialog = showAboutDialog();
  expect(dialog.querySelector('.about-version')!.textContent).toBe(`Version ${version}`);
  expect(__APP_VERSION__).toBe(version);
  document.body.replaceChildren();
});

it('never writes a version number into the web code, which would go stale at the next release', () => {
  for (const name of readdirSync('src/web').filter(file => /\.(ts|mjs)$/.test(file))) {
    const text = readFileSync(`src/web/${name}`, 'utf8');
    expect(text.match(/Version \d+\.\d+\.\d+|checkAppUpdates\(\s*['"]\d/g), name).toBeNull();
  }
});
