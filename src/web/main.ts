import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands';
import { markdownKeymap } from '@codemirror/lang-markdown';
import { documentLanguage } from './document-language';
import { syntaxHighlighting } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save, ask } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from './source';
import { markdownReturn, markdownBackspace, exitBlockDown } from './commands';
import { canUseFiles } from './file-guard';
import { livePreview, setEditorActive, editorActiveField, rerenderDiagrams } from './preview';
import { endTableEdit, tableComposing, tableSaveCommand, tableFindCommand, tableHistoryCommand, tableInputView } from './table';
import { find, guardedSearchKeymap, outline, refreshOutline, searchSupport } from './navigation';
import { format, Format } from './formatting';
import { insertTable } from './table-insert';
import { codeBlock } from './code-block-command';
import { linkControls } from './link-controls';
import { linkVersion } from './links';
import { headingTarget, linkNavigation } from './link-navigation';
import { textDirection } from './text-direction';
import { webLinkOpener } from './web-links';
import { themeControls, setTheme, ThemeChoice } from './theme';
import { RecoveryCapture, RecoveryListing, RecoveryQueue, recoveryPanel } from './recovery';
import { FileWatcher, FileStatus, fileWarning } from './file-watch';
import { imageDocument, imageBasePath, imagePath, setImagePath } from './images';
import { footnoteField } from './footnotes';
import { insertFootnote, goToFootnote } from './footnote-commands';
import { fileDrops } from './file-drop';
import { fileShortcuts } from './file-shortcuts';
import { DocumentTab, DocumentTabs, documentTabBar, tabDirty, tabName, tabSource } from './document-tabs';
import type { PrintSnapshot } from './print-view';
import { imagePaste } from './image-paste';
import { imageDrops } from './image-drop';
import { copyImageAsset } from './image-assets';
import { clipboardImageControls, droppedImageControls } from './clipboard-assets';
import { toolsPanel } from './tools-panel';
import { fileSidebar, getParentDir, isPathInsideFolder } from './file-sidebar';
import { wordCount } from './word-count';
import { nativeMenu } from './native-menu';
import { openRequests, OpenBatch } from './open-requests';
import { layoutPreferences } from './layout-preferences';
import { writingSizeControls } from './writing-size';
import { createScrollStabilizer } from './scroll-stabilizer';
import { writingSizeMeasurement } from './writing-size-measure';
import { sidebarSize } from './sidebar-size';
import { outlineDropdown } from './outline-dropdown';
import { initSettings, showSettingsDialog, showAboutDialog, isModalOpen, bindUpdateButton } from './settings';
import { registerUpdateGuard, checkAppUpdates, type UpdateInfo } from './updater';
import { runAutoUpdateCheck } from './auto-update';
import { installWithSavedDocuments } from './update-safety';
import { t, getCurrentLanguage, subscribeLanguageChange } from './i18n';
import './style.css';

document.querySelector('#app')!.innerHTML = `<header><strong>MarkDew</strong><button id="new">New</button><button id="open">Open</button><button id="save">Save</button><button id="save-as">Save As</button><button id="undo">Undo</button><button id="redo">Redo</button><button id="find">Find</button><button id="outline-toggle" aria-pressed="false">Outline</button><button id="source" aria-pressed="false">Source</button><button id="settings" hidden>Settings</button><button id="about" hidden>About</button><button id="check">Check Save</button><span id="status" role="status"></span></header><div class="workspace"><aside id="outline" aria-label="Outline" hidden></aside><main id="editor"></main></div>`;
const app = document.querySelector<HTMLElement>('#app')!;
const documentBar = document.createElement('div'); documentBar.className = 'document-bar';
documentBar.setAttribute('role', 'toolbar'); documentBar.setAttribute('aria-label', 'Document'); documentBar.setAttribute('data-tauri-drag-region', '');
const title = document.createElement('span'); title.id = 'document-title';
const countLabel = document.createElement('span'); countLabel.id = 'word-count';
const documentCount = wordCount(countLabel);
window.addEventListener('pagehide', () => documentCount.destroy(), { once: true });
const toolsButton = document.createElement('button'); toolsButton.id = 'tools-toggle'; toolsButton.textContent = 'Tools'; toolsButton.title = 'Tools';
const tools = document.createElement('section'); tools.id = 'tools-panel'; tools.setAttribute('aria-label', 'Document tools'); tools.hidden = true;
const header = document.querySelector('header')!; header.before(documentBar, tools); tools.append(header);
const paneControls = document.createElement('div'); paneControls.className = 'document-pane-controls';
const viewControls = document.createElement('div'); viewControls.className = 'document-view-controls';
const tabContainer = document.createElement('div'); tabContainer.className = 'document-tabs-host'; tabContainer.hidden = true;
const outlineButton = document.querySelector<HTMLButtonElement>('#outline-toggle')!;
outlineButton.title = 'Outline'; outlineButton.setAttribute('aria-label', 'Outline');
const outlineMenuButton = document.createElement('button'); outlineMenuButton.id = 'outline-menu';
outlineMenuButton.title = 'Outline'; outlineMenuButton.setAttribute('aria-label', 'Outline');
const filesButton = document.createElement('button'); filesButton.id = 'files-toggle'; filesButton.textContent = 'Files'; filesButton.title = 'Toggle Sidebar'; filesButton.setAttribute('aria-label', 'Toggle Sidebar'); filesButton.setAttribute('aria-pressed', 'false');
const sourceButton = document.querySelector<HTMLButtonElement>('#source')!;
sourceButton.title = 'Source Code Mode'; sourceButton.setAttribute('aria-label', 'Source Mode');
viewControls.append(countLabel, outlineMenuButton, filesButton, toolsButton);
documentBar.append(paneControls, title, tabContainer, viewControls);
if (isTauri()) {
  void Promise.resolve(invoke('update_menu_state', { language: getCurrentLanguage() })).catch(() => {});
  let lastToggle = 0;
  const toggleMaximize = () => {
    const now = Date.now();
    if (now - lastToggle < 300) return;
    lastToggle = now;
    void getCurrentWindow().toggleMaximize().catch(() => invoke('toggle_maximize_window'));
  };
  documentBar.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown')) return;
    if (event.detail > 1) {
      toggleMaximize();
      return;
    }
    void getCurrentWindow().startDragging();
  });
  documentBar.addEventListener('mouseup', event => {
    if (event.button !== 0 || event.detail !== 2) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown')) return;
    toggleMaximize();
  });
  documentBar.addEventListener('dblclick', event => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown')) return;
    toggleMaximize();
  });
}
const statusBar = document.createElement('footer'); statusBar.className = 'document-status'; statusBar.hidden = true;
statusBar.append(sourceButton, document.querySelector('#status')!); app.append(statusBar);
const outlinePane = document.querySelector<HTMLElement>('#outline')!;
const sidebarHeader = document.createElement('div'); sidebarHeader.className = 'sidebar-header';
const sidebarTitle = document.createElement('span'); sidebarTitle.className = 'sidebar-title';
sidebarTitle.textContent = 'FILES';

const sidebarTabs = document.createElement('div'); sidebarTabs.className = 'sidebar-tabs';
const sidebarTabOutline = document.createElement('button'); sidebarTabOutline.type = 'button';
sidebarTabOutline.className = 'sidebar-tab-btn sidebar-tab-outline'; sidebarTabOutline.title = 'Outline';
sidebarTabOutline.setAttribute('aria-label', 'Outline');
sidebarTabOutline.addEventListener('click', () => { showSidebarView('outline'); });

