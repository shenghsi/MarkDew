// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { history, undo, redo } from '@codemirror/commands';
import { changeIndicatorField, changeIndicators, chunkKind, setChangeBaseline } from '../../src/web/change-indicators';
import { livePreview } from '../../src/web/preview';
import { documentLanguage } from '../../src/web/document-language';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });

let view: EditorView | undefined;
afterEach(() => {
  view?.destroy();
  view = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function createEditor(initialSource: string, baseline: string | null = initialSource) {
  const display = new Compartment();
  const record = fromSource(initialSource);
  const state = EditorState.create({
    doc: normalize(record.raw),
    extensions: [
      sourceExtensions(record),
      changeIndicators(baseline),
      history(),
      documentLanguage(),
      display.of(livePreview),
    ],
  });
  const host = document.createElement('main');
  host.id = 'editor';
  document.body.appendChild(host);
  view = new EditorView({ state, parent: host });
  return { view, host, display };
}

function getIndicators(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>('.cm-change-indicator')).map(el => el.dataset.changeKind);
}

function getRulerMarks(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>('.cm-change-ruler-mark')).map(el => el.dataset.changeKind);
}

describe('changeIndicators extension', () => {
  it('shows no indicators when the document matches its baseline', () => {
    const { view } = createEditor('# Heading\n\nParagraph one.\nParagraph two.\n');
    expect(view.state.field(changeIndicatorField).chunks).toHaveLength(0);
    expect(getIndicators()).toEqual([]);
    expect(getRulerMarks()).toEqual([]);
  });

  it('tracks added, modified, and deleted lines incrementally in both margin and scrollbar ruler and clears on undo', () => {
    const original = 'Line 1\nLine 2\nLine 3\nLine 4\n';
    const { view } = createEditor(original);

    // Modify Line 2
    const line2 = view.state.doc.line(2);
    view.dispatch({ changes: { from: line2.from, to: line2.to, insert: 'Line 2 modified' } });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['modified']);
    expect(getIndicators()).toEqual(['modified']);
    expect(getRulerMarks()).toEqual(['modified']);

    // Undo restores clean state
    expect(undo(view)).toBe(true);
    expect(view.state.field(changeIndicatorField).chunks).toHaveLength(0);
    expect(getIndicators()).toEqual([]);
    expect(getRulerMarks()).toEqual([]);

    // Redo restores modified state
    expect(redo(view)).toBe(true);
    expect(getIndicators()).toEqual(['modified']);
    expect(getRulerMarks()).toEqual(['modified']);
    expect(undo(view)).toBe(true);

    // Insert a brand-new line after Line 2
    const afterLine2 = view.state.doc.line(2).to;
    view.dispatch({ changes: { from: afterLine2, to: afterLine2, insert: '\nInserted line' } });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['added']);
    expect(getIndicators()).toEqual(['added']);
    expect(getRulerMarks()).toEqual(['added']);
    expect(undo(view)).toBe(true);

    // Delete Line 3 completely
    const line3 = view.state.doc.line(3);
    view.dispatch({ changes: { from: line3.from, to: line3.to + 1, insert: '' } });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['deleted']);
    expect(getIndicators()).toEqual(['deleted']);
    expect(getRulerMarks()).toEqual(['deleted']);
  });

  it('handles BOM and CRLF baselines without false-positive change markers', () => {
    const crlfSource = '\uFEFF# Title\r\n\r\nFirst line\r\nSecond line\r\n';
    const { view } = createEditor(crlfSource, crlfSource);
    expect(view.state.field(changeIndicatorField).chunks).toHaveLength(0);
    expect(getIndicators()).toEqual([]);
    expect(savedSource(view.state.field(sourceField))).toBe(crlfSource);

    // Updating baseline to a Git HEAD version with LF line endings
    view.dispatch({ effects: setChangeBaseline.of('# Title\n\nFirst line\nOlder second line\n') });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['modified']);
    expect(getIndicators()).toEqual(['modified']);
  });

  it('renders indicators in both Live Preview and Source mode', () => {
    const { view, host, display } = createEditor('# Title\n\nOriginal text\n', '# Title\n\nBaseline text\n');
    expect(getIndicators(host)).toEqual(['modified']);

    // Switch to Source mode
    host.classList.add('source-mode');
    view.dispatch({ effects: display.reconfigure([lineNumbers()]) });
    expect(getIndicators(host)).toEqual(['modified']);

    // Switch back to Live Preview
    host.classList.remove('source-mode');
    view.dispatch({ effects: display.reconfigure(livePreview) });
    expect(getIndicators(host)).toEqual(['modified']);
  });

  it('keeps scrollbar overview ruler mark positions completely invariant during scrolling and height-map updates', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');
    const modified = lines.replace('Line 25', 'Line 25 changed').replace('Line 75', 'Line 75 changed');
    const { view, host } = createEditor(modified, lines);

    const readPositions = () =>
      Array.from(host.querySelectorAll<HTMLElement>('.cm-change-ruler-mark')).map(el => ({
        kind: el.dataset.changeKind,
        top: el.style.top,
        height: el.style.height,
      }));

    const initial = readPositions();
    expect(initial).toHaveLength(2);

    // Simulate scrolling and viewport/height changes without document edits
    view.scrollDOM.scrollTop = 450;
    view.dispatch({ selection: { anchor: view.state.doc.line(80).from } });
    expect(readPositions()).toEqual(initial);
  });

  it('aligns scrollbar ruler marks with actual vertical geometry in scrollHeight (including top padding and bottom overscroll padding)', () => {
    const baseText = 'Line 1\nLine 2\nLine 3\n';
    const modText = 'Line 1\nLine 2\nLine 3 changed\n';
    const { view, host } = createEditor(modText, baseText);

    // Simulate a short document where scrollHeight (1000px, including 42px top pad and 35vh+60px bottom pad)
    // is much taller than the 3 lines of text (~150px). Line 3 starts at top=50..75 inside the content.
    Object.defineProperty(view.scrollDOM, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(view.scrollDOM, 'clientHeight', { configurable: true, value: 500 });
    vi.spyOn(view.scrollDOM, 'getBoundingClientRect').mockReturnValue({
      top: 100, bottom: 600, left: 0, right: 800, width: 800, height: 500, x: 0, y: 100, toJSON() {},
    });
    vi.spyOn(view, 'documentTop', 'get').mockReturnValue(142); // 42px top padding
    vi.spyOn(view, 'lineBlockAt').mockImplementation((pos: number) => ({
      from: pos, to: pos, top: 50, bottom: 75, height: 25, type: 0, length: 0, widget: null, widgetLineBreaks: 0,
    } as any));

    // Trigger ruler re-render with updated geometry
    view.dispatch({ changes: { from: view.state.doc.length - 1, to: view.state.doc.length - 1, insert: '!' } });
    const mark = host.querySelector<HTMLElement>('.cm-change-ruler-mark')!;
    expect(mark).not.toBeNull();
    // (top 50 + gap 42) / total 1000 * trackHeight 500 = 46px (near top of scrollbar, matching editor indicator)
    expect(mark.style.top).toBe('46px');
    expect(mark.style.height).toBe('12.5px');
  });
});

