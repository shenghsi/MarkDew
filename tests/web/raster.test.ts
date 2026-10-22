import { expect, it } from 'vitest';
import { imagePixelLimit, imageSideLimit, validateRaster } from '../../src/web/images';
import { rasterHeader } from './raster-fixtures';

for (const format of ['png','gif','jpeg','webp'] as const) {
  it(`checks ${format} dimensions before decode, including exact limits`, () => {
    for (const [width,height] of [[1,1],[640,480],[imageSideLimit,1],[1,imageSideLimit],[8192,4096]])
      expect(validateRaster(rasterHeader(format,width,height))).toBe(`image/${format}`);
    for (const [width,height] of [[imageSideLimit+1,1],[1,imageSideLimit+1],[8192,4097]])
      expect(()=>validateRaster(rasterHeader(format,width,height))).toThrow('exceeds');
    if (format !== 'webp') for (const [width,height] of [[0,1],[1,0]])
      expect(()=>validateRaster(rasterHeader(format,width,height))).toThrow('invalid dimensions');
    const bytes=rasterHeader(format,640,480);
    for (const length of [0,3,8,bytes.length < 24 ? 9 : 23])
      expect(()=>validateRaster(bytes.slice(0,length))).toThrow();
    expect(imagePixelLimit).toBe(8192*4096);
  });
}
it('rejects truncated lossless WebP headers and does not read outside byte-array views', () => {
  const lossless=new Uint8Array(25);lossless.set(new TextEncoder().encode('RIFF'));lossless[4]=18;
  lossless.set(new TextEncoder().encode('WEBPVP8L'),8);lossless[16]=5;lossless[20]=47;
  expect(validateRaster(lossless)).toBe('image/webp');
  for (const length of [12,20,21,24]) expect(()=>validateRaster(lossless.subarray(0,length))).toThrow();
  const backing=rasterHeader('png',1,1);expect(()=>validateRaster(backing.subarray(0,20))).toThrow();
  const bad=rasterHeader('png',1,1);bad[12]=0;expect(()=>validateRaster(bad)).toThrow();
});
