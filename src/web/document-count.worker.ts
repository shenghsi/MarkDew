import { countDocument } from './document-count';

self.onmessage = (event: MessageEvent<{ generation: number; text: string }>) => {
  const { generation, text } = event.data;
  try { self.postMessage({ generation, ...countDocument(text) }); }
  catch { self.postMessage({ generation, error: true }); }
};
