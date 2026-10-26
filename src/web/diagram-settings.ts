// Diagram appearance preferences. Colors, radius and height reach diagrams through CSS variables;
// font and padding change layout, so they are passed to Pele as render options.
export const DIAGRAM_KEYS = {
  PALETTE: 'markdew.diagram-palette',
  BOX_COLORS: 'markdew.diagram-box-colors',
  FONT: 'markdew.diagram-font',
  FONT_SIZE: 'markdew.diagram-font-size',
  RADIUS: 'markdew.diagram-radius',
  PADDING: 'markdew.diagram-padding',
  MAX_HEIGHT: 'markdew.diagram-max-height',
} as const;

export const DIAGRAM_PALETTES = ['app', 'mermaid', 'classic', 'warm', 'cool'] as const;
export const DIAGRAM_BOX_COLORS = ['single', 'shape'] as const;
export const DIAGRAM_FONTS = ['sans', 'serif', 'mono'] as const;
export const DIAGRAM_FONT_SIZES = ['12', '14', '16', '18'] as const;
export const DIAGRAM_RADII = ['0', '4', '10'] as const;
export const DIAGRAM_PADDINGS = ['4', '10', '20'] as const;
export const DIAGRAM_MAX_HEIGHTS = ['400', '600', '800', 'none'] as const;

export interface DiagramSettings {
  palette: (typeof DIAGRAM_PALETTES)[number];
  boxColors: (typeof DIAGRAM_BOX_COLORS)[number];
  font: (typeof DIAGRAM_FONTS)[number];
  fontSize: (typeof DIAGRAM_FONT_SIZES)[number];
  radius: (typeof DIAGRAM_RADII)[number];
  padding: (typeof DIAGRAM_PADDINGS)[number];
  maxHeight: (typeof DIAGRAM_MAX_HEIGHTS)[number];
}

export const DEFAULT_DIAGRAM_SETTINGS: DiagramSettings = {
  palette: 'mermaid', boxColors: 'single', font: 'sans', fontSize: '16', radius: '4', padding: '10', maxHeight: '600',
};

// Fixed palettes travel inside each SVG, so an image copy (print) matches the screen.
// Follow theme reads the page's CSS variables on screen; print has no page, so it uses Classic.
export const DIAGRAM_PALETTE_COLORS: Record<'mermaid' | 'classic' | 'warm' | 'cool', Record<string, string>> = {
  // The mermaid.js default theme, which MarkDew used before Pele.
  mermaid: { bg: '#ffffff', fg: '#333333', muted: '#555555', line: '#333333', surface: '#ececff',
    'surface-alt': '#ffffde', border: '#9370db', accent: '#9370db' },
  classic: {},
  warm: { bg: '#fffcf0', fg: '#100f0f', muted: '#6f6e69', line: '#100f0f', surface: '#f2f0e5',
    'surface-alt': '#e6e4d9', border: '#cecdc3', accent: '#bc5215' },
  cool: { bg: '#f5f9fc', fg: '#1b2733', muted: '#5d7285', line: '#3d5a73', surface: '#e3eef7',
    'surface-alt': '#d0e2f0', border: '#aac3d8', accent: '#1f6fb2' },
};

// CSS declarations that carry the chosen colors and corner radius inside the SVG root.
export function diagramSvgStyle(settings: DiagramSettings, target: 'screen' | 'print'): string {
  const palette = settings.palette === 'app' ? (target === 'print' ? 'classic' : 'app') : settings.palette;
  const colors = palette === 'app' ? {} : DIAGRAM_PALETTE_COLORS[palette];
  const parts = Object.entries(colors).map(([name, value]) => `--pele-${name}:${value}`);
  parts.push(`--pele-radius:${settings.radius}px`);
  return parts.join(';') + ';';
}