const sidebarTabFiles = document.createElement('button'); sidebarTabFiles.type = 'button';
sidebarTabFiles.className = 'sidebar-tab-btn sidebar-tab-files'; sidebarTabFiles.title = 'File Tree';
sidebarTabFiles.setAttribute('aria-label', 'File Tree');
sidebarTabFiles.addEventListener('click', () => { showSidebarView('files'); });

sidebarTabs.append(sidebarTabOutline, sidebarTabFiles);
sidebarHeader.append(sidebarTitle, sidebarTabs);
paneControls.append(sidebarHeader);

const outlineContent = document.createElement('div'); outlineContent.className = 'outline-content';
outlinePane.append(outlineContent);
const filesPane = document.createElement('aside'); filesPane.id = 'files'; filesPane.hidden = true; filesPane.setAttribute('aria-label', 'Files');
outlinePane.before(filesPane);
if (isTauri() && /Macintosh|Mac OS X/.test(navigator.userAgent)) document.documentElement.dataset.platform = 'macos';
const layout = layoutPreferences();
const workspace = document.querySelector<HTMLElement>('.workspace')!;
workspace.style.setProperty('--sidebar-width', `${layout.width}px`);
app.style.setProperty('--sidebar-width', `${layout.width}px`);
filesPane.hidden = layout.sidebar !== 'files'; outlinePane.hidden = layout.sidebar !== 'outline';
let sidebarStatus: 'files' | 'outline' = layout.sidebar === 'outline' ? 'outline' : 'files';
let sidebarSizing: ReturnType<typeof sidebarSize> | undefined;
let tabsReady = false;
function syncMenuChecks() {
  if (!isTauri() || !tabsReady) return;
  void Promise.resolve(invoke('update_menu_state', {
    source_mode: active()?.sourceMode ?? false,
    outline: !outlinePane.hidden,
    language: getCurrentLanguage(),
  })).catch(() => {});
}
const syncSidebarState = () => {
  const open = !filesPane.hidden || !outlinePane.hidden;
  app.dataset.sidebar = open ? 'open' : 'closed';
  documentBar.dataset.sidebar = open ? 'open' : 'closed';
  filesButton.setAttribute('aria-pressed', String(open));
  outlineButton.setAttribute('aria-pressed', String(!outlinePane.hidden));
  sidebarHeader.hidden = !open;
  if (open) {
    const isOutline = !outlinePane.hidden;
    sidebarTitle.textContent = isOutline ? t('sidebar.title_outline') : t('sidebar.title_files');
    sidebarTabOutline.hidden = isOutline;
    sidebarTabFiles.hidden = !isOutline;
  }
  syncMenuChecks();
};
function showSidebarView(target: 'files' | 'outline') {
  sidebarStatus = target;
  if (target === 'files') {
    filesPane.hidden = false;
    outlinePane.hidden = true;
    layout.sidebarChanged('files');
    sidebar?.show();
  } else {
    outlinePane.hidden = false;
    filesPane.hidden = true;
    layout.sidebarChanged('outline');
  }
  syncSidebarState();
  sidebarSizing?.refresh();
  if (typeof view !== 'undefined') {
    view.dispatch({ effects: refreshOutline.of(null) });
    view.requestMeasure();
  }
}
function hideSidebar() {
  filesPane.hidden = true;
  outlinePane.hidden = true;
  layout.sidebarChanged('hidden');
  syncSidebarState();
  sidebarSizing?.refresh();
  if (typeof view !== 'undefined') {
    view.requestMeasure();
  }
}
syncSidebarState();
themeControls(document.querySelector('header')!);
const disposeWritingSize = writingSizeControls(header, document.querySelector<HTMLElement>('#editor')!, () => {
  if (!pageActive || composing()) {
    if (pageActive) status.textContent = 'Finish text input, then change Writing size.';
    return false;
  }
  sizeMeasurement.prepare();
  return true;
}, () => sizeMeasurement.measure());
window.addEventListener('pagehide', disposeWritingSize, { once: true });
const formatBar = document.createElement('div');
formatBar.className = 'format-bar'; formatBar.setAttribute('role', 'toolbar'); formatBar.setAttribute('aria-label', 'Formatting');
formatBar.innerHTML = `<button data-format="bold">Bold</button><button data-format="italic">Italic</button><button data-format="strike">Strikethrough</button><button data-format="code">Code</button><select id="heading" aria-label="Heading level"><option value="">Heading…</option><option value="paragraph">Paragraph</option>${Array.from({ length: 6 }, (_, index) => `<option value="h${index + 1}">Heading ${index + 1}</option>`).join('')}</select>`;
document.querySelector('header')!.after(formatBar);
const linkButton = document.createElement('button'); linkButton.textContent = 'Link'; linkButton.id = 'link';
formatBar.append(linkButton);
const status = document.querySelector<HTMLElement>('#status')!;
export let tabs: DocumentTabs;
let busy = isTauri(), terminating = false, lockActive = false;
let pageActive = true;
window.addEventListener('pagehide', () => { pageActive = false; }, { once: true });
const active = () => tabs.active;
const pastedImages = clipboardImageControls(document.querySelector('header')!, {
  native: isTauri(), available: () => !active().path ? 'Save the document before copying pasted images.' :
    active().uncertain ? 'Check the last Save before copying pasted images.' : null,
});
const droppedImages = droppedImageControls(document.querySelector('header')!, {
  native: isTauri(), available: () => !active().path ? 'Save the document before copying dropped images.' :
    active().uncertain ? 'Check the last Save before copying dropped images.' : null,
});
const formComposition = new Set<EventTarget>();
const compositionStart = (event: CompositionEvent) => { if (event.target) formComposition.add(event.target); };
const compositionEnd = (event: CompositionEvent) => { if (event.target) formComposition.delete(event.target); };
document.addEventListener('compositionstart', compositionStart, true);
document.addEventListener('compositionend', compositionEnd, true);
window.addEventListener('pagehide', () => {
  document.removeEventListener('compositionstart', compositionStart, true);
  document.removeEventListener('compositionend', compositionEnd, true); formComposition.clear();
}, { once: true });
const composing = () => view.compositionStarted || tableComposing(view) || [...formComposition].some(target => target instanceof Node && target.isConnected);
let initialization: Promise<void> = Promise.resolve();
let recoveryError: (reason: unknown) => void = reason => { status.textContent = String(reason); };
let fileVersion = 0, watcher: FileWatcher | undefined, showFileWarning: ((status?: FileStatus) => void) | undefined;
function fileTransition() { fileVersion++; watcher?.invalidate(); showFileWarning?.(); view.dispatch({ effects: setImagePath.of(active().path) }); }
const recoveryCapture = (tab: DocumentTab = active()): RecoveryCapture => ({ source: tab === active() ? text() : tabSource(tab), dirty: tabDirty(tab), label: Array.from(tabName(tab)).slice(0, 256).join('') });
function checkpoint(tab: DocumentTab = active()) {
  if (!isTauri()) return;
  if (tab === active()) tab.state = view.state;
  tab.recovery?.update(recoveryCapture(tab));
}
async function flushRecovery(tab: DocumentTab = active()) {
  if (!isTauri()) return;
  await initialization;
  if (!tab.recovery) throw new Error('Recovery is unavailable. Keep this window open.');
  await tab.recovery.flush();
}
const inputLock = new Compartment();
const display = new Compartment();
const text = () => savedSource(view.state.field(sourceField));
const dirty = () => text() !== active().baseline;
let sidebar: ReturnType<typeof fileSidebar> | undefined;
const report = () => { active().state = view.state; status.textContent = `${tabName(active())}${dirty() ? ' • Unsaved' : ''}${active().uncertain ? ' • Check Save' : ''}`;
  documentCount.update(view.state.doc);
  title.textContent = `${tabName(active())}${dirty() ? ' •' : ''}`; title.title = active().path || 'Untitled';
  title.classList.toggle('document-title-preview', !!active().preview);
  renderTabs(); sidebar?.select(active().path); syncMenuChecks(); };
