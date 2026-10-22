import { renderDiagram } from './renderers';

// Pandoc sees a mermaid block as plain code. For formats that hold pictures, draw each diagram here with
// the same renderer as the preview and print, and put the picture in the Markdown that Pandoc reads.
const scale = 2;
const edgeLimit = 8192;
const pixelLimit = 32 * 1024 * 1024;

export interface DiagramBlock { from: number; to: number; source: string }

// Fenced blocks whose info string starts with mermaid. A fence inside another fence is only text, and a
// block closes at a fence of the same character that is at least as long.
export function mermaidBlocks(markdown: string): DiagramBlock[] {
  const blocks: DiagramBlock[] = [];
  let open: { char: string; length: number; info: string; from: number; bodyFrom: number } | undefined;
  for (let position = 0; position <= markdown.length;) {
    let end = markdown.indexOf('\n', position); if (end < 0) end = markdown.length;
    const line = markdown.slice(position, end).replace(/\r$/, '');
    if (!open) {
      const fence = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\n]*)$/.exec(line);
      if (fence && !(fence[1][0] === '`' && fence[2].includes('`')))
        open = { char: fence[1][0], length: fence[1].length, info: fence[2].trim(), from: position, bodyFrom: end + 1 };
    } else {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (close && close[1][0] === open.char && close[1].length >= open.length) {
        if (/^mermaid(\s|$)/i.test(open.info)) blocks.push({ from: open.from, to: end, source: markdown.slice(open.bodyFrom, Math.max(open.bodyFrom, position - 1)).replace(/\r\n/g, '\n').replace(/\r$/, '') });
        open = undefined;
      }
    }
    position = end + 1;
  }
  return blocks;
}

// SVG text to a PNG data URL on a white page, at twice the drawn size.
export async function svgToPng(svg: string): Promise<string> {
  const document_ = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document_.documentElement;
  if (root.nodeName.toLowerCase() !== 'svg' || root.querySelector('parsererror')) throw new Error('The diagram is not a valid image.');
  // The drawn size is the width and height of the root element, else the size of its view box.
  const attribute = (name: string) => { const value = root.getAttribute(name) || ''; return /^[\d.]+(px)?$/.test(value) ? Number.parseFloat(value) : NaN; };
  const box = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  let width = attribute('width'), height = attribute('height');
  if (!(width > 0 && height > 0) && box.length === 4 && box[2] > 0 && box[3] > 0) { width = box[2]; height = box[3]; }
  if (!(width > 0 && height > 0)) { width = 800; height = 600; }
  const pixelsWide = Math.ceil(width * scale), pixelsHigh = Math.ceil(height * scale);
  if (pixelsWide > edgeLimit || pixelsHigh > edgeLimit || pixelsWide * pixelsHigh > pixelLimit) throw new Error('The diagram is too large to draw.');
  root.setAttribute('width', String(pixelsWide)); root.setAttribute('height', String(pixelsHigh));
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Cannot load the diagram image.')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = pixelsWide; canvas.height = pixelsHigh;
    const context = canvas.getContext('2d'); if (!context) throw new Error('The browser cannot create an image canvas.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, pixelsWide, pixelsHigh);
    context.drawImage(image, 0, 0, pixelsWide, pixelsHigh);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export const diagramPng = async (source: string) => svgToPng(await renderDiagram(source, 'print'));

export interface EmbedResult { markdown: string; drawn: number; failed: number }
// Replace each mermaid block with an image of its diagram. A diagram that cannot be drawn stays as code.
export async function embedDiagrams(markdown: string, draw: (source: string) => Promise<string> = diagramPng,
  progress?: (done: number, total: number) => void): Promise<EmbedResult> {
  const blocks = mermaidBlocks(markdown);
  let result = '', cursor = 0, drawn = 0, failed = 0;
  for (const [index, block] of blocks.entries()) {
    progress?.(index, blocks.length);
    result += markdown.slice(cursor, block.from);
    try {
      const url = await draw(block.source);
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) throw new Error('The diagram image is not a PNG.');
      result += `![Mermaid diagram](${url})`; drawn++;
    } catch { result += markdown.slice(block.from, block.to); failed++; }
    cursor = block.to;
  }
  return { markdown: result + markdown.slice(cursor), drawn, failed };
}
