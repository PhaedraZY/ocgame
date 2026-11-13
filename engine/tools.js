/* tools.js — 模板页和工作站共用的小工具：把手绘元素画成 PNG、打 zip 包、压缩图片。 */
const OCTools = (() => {
'use strict';

/* draw one catalog element by hand at `scale` (transparent background, exact box) */
function renderTemplate(e, scale = 2) {
  const [x, y, w, h] = e.box;
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(h * scale));
  const c = cv.getContext('2d'); c.scale(scale, scale); c.translate(-x, -y);
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  Skin.setSolo(e.key);
  try { e.draw && e.draw(new Sketch.Pen(c, 7)); } catch (err) { console.warn(e.key, err); }
  Skin.setSolo(null);
  return cv;
}

/* tiny zip writer (stored, no compression): files = [{ name, data: Uint8Array | Blob }] */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const put = (dv, list) => list.forEach(([o, v, s]) => s === 4 ? dv.setUint32(o, v, true) : dv.setUint16(o, v, true));
async function zip(files) {
  const enc = new TextEncoder(), parts = [], dir = []; let off = 0;
  for (const f of files) {
    const data = f.data instanceof Blob ? new Uint8Array(await f.data.arrayBuffer()) : typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const name = enc.encode(f.name), crc = crc32(data), n = data.length;
    const h = new DataView(new ArrayBuffer(30));
    put(h, [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, name.length, 2], [28, 0, 2]]);
    parts.push(new Uint8Array(h.buffer), name, data);
    const d = new DataView(new ArrayBuffer(46));
    put(d, [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]]);
    dir.push(new Uint8Array(d.buffer), name);
    off += 30 + name.length + n;
  }
  const size = dir.reduce((s, b) => s + b.length, 0), end = new DataView(new ArrayBuffer(22));
  put(end, [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, off, 4]]);
  return new Blob([...parts, ...dir, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

/* fit an uploaded picture to the size limit: long edge ≤ maxPx, WebP, file ≤ maxKB (lowering quality if needed) */
async function fitImage(file, maxPx, maxKB) {
  const url = URL.createObjectURL(file);
  const im = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('读不了这张图')); i.src = url; });
  URL.revokeObjectURL(url);
  const w0 = im.naturalWidth, h0 = im.naturalHeight, k = Math.min(1, maxPx / Math.max(w0, h0));
  const cv = document.createElement('canvas'); cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  let q = .92, blob;
  for (;;) { blob = await new Promise(r => cv.toBlob(r, 'image/webp', q)); if (blob.size <= maxKB * 1024 || q <= .5) break; q -= .08; }
  return { blob, w0, h0, w: cv.width, h: cv.height, scaled: k < 1, kb: Math.round(blob.size / 1024), tooBig: blob.size > maxKB * 1024 };
}

return { renderTemplate, zip, download, fitImage };
})();