function applyFormat(kind: Format) { const reason = format(view, kind); if (reason) status.textContent = reason; return true; }
function footnoteCommand(command: typeof insertFootnote) { const reason = command(view); if (reason) status.textContent = reason; return true; }
const formattingKeys = [
  { key: 'Mod-b', run: () => applyFormat('bold') }, { key: 'Mod-i', run: () => applyFormat('italic') },
  { key: 'Mod-Shift-c', run: () => applyFormat('code') },
  ...Array.from({ length: 6 }, (_, index) => ({ key: `Mod-Alt-${index + 1}`, run: () => applyFormat(`h${index + 1}` as Format) })),
];
const state = (source: string, tab?: Pick<DocumentTab, 'id' | 'path' | 'sourceMode'>): EditorState => EditorState.create({ doc: normalize(fromSource(source).raw), extensions: [
  sourceExtensions(fromSource(source)), history(), textDirection, linkVersion, footnoteField, imageBasePath.of(tab?.path || ''), imageDocument.of(tab?.id ?? 0), imagePath, highlightActiveLine(), inputLock.of([]),
  documentLanguage(), syntaxHighlighting(classHighlighter), EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Markdown document', 'aria-describedby': 'document-title' }),
  EditorView.editorAttributes.of(v => ({ class: v.state.field(editorActiveField, false) ? 'editor-active' : '' })),
  imagePaste(message => { status.textContent = message; }, () => busy ? 'Wait for the file command, then paste the image.' : composing() ? 'Finish text input, then paste the image.' : null, pastedImages.capture),
  display.of(tab?.sourceMode ? [lineNumbers()] : livePreview),
  tableSaveCommand.of(() => { void operation(saveFile); }),
  tableFindCommand.of(() => { find(view); }), searchSupport(() => view), outline(outlineContent),
  linkNavigation(message => { status.textContent = message; }, () => busy ? 'Wait for the file command, then follow the link.' :
    composing() ? 'Finish text input, then follow the link.' : null,
    url => webLinks.open(url), (destination, fragment) => { void operation(() => openDocumentLink(destination, fragment), true); }),
  keymap.of([{ key: 'Mod-/', run: () => { sourceButton.click(); return true; } }, { mac: 'Ctrl-/', run: () => { sourceButton.click(); return true; } }, ...guardedSearchKeymap, ...formattingKeys, { key: 'Mod-k', run: () => openLinkControls() }, { key: 'Mod-Shift-i', run: () => openImageControls() }, { key: 'Enter', run: markdownReturn }, { key: 'Backspace', run: markdownBackspace }, { key: 'ArrowDown', run: exitBlockDown }, { key: 'Mod-s', run: () => { void operation(saveFile); return true; } }, ...markdownKeymap.filter(binding => binding.key !== 'Enter'), ...defaultKeymap, ...historyKeymap]),
  EditorView.updateListener.of(update => {
    if (update.docChanged) { if (active().preview) active().preview = false; report(); checkpoint(); }
    if (update.startState.field(editorActiveField, false) !== update.state.field(editorActiveField, false)) {
      document.querySelector('#editor')?.classList.toggle('editor-active', !!update.state.field(editorActiveField, false));
    }
  }),
] });
export const view: EditorView = new EditorView({
  state: state(''),
  parent: document.querySelector('#editor')!,
  dispatchTransactions: createScrollStabilizer(),
});
if (typeof window !== 'undefined') (window as any).view = view;
document.querySelector('#editor')?.addEventListener('click', event => {
  if (event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (!target?.closest('.cm-scroller')) {
    if (!view.hasFocus) view.focus();
    if (!view.state.field(editorActiveField, false)) {
      view.dispatch({ effects: setEditorActive.of(true) });
    }
  }
});
const deactivateEditor = () => {
  if (view.state.field(editorActiveField, false)) {
    view.dispatch({ effects: setEditorActive.of(false) });
  }
  if (view.hasFocus) {
    (view.contentDOM as HTMLElement).blur();
  }
};
const onTitleBarPointer = (event: MouseEvent | PointerEvent) => {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement | null;
  if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown, .document-tabs-host')) return;
  deactivateEditor();
};
documentBar.addEventListener('mousedown', onTitleBarPointer, true);
documentBar.addEventListener('pointerdown', onTitleBarPointer, true);
const onOutsidePointer = (event: Event) => {
  if (event.defaultPrevented) return;
  if ('button' in event && (event as MouseEvent).button !== 0) return;
  const target = event.target as HTMLElement | null;
  if (!target || target.closest('button, input, select, textarea, a, summary, [role="button"], [role="tab"], [role="menuitem"], .files-context-menu, #editor, .format-bar, .link-controls, #tools-panel, #tools-toggle, .document-tabs-host, .markdew-search-panel')) {
    return;
  }
  deactivateEditor();
};
window.addEventListener('pointerdown', onOutsidePointer);
window.addEventListener('mousedown', onOutsidePointer);
window.addEventListener('pagehide', () => {
  documentBar.removeEventListener('mousedown', onTitleBarPointer, true);
  documentBar.removeEventListener('pointerdown', onTitleBarPointer, true);
  window.removeEventListener('pointerdown', onOutsidePointer);
  window.removeEventListener('mousedown', onOutsidePointer);
}, { once: true });
const outlineMenu = outlineDropdown(outlineMenuButton, () => view);
window.addEventListener('pagehide', () => outlineMenu.destroy(), { once: true });
const disposeSettings = initSettings({ onMeasure: () => view.requestMeasure() });
window.addEventListener('markdew:diagram-settings', () => rerenderDiagrams());
window.addEventListener('pagehide', disposeSettings, { once: true });
const sizeMeasurement = writingSizeMeasurement(view, () => tableInputView(view), () => pageActive && !composing());
sidebarSizing = sidebarSize(workspace, [
  { element: filesPane, button: filesButton },
  { element: outlinePane, button: document.querySelector<HTMLElement>('#outline-toggle')! },
], layout, () => pageActive && !busy && !composing() && !document.querySelector('.print-dialog'),
() => sizeMeasurement.prepare(), () => sizeMeasurement.measure());
window.addEventListener('pagehide', () => sidebarSizing.dispose(), { once: true });
const webLinks = webLinkOpener(view, message => { status.textContent = message; }, () => busy ? 'Wait for the file command, then open the web link.' :
  composing() ? 'Finish text input, then open the web link.' : null, undefined, () => status.textContent === 'Opening web link…');
window.addEventListener('pagehide', () => webLinks.dispose(), { once: true });
tabs = new DocumentTabs({ id: 0, state: view.state, path: '', baseline: '', uncertain: false, sourceMode: false }, inputLock);
tabsReady = true;
syncMenuChecks();
const tabBar = documentTabBar(tabContainer, id => { switchTab(id); }, id => { void operation(() => closeTab(id), true); }, id => {
  const tab = tabs.get(id);
  if (tab && tab.preview) {
    tab.preview = false;
    renderTabs();
    if (tab === active()) report();
  }
});
function renderTabs() {
  tabBar.render(tabs);
  const multiple = tabs.all.length >= 2;
  tabContainer.hidden = !multiple;
  title.hidden = multiple;
}
const disposeTools = toolsPanel(toolsButton, tools, () => {
  if (!composing()) return true;
  status.textContent = 'Finish text input, then change Tools.'; return false;
}, () => view.requestMeasure());
window.addEventListener('pagehide', disposeTools, { once: true });
const closeDocument = document.createElement('button'); closeDocument.textContent = 'Close document'; closeDocument.id = 'close-document';
closeDocument.addEventListener('click', () => { void operation(() => closeTab(active().id), true); }); header.append(closeDocument);
window.addEventListener('pagehide', () => tabBar.destroy(), { once: true });
const printButton = document.createElement('button'); printButton.id = 'print'; printButton.textContent = 'Print / PDF';
document.querySelector('header')!.append(printButton);
printButton.addEventListener('click', () => {
  if (document.querySelector('.print-dialog')) return;
  void operation(async () => {
    const tab = active();
    const captured: PrintSnapshot = { state: view.state, id: tab.id, path: tab.path, title: tabName(tab) };
    status.textContent = 'Loading print tools…';
    let tools: typeof import('./print-view');
    try { tools = await import('./print-view'); }
    catch (reason) { throw new Error(`Cannot load print tools: ${String(reason)}`); }
    if (!pageActive || terminating) return;
    if (composing()) { status.textContent = 'Finish text input, then repeat Print / PDF.'; return; }
    report();
    await tools.showPrintView(captured);
  });
});
report();
const openLinkControls = linkControls(view, tools, message => { status.textContent = message; });
const codeBlockButton = document.createElement('button'); codeBlockButton.textContent = 'Code Block'; codeBlockButton.id = 'code-block'; formatBar.append(codeBlockButton);
codeBlockButton.addEventListener('mousedown', event => event.preventDefault());
codeBlockButton.addEventListener('click', () => { const reason = codeBlock(view); if (reason) status.textContent = reason; });
const tableButton = document.createElement('button'); tableButton.textContent = 'Table'; tableButton.id = 'insert-table'; formatBar.append(tableButton);
tableButton.addEventListener('mousedown', event => event.preventDefault());
tableButton.addEventListener('click', () => { const reason = insertTable(view); if (reason) status.textContent = reason; });
const footnoteButton = document.createElement('button'); footnoteButton.id = 'footnote';
footnoteButton.textContent = t('toolbar.footnote'); formatBar.append(footnoteButton);
footnoteButton.addEventListener('mousedown', event => event.preventDefault());
footnoteButton.addEventListener('click', () => footnoteCommand(insertFootnote));

const gotoFootnoteButton = document.createElement('button'); gotoFootnoteButton.id = 'goto-footnote';
gotoFootnoteButton.textContent = t('toolbar.goto_footnote'); formatBar.append(gotoFootnoteButton);
gotoFootnoteButton.addEventListener('mousedown', event => event.preventDefault());
gotoFootnoteButton.addEventListener('click', () => footnoteCommand(goToFootnote));

const imageButton = document.createElement('button'); imageButton.textContent = 'Image'; imageButton.id = 'image'; formatBar.append(imageButton);
const openImageControls = linkControls(view, tools, message => { status.textContent = message; }, 'image', isTauri() ? async () => {
  const selected = await open({ multiple: false, filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }] });
  return typeof selected === 'string' ? selected : null;
} : undefined, isTauri() ? {
  available: () => !!active().path && !active().uncertain,
  copy: (path, current) => copyImageAsset(view, path, current, () => busy || composing()),
} : undefined);
imageButton.addEventListener('mousedown', event => event.preventDefault());
imageButton.addEventListener('click', openImageControls);
linkButton.addEventListener('mousedown', event => event.preventDefault());
linkButton.addEventListener('click', openLinkControls);

