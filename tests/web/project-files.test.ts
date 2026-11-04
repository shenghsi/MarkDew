import { expect, it } from 'vitest';
import { projectFiles } from '../../src/web/project-files';

const memory = (text: string | null = null) => {
  const storage = { getItem: () => text, setItem: (_key: string, value: string) => { text = value; } };
  return { storage, text: () => text };
};

it('remembers open files per project folder, most recent first', () => {
  const { storage, text } = memory();
  const record = projectFiles(() => storage);
  record.set('/a', ['/a/x.md', '/a/y.md', '/a/x.md'], '/a/y.md');
  record.set('C:\\中文😀', ['C:\\中文😀\\n.md'], 'C:\\other.md');
  expect(record.get('/a')).toEqual({ files: ['/a/x.md', '/a/y.md'], active: '/a/y.md' });
  // An active file that is not in the list is not kept.
  expect(record.get('C:\\中文😀')).toEqual({ files: ['C:\\中文😀\\n.md'], active: '' });
  expect(JSON.parse(text()!).projects.map((item: { folder: string }) => item.folder)).toEqual(['C:\\中文😀', '/a']);
  record.set('/a', [], '');
  expect(record.get('/a')).toEqual({ files: [], active: '' });
  expect(record.get('/missing')).toBeUndefined();
});

it('keeps at most 32 projects and ignores damaged or unavailable storage', () => {
  const { storage, text } = memory();
  const record = projectFiles(() => storage);
  for (let index = 0; index < 40; index++) record.set(`/p${index}`, [`/p${index}/f.md`], '');
  expect(JSON.parse(text()!).projects).toHaveLength(32);
  expect(record.get('/p0')).toBeUndefined(); expect(record.get('/p39')).toBeDefined();
  for (const damaged of ['{', '{"version":2,"projects":[]}', '{"version":1,"projects":[{"folder":"/a","files":[1],"active":""}]}'])
    expect(projectFiles(() => memory(damaged).storage).get('/a')).toBeUndefined();
  const broken = projectFiles(() => { throw new Error('blocked'); });
  expect(broken.get('/a')).toBeUndefined(); expect(() => broken.set('/a', ['/a/x.md'], '')).not.toThrow();
});
