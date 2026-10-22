// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { prepareImage, imageLimit } from '../../src/web/images';

const bytes = (source: string) => new TextEncoder().encode(source);
const image = (body = '', attrs = 'viewBox="0 0 120 60"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
function prepared(source: string) {
  const result = prepareImage(bytes(source)); expect(result.mime).toBe('image/svg+xml');
  return new DOMParser().parseFromString(new TextDecoder().decode(result.bytes), 'image/svg+xml');
}
it('retains SVG gradients, internal shape references, authored CSS and physical units', () => {
  const doc = prepared(image('<defs><linearGradient id="g"><stop stop-color="red"/></linearGradient><path id="p" d="M0 0h20v20z"/></defs>' +
    '<style>.ink{fill:url(#g);stroke:blue}</style><use class="ink" href="#p"/><rect fill="url(#g)" width="20" height="20"/>', 'width="2in" height="25.4mm"'));
  expect(doc.documentElement.getAttribute('width')).toBe('192'); expect(doc.documentElement.getAttribute('height')).toBe('96');
  expect(doc.querySelector('use')?.getAttribute('href')).toBe('#p');
  expect(doc.querySelector('style')?.textContent).toContain('fill:url(#g)');
  expect(doc.querySelector('rect')?.getAttribute('fill')).toBe('url(#g)');
});
it('removes active SVG, external references, CSS imports and disguised URL functions', () => {
  const doc = prepared(image('<script>alert(1)</script><foreignObject><div>bad</div></foreignObject>' +
    '<animate attributeName="href" to="https://example.com"/><image href="https://example.com/a.png"/>' +
    '<a href="javascript:alert(1)"><path onclick="alert(1)" d="M0 0h20"/></a>' +
    '<use href="https://example.com/a.svg#p"/><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#p"/>' +
    '<style>@import "https://example.com/a.css";@font-face{src:url(https://example.com/font)}' +
    '.ink{fill:url(https://example.com/a);stroke:red;background:image-set("https://example.com/b" 1x);mask:u\\72l(https://example.com/c)}</style>' +
    '<rect fill="url(https://example.com/a)" style="stroke:blue;filter:url(https://example.com/filter)"/>', 'viewBox="0 0 100 50" xml:base="https://example.com/"'));
  const source = new XMLSerializer().serializeToString(doc);
  expect(source).not.toContain('https://example.com'); expect(source).not.toContain('javascript:');
  expect(doc.querySelector('script, foreignObject, animate, image, [onclick]')).toBeNull();
  expect(source).toContain('stroke:red'); expect(source).toContain('stroke:blue');
  expect(doc.querySelectorAll('use')[1]?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#p');
});
it('normalizes viewBox dimensions and prevents style size overrides', () => {
  const doc = prepared(image('<style>svg{width:999999px!important;height:999999px!important;min-width:999999px!important;min-height:999999px!important;max-width:1px!important;max-height:1px!important}</style>',
    'viewBox="-1,-2,120,60" width="50%" style="width:999999px!important;height:999999px!important;min-width:999999px!important;min-height:999999px!important;max-width:1px!important;max-height:1px!important"'));
  expect(doc.documentElement.getAttribute('viewBox')).toBe('-1 -2 120 60');
  expect(doc.documentElement.getAttribute('width')).toBe('120'); expect(doc.documentElement.getAttribute('height')).toBe('60');
  expect(doc.documentElement.getAttribute('style')).toContain('width: 120px !important');
  for (const property of ['min-width', 'max-width']) expect(doc.documentElement.getAttribute('style')).toContain(`${property}: 120px !important`);
  for (const property of ['min-height', 'max-height']) expect(doc.documentElement.getAttribute('style')).toContain(`${property}: 60px !important`);
  expect(prepared(image('', 'width="20" viewBox="0 0 100 50"')).documentElement.getAttribute('height')).toBe('10');
});
it('rejects malformed XML, wrong roots and namespaces, DTDs, UTF-8 errors and missing dimensions', () => {
  for (const source of ['<svg>', '<html/>', '<svg xmlns="urn:wrong" width="1" height="1"/>',
    '<svg width="1" height="1"/>', '<!DOCTYPE svg [<!ENTITY x "x">]>' + image('&x;'), image('', ''),
    image('', 'viewBox="0 0 -1 2"'), image('', 'viewBox="0 0 0x10 2"'), image('', 'width="NaN" height="2"'),
    image('', 'width="0" height="2"'), image('', 'width="-1" height="2"'), image('', 'width="1em" height="2"')])
    expect(() => prepareImage(bytes(source))).toThrow();
  expect(() => prepareImage(Uint8Array.of(255, 255))).toThrow();
  expect(() => prepareImage(new Uint8Array(imageLimit + 1))).toThrow('8 MiB');
});
it('checks SVG side and area limits before producing image bytes', () => {
  expect(prepared(image('', 'width="16384" height="2048"')).documentElement.getAttribute('width')).toBe('16384');
  for (const attrs of ['width="16385" height="1"', 'width="16384" height="2049"', 'viewBox="0 0 1e309 1"',
    'width="1e309px" height="1"']) expect(() => prepareImage(bytes(image('', attrs)))).toThrow();
});
it('normalizes prefixed SVG elements before sanitization without accepting other namespaces', () => {
  const doc = prepared('<s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><s:script>bad()</s:script><s:rect width="20" height="10" fill="red"/></s:svg>');
  expect(doc.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
  expect(doc.querySelector('script')).toBeNull(); expect(doc.querySelector('rect')?.getAttribute('fill')).toBe('red');
});
