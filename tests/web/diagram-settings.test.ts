// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { applyDiagramStyle, DEFAULT_DIAGRAM_SETTINGS, DIAGRAM_KEYS, diagramRenderOptions, getDiagramSettings } from '../../src/web/diagram-settings';

function memory(values: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(values));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as Storage;
}

test('defaults apply when storage is empty or holds invalid values', () => {
  expect(getDiagramSettings(memory())).toEqual(DEFAULT_DIAGRAM_SETTINGS);
  expect(getDiagramSettings(memory({ [DIAGRAM_KEYS.PALETTE]: 'neon', [DIAGRAM_KEYS.FONT_SIZE]: '99' }))).toEqual(DEFAULT_DIAGRAM_SETTINGS);
});

test('saved values map to render options and CSS variables', () => {
  const settings = getDiagramSettings(memory({ [DIAGRAM_KEYS.FONT]: 'mono', [DIAGRAM_KEYS.FONT_SIZE]: '14',
    [DIAGRAM_KEYS.PADDING]: '20', [DIAGRAM_KEYS.PALETTE]: 'warm', [DIAGRAM_KEYS.RADIUS]: '10', [DIAGRAM_KEYS.MAX_HEIGHT]: 'none' }));
  expect(diagramRenderOptions(settings)).toMatchObject({ fontSize: 14, padding: 20 });
  expect(diagramRenderOptions(settings).fontFamily).toContain('monospace');
  const root = document.createElement('div');
  applyDiagramStyle(settings, root);
  expect(root.dataset.diagramPalette).toBe('warm');
  expect(root.style.getPropertyValue('--diagram-bg')).toBe('#fffcf0');
  expect(root.style.getPropertyValue('--diagram-max-height')).toBe('none');
});

test('the SVG carries palette and radius; print maps Follow theme to Classic', async () => {
  const { renderDiagram } = await import('../../src/web/renderers');
  localStorage.setItem(DIAGRAM_KEYS.PALETTE, 'warm'); localStorage.setItem(DIAGRAM_KEYS.RADIUS, '10');
  const warm = await renderDiagram('flowchart LR\nA-->B', 'print');
  expect(warm).toContain('--pele-bg:#fffcf0'); expect(warm).toContain('--pele-radius:10px');
  localStorage.setItem(DIAGRAM_KEYS.PALETTE, 'app');
  expect(await renderDiagram('flowchart LR\nA-->B', 'print')).not.toContain('--pele-bg:');
  expect(await renderDiagram('flowchart LR\nA-->B', 'screen')).toContain('--pele-radius:10px');
  localStorage.clear();
});
