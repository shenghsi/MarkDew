import { invoke, isTauri } from '@tauri-apps/api/core';
import { EditorView } from '@codemirror/view';
import { imageDocument } from './images';
import { sourceField } from './source';
import { tableCellField, tableComposing } from './table';

export const webLinkLimit = 8192;
export function webURL(source: string): string {
  if (!/^https?:\/\//i.test(source) || /\p{Cc}/u.test(source) || source.endsWith(' ') ||
    new TextEncoder().encode(source).length > webLinkLimit) throw new Error('Use an absolute HTTP or HTTPS web link without controls.');
  const url = new URL(source);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
    new TextEncoder().encode(url.href).length > webLinkLimit) throw new Error('Use a bounded web link with a host and no credentials.');
  return url.href;
}
export type WebLinkLaunch = (url: string) => Promise<unknown>;
const launch: WebLinkLaunch = url => isTauri() ? invoke('open_web_link', { url }) :
  Promise.reject(new Error('Open web links in the desktop app.'));

// Dispatch is immediate. Disposal can suppress status, never undo a host launch.
export function webLinkOpener(view: EditorView, report: (message: string) => void,
  blocked: () => string | null = () => null, open: WebLinkLaunch = launch,
  ownsStatus: () => boolean = () => true) {
  let alive = true, request = 0;
  const guard = () => blocked() || (view.compositionStarted || tableComposing(view) ? 'Finish text input, then open the web link.' :
    view.state.field(tableCellField, false) ? 'End the table cell edit, then open the web link.' : null);
  return {
    open(source: string) {
      if (!alive || !view.dom.isConnected) return;
      const token = ++request;
      const reason = guard(); if (reason) { report(reason); return; }
      let url: string;
      try { url = webURL(source); } catch (error) { report(String(error)); return; }
      const doc = view.state.doc, record = view.state.field(sourceField, false),
        selection = view.state.selection, id = view.state.facet(imageDocument);
      const current = () => alive && view.dom.isConnected && ownsStatus() && request === token && view.state.doc === doc &&
        view.state.field(sourceField, false) === record && view.state.selection === selection &&
        view.state.facet(imageDocument) === id && !guard();
      report('Opening web link…');
      try {
        void open(url).then(() => { if (current()) report('Web link open requested.'); },
          error => { if (current()) report(`Cannot open web link: ${String(error)}`); });
      } catch (error) { if (current()) report(`Cannot open web link: ${String(error)}`); }
    },
    dispose() { alive = false; request++; },
  };
}
