/* skin.js — 「图片优先，没有图就用手绘」
   每个画面元素有一个名字（key）和一个框（逻辑坐标 x, y, w, h）。主题包 theme.json 的 images 里有同名图片 → 画图片；
   没有 → 跑原来的手绘函数。这样可以一张一张慢慢换，换一半也不会坏。
   catalog 里记着所有可替换的元素（名字、中文说明、分组、框、规格），导出模板和工作站都用它。 */
const Skin = (() => {
'use strict';
const imgs = (window.THEME && THEME._images) || {};   // key → loaded <img> (boot.js preloads them)
const catalog = new Map();

/* image size limits by kind (long edge in px, file size in KB); images are drawn at 2× the logical box */
const SPEC = {
  scene:  { px: 2400, kb: 1500, label: '场景背景' },
  oc:     { px: 1600, kb: 800,  label: '人物' },
  large:  { px: 1024, kb: 400,  label: '大物件' },
  small:  { px: 512,  kb: 200,  label: '小物件' },
  ui:     { px: 512,  kb: 150,  label: '界面' },
};

/* register a replaceable element.  box = [x, y, w, h] in the coordinates the drawing uses.
   fit: 'stretch' fills the box; 'contain' keeps the picture's shape, sitting on the box's bottom centre. */
function add(key, label, group, box, opts = {}) {
  catalog.set(key, { key, label, group, box, kind: opts.kind || (box[2] * box[3] > 200000 ? 'scene' : box[2] > 160 || box[3] > 160 ? 'large' : 'small'), fit: opts.fit || 'contain', draw: opts.draw || null, note: opts.note || '' });
}
const has = key => !!imgs[key];
const get = key => imgs[key] || null;

function drawImg(c, im, [x, y, w, h], fit) {
  if (fit === 'stretch') return c.drawImage(im, x, y, w, h);
  const k = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
  c.drawImage(im, x + (w - dw) / 2, y + h - dh, dw, dh);
}
/* draw `key`: the theme's image if there is one, otherwise the hand-drawn fallback.  `box` overrides the catalog box. */
let solo = null;          // template export: draw only this key, always by hand
function part(p, key, fallback, box) {
  if (solo) { if (solo === key) fallback && fallback(p); return true; }
  const im = imgs[key], e = catalog.get(key);
  if (im) { drawImg(p.c, im, box || (e && e.box) || [0, 0, im.naturalWidth / 2, im.naturalHeight / 2], e ? e.fit : 'contain'); return true; }
  fallback && fallback(p);
  return false;
}
/* whole-element override: draw the theme image for `key` and return true, or return false so the caller draws by hand */
function img(p, key, box) {
  const im = !solo && imgs[key]; if (!im) return false;
  const e = catalog.get(key); drawImg(p.c, im, box || (e && e.box) || [0, 0, im.naturalWidth / 2, im.naturalHeight / 2], e ? e.fit : 'contain');
  return true;
}
const setSolo = k => { solo = k; };
/* first key that has an image (e.g. ['steamer.burnt', 'steamer']) */
const pick = keys => solo ? null : keys.find(k => imgs[k]) || null;

/* page UI pieces (CSS backgrounds, stretched to fit) */
{
  const S = Sketch.Shapes;
  const ui = (key, label, w, h, draw, note = '会拉伸铺满') => add(key, label, '界面', [0, 0, w, h], { kind: 'ui', fit: 'stretch', draw, note });
  const box = (fill, r = 18) => (w, h) => p => p.draw(S.rect(3, 3, w - 6, h - 6, r), { fill, w: 2, line: '#7a6c66' });
  ui('ui.paper', '弹出的纸（便签、日记、商店）', 560, 420, box('#fffdf6', 6)(560, 420));
  ui('ui.card', '大卡片（店面和小屋外面那张纸）', 600, 380, box('#fbf8f0', 6)(600, 380));
  ui('ui.note', '小便签（点东西弹出的说明）', 280, 180, box('#fffdf6', 8)(280, 180));
  ui('ui.button', '按钮', 160, 44, box('#bcd97a', 22)(160, 44));
  ui('ui.button.ghost', '次要按钮', 160, 44, box('#fffdf6', 22)(160, 44));
  ui('ui.shopcard', '商店里的商品卡', 130, 150, box('#fffdf6', 12)(130, 150));
  ui('ui.sticky', '墙上的小便签纸', 60, 60, box('#fbf1b8', 2)(60, 60));
  ui('ui.tape', '和纸胶带', 110, 30, p => p.draw(S.rect(2, 4, 106, 22, 2), { fill: '#f4cad3', w: 1, line: '#e7a4b4' }));
  ui('ui.page', '网页底纹（会平铺）', 200, 200, p => { p.c.fillStyle = '#f3eee2'; p.c.fillRect(0, 0, 200, 200); for (let y = 10; y < 200; y += 20) for (let x = 10; x < 200; x += 20) p.dot(x, y, 1.4, '#d9cdb8'); }, '会平铺');
}

return { SPEC, catalog, add, has, get, part, img, pick, drawImg, setSolo };
})();