describe('app integration for change indicators', () => {
  it('uses Git HEAD baseline for Git-tracked files and falls back to saved disk baseline for non-Git files', async () => {
    vi.resetModules();
    const invoke = vi.fn(async (command: string, args?: any) => {
      if (command === 'document_start') {
        return {
          documents: [
            { id: 1, path: '/repo/tracked.md', baseline: 'Line 1\nSaved on disk\n', uncertain: false },
            { id: 2, path: '/notes/untracked.md', baseline: 'Alpha\nBeta\n', uncertain: false },
          ],
          sessions: [
            { document: 1, session: 's1', revision: 0 },
            { document: 2, session: 's2', revision: 0 },
          ],
          recovery: { session: 's1', revision: 0, entries: [], warnings: [] },
        };
      }
      if (command === 'git_file_at') {
        if (args?.path === '/repo/tracked.md' && args?.rev === 'head') {
          return 'Line 1\nCommitted in HEAD\n';
        }
        throw new Error('This version does not have the file.');
      }
      if (command === 'save_document') return;
      if (command === 'recovery_checkpoint' || command === 'recovery_document' || command === 'recovery_list') {
        return { session: 's1', revision: 1, entries: [], warnings: [] };
      }
      if (command === 'file_status') return { kind: 'unchanged', generation: 0 };
      if (command === 'take_open_requests') return { paths: [], warnings: [] };
      if (command === 'quit_ready') return null;
      return null;
    });

    vi.doMock('@tauri-apps/api/core', () => ({ invoke, isTauri: () => true }));
    vi.doMock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn(), ask: vi.fn() }));
    vi.doMock('@tauri-apps/api/window', () => ({
      getCurrentWindow: () => ({
        onCloseRequested: vi.fn(),
        onDragDropEvent: async () => () => {},
        listen: async () => () => {},
      }),
    }));

    document.body.innerHTML = '<div id="app"></div>';
    const app = await import('../../src/web/main');
    const indicatorsModule = await import('../../src/web/change-indicators');

    try {
      await vi.waitFor(() => expect(app.view.state.readOnly).toBe(false));
      // Wait for git_file_at('head') to resolve for tracked.md
      await vi.waitFor(() =>
        expect(app.view.state.field(indicatorsModule.changeIndicatorField).base?.toString()).toBe('Line 1\nCommitted in HEAD\n')
      );
      // Even though tracked.md is clean relative to disk, it differs from Git HEAD on line 2
      expect(getIndicators(document.querySelector('#editor')!)).toEqual(['modified']);

      // Switch to untracked.md (document 2)
      document.querySelector<HTMLButtonElement>('[data-document="2"]')!.click();
      await vi.waitFor(() =>
        expect(app.view.state.field(indicatorsModule.changeIndicatorField).base?.toString()).toBe('Alpha\nBeta\n')
      );
      expect(getIndicators(document.querySelector('#editor')!)).toEqual([]);

      // Edit untracked.md -> shows indicator against disk baseline
      app.view.dispatch({ changes: { from: app.view.state.doc.length, insert: 'Gamma\n' } });
      expect(getIndicators(document.querySelector('#editor')!)).toEqual(['added']);

      // Save untracked.md -> baseline advances to saved content, clearing indicators
      document.querySelector<HTMLButtonElement>('#save')!.click();
      await vi.waitFor(() => expect(getIndicators(document.querySelector('#editor')!)).toEqual([]));
    } finally {
      window.dispatchEvent(new Event('pagehide'));
      app.view.destroy();
      vi.doUnmock('@tauri-apps/api/core');
      vi.doUnmock('@tauri-apps/plugin-dialog');
      vi.doUnmock('@tauri-apps/api/window');
    }
  });
});