function updateUILanguage() {
  const currentLang = getCurrentLanguage();
  if (isTauri()) {
    void Promise.resolve(invoke('update_menu_state', { language: currentLang })).catch(() => {});
  }
  const btnNew = document.querySelector<HTMLButtonElement>('#new');
  if (btnNew) btnNew.textContent = t('toolbar.new');
  const btnOpen = document.querySelector<HTMLButtonElement>('#open');
  if (btnOpen) btnOpen.textContent = t('toolbar.open');
  const btnSave = document.querySelector<HTMLButtonElement>('#save');
  if (btnSave) btnSave.textContent = t('toolbar.save');
  const btnSaveAs = document.querySelector<HTMLButtonElement>('#save-as');
  if (btnSaveAs) btnSaveAs.textContent = t('toolbar.save_as');
  const btnUndo = document.querySelector<HTMLButtonElement>('#undo');
  if (btnUndo) btnUndo.textContent = t('toolbar.undo');
  const btnRedo = document.querySelector<HTMLButtonElement>('#redo');
  if (btnRedo) btnRedo.textContent = t('toolbar.redo');
  const btnFind = document.querySelector<HTMLButtonElement>('#find');
  if (btnFind) btnFind.textContent = t('toolbar.find');
  const btnCheck = document.querySelector<HTMLButtonElement>('#check');
  if (btnCheck) btnCheck.textContent = t('toolbar.check_save');

  toolsButton.textContent = t('toolbar.tools');
  toolsButton.title = t('toolbar.tools');
  filesButton.textContent = t('toolbar.files');
  filesButton.title = t('toolbar.toggle_sidebar');
  filesButton.setAttribute('aria-label', t('toolbar.toggle_sidebar'));
  outlineButton.title = t('toolbar.outline');
  outlineButton.setAttribute('aria-label', t('toolbar.outline'));
  outlineMenuButton.title = t('toolbar.outline');
  outlineMenuButton.setAttribute('aria-label', t('toolbar.outline'));
  sourceButton.title = t('toolbar.source_mode');
  sourceButton.setAttribute('aria-label', t('toolbar.source_mode'));

  closeDocument.textContent = t('toolbar.close_document');
  printButton.textContent = t('toolbar.print');
  codeBlockButton.textContent = t('toolbar.code_block');
  tableButton.textContent = t('toolbar.table');
  imageButton.textContent = t('toolbar.image');
  footnoteButton.textContent = t('toolbar.footnote');
  gotoFootnoteButton.textContent = t('toolbar.goto_footnote');

  if (!filesPane.hidden || !outlinePane.hidden) {
    const isOutline = !outlinePane.hidden;
    sidebarTitle.textContent = isOutline ? t('sidebar.title_outline') : t('sidebar.title_files');
  }
}

