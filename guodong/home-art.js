/* home-art.js — 果冻的小屋 · 手绘素材（同一支 sketch.js 手绘笔）
   房间逻辑尺寸 1200×720；家具各自一个盒子 (w×h)，锚点在底边中点。 */
const HomeArt = (() => {
'use strict';
const { Shapes: S } = Sketch;
const C = Art.C;
const WOOD = '#ecd6b2', WOOD_D = '#d6b98c', WOOD_L = '#f5e6cc', PLANK = '#c9a87c';

/* ---------------- the cottage room ----------------
   One-point perspective box: back wall (plaster above, wood wainscot below), two side walls that lean in,
   a floor whose boards run toward the vanishing point, a pitched ceiling with rafters and a tie beam.
   Everything seen through glass (window, door) is clipped to the glass. */
const ROOM = {
  bx0: 96, bx1: 1104, by0: 132, by1: 556,      // back wall rectangle
  vp: [600, 330],                               // vanishing point
  win: { x0: 236, y0: 160, x1: 620, y1: 436 },  // window outer frame
  door: { x0: 880, y0: 236, x1: 1050, y1: 556 },
};
function clipTo(p, pts, fn) { const c = p.c; c.save(); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); c.clip(); fn(); c.restore(); }
function yardView(p, x0, y0, x1, y1, near = 1, night = false) {     // the front yard, drawn into whatever clip is active
  const w = x1 - x0, h = y1 - y0, X = t => x0 + w * t, Y = t => y0 + h * t;
  p.wash(S.rect(x0 - 4, y0 - 4, w + 8, h + 8), { color: night ? '#7d88bd' : '#d8eaf4', blooms: 5, edge: 0, off: 0 });
  p.wash(S.rect(x0 - 4, Y(.45), w + 8, h * .2), { color: night ? '#a3a9cf' : '#eef5f0', edge: 0, off: 0, alpha: .8 });
  if (night) {
    for (let i = 0; i < 22; i++) p.dot(X(p.rand(.03, .97)), Y(p.rand(.03, .4)), p.rand(.8, 1.8) * near, '#fffbe8');
    p.draw(S.ell(X(.78), Y(.14), 13 * near, 13 * near), { fill: '#fff6d2', w: 1, line: '#a39089' });
    p.wash(S.ell(X(.78), Y(.14), 30 * near, 30 * near), { color: '#fff6d2', alpha: .25, edge: 0, off: 0 });
  } else for (const [cx, cy, s] of [[.18, .14, 1], [.62, .1, .8], [.9, .22, .7]]) p.wash(S.ell(X(cx), Y(cy), 34 * s * near, 10 * s * near), { color: '#ffffff', edge: 0, alpha: .9 });
  // far hills + orchard rows
  p.wash(S.curve([[x0 - 10, Y(.55)], [X(.25), Y(.44)], [X(.55), Y(.5)], [X(.8), Y(.42)], [x1 + 10, Y(.48)], [x1 + 10, Y(.7)], [x0 - 10, Y(.7)]], true, 8), { color: '#d4e6c0', edge: 0 });
  for (let i = 0; i < 9; i++) { const tx = .06 + i * .11; p.draw(S.ell(X(tx), Y(.53 + (i % 2) * .02), 14 * near, 11 * near), { fill: '#bcd895', w: .9, line: '#a39089', blooms: 1 }); }
  // the shop, far away, with its green awning
  p.draw(S.rect(X(.7), Y(.46), w * .1, h * .1, 2), { fill: '#fbf7ee', w: 1, line: '#a39089' });
  p.draw([[X(.69), Y(.47)], [X(.75), Y(.4)], [X(.81), Y(.47)]], { fill: '#bcd97a', w: 1, line: '#a39089' });
  p.draw(S.rect(X(.735), Y(.5), w * .025, h * .06, 1), { fill: night ? '#fbe7a6' : '#d3e3ee', w: .8, line: '#a39089' });
  // lawn, stepping-stone path, picket fence
  p.wash(S.curve([[x0 - 10, Y(.66)], [X(.4), Y(.62)], [X(.8), Y(.65)], [x1 + 10, Y(.62)], [x1 + 10, y1 + 10], [x0 - 10, y1 + 10]], true, 8), { color: '#c9e0a3', blooms: 6, edge: 0 });
  for (let i = 0; i < 5; i++) { const t = i / 4; p.draw(S.ell(X(.5 + Math.sin(t * 2) * .06), Y(.98 - t * .3), (18 - t * 9) * near, (6 - t * 3) * near), { fill: '#e8e1d0', w: .9, line: '#a39089', blooms: 1 }); }
  for (let x = x0 - 6; x < x1 + 10; x += 15 * near) p.draw([[x, Y(.76)], [x, Y(.66)], [x + 4 * near, Y(.63)], [x + 8 * near, Y(.66)], [x + 8 * near, Y(.76)]], { fill: '#fbfaf3', w: .9, line: '#a39089', blooms: 0 });
  p.ink([[x0 - 6, Y(.69)], [x1 + 6, Y(.69)]], { w: .9, color: '#a39089' });
  // mailbox
  p.draw(S.rect(X(.9), Y(.62), 4 * near, h * .2, 1), { fill: '#bba083', w: .8, line: '#a39089' });
  p.draw(S.rect(X(.875), Y(.57), 22 * near, 13 * near, 5), { fill: '#e7a4b4', w: .9, line: '#a39089' });
  for (let i = 0; i < 14; i++) p.dot(X(p.rand(.05, .95)), Y(p.rand(.8, .98)), 2.2 * near, ['#fbfaf3', '#f4cad3', '#f5dc86'][i % 3]);
}
function drawRoom(p, opt = {}) {
  const R = ROOM, night = !!opt.night;
  // ---- ceiling (pitched) ----
  p.wash([[-10, -10], [1210, -10], [R.bx1, R.by0], [R.bx0, R.by0]], { color: '#e3c89f', blooms: 6, edge: 0, off: 0 });
  for (let i = 0; i <= 8; i++) { const t = i / 8, xb = lerp(R.bx0, R.bx1, t), xt = lerp(-160, 1360, t); p.ink([[xt, -10], [xb, R.by0]], { w: 1.2, color: '#c5a578' }); }
  // ---- side walls ----
  p.draw([[-10, -10], [R.bx0, R.by0], [R.bx0, R.by1], [-10, 730]], { fill: '#e9d1a8', w: 1.6, blooms: 5 });
  p.draw([[1210, -10], [R.bx1, R.by0], [R.bx1, R.by1], [1210, 730]], { fill: '#e9d1a8', w: 1.6, blooms: 5 });
  for (let i = 1; i < 4; i++) { const t = i / 4; p.ink([[lerp(-10, R.bx0, t), lerp(-10, R.by0, t)], [lerp(-10, R.bx0, t), lerp(730, R.by1, t)]], { w: 1, color: '#c9a87c' }); p.ink([[lerp(1210, R.bx1, t), lerp(-10, R.by0, t)], [lerp(1210, R.bx1, t), lerp(730, R.by1, t)]], { w: 1, color: '#c9a87c' }); }
  p.wash([[-10, -10], [R.bx0, R.by0], [R.bx0, R.by1], [-10, 730]], { color: '#7a6c66', alpha: .06, edge: 0, off: 0 });
  // ---- back wall: plaster with hand-dotted pattern above, wood wainscot below ----
  p.wash(S.rect(R.bx0, R.by0, R.bx1 - R.bx0, R.by1 - R.by0), { color: '#f6ecda', blooms: 7, edge: 0, off: 0 });
  for (let y = R.by0 + 26, row = 0; y < 372; y += 34, row++) for (let x = R.bx0 + (row % 2 ? 18 : 35); x < R.bx1 - 8; x += 34) p.dot(x + p.rand(-1.5, 1.5), y + p.rand(-1.5, 1.5), p.rand(1.8, 2.5), '#b9cde3');
  p.wash(S.rect(R.bx0, 384, R.bx1 - R.bx0, R.by1 - 384), { color: '#e6cda3', blooms: 6, edge: 0, off: 0 });
  for (let x = R.bx0 + 24; x < R.bx1; x += 40) p.ink([[x + p.rand(-1, 1), 392], [x + p.rand(-1, 1), R.by1 - 6]], { w: 1, color: '#c9a87c', amp: .5 });
  p.draw(S.rect(R.bx0 - 2, 376, R.bx1 - R.bx0 + 4, 12, 3), { fill: '#f1dfbf', w: 1.6 });
  // ---- structure: top plate beam, corner posts, tie beam + rafters ----
  p.draw(S.rect(R.bx0 - 6, R.by0 - 10, R.bx1 - R.bx0 + 12, 18, 3), { fill: '#c9a77c', w: 1.8 });
  for (const x of [R.bx0 - 8, R.bx1 - 8]) p.draw(S.rect(x, R.by0 - 6, 16, R.by1 - R.by0 + 8, 3), { fill: '#c9a77c', w: 1.7 });
  p.draw([[-10, 62], [-10, 44], [1210, 44], [1210, 62]], { fill: '#c19d70', w: 1.7 });
  for (const [xt, xb] of [[150, 300], [1050, 900]]) p.draw([[xt - 8, 62], [xb - 8, R.by0 - 10], [xb + 8, R.by0 - 10], [xt + 8, 62]], { fill: '#c9a77c', w: 1.3 });
  // ---- floor: boards converge toward the vanishing point ----
  p.draw([[R.bx0, R.by1], [R.bx1, R.by1], [1210, 730], [-10, 730]], { fill: '#e2c69a', w: 1.6, blooms: 7 });
  for (let i = 0; i <= 14; i++) { const t = i / 14, xb = lerp(R.bx0, R.bx1, t), xf = lerp(-180, 1380, t); p.ink([[xb, R.by1 + 2], [xf, 730]], { w: 1.1, color: '#c5a578' }); }
  for (const [y, n] of [[580, 9], [612, 7], [652, 6], [702, 5]]) for (let k = 0; k < n; k++) { const t = (k + p.rand(.2, .8)) / n, xl = lerp(R.bx0, -10, (y - R.by1) / 174), xr = lerp(R.bx1, 1210, (y - R.by1) / 174); const x = lerp(xl, xr, t); p.ink([[x, y], [x + 14, y]], { w: 1, color: '#c5a578' }); }
  // baseboards (back + sides)
  p.draw(S.rect(R.bx0, R.by1 - 12, R.bx1 - R.bx0, 14, 2), { fill: '#c9a77c', w: 1.5 });
  p.draw([[-10, 716], [R.bx0, R.by1 - 12], [R.bx0, R.by1 + 2], [-10, 734]], { fill: '#c9a77c', w: 1.3 });
  p.draw([[1210, 716], [R.bx1, R.by1 - 12], [R.bx1, R.by1 + 2], [1210, 734]], { fill: '#c9a77c', w: 1.3 });

  // ---- the big window, front yard visible through it ----
  const W = R.win, g = { x0: W.x0 + 16, y0: W.y0 + 16, x1: W.x1 - 16, y1: W.y1 - 16 };
  p.wash(S.rect(W.x0 + 6, W.y0 + 8, W.x1 - W.x0, W.y1 - W.y0), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
  p.draw(S.rect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0, 6), { fill: '#f3e3c6', w: 2 });
  clipTo(p, [[g.x0, g.y0], [g.x1, g.y0], [g.x1, g.y1], [g.x0, g.y1]], () => {
    yardView(p, g.x0, g.y0, g.x1, g.y1, 1, night);
    // her old apple tree, close to the window, cut off by the frame
    p.draw(S.rect(g.x0 + 40, g.y0 + 120, 18, 160, 4), { fill: '#b59c80', w: 1.3, line: '#a39089' });
    for (const [x, y, r] of [[g.x0 + 20, g.y0 + 70, 60], [g.x0 + 92, g.y0 + 52, 58], [g.x0 + 56, g.y0 + 12, 52], [g.x0 + 130, g.y0 + 104, 34]]) p.draw(S.ell(x, y, r, r * .84), { fill: '#b6d585', w: 1.2, line: '#a39089' });
    for (let i = 0; i < 9; i++) p.dot(g.x0 + p.rand(0, 150), g.y0 + p.rand(10, 120), 4.4, '#e4f2a8', { line: '#a39089', w: .8 });
    // glass sheen
    if (!opt.winOpen) { p.c.globalAlpha = .5; p.ink([[g.x0 + 170, g.y0 + 20], [g.x0 + 120, g.y0 + 110]], { w: 3, color: '#ffffff' }); p.ink([[g.x0 + 196, g.y0 + 20], [g.x0 + 160, g.y0 + 86]], { w: 2, color: '#ffffff' }); p.c.globalAlpha = 1; }
  });
  p.ink(S.rect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, 2), { w: 1.6, closed: true });
  if (!opt.winOpen) {
    const mx = [lerp(g.x0, g.x1, 1 / 3), lerp(g.x0, g.x1, 2 / 3)], my = lerp(g.y0, g.y1, .5);
    for (const x of mx) p.draw(S.rect(x - 5, g.y0, 10, g.y1 - g.y0), { fill: '#f3e3c6', w: 1.3 });
    p.draw(S.rect(g.x0, my - 5, g.x1 - g.x0, 10), { fill: '#f3e3c6', w: 1.3 });
  } else {      // two casements swung into the room, seen edge-on
    for (const side of [0, 1]) {
      const X = x => side ? g.x1 - (x - g.x0) : x, d = 54;
      const pane = [[X(g.x0), g.y0], [X(g.x0 + d), g.y0 + 22], [X(g.x0 + d), g.y1 + 18], [X(g.x0), g.y1]];
      p.draw(pane, { fill: '#e4eef6', fillAlpha: .55, w: 1.5 });
      p.ink([[X(g.x0 + 4), lerp(g.y0, g.y1, .5) + 4], [X(g.x0 + d - 4), lerp(g.y0, g.y1, .5) + 18]], { w: 3, color: '#f3e3c6' });
      p.ink([[X(g.x0 + 14), g.y0 + 40], [X(g.x0 + 30), g.y0 + 60]], { w: 1.6, color: '#ffffff' });
    }
  }
  // little scalloped valance + sill
  p.draw(S.rect(W.x0 - 12, W.y0 - 16, W.x1 - W.x0 + 24, 14, 3), { fill: '#c9a77c', w: 1.5 });
  p.draw(S.rect(W.x0 - 4, W.y0 - 4, W.x1 - W.x0 + 8, 16, 2), { fill: '#fbfaf3', w: 1.2 });
  p.draw(S.scallops(W.x0 - 4, W.x1 + 4, W.y0 + 12, 24), { fill: '#fbfaf3', w: 1.2 });
  for (let x = W.x0 + 8; x < W.x1; x += 24) p.dot(x, W.y0 + 6, 2, '#b9cde3');
  p.draw(S.rect(W.x0 - 18, W.y1 - 4, W.x1 - W.x0 + 36, 16, 4), { fill: '#f1dfbf', w: 1.8 });
  p.draw([[W.x0 + 4, W.y1 + 12], [W.x0 + 12, W.y1 + 28], [W.x0 + 20, W.y1 + 12]], { fill: '#d6b98c', w: 1.1 });
  p.draw([[W.x1 - 20, W.y1 + 12], [W.x1 - 12, W.y1 + 28], [W.x1 - 4, W.y1 + 12]], { fill: '#d6b98c', w: 1.1 });

  // ---- door with glass panes ----
  const D = R.door;
  p.draw(S.rect(D.x0 - 12, D.y0 - 14, D.x1 - D.x0 + 24, D.y1 - D.y0 + 14, 4), { fill: '#c9a77c', w: 1.8 });
  p.draw(S.rect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0, 3), { fill: '#d9bb8c', w: 1.8 });
  const dg = { x0: D.x0 + 18, y0: D.y0 + 18, x1: D.x1 - 18, y1: D.y0 + 132 };
  clipTo(p, [[dg.x0, dg.y0], [dg.x1, dg.y0], [dg.x1, dg.y1], [dg.x0, dg.y1]], () => { yardView(p, dg.x0 - 40, dg.y0 - 20, dg.x1 + 40, dg.y1 + 60, .7, night); });
  p.ink(S.rect(dg.x0, dg.y0, dg.x1 - dg.x0, dg.y1 - dg.y0, 2), { w: 1.4, closed: true });
  p.draw(S.rect((dg.x0 + dg.x1) / 2 - 4, dg.y0, 8, dg.y1 - dg.y0), { fill: '#d9bb8c', w: 1.1 });
  p.draw(S.rect(dg.x0, (dg.y0 + dg.y1) / 2 - 4, dg.x1 - dg.x0, 8), { fill: '#d9bb8c', w: 1.1 });
  for (const y of [D.y0 + 150, D.y0 + 236]) p.ink(S.rect(D.x0 + 18, y, D.x1 - D.x0 - 36, 70, 3), { w: 1.2, closed: true, color: '#b99668' });
  p.dot(D.x1 - 20, D.y0 + 178, 6, C.gold, { line: C.line, w: 1 });
  p.draw(S.rect(D.x0 + 8, D.y1 - 4, D.x1 - D.x0 - 16, 10, 3), { fill: '#e7a4b4', w: 1.2 });
  // a hook with her old straw hat
  p.draw(S.rect(806, 278, 62, 10, 3), { fill: '#c9a77c', w: 1.3 });
  p.draw(S.rect(832, 286, 8, 10, 2), { fill: '#a88b66', w: 1 });
  p.draw(S.ell(836, 308, 24, 7), { fill: '#efd79a', w: 1.3 }); p.draw(S.ell(836, 300, 13, 10, Math.PI, Math.PI * 2).concat([[823, 302]]), { fill: '#efd79a', w: 1.3 });
  p.ink([[824, 304], [848, 304]], { w: 2, color: C.apple });

  // ---- bare bulb hanging from the tie beam (until she buys a lamp) ----
  p.ink([[700, 62], [700, 104]], { w: 1.3 });
  p.draw(S.rect(692, 102, 16, 12, 2), { fill: '#bdb5aa', w: 1.1 });
  p.draw(S.ell(700, 126, 13, 15), { fill: '#fff6d6', w: 1.3 });
}
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- furniture ----------------
   zone: floor | wall | small (small things sit on the floor or on a surface)
   surf: a surface other things can sit on, in local coords (y from the item's top, x0..x1) */
const ITEMS = {
  basket:   { name: '旧篮子', w: 120, h: 62, zone: 'floor', price: 0, comfort: 2, soft: true, surf: { y: 18, x0: 24, x1: 96 }, line: '……以前，每天睡在这里。' },
  bed:      { name: '青苹果小床', w: 270, h: 150, zone: 'floor', price: 260, comfort: 22, soft: true, surf: { y: 62, x0: 40, x1: 236 }, line: '……软的。比篮子软。' },
  rug:      { name: '波点小地毯', w: 230, h: 44, zone: 'rug', price: 50, comfort: 6, soft: true, line: '可以在上面打滚。' },
  desk:     { name: '小书桌', w: 176, h: 112, zone: 'floor', price: 220, comfort: 6, surf: { y: 2, x0: 10, x1: 166 }, line: '这里可以……练写字。' },
  chair:    { name: '小木椅', w: 74, h: 116, zone: 'floor', price: 40, comfort: 3, line: '坐、坐上去了。' },
  wardrobe: { name: '旧木衣柜', w: 150, h: 232, zone: 'floor', price: 240, comfort: 6, surf: { y: 2, x0: 14, x1: 136 }, line: '衣服……只有一件。\n现在有地方放了。' },
  monstera: { name: '大叶子盆栽', w: 96, h: 156, zone: 'floor', price: 200, comfort: 6, line: '叶子比我的耳朵还大。' },
  shelf:    { name: '墙上小架子', w: 170, h: 46, zone: 'wall', price: 45, comfort: 3, surf: { y: 16, x0: 8, x1: 162 }, line: '可以放小东西。' },
  frame:    { name: '挂画：主人和我', w: 84, h: 100, zone: 'wall', price: 180, comfort: 7, line: '画的是……主人，\n和兔子时候的我。' },
  clock:    { name: '兔耳挂钟', w: 74, h: 92, zone: 'wall', price: 200, comfort: 4, line: '滴答滴答。\n……耳朵跟着动。' },
  lights:   { name: '星星串灯', w: 280, h: 46, zone: 'wall', price: 220, comfort: 7, line: '一闪一闪的。' },
  plush:    { name: '兔子玩偶', w: 56, h: 64, zone: 'small', price: 50, comfort: 6, soft: true, line: '……和我长得有点像。' },
  pillow:   { name: '青苹果抱枕', w: 60, h: 50, zone: 'small', price: 30, comfort: 5, soft: true, line: '抱着睡。' },
  lamp:     { name: '蘑菇台灯', w: 52, h: 70, zone: 'small', price: 50, comfort: 5, line: '晚上，这里会亮。' },
  clover:   { name: '三叶草小盆', w: 50, h: 58, zone: 'small', price: 20, comfort: 3, line: '……要每天浇水。' },
};


// inside a wardrobe: dark back, a rail, her clothes on hangers (apron, polka blouse, dark skirt) and a hat on the shelf
function closetInside(p, x0, y0, x1, y1) {
  p.wash(S.rect(x0, y0, x1 - x0, y1 - y0), { color: '#8a7663', edge: 0, off: 0 });
  p.wash(S.rect(x0, y0, x1 - x0, 18), { color: '#6f5e4f', edge: 0, off: 0, alpha: .6 });
  p.draw(S.rect(x0 + 2, y0 + 22, x1 - x0 - 4, 5, 2), { fill: '#d9dcd8', w: 1 });
  const w = (x1 - x0) / 3.2;
  const hang = (cx, draw) => { p.ink([[cx, y0 + 24], [cx, y0 + 32]], { w: 1.2, color: '#e9e2d4' }); p.ink([[cx - w * .45, y0 + 40], [cx, y0 + 32], [cx + w * .45, y0 + 40]], { w: 1.4, color: '#e9e2d4' }); draw(cx); };
  hang(x0 + w * .7, cx => { p.draw(S.curve([[cx - w * .42, y0 + 40], [cx + w * .42, y0 + 40], [cx + w * .48, y0 + 110], [cx - w * .48, y0 + 110]], true, 5), { fill: '#fdfbf6', w: 1.2 }); for (let i = 0; i < 6; i++) p.dot(cx + p.rand(-w * .35, w * .35), y0 + p.rand(48, 104), 1.8, C.dot); });
  hang(x0 + w * 1.6, cx => { p.draw(S.curve([[cx - w * .38, y0 + 40], [cx + w * .38, y0 + 40], [cx + w * .44, y0 + 96], [cx - w * .44, y0 + 96]], true, 5), { fill: '#fdfbf6', w: 1.2 }); p.draw(S.ell(cx, y0 + 70, w * .2, w * .18), { fill: C.apple, w: .9 }); p.draw(S.scallops(cx - w * .44, cx + w * .44, y0 + 96, 8), { fill: '#fdfbf6', w: .9 }); });
  hang(x0 + w * 2.5, cx => { p.draw(S.curve([[cx - w * .3, y0 + 40], [cx + w * .3, y0 + 40], [cx + w * .52, y0 + 120], [cx - w * .52, y0 + 120]], true, 5), { fill: '#4b4e48', w: 1.2 }); p.draw(S.scallops(cx - w * .52, cx + w * .52, y0 + 120, 8), { fill: '#fdfbf6', w: .9 }); });
}

const drawers = {
  basket(p) {
    p.wash(S.ell(60, 58, 58, 6), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    p.draw(S.ell(60, 40, 56, 20), { fill: '#d9b98a', w: 1.8 });
    p.draw(S.ell(60, 26, 50, 14, Math.PI, Math.PI * 2).concat([[10, 26]]), { fill: C.white, w: 1.5 });
    for (let i = 0; i < 8; i++) p.dot(p.rand(20, 100), p.rand(16, 28), 2, C.dot);
    for (let x = 12; x < 110; x += 10) p.ink([[x, 40], [x + 3, 58]], { w: .9, color: '#b8956a' });
  },
  bed(p) {
    p.wash(S.ell(135, 146, 132, 6), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    for (const x of [16, 254]) p.draw(S.rect(x - 5, 126, 10, 22, 2), { fill: WOOD_D, w: 1.3 });
    // headboard with an apple cut-out
    p.draw(S.curve([[4, 140], [4, 30], [10, 16], [26, 10], [42, 16], [48, 30], [48, 140]], false).concat([[4, 140]]), { fill: WOOD_L, w: 1.8 });
    p.draw(S.ell(26, 50, 12, 11), { fill: C.apple, w: 1.3 }); p.ink([[26, 39], [28, 33]], { w: 1.2 });
    // mattress + frame
    p.draw(S.rect(40, 84, 222, 44, 6), { fill: WOOD, w: 1.8 });
    p.draw(S.rect(42, 66, 216, 26, 10), { fill: '#fbf8f0', w: 1.5 });
    // pillow
    p.draw(S.curve([[50, 72], [54, 54], [86, 50], [104, 58], [100, 76], [60, 80]], true, 6), { fill: C.white, w: 1.5 });
    // green-apple polka duvet hanging over the side
    p.draw(S.curve([[110, 60], [196, 56], [262, 62], [266, 110], [258, 124], [200, 120], [140, 124], [112, 118]], true, 6), { fill: C.appleL, w: 1.7 });
    for (let i = 0; i < 14; i++) p.dot(p.rand(122, 254), p.rand(66, 116), 3, C.apple);
    p.ink(S.curve([[116, 68], [190, 64], [258, 70]]), { w: 1, color: C.soft });
    // footboard
    p.draw(S.rect(250, 52, 16, 92, 4), { fill: WOOD_L, w: 1.6 });
  },
  rug(p) {
    p.draw(S.ell(115, 24, 110, 18), { fill: '#fbf6ea', w: 1.6 });
    p.ink(S.ell(115, 24, 96, 13), { w: 1, closed: true, color: C.pinkD });
    for (let i = 0; i < 16; i++) p.dot(115 + p.rand(-84, 84), 24 + p.rand(-9, 9), 2.6, C.apple);
    for (let x = 14; x < 220; x += 9) { const d = Math.abs(x - 115) / 110; p.ink([[x, 40 - d * 8], [x, 44 - d * 8]], { w: .9, color: C.soft }); }
  },
  desk(p) {
    p.wash(S.ell(88, 108, 84, 5), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    p.draw(S.rect(0, 2, 176, 14, 4), { fill: WOOD_L, w: 1.8 });
    p.draw(S.rect(10, 16, 10, 92, 2), { fill: WOOD_D, w: 1.4 }); p.draw(S.rect(156, 16, 10, 92, 2), { fill: WOOD_D, w: 1.4 });
    p.draw(S.rect(96, 16, 60, 34, 3), { fill: WOOD, w: 1.5 });
    p.dot(126, 33, 3, C.gold, { line: C.line, w: .8 });
    p.ink([[20, 80], [156, 80]], { w: 1.4, color: WOOD_D });
  },
  chair(p) {
    p.wash(S.ell(37, 112, 32, 4), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    p.draw(S.rect(6, 2, 10, 110, 3), { fill: WOOD_D, w: 1.4 });
    p.draw(S.rect(6, 4, 36, 34, 6), { fill: WOOD_L, w: 1.4 });
    p.draw(S.ell(24, 21, 7, 6), { fill: C.pink, w: 1 });
    p.draw(S.rect(6, 60, 62, 10, 3), { fill: WOOD_L, w: 1.6 });
    p.draw(S.rect(58, 68, 8, 44, 2), { fill: WOOD_D, w: 1.3 });
    p.draw(S.rect(10, 52, 52, 10, 5), { fill: C.mist, w: 1.2 });
  },
  wardrobe(p, st) {
    p.wash(S.ell(75, 228, 70, 5), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    p.draw(S.rect(4, 2, 142, 14, 4), { fill: WOOD_D, w: 1.6 });
    p.draw(S.rect(10, 14, 130, 202, 4), { fill: WOOD_L, w: 1.8 });
    if (st.open) {
      closetInside(p, 24, 22, 126, 204);
      p.draw([[10, 18], [24, 26], [24, 200], [10, 210]], { fill: WOOD, w: 1.3 }); p.draw([[140, 18], [126, 26], [126, 200], [140, 210]], { fill: WOOD, w: 1.3 });
      p.dot(20, 112, 2.4, C.gold, { line: C.line, w: .6 }); p.dot(130, 112, 2.4, C.gold, { line: C.line, w: .6 });
    } else {
      p.ink([[75, 20], [75, 210]], { w: 1.5 });
      for (const x of [16, 81]) { p.draw(S.rect(x, 26, 52, 170, 6), { fill: WOOD, w: 1.2 }); p.ink(S.rect(x + 8, 36, 36, 150, 6), { w: .9, closed: true, color: WOOD_D }); }
      p.dot(68, 112, 3, C.gold, { line: C.line, w: .8 }); p.dot(82, 112, 3, C.gold, { line: C.line, w: .8 });
    }
    p.draw(S.rect(16, 216, 10, 14, 2), { fill: WOOD_D, w: 1.2 }); p.draw(S.rect(124, 216, 10, 14, 2), { fill: WOOD_D, w: 1.2 });
  },
  monstera(p) {
    p.wash(S.ell(48, 152, 34, 4), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    const leaf = (x, y, a, s) => { const pts = S.ell(0, 0, 22 * s, 32 * s); p.c.save(); p.c.translate(x, y); p.c.rotate(a); p.draw(pts, { fill: '#9cc56b', w: 1.3 }); p.ink([[0, -30 * s], [0, 30 * s]], { w: 1, color: '#7aa24f' }); p.c.restore(); };
    for (const [x0, y0, a] of [[48, 104, 0], [48, 104, -.5], [48, 104, .5]]) p.ink([[x0, y0], [x0 + Math.sin(a) * 40, y0 - 50]], { w: 1.6, color: '#7aa24f' });
    leaf(28, 48, -.6, 1); leaf(70, 46, .6, 1); leaf(48, 32, 0, 1.05); leaf(24, 82, -1, .8); leaf(74, 80, 1, .8);
    p.draw([[18, 154], [12, 108], [84, 108], [78, 154]], { fill: '#e9b9a4', w: 1.7 });
    p.draw(S.rect(10, 102, 76, 12, 3), { fill: '#e2ab95', w: 1.4 });
  },
  shelf(p) {
    p.draw(S.rect(0, 16, 170, 12, 3), { fill: WOOD_L, w: 1.6 });
    p.draw([[18, 28], [18, 44], [34, 28]], { fill: WOOD_D, w: 1.2 }); p.draw([[152, 28], [152, 44], [136, 28]], { fill: WOOD_D, w: 1.2 });
  },
  frame(p) {
    p.ink([[42, 2], [14, 22]], { w: 1 }); p.ink([[42, 2], [70, 22]], { w: 1 }); p.dot(42, 3, 2.5, C.gold, { line: C.line, w: .7 });
    p.draw(S.rect(6, 20, 72, 78, 4), { fill: WOOD_D, w: 1.6 });
    p.wash(S.rect(14, 28, 56, 62, 2), { color: '#fbe6ea' });
    p.wash(S.curve([[14, 74], [40, 66], [70, 72], [70, 90], [14, 90]], true, 5), { color: '#d9ebbf', edge: 0 });
    p.draw(S.ell(30, 76, 9, 8), { fill: C.white, w: 1 }); p.draw(S.ell(27, 63, 3, 7), { fill: C.white, w: .9 }); p.draw(S.ell(33, 63, 3, 7), { fill: C.white, w: .9 });
    p.draw(S.ell(54, 48, 7, 7), { fill: '#f1d9c3', w: 1 }); p.draw([[46, 86], [48, 56], [60, 56], [62, 86]], { fill: C.apple, w: 1 });
    p.ink([[40, 72], [48, 66]], { w: 1 });
  },
  clock(p) {
    p.draw(S.ell(24, 20, 9, 18, 0, 6.29, -.2), { fill: C.white, w: 1.4 }); p.draw(S.ell(50, 20, 9, 18, 0, 6.29, .2), { fill: C.white, w: 1.4 });
    p.wash(S.ell(24, 22, 4, 11, 0, 6.29, -.2), { color: C.pink, edge: 0 }); p.wash(S.ell(50, 22, 4, 11, 0, 6.29, .2), { color: C.pink, edge: 0 });
    p.draw(S.ell(37, 58, 32, 32), { fill: C.appleL, w: 1.8 });
    p.draw(S.ell(37, 58, 24, 24), { fill: '#fffdf6', w: 1.2 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.dot(37 + Math.cos(a) * 19, 58 + Math.sin(a) * 19, 1.2, C.line); }
    const now = new Date(), mA = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2, hA = ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    p.ink([[37, 58], [37 + Math.cos(hA) * 11, 58 + Math.sin(hA) * 11]], { w: 2, taper: false }); p.ink([[37, 58], [37 + Math.cos(mA) * 17, 58 + Math.sin(mA) * 17]], { w: 1.4, taper: false });
    p.dot(37, 58, 2, C.pinkD);
  },
  lights(p) {
    const pts = S.curve([[4, 6], [70, 26], [140, 32], [210, 26], [276, 6]]);
    p.ink(pts, { w: 1.2, color: C.soft });
    for (let i = 1; i < 10; i++) { const [x, y] = pts[Math.floor(i / 10 * (pts.length - 1))]; const col = ['#ffe9a8', C.pink, C.appleL][i % 3];
      p.wash(S.ell(x, y + 9, 11, 11), { color: col, alpha: .4, edge: 0, off: 0 });
      const st = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 3 : 7; st.push([x + Math.cos(a) * r, y + 9 + Math.sin(a) * r]); }
      p.draw(st, { fill: col, w: 1 }); }
  },
  plush(p) {
    p.wash(S.ell(28, 62, 22, 3), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
    p.draw(S.ell(20, 14, 6, 14, 0, 6.29, -.2), { fill: '#fbf8f0', w: 1.3 }); p.draw(S.ell(36, 14, 6, 14, 0, 6.29, .2), { fill: '#fbf8f0', w: 1.3 });
    p.wash(S.ell(20, 16, 2.5, 9, 0, 6.29, -.2), { color: C.pink, edge: 0 }); p.wash(S.ell(36, 16, 2.5, 9, 0, 6.29, .2), { color: C.pink, edge: 0 });
    p.draw(S.ell(28, 48, 20, 15), { fill: '#fbf8f0', w: 1.4 });
    p.draw(S.ell(28, 32, 15, 13), { fill: '#fbf8f0', w: 1.4 });
    p.dot(23, 31, 1.6, C.line); p.dot(33, 31, 1.6, C.line);
    p.ink([[26, 37], [30, 40]], { w: 1 }); p.ink([[30, 37], [26, 40]], { w: 1 });
    p.draw([[28, 44], [18, 40], [18, 49]], { fill: C.apple, w: 1 }); p.draw([[28, 44], [38, 40], [38, 49]], { fill: C.apple, w: 1 });
  },
  pillow(p) {
    p.draw(S.curve([[30, 12], [48, 6], [58, 22], [52, 42], [30, 48], [8, 42], [2, 22], [12, 6]], true, 6), { fill: '#c3dd7c', w: 1.5 });
    p.ink([[30, 12], [32, 4]], { w: 1.4 }); p.draw(S.ell(40, 6, 7, 3, 0, 6.29, -.4), { fill: '#86b04b', w: 1 });
    p.dot(24, 26, 1.4, C.line); p.dot(36, 26, 1.4, C.line);
    p.wash(S.ell(16, 20, 3, 7, 0, 6.29, .4), { color: '#ffffff', edge: 0, alpha: .7 });
  },
  lamp(p) {
    p.draw(S.rect(16, 62, 20, 6, 2), { fill: WOOD_D, w: 1.2 });
    p.draw(S.rect(22, 30, 8, 34, 3), { fill: '#fbf6ea', w: 1.3 });
    p.wash(S.ell(26, 30, 30, 22), { color: '#fff1bf', alpha: .45, edge: 0, off: 0 });
    p.draw(S.ell(26, 30, 24, 22, Math.PI, Math.PI * 2).concat([[2, 30]]), { fill: '#f4cad3', w: 1.5 });
    for (const [x, y] of [[16, 20], [30, 14], [38, 24]]) p.dot(x, y, 3, C.white);
  },
  clover(p) {
    for (const [x, y] of [[18, 20], [28, 12], [36, 22], [26, 26]]) { for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 - Math.PI / 2; p.draw(S.ell(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 4.5, 4), { fill: C.apple, w: 1 }); } }
    p.draw([[12, 56], [8, 32], [42, 32], [38, 56]], { fill: '#e9b9a4', w: 1.5 });
    p.draw(S.rect(6, 30, 38, 7, 2), { fill: '#e2ab95', w: 1.2 });
  },
};
/* ---------------- more furniture: 2–3 per category, cheap → fancy ---------------- */
const CAT = { bed: '床', wardrobe: '衣柜', table: '桌子', seat: '椅凳', sofa: '沙发', plant: '盆栽和花', wallart: '挂画', light: '灯', rug: '地毯', deco: '墙饰和摆件' };
Object.assign(ITEMS.basket, { cat: 'bed' }); Object.assign(ITEMS.bed, { cat: 'bed' }); Object.assign(ITEMS.wardrobe, { cat: 'wardrobe' });
Object.assign(ITEMS.desk, { cat: 'table' }); Object.assign(ITEMS.chair, { cat: 'seat' }); Object.assign(ITEMS.monstera, { cat: 'plant' }); Object.assign(ITEMS.clover, { cat: 'plant' });
Object.assign(ITEMS.frame, { cat: 'wallart' }); Object.assign(ITEMS.lights, { cat: 'light' }); Object.assign(ITEMS.lamp, { cat: 'light' }); Object.assign(ITEMS.rug, { cat: 'rug' });
Object.assign(ITEMS.shelf, { cat: 'deco' }); Object.assign(ITEMS.clock, { cat: 'deco' }); Object.assign(ITEMS.plush, { cat: 'deco' }); Object.assign(ITEMS.pillow, { cat: 'deco' });
Object.assign(ITEMS, {
  mat:        { cat: 'bed', name: '稻草小床垫', w: 220, h: 62, zone: 'floor', price: 40, comfort: 10, soft: true, surf: { y: 26, x0: 24, x1: 196 }, line: '……比篮子大一点。' },
  canopy:     { cat: 'bed', name: '云朵四柱床', w: 290, h: 252, zone: 'floor', price: 1600, comfort: 40, soft: true, surf: { y: 168, x0: 50, x1: 250 }, limit: 1, line: '……像睡在云里面。\n（耳朵都放松了）' },
  rack:       { cat: 'wardrobe', name: '小挂衣架', w: 84, h: 194, zone: 'floor', price: 45, comfort: 3, line: '围裙，挂在这里。' },
  fancyward:  { cat: 'wardrobe', name: '雕花兔耳衣柜', w: 172, h: 262, zone: 'floor', price: 1200, comfort: 14, surf: { y: 40, x0: 18, x1: 154 }, limit: 1, line: '镜子里……有一只兔子。\n啊，是我。' },
  crate:      { cat: 'table', name: '苹果箱小桌', w: 104, h: 74, zone: 'floor', price: 25, comfort: 2, surf: { y: 4, x0: 6, x1: 98 }, line: '以前装苹果的箱子。' },
  vanity:     { cat: 'table', name: '梳妆台', w: 184, h: 214, zone: 'floor', price: 1000, comfort: 12, surf: { y: 112, x0: 12, x1: 172 }, limit: 1, line: '……发箍，要戴正。' },
  stump:      { cat: 'seat', name: '树桩小凳', w: 64, h: 58, zone: 'floor', price: 15, comfort: 2, surf: { y: 6, x0: 10, x1: 54 }, line: '苹果园里捡来的。' },
  rocker:     { cat: 'seat', name: '藤编摇椅', w: 126, h: 152, zone: 'floor', price: 520, comfort: 12, line: '摇啊摇……\n要睡着了。' },
  cushions:   { cat: 'sofa', name: '软坐垫堆', w: 116, h: 58, zone: 'floor', price: 60, comfort: 6, soft: true, line: '一屁股坐下去。' },
  sofa:       { cat: 'sofa', name: '小布艺沙发', w: 206, h: 112, zone: 'floor', price: 320, comfort: 14, soft: true, surf: { y: 54, x0: 34, x1: 172 }, limit: 1, line: '可以请客人坐了。' },
  velvet:     { cat: 'sofa', name: '兔耳天鹅绒沙发', w: 246, h: 158, zone: 'floor', price: 1500, comfort: 26, soft: true, surf: { y: 92, x0: 40, x1: 206 }, limit: 1, line: '……软得陷进去了。\n像被耳朵抱住。' },
  tulip:      { cat: 'plant', name: '郁金香花盆', w: 52, h: 74, zone: 'small', price: 45, comfort: 4, line: '粉色的，像耳朵里面。' },
  hydrangea:  { cat: 'plant', name: '绣球花架', w: 116, h: 176, zone: 'floor', price: 600, comfort: 12, line: '蓝色的、粉色的……\n一团一团。' },
  doodle:     { cat: 'wallart', name: '手绘涂鸦', w: 72, h: 66, zone: 'wall', price: 20, comfort: 2, line: '是我画的……\n（是兔子。真的是兔子。）' },
  oil:        { cat: 'wallart', name: '金框油画·苹果园', w: 168, h: 128, zone: 'wall', price: 900, comfort: 14, line: '傍晚的苹果园。\n……我出生的地方。' },
  flowerlights: { cat: 'light', name: '花朵灯串', w: 300, h: 60, zone: 'wall', price: 360, comfort: 9, line: '每一朵，都会亮。' },
  floorlamp:  { cat: 'light', name: '流苏落地灯', w: 84, h: 222, zone: 'floor', price: 480, comfort: 9, line: '流苏，会跟着晃。' },
  strawrug:   { cat: 'rug', name: '草编圆地毯', w: 212, h: 46, zone: 'rug', price: 180, comfort: 6, line: '有太阳的味道。' },
  bunnyrug:   { cat: 'rug', name: '兔子绒毯', w: 266, h: 66, zone: 'rug', price: 950, comfort: 14, soft: true, line: '……是兔子的形状！' },
  wreath:     { cat: 'deco', name: '干花环', w: 92, h: 98, zone: 'wall', price: 200, comfort: 5, line: '花干了，也还是香的。' },
  musicbox:   { cat: 'deco', name: '旋转木马音乐盒', w: 66, h: 84, zone: 'small', price: 420, comfort: 8, line: '转起来了……\n（叮叮咚咚）' },
});

const PINK_V = '#f2b3c4', MINT = '#d7ead6', GOLDL = '#efd28c';
const shadow = (p, cx, y, rx) => p.wash(S.ell(cx, y, rx, 5), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
const star5 = (x, y, r) => { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return pts; };
const flower = (p, x, y, r, col, center = '#f5dc86') => { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; p.draw(S.ell(x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7, r * .55, r * .5, 0, 6.29, a), { fill: col, w: .9, blooms: 0, edge: .1 }); } p.dot(x, y, r * .35, center, { line: C.line, w: .6 }); };

Object.assign(drawers, {
  mat(p) {
    shadow(p, 110, 58, 106);
    p.draw(S.rect(6, 28, 208, 32, 10), { fill: '#eedcab', w: 1.7 });
    for (let x = 18; x < 206; x += 12) p.ink([[x, 32], [x + 2, 56]], { w: .8, color: '#c9ad73' });
    p.ink([[10, 44], [210, 44]], { w: .8, color: '#c9ad73' });
    p.draw(S.curve([[22, 32], [26, 16], [56, 12], [74, 20], [70, 34]], true, 6), { fill: C.white, w: 1.4 });
    p.draw(S.curve([[84, 30], [150, 24], [208, 30], [210, 50], [150, 54], [86, 50]], true, 6), { fill: C.mist, w: 1.4 });
    for (let i = 0; i < 9; i++) p.dot(p.rand(96, 200), p.rand(32, 48), 2.2, '#fbfaf3');
  },
  canopy(p) {
    shadow(p, 145, 248, 140);
    // back posts
    for (const x of [36, 254]) p.draw(S.rect(x - 4, 22, 8, 170, 3), { fill: '#e8d3b1', w: 1.2 });
    // cloud headboard
    p.draw(S.curve([[30, 190], [24, 120], [40, 96], [66, 100], [80, 80], [112, 84], [124, 104], [138, 96], [140, 190]], true, 8), { fill: '#dbe9f5', w: 1.7 });
    for (const [x, y] of [[60, 120], [96, 108], [118, 132], [52, 158]]) p.dot(x, y, 3, '#fbfaf3');
    // canopy frame + sheer polka drapes tied at the posts
    p.draw(S.rect(16, 12, 258, 14, 4), { fill: '#efe0c4', w: 1.6 });
    p.draw(S.scallops(18, 272, 26, 22), { fill: '#fdfbf6', w: 1.2 });
    for (let x = 30; x < 270; x += 22) p.dot(x, 30, 1.8, C.dot);
    // mattress, patchwork quilt, pillows
    p.draw(S.rect(30, 186, 236, 40, 6), { fill: '#efe0c4', w: 1.8 });
    p.draw(S.rect(34, 166, 230, 26, 12), { fill: '#fbf8f0', w: 1.5 });
    p.draw(S.curve([[46, 172], [52, 152], [84, 148], [100, 158], [96, 176], [56, 180]], true, 6), { fill: C.white, w: 1.4 });
    p.draw(S.curve([[84, 168], [56, 158], [52, 176], [78, 182]], true, 5), { fill: C.pink, w: 1.1 });
    const q = [[112, 162], [270, 160], [276, 214], [266, 230], [112, 228]];
    p.draw(q, { fill: C.appleL, w: 1.7 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const cols = [C.appleL, '#fbe6ea', '#e4eef8', '#fdf3d0']; p.wash(S.rect(116 + c * 38, 166 + r * 20, 36, 18, 2), { color: cols[(r + c) % 4], edge: .2 }); }
    for (let x = 116; x < 272; x += 9) p.ink([[x, 226], [x + 3, 232]], { w: .8, color: C.soft });
    // front posts with bunny-ear finials + footboard with an apple
    for (const x of [22, 268]) { p.draw(S.rect(x - 6, 30, 12, 218, 4), { fill: '#e8d3b1', w: 1.6 }); p.draw(S.ell(x - 4, 22, 3, 8, 0, 6.29, -.2), { fill: '#fdfbf6', w: 1 }); p.draw(S.ell(x + 4, 22, 3, 8, 0, 6.29, .2), { fill: '#fdfbf6', w: 1 }); }
    p.draw(S.curve([[236, 246], [236, 196], [252, 186], [270, 196], [270, 246]], false).concat([[236, 246]]), { fill: '#efe0c4', w: 1.5 });
    p.draw(S.ell(253, 214, 9, 8), { fill: C.apple, w: 1.1 }); p.ink([[253, 206], [255, 201]], { w: 1 });
    for (const side of [0, 1]) {
      const X = x => side ? 290 - x : x;
      p.draw(S.curve([[X(8), 26], [X(40), 26], [X(30), 90], [X(24), 120], [X(32), 150], [X(28), 238], [X(6), 240], [X(10), 140]], true, 7), { fill: '#fffdf8', fillAlpha: .95, w: 1.4 });
      p.ink(S.curve([[X(22), 30], [X(24), 80], [X(22), 118]]), { w: .8, color: C.soft }); p.ink(S.curve([[X(20), 124], [X(18), 180], [X(16), 234]]), { w: .8, color: C.soft });
      p.draw(S.ell(X(24), 122, 11, 6), { fill: C.pink, w: 1.1 });
      for (const [x, y] of [[18, 60], [30, 46], [18, 170], [22, 210]]) p.dot(X(x), y, 2, C.dot);
    }
  },
  rack(p) {
    shadow(p, 42, 190, 30);
    p.draw([[18, 192], [42, 172], [66, 192]], { fill: '#d6b98c', w: 1.4 });
    p.draw(S.rect(38, 16, 8, 170, 3), { fill: '#d6b98c', w: 1.5 });
    p.draw(S.ell(42, 14, 8, 6), { fill: '#c9a77c', w: 1.2 });
    for (const [x, d] of [[34, -1], [50, 1]]) p.ink([[x, 30], [x + d * 12, 24]], { w: 2.4, color: '#c9a77c' });
    // a spare white apron with the green bunny
    p.draw(S.curve([[28, 30], [56, 30], [64, 72], [60, 112], [24, 112], [20, 72]], true, 6), { fill: '#fdfbf6', w: 1.4 });
    p.draw(S.scallops(22, 62, 112, 10), { fill: '#fdfbf6', w: 1 });
    p.draw(S.ell(42, 82, 9, 8), { fill: C.apple, w: 1 }); p.draw(S.ell(38, 72, 2.5, 6), { fill: C.apple, w: .8 }); p.draw(S.ell(46, 72, 2.5, 6), { fill: C.apple, w: .8 });
    // straw hat on the top hook
    p.draw(S.ell(60, 28, 16, 5), { fill: '#efd79a', w: 1.1 }); p.draw(S.ell(60, 24, 9, 7, Math.PI, Math.PI * 2).concat([[51, 25]]), { fill: '#efd79a', w: 1.1 });
  },
  fancyward(p, st) {
    shadow(p, 86, 258, 82);
    // crown with bunny ears
    p.draw(S.ell(60, 26, 9, 24, 0, 6.29, -.15), { fill: MINT, w: 1.4 }); p.draw(S.ell(112, 26, 9, 24, 0, 6.29, .15), { fill: MINT, w: 1.4 });
    p.wash(S.ell(60, 28, 4, 15, 0, 6.29, -.15), { color: C.pink, edge: 0 }); p.wash(S.ell(112, 28, 4, 15, 0, 6.29, .15), { color: C.pink, edge: 0 });
    p.draw(S.curve([[8, 52], [20, 38], [86, 30], [152, 38], [164, 52]], false).concat([[8, 52]]), { fill: '#e6f1e4', w: 1.6 });
    p.draw(S.rect(6, 46, 160, 12, 4), { fill: '#c9dcc2', w: 1.5 });
    // body + doors
    p.draw(S.rect(12, 56, 148, 174, 6), { fill: '#e6f1e4', w: 1.8 });
    if (st.open) {
      closetInside(p, 28, 62, 144, 184);
      p.draw([[12, 58], [28, 66], [28, 180], [12, 186]], { fill: '#f6efe2', w: 1.3 }); p.wash([[14, 70], [26, 74], [26, 170], [14, 174]], { color: '#e1eef6', edge: 0 });
      p.draw([[160, 58], [144, 66], [144, 180], [160, 186]], { fill: '#e6f1e4', w: 1.3 }); p.dot(152, 120, 2, '#fbe3e8');
    } else {
    p.ink([[86, 60], [86, 186]], { w: 1.4 });
    p.draw(S.ell(50, 120, 26, 46), { fill: '#f6efe2', w: 1.4 });           // oval mirror
    p.wash(S.ell(50, 120, 21, 41), { color: '#e1eef6', edge: .1 });
    p.ink([[40, 96], [52, 84]], { w: 1.6, color: '#ffffff' }); p.ink([[40, 108], [58, 90]], { w: 1.2, color: '#ffffff' });
    p.ink(S.rect(96, 70, 54, 106, 8), { w: 1, closed: true, color: '#b9cfb4' });
    flower(p, 123, 104, 9, '#fbe3e8'); flower(p, 112, 140, 7, '#e4eef8'); flower(p, 134, 150, 6, '#fdf3d0');
    p.ink(S.curve([[112, 140], [118, 124], [123, 104]]), { w: 1, color: '#93bb57' });
    p.dot(80, 128, 3.5, GOLDL, { line: C.line, w: .8 }); p.dot(92, 128, 3.5, GOLDL, { line: C.line, w: .8 });
    }
    for (const y of [188, 210]) { p.draw(S.rect(20, y, 132, 20, 4), { fill: '#dcebd8', w: 1.3 }); p.dot(86, y + 10, 3, GOLDL, { line: C.line, w: .7 }); }
    // curvy feet
    for (const x of [20, 152]) p.draw(S.curve([[x - 6, 230], [x + 6, 230], [x + 4, 246], [x + (x < 80 ? -6 : 6), 258], [x, 246]], true, 4), { fill: '#c9dcc2', w: 1.2 });
  },
  crate(p) {
    shadow(p, 52, 72, 50);
    p.draw(S.rect(6, 6, 92, 64, 3), { fill: '#d9b98a', w: 1.6 });
    for (const y of [26, 46]) p.ink([[8, y], [96, y]], { w: 1, color: '#b8956a' });
    p.ink([[52, 8], [52, 68]], { w: 1, color: '#b8956a' });
    p.draw(S.ell(30, 38, 9, 8), { fill: '#c3dd7c', w: 1, line: '#93bb57' });
    p.draw(S.curve([[2, 4], [52, -2], [102, 4], [100, 16], [86, 12], [70, 20], [52, 12], [34, 20], [18, 12], [4, 16]], true, 5), { fill: '#fbe6ea', w: 1.2 });
    for (let x = 12; x < 96; x += 14) p.dot(x, 6, 1.6, '#ffffff');
  },
  vanity(p) {
    shadow(p, 92, 210, 88);
    // ornate oval mirror
    p.draw(S.ell(92, 58, 50, 54), { fill: GOLDL, w: 1.7 });
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; p.dot(92 + Math.cos(a) * 47, 58 + Math.sin(a) * 51, 3, '#f5e2a8', { line: C.line, w: .5 }); }
    p.draw(S.ell(92, 58, 40, 44), { fill: '#e8f1f7', w: 1.3 });
    p.ink([[72, 40], [88, 22]], { w: 2, color: '#ffffff' }); p.ink([[74, 56], [96, 30]], { w: 1.4, color: '#ffffff' });
    p.draw(S.ell(92, 6, 9, 7), { fill: C.pink, w: 1.1 });
    p.draw(S.rect(84, 108, 16, 8, 2), { fill: '#efe0c4', w: 1 });
    // table top, drawers, cabriole legs
    p.draw(S.rect(4, 112, 176, 14, 5), { fill: '#fbf3e6', w: 1.7 });
    p.draw(S.curve([[10, 126], [174, 126], [170, 150], [92, 158], [14, 150]], true, 6), { fill: '#fbe6ea', w: 1.5 });
    p.draw(S.rect(26, 130, 50, 18, 3), { fill: '#fdf0f2', w: 1.1 }); p.draw(S.rect(108, 130, 50, 18, 3), { fill: '#fdf0f2', w: 1.1 });
    p.dot(51, 139, 2.5, GOLDL, { line: C.line, w: .6 }); p.dot(133, 139, 2.5, GOLDL, { line: C.line, w: .6 });
    for (const [x, d] of [[22, -1], [162, 1]]) p.ink(S.curve([[x, 152], [x - d * 6, 176], [x + d * 2, 196], [x - d * 4, 210]]), { w: 4.2, color: '#e9d8bd' });
    for (const [x, d] of [[22, -1], [162, 1]]) p.ink(S.curve([[x, 152], [x - d * 6, 176], [x + d * 2, 196], [x - d * 4, 210]]), { w: 1, color: C.line });
    // little perfume bottle + comb on top
    p.draw(S.ell(156, 104, 8, 9), { fill: '#e4eef8', w: 1.1 }); p.draw(S.rect(152, 90, 8, 7, 2), { fill: C.pink, w: .9 });
    p.draw(S.rect(22, 104, 30, 8, 3), { fill: '#efd28c', w: 1 });
  },
  stump(p) {
    shadow(p, 32, 56, 30);
    p.draw(S.curve([[6, 56], [8, 14], [56, 14], [58, 56]], false).concat([[6, 56]]), { fill: '#c9a07a', w: 1.6 });
    for (const x of [16, 30, 44]) p.ink([[x, 22], [x + 1, 54]], { w: .9, color: '#a88160' });
    p.draw(S.ell(32, 14, 26, 9), { fill: '#efd8b4', w: 1.5 });
    p.ink(S.ell(32, 14, 17, 5.5), { w: .9, closed: true, color: '#c9a07a' }); p.ink(S.ell(32, 14, 8, 2.6), { w: .9, closed: true, color: '#c9a07a' });
    p.draw(S.ell(52, 46, 7, 4, Math.PI, Math.PI * 2).concat([[45, 46]]), { fill: '#e7849c', w: 1 }); p.draw(S.rect(50, 46, 4, 8, 1), { fill: '#fbf6ea', w: .8 });
  },
  rocker(p) {
    shadow(p, 63, 150, 56);
    p.ink(S.curve([[4, 140], [30, 150], [96, 150], [124, 136]]), { w: 4, color: '#d9b98a' }); p.ink(S.curve([[4, 140], [30, 150], [96, 150], [124, 136]]), { w: 1, color: C.line });
    for (const x of [26, 98]) p.ink([[x, 146], [x, 92]], { w: 3.4, color: '#d9b98a' });
    // woven fan back
    p.draw(S.curve([[22, 96], [12, 52], [26, 14], [63, 4], [100, 14], [114, 52], [104, 96]], false).concat([[22, 96]]), { fill: '#ead3a2', w: 1.7 });
    for (let k = 0; k < 9; k++) { const a = Math.PI * (1.1 + k * .1); p.ink([[63, 92], [63 + Math.cos(a) * 52, 92 + Math.sin(a) * 84]], { w: .8, color: '#c9ad73' }); }
    for (const r of [24, 46, 68]) p.ink(S.ell(63, 92, r * .78, r * 1.1, Math.PI * 1.12, Math.PI * 1.88), { w: .8, closed: false, color: '#c9ad73' });
    // seat, cushion, knitted throw
    p.draw(S.rect(16, 92, 96, 14, 5), { fill: '#e2c48c', w: 1.5 });
    p.draw(S.curve([[22, 92], [30, 80], [96, 80], [104, 92]], false).concat([[22, 92]]), { fill: C.pink, w: 1.3 });
    p.draw(S.curve([[66, 86], [102, 84], [108, 120], [92, 128], [76, 118]], true, 6), { fill: C.appleL, w: 1.2 });
    for (let y = 92; y < 122; y += 6) p.ink([[78, y], [100, y + 2]], { w: .7, color: '#b7c895' });
    for (const x of [24, 104]) p.ink([[x, 88], [x - (x < 60 ? 6 : -6), 66]], { w: 3, color: '#d9b98a' });
  },
  cushions(p) {
    shadow(p, 58, 56, 56);
    const pouf = (cx, top, rx, ry, hgt, col) => {
      p.draw(S.ell(cx, top + hgt, rx, ry, 0, Math.PI).concat(S.ell(cx, top, rx, ry, Math.PI, 0)), { fill: col, w: 1.5 });
      p.draw(S.ell(cx, top, rx, ry), { fill: col, w: 1.3 });
      p.ink(S.ell(cx, top + hgt * .5, rx, ry, .1, Math.PI - .1), { w: .8, closed: false, color: C.soft });
      p.dot(cx, top, 2.4, '#ffffff', { line: C.soft, w: .6 });
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; p.ink([[cx, top], [cx + Math.cos(a) * rx * .7, top + Math.sin(a) * ry * .7]], { w: .6, color: C.soft }); }
    };
    pouf(36, 30, 30, 9, 22, '#e4eef8');
    pouf(82, 36, 28, 8, 18, C.pink);
    pouf(58, 14, 22, 7, 14, C.appleL);
  },
  sofa(p) {
    shadow(p, 103, 108, 98);
    for (const x of [26, 180]) p.draw([[x - 5, 96], [x + 5, 96], [x + 3, 110], [x - 3, 110]], { fill: '#c9a77c', w: 1.2 });
    p.draw(S.rect(22, 10, 162, 52, 16), { fill: '#cfe3cf', w: 1.7 });              // back
    p.draw(S.rect(16, 56, 174, 40, 10), { fill: '#d9ead8', w: 1.7 });              // seat
    p.ink([[103, 58], [103, 92]], { w: 1, color: '#a9c4a8' });
    for (const x of [6, 168]) p.draw(S.rect(x, 36, 32, 62, 14), { fill: '#cfe3cf', w: 1.6 });   // arms
    p.draw(S.curve([[42, 54], [46, 30], [76, 28], [82, 52]], true, 6), { fill: C.white, w: 1.3 });
    p.draw(S.curve([[124, 54], [128, 30], [158, 28], [164, 52]], true, 6), { fill: C.pink, w: 1.3 });
    for (let i = 0; i < 6; i++) p.dot(p.rand(130, 158), p.rand(34, 50), 1.6, '#ffffff');
  },
  velvet(p) {
    shadow(p, 123, 154, 118);
    for (const x of [30, 216]) p.draw(S.curve([[x - 6, 140], [x + 6, 140], [x + 3, 152], [x - 3, 152]], true, 3), { fill: GOLDL, w: 1.1 });
    // tall back with bunny ears at both ends
    p.draw(S.ell(34, 34, 14, 34, 0, 6.29, -.18), { fill: PINK_V, w: 1.6 }); p.draw(S.ell(212, 34, 14, 34, 0, 6.29, .18), { fill: PINK_V, w: 1.6 });
    p.wash(S.ell(34, 36, 6, 22, 0, 6.29, -.18), { color: '#fbe6ea', edge: 0 }); p.wash(S.ell(212, 36, 6, 22, 0, 6.29, .18), { color: '#fbe6ea', edge: 0 });
    p.draw(S.curve([[26, 104], [24, 60], [60, 40], [123, 36], [186, 40], [222, 60], [220, 104]], false).concat([[26, 104]]), { fill: PINK_V, w: 1.8 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = 66 + c * 28 + (r % 2) * 14, y = 60 + r * 20; p.dot(x, y, 2.2, '#e48aa3', { line: C.line, w: .5 }); p.ink([[x - 7, y - 6], [x, y]], { w: .6, color: '#e48aa3' }); p.ink([[x + 7, y - 6], [x, y]], { w: .6, color: '#e48aa3' }); }
    // seat with piping + rolled arms
    p.draw(S.rect(28, 96, 190, 42, 14), { fill: '#f5c2cf', w: 1.7 });
    p.ink([[123, 98], [123, 134]], { w: 1, color: '#e48aa3' });
    for (const x of [8, 206]) { p.draw(S.rect(x, 74, 34, 66, 16), { fill: PINK_V, w: 1.6 }); p.ink(S.ell(x + 17, 80, 12, 6), { w: 1, closed: true, color: '#e48aa3' }); }
    // cushions + a knit throw
    p.draw(S.curve([[56, 94], [62, 66], [96, 64], [104, 92]], true, 6), { fill: '#c3dd7c', w: 1.3 });
    p.draw(S.ell(82, 72, 3, 1.5), { fill: '#86b04b', w: .6 });
    p.draw(S.curve([[142, 94], [148, 68], [182, 66], [188, 92]], true, 6), { fill: '#fdf6ea', w: 1.3 });
    for (const [x, y] of [[156, 80], [172, 76], [164, 88]]) p.dot(x, y, 2, C.dot);
    p.draw(S.curve([[150, 98], [214, 96], [222, 140], [200, 148], [160, 132]], true, 6), { fill: '#e4eef8', w: 1.2 });
    for (let y = 104; y < 140; y += 6) p.ink([[162, y], [210, y + 3]], { w: .7, color: '#b9cde3' });
  },
  tulip(p) {
    for (const [x, d] of [[18, -1], [28, 0], [38, 1]]) p.ink(S.curve([[26, 50], [26 + d * 4, 34], [x, 20]]), { w: 1.4, color: '#7aa24f' });
    p.draw(S.ell(16, 40, 4, 10, 0, 6.29, -.5), { fill: '#a9cf7a', w: .9 }); p.draw(S.ell(38, 42, 4, 10, 0, 6.29, .5), { fill: '#a9cf7a', w: .9 });
    for (const [x, y, c] of [[18, 16, C.pink], [28, 10, '#e7a4b4'], [38, 16, '#fbe3e8']]) p.draw(S.curve([[x - 7, y + 8], [x - 8, y - 2], [x - 4, y - 8], [x, y - 3], [x + 4, y - 8], [x + 8, y - 2], [x + 7, y + 8]], true, 5), { fill: c, w: 1.1 });
    p.draw([[10, 72], [7, 50], [45, 50], [42, 72]], { fill: '#e4eef8', w: 1.4 });
    for (let i = 0; i < 4; i++) p.dot(14 + i * 8, 60, 1.8, '#ffffff');
  },
  hydrangea(p) {
    shadow(p, 58, 172, 50);
    // tiered stand
    p.draw(S.rect(10, 92, 96, 8, 2), { fill: '#e8d3b1', w: 1.3 }); p.draw(S.rect(4, 136, 108, 8, 2), { fill: '#e8d3b1', w: 1.3 });
    for (const [x0, x1] of [[16, 8], [100, 108]]) p.ink([[x0, 54], [x1, 172]], { w: 3, color: '#d6b98c' });
    p.ink([[58, 54], [58, 172]], { w: 2.6, color: '#d6b98c' });
    const bush = (cx, cy, r, col) => { for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; flower(p, cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .4, r * .32, col, '#ffffff'); } flower(p, cx, cy, r * .34, col, '#ffffff'); };
    const pot = (x, y, w) => p.draw([[x - w / 2, y], [x - w / 2 - 3, y - 18], [x + w / 2 + 3, y - 18], [x + w / 2, y]], { fill: '#fbf6ea', w: 1.2 });
    pot(58, 92, 34); bush(58, 56, 30, '#c9dcf2');
    pot(30, 136, 30); bush(30, 104, 24, PINK_V);
    pot(86, 136, 30); bush(86, 104, 24, '#d9cdf0');
    for (const [x, y] of [[22, 140], [94, 140], [60, 96]]) p.ink(S.curve([[x, y], [x + 4, y + 16], [x - 2, y + 30]]), { w: 1.1, color: '#93bb57' });
    for (const [x, y] of [[26, 150], [96, 154], [58, 110]]) p.draw(S.ell(x, y, 4, 3), { fill: '#a9cf7a', w: .8 });
  },
  doodle(p) {
    p.c.save(); p.c.translate(36, 34); p.c.rotate(-.06); p.c.translate(-36, -34);
    p.draw(S.rect(6, 8, 60, 52, 1), { fill: '#fffdf6', w: 1.2 });
    p.ink(S.ell(34, 42, 12, 10), { w: 1.6, closed: true, color: '#9fc56b' });
    p.ink(S.ell(28, 24, 3, 8), { w: 1.4, closed: true, color: '#9fc56b' }); p.ink(S.ell(40, 24, 3, 8), { w: 1.4, closed: true, color: '#9fc56b' });
    p.dot(30, 40, 1.3, '#7a6c66'); p.dot(38, 40, 1.3, '#7a6c66');
    p.ink([[48, 50], [58, 48]], { w: 1.4, color: '#e7849c' }); p.ink(S.ell(54, 18, 5, 5), { w: 1.2, closed: true, color: '#f2c76a' });
    p.wash(S.rect(26, 2, 20, 10), { color: '#f4cad3', alpha: .85, edge: 0 });
    p.c.restore();
  },
  oil(p) {
    p.ink([[84, 0], [30, 18]], { w: 1 }); p.ink([[84, 0], [138, 18]], { w: 1 });
    p.draw(S.rect(4, 14, 160, 112, 6), { fill: GOLDL, w: 1.8 });
    for (let x = 12; x < 160; x += 12) { p.dot(x, 18, 2.4, '#f5e2a8', { line: C.line, w: .5 }); p.dot(x, 122, 2.4, '#f5e2a8', { line: C.line, w: .5 }); }
    for (let y = 26; y < 118; y += 12) { p.dot(8, y, 2.4, '#f5e2a8', { line: C.line, w: .5 }); p.dot(160, y, 2.4, '#f5e2a8', { line: C.line, w: .5 }); }
    p.draw(S.rect(16, 26, 136, 88, 2), { fill: '#f7d6b0', w: 1.2 });
    p.wash(S.rect(16, 26, 136, 40), { color: '#f3b9a8', edge: 0, alpha: .7 });
    p.wash(S.ell(110, 64, 14, 14), { color: '#fbe7a6', edge: 0 });
    p.wash(S.curve([[16, 76], [60, 64], [110, 72], [152, 66], [152, 114], [16, 114]], true, 6), { color: '#b7cf8a', edge: 0 });
    for (let i = 0; i < 7; i++) { const x = 26 + i * 19; p.draw(S.rect(x - 1.5, 82, 3, 12, 1), { fill: '#9c7f62', w: .6 }); p.draw(S.ell(x, 78, 9, 7), { fill: i % 2 ? '#a9c97a' : '#9cbf6d', w: .8 }); p.dot(x - 2, 77, 1.6, '#e7849c'); }
    p.wash(S.curve([[60, 114], [72, 96], [80, 96], [92, 114]], true, 5), { color: '#efe3c4', edge: 0 });
    p.dot(84, 15, 4, C.pink, { line: C.line, w: .7 });
  },
  flowerlights(p) {
    const pts = S.curve([[4, 8], [80, 30], [150, 36], [220, 30], [296, 8]]);
    p.ink(pts, { w: 1.2, color: '#93bb57' });
    for (let i = 1; i < 12; i++) {
      const [x, y] = pts[Math.floor(i / 12 * (pts.length - 1))];
      if (i % 2) p.draw(S.ell(x + 4, y + 2, 6, 3, 0, 6.29, .6), { fill: '#a9cf7a', w: .8 });
      const col = [C.pink, '#fdf3d0', '#e4eef8', '#fbe3e8'][i % 4];
      p.wash(S.ell(x, y + 12, 13, 13), { color: '#fff1bf', alpha: .45, edge: 0, off: 0 });
      flower(p, x, y + 12, 8, col);
    }
  },
  floorlamp(p) {
    shadow(p, 42, 218, 34);
    p.wash(S.ell(42, 66, 62, 52), { color: '#fff1bf', alpha: .5, edge: 0, off: 0 });
    // turned wooden stand on a round foot
    p.draw(S.ell(42, 212, 28, 8), { fill: '#d6b98c', w: 1.5 });
    p.draw(S.curve([[34, 210], [36, 196], [40, 190], [44, 190], [48, 196], [50, 210]], true, 4), { fill: '#c9a77c', w: 1.2 });
    p.draw(S.rect(39, 82, 6, 110, 2), { fill: '#d6b98c', w: 1.3 });
    for (const y of [120, 150]) p.draw(S.ell(42, y, 6, 4), { fill: '#c9a77c', w: 1 });
    // pleated scalloped shade with fringe + pompoms
    const shade = S.curve([[12, 76], [22, 30], [32, 18], [52, 18], [62, 30], [72, 76]], false).concat(S.scallops(12, 72, 76, 12).reverse());
    p.draw(shade, { fill: '#fbe9e3', w: 1.7 });
    for (const [x0, x1] of [[26, 18], [34, 30], [42, 42], [50, 54], [58, 66]]) p.ink([[x0, 22], [x1, 76]], { w: .8, color: '#eab8b8' });
    p.draw(S.rect(28, 12, 28, 8, 3), { fill: '#d7ead6', w: 1.1 });
    for (let x = 14; x <= 70; x += 4) p.ink([[x, 80], [x + .5, 92]], { w: .9, color: '#e7a4b4' });
    for (let x = 16; x <= 70; x += 12) p.dot(x, 96, 3, C.appleL, { line: C.line, w: .6 });
    p.draw(S.ell(42, 10, 4, 4), { fill: GOLDL, w: .8 });
  },
  strawrug(p) {
    p.draw(S.ell(106, 24, 102, 19), { fill: '#efdcab', w: 1.6 });
    for (const r of [.78, .56, .34]) p.ink(S.ell(106, 24, 102 * r, 19 * r), { w: .9, closed: true, color: '#c9ad73' });
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; p.ink([[106 + Math.cos(a) * 100, 24 + Math.sin(a) * 18], [106 + Math.cos(a) * 108, 24 + Math.sin(a) * 21]], { w: .9, color: '#c9ad73' }); }
  },
  bunnyrug(p) {
    // a fluffy white bunny lying flat: two long ears, round head, oval body, little tail
    const fuzzy = (cx, cy, rx, ry, n = 36) => { const pts = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, r = k % 2 ? 1 : 1.06; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); } return pts; };
    p.wash(S.ell(140, 50, 130, 12), { color: '#7a6c66', alpha: .1, edge: 0, off: 0 });
    for (const [cx, cy, rot] of [[36, 22, -.22], [40, 40, .08]]) { p.c.save(); p.c.translate(cx, cy); p.c.rotate(rot); p.draw(fuzzy(0, 0, 32, 9, 28), { fill: '#fdfbf6', w: 1.3 }); p.wash(S.ell(4, 0, 22, 4.5), { color: C.pink, edge: 0 }); p.c.restore(); }
    p.draw(fuzzy(170, 38, 92, 24, 48), { fill: '#fdfbf6', w: 1.5 });
    p.draw(fuzzy(88, 36, 30, 24, 32), { fill: '#fdfbf6', w: 1.4 });
    p.dot(80, 32, 2.2, C.line); p.dot(98, 32, 2.2, C.line);
    p.ink([[87, 40], [91, 44]], { w: 1.1 }); p.ink([[91, 40], [87, 44]], { w: 1.1 });
    p.wash(S.ell(74, 42, 6, 3.5), { color: C.pink, edge: 0 }); p.wash(S.ell(104, 42, 6, 3.5), { color: C.pink, edge: 0 });
    for (const x of [130, 214]) p.draw(fuzzy(x, 58, 12, 6, 16), { fill: '#fdfbf6', w: 1.1 });
    p.draw(fuzzy(260, 34, 12, 11, 18), { fill: '#fdfbf6', w: 1.2 });
    for (let i = 0; i < 22; i++) { const x = p.rand(110, 250), y = p.rand(22, 54); p.ink([[x, y], [x + 4, y - 2]], { w: .7, color: '#e4dccd' }); }
  },
  wreath(p) {
    p.ink([[46, 0], [46, 12]], { w: 1 }); p.dot(46, 2, 2.5, C.gold, { line: C.line, w: .6 });
    const ring = S.ell(46, 54, 36, 36);
    p.ink(ring, { w: 7, closed: true, color: '#d9c08f' }); p.ink(ring, { w: 1, closed: true, color: '#b8956a' });
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = 46 + Math.cos(a) * 36, y = 54 + Math.sin(a) * 36;
      if (k % 3 === 0) flower(p, x, y, 6, ['#f2b3c4', '#fdf3d0', '#d9cdf0'][k % 3]); else p.draw(S.ell(x, y, 6, 3, 0, 6.29, a + 1.4), { fill: k % 2 ? '#b7cf8a' : '#cbbd94', w: .8 }); }
    p.draw([[46, 84], [36, 96], [46, 92], [56, 96]], { fill: C.mist, w: 1 }); p.draw(S.ell(46, 86, 6, 4), { fill: C.mist, w: 1 });
  },
  musicbox(p, st) {
    const a = st.spin || 0, lift = st.spin ? 1 : 0;
    shadow(p, 33, 82, 28);
    p.draw(S.rect(6, 66, 54, 16, 4), { fill: '#f3e3c6', w: 1.5 });
    for (let x = 12; x < 58; x += 8) p.dot(x, 74, 1.6, GOLDL, { line: C.line, w: .4 });
    p.draw(S.ell(33, 66, 27, 6), { fill: '#fbf3e6', w: 1.3 });
    // three bunnies on poles riding round; the ones behind are drawn first and a little smaller
    const riders = [0, 1, 2].map(i => { const t = a + i * Math.PI * 2 / 3; return { x: 33 + Math.sin(t) * 19, z: Math.cos(t), y: 46 + Math.sin(a * 3 + i * 2) * 5 * lift, c: ['#fdfbf6', C.pink, '#e4eef8'][i] }; }).sort((m, n) => m.z - n.z);
    for (const r of riders) {
      const k = .8 + r.z * .2;
      p.ink([[r.x, 24], [r.x, 64]], { w: 1.4 * k, color: GOLDL });
      p.draw(S.ell(r.x, r.y, 7 * k, 5 * k), { fill: r.c, w: .9 }); p.draw(S.ell(r.x - 2 * k, r.y - 7 * k, 1.6 * k, 4 * k), { fill: r.c, w: .7 }); p.draw(S.ell(r.x + 2 * k, r.y - 7 * k, 1.6 * k, 4 * k), { fill: r.c, w: .7 });
    }
    p.ink([[33, 24], [33, 64]], { w: 2, color: GOLDL });
    p.draw(S.curve([[2, 26], [33, 4], [64, 26]], false).concat([[2, 26]]), { fill: C.pink, w: 1.4 });
    for (let k = 0; k < 5; k++) { const o = ((k / 5 + a / (Math.PI * 2)) % 1); p.ink([[33, 6], [4 + o * 60, 26]], { w: .8, color: '#fbe6ea' }); }
    p.draw(S.scallops(2, 64, 26, 9), { fill: '#fdfbf6', w: 1 });
    p.draw(star5(33, 2, 5), { fill: GOLDL, w: .8 });
  },
});

const SC = 1.2;   // furniture drawn at 1.2× so the room feels lived-in next to her
for (const d of Object.values(ITEMS)) { d.w = Math.round(d.w * SC); d.h = Math.round(d.h * SC); if (d.surf) d.surf = { y: d.surf.y * SC, x0: d.surf.x0 * SC, x1: d.surf.x1 * SC }; }
function drawItem(p, id, st) { p.c.save(); p.c.scale(SC, SC); drawers[id](p, st || {}); p.c.restore(); }

return { drawRoom, drawItem, ITEMS, ROOM, CAT };
})();
