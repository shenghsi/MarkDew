import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const hook = resolve('src/desktop/windows/open-with.nsh');
test('Windows disables default association macros and registers only owned Open With values', () => {
  const config = JSON.parse(readFileSync('src/desktop/tauri.windows.conf.json', 'utf8'));
  assert.deepEqual(config.bundle.fileAssociations, []);
  assert.equal(config.bundle.windows.nsis.installerHooks, 'windows/open-with.nsh');
  const source = readFileSync(hook, 'utf8');
  const writes = source.split('\n').filter(line => /^\s*WriteReg/.test(line));
  assert.equal(writes.length, 6);
  for (const line of writes) {
    assert.match(line, /SHCTX/);
    assert.ok(line.includes('Classes\\${MARKDEW_PROGID}') || line.includes('OpenWithProgids" "${MARKDEW_PROGID}"'));
  }
  for (const extension of ['md', 'markdown', 'txt']) {
    assert.ok(source.includes(`Classes\\.${extension}\\OpenWithProgids`));
    assert.ok(!source.includes(`DeleteRegKey SHCTX "Software\\Classes\\.${extension}`));
  }
  assert.ok(source.includes("${If} $R7 == '${MARKDEW_COMMAND}'"));
  assert.ok(source.includes('!define MARKDEW_COMMAND \'$\\"$INSTDIR\\${MAINBINARYNAME}.exe$\\" $\\"%1$\\"\''));
  for (const line of source.split('\n').filter(line => /^\s*DeleteRegKey/.test(line))) {
    assert.match(line, /\/ifempty SHCTX "Software\\Classes\\\$\{MARKDEW_PROGID\}/);
  }
});

const windowsCompiler = join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'NSIS', 'makensis.exe');
const compiler = process.platform === 'win32' && existsSync(windowsCompiler) ? windowsCompiler : 'makensis';
const available = spawnSync(compiler, ['-VERSION'], { encoding: 'utf8' }).status === 0;
test('NSIS compiles both actual installer hooks', { skip: !available && process.platform !== 'win32' }, () => {
  assert.ok(available, 'Windows checks require the NSIS compiler');
  const directory = mkdtempSync(join(tmpdir(), 'markdew-nsis-'));
  try {
    const output = join(directory, 'check.exe');
    const prefix = process.platform === 'win32' ? '/' : '-';
    const result = spawnSync(compiler, [`${prefix}DHOOK=${hook}`, `${prefix}DOUTPUT=${output}`, resolve('tests/node/open-with.nsi')], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(existsSync(output));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Linux desktop entry accepts file arguments and advertises Markdown MIME aliases', () => {
  const config = JSON.parse(readFileSync('src/desktop/tauri.conf.json', 'utf8'));
  const path = resolve('src/desktop', config.bundle.linux.deb.desktopTemplate);
  const template = readFileSync(path, 'utf8');
  const rendered = template.replaceAll('{{name}}', 'MarkDew').replaceAll('{{exec}}', 'markdew-desktop').replaceAll('{{icon}}', 'markdew-desktop');
  assert.match(rendered, /^Exec=markdew-desktop %F$/m);
  assert.match(rendered, /^Type=Application$/m);
  assert.match(rendered, /^MimeType=text\/markdown;text\/x-markdown;text\/plain;$/m);
  assert.doesNotMatch(rendered, /^(Hidden|NoDisplay)=true$/m);
  assert.doesNotMatch(rendered, /xdg-mime default/);
  const validator = spawnSync('desktop-file-validate', ['--version'], { encoding: 'utf8' });
  if (validator.error?.code === 'ENOENT') return;
  const directory = mkdtempSync(join(tmpdir(), 'markdew-desktop-entry-'));
  try {
    const desktop = join(directory, 'MarkDew.desktop');
    writeFileSync(desktop, rendered);
    const result = spawnSync('desktop-file-validate', [desktop], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