updateUILanguage();
subscribeLanguageChange(() => {
  updateUILanguage();
});
formatBar.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(button => {
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', () => applyFormat(button.dataset.format as Format));
});
formatBar.querySelector<HTMLSelectElement>('#heading')!.addEventListener('change', event => {
  const select = event.target as HTMLSelectElement;
  if (select.value) applyFormat(select.value as Format); select.value = '';
});
async function operation(action: () => Promise<unknown>, lock = false, focusAfter = false) {
  if (!pageActive) return;
  const inputComposing = composing();
  if (!canUseFiles(busy, inputComposing)) {
    if (inputComposing) status.textContent = 'Finish text input, then repeat the file command.';
    return;
  }
  busy = true;
  lockActive = lock; if (lock) applyLock();
  try { await action(); } catch (error) { if (pageActive) status.textContent = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error); }
  finally { busy = terminating; if (pageActive && !terminating) {
    const unlock = lockActive; lockActive = false; if (unlock) applyLock();
    if (focusAfter && !composing() && !document.querySelector('.print-dialog')) view.focus();
  } }
}
function applyLock() {
  view.dispatch({ effects: inputLock.reconfigure(lockActive ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []) });
  document.querySelectorAll<HTMLElement>('.link-controls').forEach(form => { form.inert = lockActive; });
}
function switchTab(id: number, internal = false) {
  if (!tabs.activate(view, id, () => (!busy || internal) && !composing(), () => {
    document.querySelectorAll<HTMLFormElement>('.link-controls').forEach(form => form.querySelector<HTMLButtonElement>('[data-cancel]')!.click());
  })) return false;
  fileTransition();
  document.querySelector('#source')!.setAttribute('aria-pressed', String(active().sourceMode));
  document.querySelector('#editor')!.classList.toggle('source-mode', active().sourceMode);
  document.querySelector('#editor')!.setAttribute('role', 'tabpanel');
  document.querySelector('#editor')!.setAttribute('aria-labelledby', `document-tab-${id}`);
  applyLock(); report();
  if (view.state.field(editorActiveField, false)) {
    view.dispatch({ effects: setEditorActive.of(false) });
  }
  if (view.hasFocus) {
    (view.contentDOM as HTMLElement).blur();
    (document.activeElement as HTMLElement)?.blur?.();
  }
  return true;
}
async function discard(tab: DocumentTab = active()) {
  if (tab.uncertain) throw new Error('Check the last save before you close or reload this file.');
  if (tab === active()) tab.state = view.state;
  return !tabDirty(tab) || await ask(`Discard the unsaved changes in ${tabName(tab)}?`, { title: 'MarkDew', kind: 'warning' });
}
registerUpdateGuard(async install => {
  if (!pageActive || busy || composing()) {
    throw new Error('Finish the current command or text input, then repeat the update.');
  }
  let failure: unknown;
  await operation(async () => {
    try {
      active().state = view.state;
      await installWithSavedDocuments(tabs.all.map(tab => ({
        dirty: tabDirty(tab), uncertain: tab.uncertain,
        checkpoint: () => checkpoint(tab), flush: () => flushRecovery(tab),
      })), install);
      terminating = true;
    } catch (error) { failure = error; }
  }, true);
  if (failure) throw failure;
});
async function saveFile(as = false) {
  const tab = active();
  if (tab.uncertain) throw new Error('Check the last save before you save again.');
  if (!isTauri()) throw new Error('Open the desktop app to use file commands.');
  const destination = !as && tab.path ? tab.path : await save({ defaultPath: tab.path || 'Untitled.md', filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }] });
  if (!destination) return;
  const captured = text();
  try { await invoke('save_document', { document: tab.id, path: destination, source: captured }); }
  catch (error) {
    if (typeof error === 'object' && error && 'uncertain' in error && error.uncertain) {
      tab.uncertain = true; tab.path = destination; tab.baseline = captured;
      fileTransition(); showFileWarning?.({ kind: 'uncertain', generation: -1 });
      checkpoint();
      throw new Error(`Save completion is uncertain. Use Check Save. ${'message' in error ? error.message : ''}`);
    }
    throw error;
  }
  tab.path = destination; tab.baseline = captured; tab.preview = false; fileTransition(); report(); checkpoint(tab); await flushRecovery(tab);
  if (isTauri()) void invoke('add_recent_file', { path: destination }).catch(() => {});
  sidebar?.refresh();
}
let browserID = 0;
function attachRecovery(tab: DocumentTab, listing: Pick<RecoveryListing, 'session' | 'revision'>) {
  const id = tab.id, session = listing.session; tab.recoverySession = session;
  tab.recovery = new RecoveryQueue(listing.revision,
    capture => invoke('recovery_checkpoint', { document: id, session, ...capture }), recoveryError);
}
async function createTab(source = '', file?: string, preview = false): Promise<DocumentTab> {
  const id = isTauri() ? await invoke<number>('create_document') : ++browserID;
  const tab: DocumentTab = { id, path: '', baseline: '', uncertain: false, sourceMode: false, preview, state: state('', { id, path: '', sourceMode: false }) };
  try {
    if (isTauri()) attachRecovery(tab, await invoke<RecoveryListing>('recovery_document', { document: id }));
    if (file) {
      const loaded = await invoke<{ source: string; path: string }>('open_document', { document: id, path: file });
      source = loaded.source; tab.path = loaded.path; tab.baseline = loaded.source;
    }
    tab.state = state(source, tab);
    if (isTauri()) {
      checkpoint(tab);
      await tab.recovery!.flush();
      if (file) void invoke('add_recent_file', { path: tab.path }).catch(() => {});
    }
    return tab;
  } catch (error) {
    try {
      if (isTauri()) {
        if (!tab.recovery) attachRecovery(tab, await invoke<RecoveryListing>('recovery_document', { document: id }));
        const revision = await tab.recovery!.clear();
        await invoke('retire_document', { document: id, session: tab.recoverySession, revision });
      }
    } catch (cleanup) {
      // A host entry that could not retire must remain reachable for retry.
      tabs.add(tab); renderTabs(); recoveryError(cleanup);
    }
    throw error;
  }
}
async function loadIntoTab(tab: DocumentTab, file: string, preview = true): Promise<DocumentTab> {
  checkpoint(tab); await flushRecovery(tab);
  if (!pageActive) return tab;
  let source = '';
  if (isTauri()) {
    const loaded = await invoke<{ source: string; path: string }>('open_document', { document: tab.id, path: file });
    source = loaded.source; tab.path = loaded.path; tab.baseline = loaded.source;
  } else {
    tab.path = file; tab.baseline = '';
  }
  tab.preview = preview;
  tab.state = state(source, tab);
  if (tab === active()) {
    view.setState(tab.state);
    if (view.hasFocus) {
      (view.contentDOM as HTMLElement).blur();
      (document.activeElement as HTMLElement)?.blur?.();
    }
    fileTransition();
  }
  if (isTauri()) {
    checkpoint(tab);
    await tab.recovery!.flush();
    void invoke('add_recent_file', { path: tab.path }).catch(() => {});
  }
  report();
  return tab;
}
async function addDocument(source = '', file?: string, preview = false) {
  checkpoint(); await flushRecovery();
  if (!pageActive) return;
  const tab = await createTab(source, file, preview);
  if (!pageActive) return;
  tabs.add(tab); switchTab(tab.id, true); return tab;
}
async function closeTab(id: number) {
  const tab = tabs.get(id); if (!tab || !await discard(tab)) return;
  checkpoint(tab); await flushRecovery(tab);
  let replacement: DocumentTab | undefined;
  if (tabs.all.length === 1) { replacement = await createTab(); tabs.add(replacement); renderTabs(); }
  const previous = active().id;
  // Adopt a valid replacement while the old host document is still live. A
  // rejected activation must not leave an active view for a retired document.
  if (active() === tab && !switchTab((replacement || tabs.all.find(other => other !== tab)!).id, true)) {
    throw new Error('Finish text input, then close this tab again.');
  }
  try {
    if (isTauri()) {
      if (!tab.recovery) throw new Error('Recovery is unavailable. Keep this tab open.');
      const revision = await tab.recovery.clear();
      await invoke('retire_document', { document: tab.id, session: tab.recoverySession, revision });
    }
  } catch (error) {
    checkpoint(tab); await flushRecovery(tab).catch(recoveryError); switchTab(previous, true); throw error;
  }
    tabs.remove(id); report();
    if (tab.path && isTauri()) {
      void invoke('record_closed_file', { path: tab.path }).catch(() => {});
    }
  }
