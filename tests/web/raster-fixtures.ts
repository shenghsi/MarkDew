// Header-only fixtures test preflight. They do not prove browser decode success.
export function rasterHeader(format: 'png' | 'gif' | 'jpeg' | 'webp', width: number, height: number) {
  if (format === 'png') {
    const bytes = new Uint8Array(24);
    bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
    const view = new DataView(bytes.buffer); view.setUint32(16,width); view.setUint32(20,height); return bytes;
  }
  if (format === 'gif') {
    const bytes = new Uint8Array(10); bytes.set(new TextEncoder().encode('GIF89a'));
    const view = new DataView(bytes.buffer); view.setUint16(6,width,true); view.setUint16(8,height,true); return bytes;
  }
  if (format === 'jpeg') {
    const bytes = Uint8Array.from([255,216,255,224,0,2,255,192,0,11,8,0,0,0,0,1,1,17,0,255,217]);
    const view = new DataView(bytes.buffer); view.setUint16(11,height); view.setUint16(13,width); return bytes;
  }
  const bytes = new Uint8Array(30); bytes.set(new TextEncoder().encode('RIFF')); bytes[4]=22;
  bytes.set(new TextEncoder().encode('WEBPVP8X'),8); bytes[16]=10;
  for (let index=0;index<3;index++) {bytes[24+index]=((width-1) >>> (8*index)) & 255;bytes[27+index]=((height-1) >>> (8*index)) & 255;}
  return bytes;
}
