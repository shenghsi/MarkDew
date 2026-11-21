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

describe('changeIndicators extension', () => {
  it('shows no indicators when the document matches its baseline', () => {
    const { view } = createEditor('# Heading\n\nParagraph one.\nParagraph two.\n');
    expect(view.state.field(changeIndicatorField).chunks).toHaveLength(0);
    expect(getIndicators()).toEqual([]);
  });

  it('tracks added, modified, and deleted lines incrementally and clears on undo', () => {
    const original = 'Line 1\nLine 2\nLine 3\nLine 4\n';
    const { view } = createEditor(original);

    // Modify Line 2
    const line2 = view.state.doc.line(2);
    view.dispatch({ changes: { from: line2.from, to: line2.to, insert: 'Line 2 modified' } });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['modified']);
    expect(getIndicators()).toEqual(['modified']);

    // Undo restores clean state
    expect(undo(view)).toBe(true);
    expect(view.state.field(changeIndicatorField).chunks).toHaveLength(0);
    expect(getIndicators()).toEqual([]);

    // Redo restores modified state
    expect(redo(view)).toBe(true);
    expect(getIndicators()).toEqual(['modified']);
    expect(undo(view)).toBe(true);

    // Insert a brand-new line after Line 2
    const afterLine2 = view.state.doc.line(2).to;
    view.dispatch({ changes: { from: afterLine2, to: afterLine2, insert: '\nInserted line' } });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['added']);
    expect(getIndicators()).toEqual(['added']);
    expect(undo(view)).toBe(true);

    // Delete Line 3 completely
    const line3 = view.state.doc.line(3);
    view.dispatch({ changes: { from: line3.from, to: line3.to + 1, insert: '' } });
    expect(view.state.field(changeIndicatorField).chunks.map(chunkKind)).toEqual(['deleted']);
    expect(getIndicators()).toEqual(['deleted']);
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