document.querySelector('#new')!.addEventListener('click', () => void operation(() => addDocument(), true));
document.querySelector('#open')!.addEventListener('click', () => void operation(async () => {
  if (!isTauri()) throw new Error('Open the desktop app to use file commands.');
  const selected = await open({ multiple: false, filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }] });
  if (typeof selected !== 'string') return;
  await handleOpenFile(selected);
}, true));
async function handleOpenFile(selected: string) {
  const existing = tabs.all.find(tab => tab.path === selected);
  if (existing) {
    existing.preview = false;
    switchTab(existing.id, true);
    sidebar?.select(selected);
    return existing;
  }
  const containingFolder = getParentDir(selected);
  if (layout.folder) {
    if (isPathInsideFolder(selected, layout.folder)) {
      const loaded = await loadFile(selected);
      sidebar?.select(selected);
      return loaded;
    }
    await invoke('open_folder_window', { path: containingFolder, file: selected });
    return undefined;
  }
  if (!layout.folder) {
    layout.folderChanged(containingFolder);
    initSidebar(containingFolder, false);
    showSidebarView('files');
  }
  const loaded = await loadFile(selected);
  sidebar?.select(selected);
  return loaded;
}
async function loadFile(selected: string) {
  const existing = tabs.all.find(tab => tab.path === selected);
  if (existing) {
    existing.preview = false;
    switchTab(existing.id, true);
    return existing;
  }
  return await addDocument('', selected, false);
}
const openNotice = document.createElement('aside');
openNotice.className = 'native-open-notice'; openNotice.hidden = true;
const openNoticeText = document.createElement('span'); openNoticeText.setAttribute('role', 'status');
const dismissOpenNotice = document.createElement('button'); dismissOpenNotice.textContent = 'Dismiss';
dismissOpenNotice.addEventListener('click', () => { openNotice.hidden = true; openNoticeText.textContent = ''; });
openNotice.append(openNoticeText, dismissOpenNotice); app.append(openNotice);
const nativeOpen = isTauri() ? openRequests(
  callback => getCurrentWindow().listen('markdew-open-request', callback),
  () => (!getCurrentWindow().label || getCurrentWindow().label === 'main') ? invoke<OpenBatch>('take_open_requests') : Promise.resolve({ paths: [], warnings: [] }),
  async paths => {
    if (!pageActive) return;
    if (busy || composing()) { status.textContent = 'Finish the file command or text input, then repeat Open for these files.'; return; }
    await operation(async () => {
      if (layout.folder) {
        const outside: string[] = [];
        for (const path of paths) {
          if (!pageActive || composing()) return;
          const existing = tabs.all.find(tab => tab.path === path);
          if (existing) {
            if (!switchTab(existing.id, true)) return;
            sidebar?.select(path);
          } else if (isPathInsideFolder(path, layout.folder)) {
            if (!await loadFile(path)) return;
            sidebar?.select(path);
          } else {
            outside.push(path);
          }
        }
        if (outside.length === 0) return;
        const byFolder = new Map<string, string[]>();
        for (const path of outside) {
          const folder = getParentDir(path);
          const group = byFolder.get(folder) || [];
          group.push(path);
          byFolder.set(folder, group);
        }
        for (const [folder, files] of byFolder) {
          await invoke('open_folder_window', { path: folder, file: files[0] });
        }
        return;
      }

      for (const path of paths) {
        if (!pageActive || composing()) return;
        const existing = tabs.all.find(tab => tab.path === path);
        if (existing) {
          if (!switchTab(existing.id, true)) return;
        } else if (!await loadFile(path)) return;
        sidebar?.select(path);
      }
    }, true);
  }, message => { status.textContent = message; }, () => busy || composing(),
  message => { openNoticeText.textContent = message; openNotice.hidden = false; }) : undefined;