// By shape colors flowchart boxes by their Pele shape class. Shapes not listed keep the palette surface.
type ShapeKind = 'terminal' | 'decision' | 'data' | 'io' | 'circle' | 'prep' | 'flag';
const SHAPE_KINDS: Record<string, ShapeKind> = {
  rounded: 'terminal', stadium: 'terminal', diam: 'decision', cyl: 'data',
  'lean-r': 'io', 'lean-l': 'io', 'trap-t': 'io', 'trap-b': 'io',
  circle: 'circle', 'dbl-circ': 'circle', hex: 'prep', odd: 'flag',
};
// Light fill and border for each kind. Follow theme on screen reads --diagram-<kind>-fill and
// --diagram-<kind>-border, which style.css changes for the dark theme.
export const DIAGRAM_SHAPE_COLORS: Record<ShapeKind, [fill: string, border: string]> = {
  terminal: ['#e3f4e1', '#5a9e55'], decision: ['#fff3cd', '#c9a227'], data: ['#dcebfa', '#4a86c5'],
  io: ['#fde4d0', '#d7834a'], circle: ['#ece3f7', '#8a63c2'], prep: ['#d8f1ef', '#3f9c94'], flag: ['#fadcdc', '#c75b5b'],
};

// Pele fills a node with var(--_s) and strokes it with var(--_b); a node style redefines both.
// Author classDef and style rules sit inline on the shape, so they still win.
export function colorBoxesByShape(svg: string, settings: DiagramSettings, target: 'screen' | 'print'): string {
  if (settings.boxColors !== 'shape') return svg;
  const followTheme = settings.palette === 'app' && target === 'screen';
  return svg.replace(/<g class="pele-node pele-shape-([\w-]+)[^"]*"/g, (tag, shape: string) => {
    const kind = SHAPE_KINDS[shape];
    if (!kind) return tag;
    const [fill, border] = DIAGRAM_SHAPE_COLORS[kind];
    return `${tag} style="${followTheme
      ? `--_s:var(--diagram-${kind}-fill,${fill});--_b:var(--diagram-${kind}-border,${border})`
      : `--_s:${fill};--_b:${border}`}"`;
  });
}

const FONT_FAMILIES: Record<DiagramSettings['font'], string> = {
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Menlo, Consolas, monospace',
};

function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

export function getDiagramSettings(storage: Storage = localStorage): DiagramSettings {
  const read = (key: string) => { try { return storage.getItem(key); } catch { return null; } };
  const d = DEFAULT_DIAGRAM_SETTINGS;
  return {
    palette: pick(DIAGRAM_PALETTES, read(DIAGRAM_KEYS.PALETTE), d.palette),
    boxColors: pick(DIAGRAM_BOX_COLORS, read(DIAGRAM_KEYS.BOX_COLORS), d.boxColors),
    font: pick(DIAGRAM_FONTS, read(DIAGRAM_KEYS.FONT), d.font),
    fontSize: pick(DIAGRAM_FONT_SIZES, read(DIAGRAM_KEYS.FONT_SIZE), d.fontSize),
    radius: pick(DIAGRAM_RADII, read(DIAGRAM_KEYS.RADIUS), d.radius),
    padding: pick(DIAGRAM_PADDINGS, read(DIAGRAM_KEYS.PADDING), d.padding),
    maxHeight: pick(DIAGRAM_MAX_HEIGHTS, read(DIAGRAM_KEYS.MAX_HEIGHT), d.maxHeight),
  };
}

export function diagramRenderOptions(settings: DiagramSettings = getDiagramSettings()) {
  return {
    fontFamily: FONT_FAMILIES[settings.font],
    fontFamilyMono: FONT_FAMILIES.mono,
    fontSize: Number(settings.fontSize),
    padding: Number(settings.padding),
  };
}

export function applyDiagramStyle(settings: DiagramSettings = getDiagramSettings(), root: HTMLElement = document.documentElement): void {
  root.dataset.diagramPalette = settings.palette;
  const colors = settings.palette === 'app' ? { bg: 'var(--paper)', fg: 'var(--ink)' }
    : settings.palette === 'classic' ? { bg: '#fff', fg: '#24272c' } : DIAGRAM_PALETTE_COLORS[settings.palette];
  root.style.setProperty('--diagram-bg', colors.bg);
  root.style.setProperty('--diagram-fg', colors.fg);
  root.style.setProperty('--pele-font', FONT_FAMILIES[settings.font]);
  root.style.setProperty('--diagram-max-height', settings.maxHeight === 'none' ? 'none' : `${settings.maxHeight}px`);
}
