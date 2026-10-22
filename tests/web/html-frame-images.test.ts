// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Text } from '@codemirror/state';
import { invoke } from '@tauri-apps/api/core';
import { resolveHTMLImages, mountHTMLFrame } from '../../src/web/html-frame';
import { mountBlockHTML } from '../../src/web/block-html';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: () => true,
}));

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

const validSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="40" fill="green"/></svg>';
const validSvgBytes = new TextEncoder().encode(validSvg);

it('resolves local relative SVG paths in HTML blocks to data URIs', async () => {
  vi.mocked(invoke).mockResolvedValue(validSvgBytes.buffer);

  const source = '<p align="center">\n  <img src="assets/markview-icon-color.svg" alt="Markview" width="104" height="104">\n</p>';
  const resolved = await resolveHTMLImages(source, '/tmp/doc.md', 42);

  expect(invoke).toHaveBeenCalledWith('read_image', {
    destination: 'assets/markview-icon-color.svg',
    documentPath: '/tmp/doc.md',
    document: 42,
  });
  expect(resolved).toContain('data:image/svg+xml;base64,');
  expect(resolved).toContain('alt="Markview"');
  expect(resolved).toContain('width="104"');
  expect(resolved).toContain('height="104"');
  expect(resolved).toContain('align="center"');
});

it('mountBlockHTML renders local SVG inside isolated iframe with resolved data URI', async () => {
  vi.mocked(invoke).mockResolvedValue(validSvgBytes.buffer);

  const source = '<p align="center">\n  <img src="assets/markview-icon-color.svg" alt="Markview" width="104" height="104">\n</p>';
  const dom = document.createElement('div');
  document.body.append(dom);

  const measure = vi.fn();
  mountBlockHTML(
    dom,
    {
      source,
      doc: Text.of(source.split('\n')),
      bodyFrom: 0,
      from: 0,
      to: source.length,
      path: '/tmp/doc.md',
      document: 42,
    },
    measure
  );

  await vi.waitFor(() => expect(dom.dataset.ready).toBe('isolated'));
  const frame = dom.querySelector('iframe')!;
  expect(frame).not.toBeNull();
  expect(frame.srcdoc).toContain('data:image/svg+xml;base64,');
  expect(frame.srcdoc).toContain('alt="Markview"');
  expect(frame.srcdoc).toContain('width="104"');
  expect(frame.srcdoc).toContain('height="104"');
  expect(measure).toHaveBeenCalled();
});

it('mountHTMLFrame resolves local images during loaded lifecycle if not pre-resolved', async () => {
  vi.mocked(invoke).mockResolvedValue(validSvgBytes.buffer);

  const source = '<div><img src="assets/icon.svg" alt="Icon"></div>';
  const measure = vi.fn();
  const notice = vi.fn();
  const mounted = mountHTMLFrame(source, 'Preview', measure, notice, {
    path: '/tmp/doc.md',
    document: 1,
  });
  document.body.append(mounted.frame);

  const doc = mounted.frame.contentDocument!;
  doc.body.innerHTML = source;
  const img = doc.querySelector('img')!;
  expect(img).not.toBeNull();
  expect(img.getAttribute('src')).toBe('assets/icon.svg');

  mounted.frame.dispatchEvent(new Event('load'));
  await vi.waitFor(() => expect(img.src).toContain('data:image/svg+xml;base64,'));
  mounted.dispose();
});

it('renders remote HTTPS badge images inside isolated iframe with https CSP', async () => {
  const source = '<p align="center">\n  <a href="https://github.com/szdytom/markview/actions/workflows/ci.yml"><img src="https://github.com/szdytom/markview/actions/workflows/ci.yml/badge.svg" alt="CI"></a>\n  <a href="https://github.com/szdytom/markview/releases"><img src="https://img.shields.io/github/v/release/szdytom/markview?sort=semver" alt="Latest release"></a>\n  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>\n</p>';
  const dom = document.createElement('div');
  document.body.append(dom);

  const measure = vi.fn();
  mountBlockHTML(
    dom,
    {
      source,
      doc: Text.of(source.split('\n')),
      bodyFrom: 0,
      from: 0,
      to: source.length,
      path: '/tmp/doc.md',
      document: 42,
    },
    measure
  );

  await vi.waitFor(() => expect(dom.dataset.ready).toBe('isolated'));
  const frame = dom.querySelector('iframe')!;
  expect(frame).not.toBeNull();
  expect(frame.srcdoc).toContain('img-src data: https:;');
  expect(frame.srcdoc).toContain('src="https://github.com/szdytom/markview/actions/workflows/ci.yml/badge.svg"');
  expect(frame.srcdoc).toContain('src="https://img.shields.io/github/v/release/szdytom/markview?sort=semver"');
  expect(frame.srcdoc).toContain('src="https://img.shields.io/badge/license-MIT-blue.svg"');
  expect(measure).toHaveBeenCalled();
});