window.addEventListener('pagehide', () => nativeOpen?.dispose(), { once: true });
async function openDocumentLink(destination: string, fragment?: string) {
  if (!isTauri()) throw new Error('Open file links in the desktop app.');
  const origin = active(), path = origin.path, doc = view.state.doc, record = view.state.field(sourceField), selection = view.state.selection;
  const resolved = await invoke<{ path: string; origin: string | null }>('resolve_document_link', {
    document: origin.id, documentPath: path, destination,
  });
  if (!pageActive || active() !== origin || origin.path !== path || view.state.doc !== doc ||
    view.state.field(sourceField) !== record || view.state.selection !== selection || composing()) return;
  const existing = resolved.path === resolved.origin ? origin : tabs.all.find(tab => tab.path === resolved.path);
  if (existing) { if (!switchTab(existing.id, true)) return; }
  else {
    const loaded = await loadFile(resolved.path);
    if (!loaded || active() !== loaded) return;
  }
  if (!pageActive || composing()) return;
  if (fragment !== undefined) {
    const target = headingTarget(view.state, fragment);
    if (typeof target === 'string') { status.textContent = target; return; }
    view.dispatch({ selection: { anchor: target.position }, effects: EditorView.scrollIntoView(target.position, { y: 'start' }) });
  }
  status.textContent = 'File link opened.';
}
function initSidebar(initialRoot: string, deferRead: boolean) {
  sidebar?.dispose();
  filesPane.replaceChildren();
  sidebar = fileSidebar(filesPane, {
    read: path => invoke('list_directory', { path }),
    allowed: () => {
      if (!pageActive || busy) return false;
      if (composing()) { status.textContent = 'Finish text input, then use Files.'; return false; }
      return true;
    },
    choose: async () => {
      let selected: string | null = null;
      await operation(async () => {
        if (!isTauri()) throw new Error('Open the desktop app to choose a folder.');
        const path = await open({ directory: true, multiple: false });
        if (typeof path === 'string') {
          selected = path;
          await invoke('open_folder_window', { path }).catch(() => {});
        }
      }, true);
      return selected;
    },
    open: (path, options) => { void operation(async () => {
      const existing = tabs.all.find(tab => tab.path === path);
      if (existing) {
        if (options?.preview === false) { existing.preview = false; renderTabs(); }
        switchTab(existing.id, true);
        return;
      }
      if (options?.newTab) {
        await addDocument('', path, options?.preview ?? false);
        return;
      }
      const curr = active();
      if (!tabDirty(curr) && (curr.preview || !curr.path)) {
        await loadIntoTab(curr, path, true);
        return;
      }
      const uneditedPreviewTab = tabs.all.find(tab => tab.preview && !tabDirty(tab));
      if (uneditedPreviewTab) {
        switchTab(uneditedPreviewTab.id, true);
        await loadIntoTab(uneditedPreviewTab, path, true);
        return;
      }
      await addDocument('', path, true);
    }, true); },
    createFile: async (parent: string, name?: string) => {
      return await invoke<string>('create_file', { parent, name });
    },
    renameFile: async (oldPath: string, newPath: string) => {
      await invoke('rename_file', { oldPath, newPath });
      const openTab = tabs.all.find(tab => tab.path === oldPath);
      if (openTab) {
        openTab.path = newPath;
        if (openTab === active()) {
          fileTransition();
        }
        report();
        checkpoint(openTab);
      }
    },
    deletePath: async (targetPath: string) => {
      await invoke('delete_path', { path: targetPath });
      const matchingTabs = tabs.all.filter(t => t.path === targetPath || (t.path && (t.path.startsWith(targetPath + '/') || t.path.startsWith(targetPath + '\\'))));
      for (const t of matchingTabs) {
        if (tabs.all.length > 1) {
          await closeTab(t.id);
        } else {
          t.path = '';
          t.preview = false;
          report();
        }
      }
    },
  }, { root: initialRoot, deferRead, rootChanged: root => {
    layout.folderChanged(root);
    if (root) void invoke('add_recent_file', { path: root }).catch(() => {});
  }, showHeading: false });
  sidebar.select(active().path);
}
initSidebar(isTauri() ? layout.folder : '', filesPane.hidden);
if (isTauri()) {
  if (layout.folder) {
    void invoke('add_recent_file', { path: layout.folder }).catch(() => {});
  }
  void Promise.all([
    invoke<string | null>('take_initial_folder'),
    invoke<string | null>('take_initial_file'),
  ]).then(async ([folder, file]) => {
    if (folder) {
      layout.folderChanged(folder);
      initSidebar(folder, false);
      showSidebarView('files');
      void invoke('add_recent_file', { path: folder }).catch(() => {});
    }
    if (file) {
      await initialization;
      const curr = active();
      if (!tabDirty(curr) && (curr.preview || !curr.path)) {
        await loadIntoTab(curr, file, false);
      } else {
        await loadFile(file);
      }
      sidebar?.select(file);
    }
  }).catch(() => {});
}
const autoRefreshInterval = setInterval(() => {
  if (!pageActive || busy || composing() || filesPane.hidden || document.hidden) return;
  if (filesPane.contains(document.activeElement)) return;
  sidebar?.refresh();
}, 5000);
window.addEventListener('focus', () => {
  if (!pageActive || busy || composing() || filesPane.hidden) return;
  if (filesPane.contains(document.activeElement)) return;
  sidebar?.refresh();
});
window.addEventListener('pagehide', () => { sidebar?.dispose(); clearInterval(autoRefreshInterval); }, { once: true });
filesButton.addEventListener('click', () => {
  if (!pageActive) return;
  if (busy || composing()) { status.textContent = 'Finish the file command or text input, then use Files.'; return; }
  const isSidebarOpen = !filesPane.hidden || !outlinePane.hidden;
  if (isSidebarOpen) {
    hideSidebar();
  } else {
    showSidebarView(sidebarStatus);
  }
});
if (isTauri()) {
  const hint = document.createElement('div'); hint.className = 'file-drop-hint'; hint.hidden = true;
  hint.setAttribute('role', 'status'); hint.textContent = 'Drop to open this Markdown file.';
  document.querySelector('.workspace')!.append(hint);
  const images = imageDrops(view, { scale: () => getCurrentWindow().scaleFactor(),
    policy: droppedImages.capture,
    report: message => { status.textContent = message; },
    blocked: () => busy ? 'Wait for the file command, then drop the image.' : composing() ? 'Finish text input, then drop the image.' : null });
  const dispose = fileDrops(handler => getCurrentWindow().onDragDropEvent(handler),
    selected => { void operation(() => loadFile(selected), true); },
    message => { status.textContent = message; }, (visible, image) => {
      hint.hidden = !visible; hint.textContent = image ? 'Drop this image into document text.' : 'Drop to open this Markdown file.';
    }, (path, position) => { void images.drop(path, position); });
  window.addEventListener('pagehide', () => { dispose(); images.dispose(); }, { once: true });
}
document.querySelector('#save')!.addEventListener('click', () => void operation(saveFile));
document.querySelector('#save-as')!.addEventListener('click', () => void operation(() => saveFile(true)));
if (isTauri()) {
  const dispose = fileShortcuts(document, /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    () => view.compositionStarted || tableComposing(view));
  window.addEventListener('pagehide', dispose, { once: true });
}
document.querySelector('#undo')!.addEventListener('click', () => { tableHistoryCommand(view, undo); });
document.querySelector('#redo')!.addEventListener('click', () => { tableHistoryCommand(view, redo); });
if (isTauri()) {
  const menuDispatch = (command: string): boolean => {
    if (['bold', 'italic', 'strike', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'paragraph'].includes(command)) {
      applyFormat(command as Format);
      view.focus();
      return true;
    }
    if (command === 'table') {
      insertTable(view);
      view.focus();
      return true;
    }
    if (command === 'code-block') {
      codeBlock(view);
      view.focus();
      return true;
    }
    if (command === 'quote') {
      applyFormat('paragraph');
      view.focus();
      return true;
    }
    if (command === 'link') {
      document.querySelector<HTMLButtonElement>('#link')?.click();
      return true;
    }
    if (command === 'find') {
      find(view);
      return true;
    }
    if (command === 'toggle-sidebar') {
      filesButton.click();
      return true;
    }
    if (command === 'toggle-outline') {
      outlineButton.click();
      return true;
    }
    if (command === 'source-mode') {
      sourceButton.click();
      return true;
    }
    if (command === 'open-folder') {
      void operation(async () => {
        if (!isTauri()) throw new Error('Open the desktop app to choose a folder.');
        const path = await open({ directory: true, multiple: false });
        if (typeof path === 'string') {
          await invoke('open_folder_window', { path });
        }
      }, true);
      return true;
    }
    if (command.startsWith('theme-')) {
      const mode = command.replace('theme-', '') as ThemeChoice;
      setTheme(mode);
      const select = document.querySelector<HTMLSelectElement>('#theme, select[aria-label="Theme"], .theme-control select');
      if (select && select.value !== mode) {
        select.value = mode;
        select.dispatchEvent(new Event('change'));
      }
      return true;
    }
    if (command === 'settings') {
      showSettingsDialog({ onMeasure: () => view.requestMeasure() });
      return true;
    }
    if (command === 'about') {
      showAboutDialog();
      return true;
    }
    return false;
  };
  const dispose = nativeMenu(document, callback => getCurrentWindow().listen('markdew-document-command', callback),
    command => pageActive && !busy && !composing() && !document.querySelector('.print-dialog') &&
      (!isModalOpen() || command === 'settings' || command === 'about') &&
      (!['undo', 'redo'].includes(command) ||
      !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)),
    message => { status.textContent = message; }, menuDispatch);
  window.addEventListener('pagehide', dispose, { once: true });
}
document.querySelector('#settings')?.addEventListener('click', () => {
  showSettingsDialog({ onMeasure: () => view.requestMeasure() });
});
document.querySelector('#about')?.addEventListener('click', () => {
  showAboutDialog();
});
document.querySelector('#find')!.addEventListener('click', () => {
  if (!find(view)) status.textContent = 'Finish text input, then open Find.';
});
document.querySelector('#outline-toggle')!.addEventListener('click', () => {
  if (!pageActive) return;
  if (busy || composing()) return;
  if (outlinePane.hidden) {
    showSidebarView('outline');
  } else {
    hideSidebar();
  }
});
document.querySelector('#source')!.addEventListener('click', () => {
  if (composing()) { status.textContent = 'Finish text input, then change the display.'; return; }
  active().sourceMode = !active().sourceMode;
  document.querySelector('#source')!.setAttribute('aria-pressed', String(active().sourceMode));
  document.querySelector('#editor')!.classList.toggle('source-mode', active().sourceMode);
  view.dispatch({ effects: display.reconfigure(active().sourceMode ? [lineNumbers()] : livePreview) }); active().state = view.state; view.focus();
  syncMenuChecks();
});
document.querySelector('#check')!.addEventListener('click', () => void operation(async () => { const tab = active(); await invoke('check_save', { document: tab.id }); tab.uncertain = false; fileTransition(); report(); checkpoint(tab); await flushRecovery(tab); }));
async function reloadFile() {
  const tab = active(); if (!tab.path) return;
  if (!await discard()) return;
  checkpoint(); await flushRecovery();
  const loaded = await invoke<{ source: string; path: string }>('open_document', { document: tab.id, path: tab.path });
  tab.path = loaded.path; tab.baseline = loaded.source; fileTransition(); view.setState(state(loaded.source, tab)); applyLock();
  report(); checkpoint(); await flushRecovery();
}
if (isTauri()) {
  showFileWarning = fileWarning(tools, () => void operation(reloadFile, true),
    () => void operation(() => saveFile(true)), () => void watcher?.check());
  watcher = new FileWatcher(() => active().path ? { path: active().path, version: fileVersion } : undefined,
    () => !busy && !composing(),
    () => invoke<FileStatus>('file_status', { document: active().id }), result => showFileWarning!(result));
  const checkFile = document.createElement('button'); checkFile.textContent = 'Check File'; checkFile.id = 'check-file';
  checkFile.addEventListener('click', () => void watcher?.check()); document.querySelector('header')!.append(checkFile);
  const timer = setInterval(() => { if (document.visibilityState === 'visible') void watcher?.check(); }, 2000);
  window.addEventListener('focus', () => void watcher?.check());
  window.addEventListener('pagehide', () => { clearInterval(timer); watcher?.dispose(); }, { once: true });
}
if (isTauri()) {
  const panel = recoveryPanel(tools,
    async () => { await initialization; return await invoke<RecoveryListing>('recovery_list', { document: active().id }); },
    async id => {
      // operation reports errors to the app and keeps current source on failures.
      await operation(async () => {
        checkpoint(); await flushRecovery();
        const tab = active(); const copy = await invoke<{ source: string; label: string }>('recovery_copy', { document: tab.id, id });
        await addDocument(copy.source);
      }, true);
    }, async () => {
      if (!started) { await startRecovery(); return; }
      for (const tab of tabs.all) {
        if (!tab.recovery) attachRecovery(tab, await invoke<RecoveryListing>('recovery_document', { document: tab.id }));
        checkpoint(tab); await flushRecovery(tab);
      }
    },
    async id => {
      await invoke('recovery_discard', { document: active().id, id });
    },
    async () => {
      await invoke('recovery_discard_all', { document: active().id });
    });
  recoveryError = panel.error;
  const recoveryButton = document.createElement('button'); recoveryButton.textContent = 'Recovery';
  document.querySelector('header')!.append(recoveryButton);
  recoveryButton.addEventListener('click', () => void panel.show());
  type Startup = { documents: { id: number; path: string; baseline: string; uncertain: boolean }[];
    sessions: { document: number; session: string; revision: number }[]; recovery: RecoveryListing };
  let started = false, starting = false;
  function startRecovery(): Promise<void> {
    if (starting) return initialization;
    if (busy && started) return initialization;
    starting = true;
    busy = true; lockActive = true; applyLock();
    const previous = active(); previous.state = view.state;
    initialization = invoke<Startup>('document_start').then(startup => {
      if (!startup.documents.length) throw new Error('No document returned by the host. Retry recovery.');
      const documents = startup.documents.map(info => {
        // Programmatic early edits in a fresh empty document are kept. Native
        // input is locked until startup completes.
        const source = info.id === previous.id && !info.path && !info.baseline ? tabSource(previous) : info.baseline;
        const tab: DocumentTab = { ...info, sourceMode: false, state: state(source, { ...info, sourceMode: false }) };
        const token = startup.sessions.find(token => token.document === tab.id);
        if (!token) throw new Error('Recovery session is missing. Retry recovery.');
        attachRecovery(tab, token); return tab;
      });
      tabs = new DocumentTabs(documents[0], inputLock);
      for (const tab of documents.slice(1)) tabs.add(tab);
      view.setState(active().state);
      if (view.hasFocus) {
        (view.contentDOM as HTMLElement).blur();
        (document.activeElement as HTMLElement)?.blur?.();
      }
      busy = false; lockActive = false; applyLock();
      started = true; fileTransition(); report(); checkpoint();
      void nativeOpen?.ready();
      document.querySelector('#editor')!.setAttribute('role', 'tabpanel');
      document.querySelector('#editor')!.setAttribute('aria-labelledby', `document-tab-${active().id}`);
    }).catch(reason => { panel.error(reason); throw reason; }).finally(() => { starting = false; });
    return initialization;
  }
  void startRecovery().then(() => {
    const isMain = !getCurrentWindow().label || getCurrentWindow().label === 'main';
    if (isMain) {
      void panel.show(true);
      if (isTauri()) void runAutoUpdateCheck({
        check: () => checkAppUpdates(''),
        onUpdate: showUpdateNotice,
      });
    }
  }).catch(() => {});
}
function showUpdateNotice(update: UpdateInfo): void {
  const notice = document.createElement('div');
  notice.className = 'update-notice';
  const text = document.createElement('span');
  text.setAttribute('role', 'status');
  text.textContent = t('general.auto_update_notice').replace('{v}', update.version);
  const status = document.createElement('div');
  status.className = 'update-notice-status';
  const action = document.createElement('button');
  action.type = 'button';
  bindUpdateButton(action, update, status);
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', 'Close');
  dismiss.innerHTML = '&times;';
  dismiss.addEventListener('click', () => notice.remove());
  notice.append(text, action, dismiss, status);
  document.body.append(notice);
}
if (isTauri()) void getCurrentWindow().onCloseRequested(async event => {
  event.preventDefault(); if (busy) return;
  await operation(async () => {
    for (const tab of tabs.all) if (!await discard(tab)) return;
    for (const tab of tabs.all) { checkpoint(tab); await flushRecovery(tab); }
    try {
      for (const tab of tabs.all) await tab.recovery!.clear();
      await getCurrentWindow().destroy();
    } catch (error) {
      // Window Close clears are not atomic. Rebuild every retained dirty copy
      // when a later clear or destruction fails; keep the window open.
      for (const tab of tabs.all) checkpoint(tab);
      const results = await Promise.allSettled(tabs.all.map(tab => flushRecovery(tab)));
      for (const result of results) if (result.status === 'rejected') recoveryError(result.reason);
      throw error;
    }
  }, true);
});
if (isTauri()) {
  let activeQuit: number | undefined;
  async function quit(request: number) {
    if (!Number.isSafeInteger(request) || request <= 0 || activeQuit === request) return;
    activeQuit = request;
    let approved = false;
    if (busy || composing()) {
      status.textContent = 'Finish the current command or text input, then repeat Quit.';
    } else await operation(async () => {
      for (const tab of tabs.all) if (!await discard(tab)) return;
      // Quit keeps the confirmed recovery copy. Close has a separate clear policy.
      for (const tab of tabs.all) { checkpoint(tab); await flushRecovery(tab); }
      await invoke('resolve_quit', { request, allow: true });
      approved = true; terminating = true;
    }, true);
    if (!approved) {
      try { await invoke('resolve_quit', { request, allow: false }); }
      catch (error) { status.textContent = String(error); }
    }
    activeQuit = undefined;
  }
  void (async () => {
    let ready = false, queued: number | undefined;
    await getCurrentWindow().listen<number>('markdew-quit-request', event => {
      if (ready) void quit(event.payload); else queued = event.payload;
    });
    const pending = await invoke<number | null>('quit_ready');
    ready = true;
    if (pending != null) void quit(pending); else if (queued != null) void quit(queued);
  })().catch(error => { status.textContent = `Quit protection is unavailable. Keep this window open. ${String(error)}`; });
}
