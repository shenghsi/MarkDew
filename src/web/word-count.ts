import type { Text } from '@codemirror/state';
import type { DocumentCount } from './document-count';

type CountWorker = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;
const scope = 'Counts all Markdown source, including code and front matter. Words use English word boundaries.';

export function wordCount(element: HTMLElement, createWorker: () => CountWorker = () =>
  new Worker(new URL('./document-count.worker.ts', import.meta.url), { type: 'module' })) {
  let document: Text | undefined, generation = 0, disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined, worker: CountWorker | undefined, inFlight = false;
  const stop = () => {
    if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); }
    worker = undefined; inFlight = false;
  };
  const show = (label: string, details = scope) => {
    element.textContent = label; element.title = details; element.setAttribute('aria-label', `${label}. ${details}`);
  };
  const failure = () => { stop(); show('Count unavailable', 'Word count is unavailable.'); };
  element.setAttribute('aria-live', 'off');
  function update(next: Text) {
    if (disposed || next === document) return;
    document = next; generation++;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (inFlight) stop(); // Cancel stale work instead of queuing more snapshots.
    if (!next.length) { show('0 words', `${scope} 0 characters (Unicode code points, including spaces).`); return; }
    show('Counting…');
    const request = generation;
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed || request !== generation || document !== next) return;
      try {
        if (!worker) worker = createWorker();
        const owned = worker;
        owned.onmessage = event => {
          if (disposed || worker !== owned || generation !== request || document !== next) return;
          const data = event.data as DocumentCount & { generation: number; error?: boolean };
          if (!data || data.generation !== request) return;
          if (data.error) { failure(); return; }
          if (!Number.isSafeInteger(data.words) || !Number.isSafeInteger(data.characters) || data.words < 0 || data.characters < 0) return;
          inFlight = false;
          show(`${data.words.toLocaleString('en')} ${data.words === 1 ? 'word' : 'words'}`,
            `${scope} ${data.characters.toLocaleString('en')} characters (Unicode code points, including spaces). An emoji can contain several code points.`);
        };
        const error = () => { if (!disposed && worker === owned && generation === request && document === next) failure(); };
        owned.onerror = owned.onmessageerror = error;
        inFlight = true;
        owned.postMessage({ generation: request, text: next.toString() });
      } catch { failure(); }
    }, 500);
  }
  return { update, destroy() {
    disposed = true; generation++; document = undefined;
    if (timer !== undefined) clearTimeout(timer); timer = undefined; stop();
  } };
}
