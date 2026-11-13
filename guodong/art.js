/* art.js — 果冻的小店 · 全部手绘素材（用 sketch.js 的笔画在 canvas 上）
   逻辑尺寸：店面 1200×720；客人 170×160；甜品 100×100；图标 80×80。 */
const Art = (() => {
'use strict';
const { Shapes: S } = Sketch;

const C = {
  line: '#7a6c66', soft: '#a39089', pinkLine: '#c7959f', dark: '#4b4e48',
  wall: '#f7f2e6', dot: '#a3bfdd', wains: '#e1ecc4', wainsLine: '#b7c895', rail: '#f6eddb',
  floor: '#efdfc6', floorLine: '#cdb391', cream: '#fcf8ef', wood: '#e8d3b1', woodD: '#c9ab83',
  apple: '#bcd97a', appleD: '#93bb57', appleL: '#e4f0c7', mist: '#d3e3ee', sky: '#dcecf4',
  pink: '#f4cad3', pinkD: '#e7a4b4', board: '#4e5349', gold: '#d9b56a', white: '#fffdf8',
};
const LW = 1200, LH = 720;

/* ---------------- back layer: walls, window, shelves, door ---------------- */
function drawBack(p, decor = new Set(), unl = {}) {
  const c = p.c, part = (k, f, box) => Skin.part(p, k, f, box);
  part('shop.room', () => {
  // wall + hand-dotted polka
  p.wash(S.rect(-10, -10, LW + 20, 350), { color: C.wall, blooms: 6, edge: 0, off: 0, amp: 0 });
  for (let y = 26, row = 0; y < 330; y += 38, row++)
    for (let x = (row % 2 ? 22 : 41); x < LW; x += 38) p.dot(x + p.rand(-2, 2), y + p.rand(-2, 2), p.rand(2.4, 3.4), C.dot);
  // bunting garland
  const gy = x => 26 + Math.sin((x - 40) / 1120 * Math.PI) * 26;
  p.ink(S.curve([[30, 22], [300, 44], [600, 54], [900, 44], [1170, 22]]), { w: 1.6, color: C.soft });
  for (let x = 60, i = 0; x < 1150; x += 52, i++) {
    const y = gy(x) + 2, col = [C.appleL, C.white, C.pink, C.mist][i % 4];
    p.draw([[x - 16, y], [x + 16, y + 1], [x + p.rand(-1, 1), y + 30]], { fill: col, w: 1.5, line: C.soft });
  }
  // wainscot + rail
  p.wash(S.rect(-10, 330, LW + 20, 250), { color: C.wains, blooms: 6, edge: 0, off: 0 });
  for (let x = 20; x < LW; x += 44) p.ink([[x + p.rand(-1, 1), 345], [x + p.rand(-2, 2), 560]], { w: 1.2, color: C.wainsLine, amp: .6 });
  p.draw(S.rect(-10, 322, LW + 20, 16, 4), { fill: C.rail, w: 1.6 });
  // floor
  p.wash(S.rect(-10, 560, LW + 20, 170), { color: C.floor, blooms: 6, edge: 0, off: 0 });
  for (const y of [596, 640, 688]) p.ink([[880, y + p.rand(-2, 2)], [1210, y + p.rand(-2, 2)]], { w: 1.4, color: C.floorLine });
  for (let i = 0; i < 9; i++) { const x = 900 + p.rand(0, 290), ys = [560, 596, 640, 688], k = Math.floor(p.rand(0, 3)); p.ink([[x, ys[k] + 3], [x + p.rand(-2, 2), ys[k + 1] - 3]], { w: 1.2, color: C.floorLine }); }
  p.ink([[-10, 560], [LW + 10, 560]], { w: 1.8 });
  });

  // ---- ingredient shelves (left wall) ----
  const label = (t, x, y, size = 11, col = C.line) => { const c = p.c; c.save(); c.font = `${size}px "LXGW WenKai", "KaiTi", serif`; c.fillStyle = col; c.textAlign = 'center'; c.fillText(t, x, y); c.restore(); };
  part('shop.shelves', () => {
  for (const sy of [120, 194]) {
    p.draw(S.rect(32, sy, 248, 11, 3), { fill: C.wood, w: 1.8 });
    p.draw([[56, sy + 11], [56, sy + 32], [78, sy + 11]], { fill: C.woodD, w: 1.3 });
    p.draw([[256, sy + 11], [256, sy + 32], [234, sy + 11]], { fill: C.woodD, w: 1.3 });
  }
  });
  part('shop.egg', () => {
  // egg carton (open lid leaning back, six eggs)
  p.draw([[48, 104], [118, 104], [114, 82], [52, 82]], { fill: '#e2cfae', w: 1.5 });
  for (let i = 0; i < 3; i++) p.draw(S.ell(62 + i * 20, 104, 8, 10), { fill: '#fbf2e2', w: 1.3 });
  p.draw([[46, 120], [120, 120], [117, 104], [49, 104]], { fill: '#e8d6b6', w: 1.6 });
  for (let i = 0; i < 3; i++) p.ink(S.ell(60 + i * 23, 114, 7, 3, 0, Math.PI), { w: 1, closed: false, color: '#bfa57f' });
  });
  part('shop.milk', () => {
  // two glass milk bottles with blue caps
  for (const bx of [140, 166]) {
    p.draw(S.curve([[bx - 11, 120], [bx - 12, 96], [bx - 6, 86], [bx - 5, 76], [bx + 5, 76], [bx + 6, 86], [bx + 12, 96], [bx + 11, 120]], true, 6), { fill: '#fdfcf8', w: 1.5 });
    p.draw(S.rect(bx - 6, 70, 12, 8, 2), { fill: '#9fbedf', w: 1.2 });
    p.wash(S.rect(bx - 9, 100, 18, 10, 2), { color: C.mist, edge: .2 });
    p.ink([[bx - 8, 92], [bx - 8, 116]], { w: 1.2, color: '#ffffff' });
  }
  });
  part('shop.sugar', () => {
  // sugar jar with cork
  p.draw(S.rect(190, 86, 44, 34, 8), { fill: '#f4f1ea', w: 1.6 });
  for (let i = 0; i < 18; i++) p.dot(p.rand(196, 228), p.rand(96, 116), .9, '#d8d2c4');
  p.draw(S.rect(196, 78, 32, 10, 3), { fill: '#d6b48a', w: 1.4 });
  p.draw(S.rect(198, 96, 28, 14, 2), { fill: C.white, w: 1 }); label('糖', 212, 107, 10);
  });
  if (unl.choco) part('shop.flour', () => {
    p.draw(S.curve([[244, 120], [242, 100], [248, 90], [256, 94], [264, 88], [272, 96], [276, 120]], true, 6), { fill: '#f3ecdc', w: 1.5 });
    p.ink([[248, 96], [270, 94]], { w: 1, color: C.soft });
    label('面粉', 259, 112, 9);
  }); else part('shop.clover', () => {
  p.draw([[248, 120], [251, 104], [270, 104], [273, 120]], { fill: '#e9b9a4', w: 1.4 });
  for (const [x, y] of [[254, 98], [262, 94], [268, 100]]) p.draw(S.ell(x, y, 5, 4.5), { fill: C.apple, w: 1.1 });
  });
  part('shop.apple', () => {
  // wicker basket of green apples
  for (const [x, y] of [[62, 166], [84, 162], [106, 166], [74, 154], [96, 152]]) p.draw(S.ell(x, y, 12, 11), { fill: C.apple, w: 1.4 });
  p.ink([[84, 151], [86, 143]], { w: 1.3 });
  p.draw([[42, 172], [128, 172], [120, 194], [50, 194]], { fill: '#d9b98a', w: 1.7 });
  for (let x = 50; x < 124; x += 8) p.ink([[x, 174], [x + 2, 192]], { w: .9, color: '#b8956a' });
  p.ink([[46, 182], [124, 182]], { w: .9, color: '#b8956a' });
  });
  part('shop.gel', () => {
  // gelatin box
  p.draw([[150, 194], [150, 160], [204, 160], [204, 194]], { fill: '#f6e6cf', w: 1.6 });
  p.draw([[150, 160], [160, 152], [214, 152], [204, 160]], { fill: '#efdcc0', w: 1.3 });
  p.draw([[204, 160], [214, 152], [214, 186], [204, 194]], { fill: '#e6cfb0', w: 1.3 });
  p.draw(S.curve([[162, 184], [163, 176], [170, 170], [177, 166], [184, 170], [191, 176], [192, 184]], false).concat([[162, 184]]), { fill: C.apple, w: 1.1 });
  });
  part('shop.honey', () => {
  // honey jar (decor)
  p.draw(S.rect(228, 168, 36, 26, 9), { fill: '#f3d68b', w: 1.4 });
  p.draw(S.rect(232, 162, 28, 8, 3), { fill: '#e9c48f', w: 1.2 });
  });
  part('shop.backCounter', () => {
  // ---- back counter: cassette stove + bamboo steamer stand here ----
  p.draw(S.rect(28, 300, 278, 150, 6), { fill: C.cream, w: 2 });
  p.draw(S.rect(22, 292, 290, 14, 4), { fill: C.wood, w: 1.8 });
  p.ink([[166, 312], [166, 446]], { w: 1.5 });
  p.dot(156, 356, 3.5, C.gold, { line: C.line, w: 1 }); p.dot(176, 356, 3.5, C.gold, { line: C.line, w: 1 });
  });

  part('shop.windowView', () => {
  // ---- window ----
  p.draw(S.rect(310, 74, 260, 232, 10), { fill: C.cream, w: 2 });
  p.wash(S.rect(326, 90, 228, 200, 4), { color: C.sky, edge: .1 });
  p.wash(S.curve([[326, 240], [380, 222], [450, 230], [520, 216], [554, 226], [554, 290], [326, 290]], true, 6), { color: '#cfe3b0' });
  p.draw(S.rect(438, 186, 16, 104, 3), { fill: '#bba083', w: 1.4, line: C.soft });
  for (const [x, y, r] of [[410, 176, 44], [478, 170, 46], [444, 138, 46], [500, 210, 30], [392, 214, 28]]) p.draw(S.ell(x, y, r, r * .82), { fill: '#b9d88c', w: 1.4, line: C.soft });
  for (let i = 0; i < 8; i++) p.dot(p.rand(380, 520), p.rand(128, 214), 4.2, '#e4f2a8', { line: C.soft, w: .8 });
  p.wash(S.ell(372, 116, 24, 9), { color: C.white, edge: 0 }); p.wash(S.ell(520, 104, 20, 7), { color: C.white, edge: 0 });
  });
  part('shop.window', () => {
  p.ink(S.rect(326, 90, 228, 200, 4), { w: 1.6, closed: true });
  p.draw(S.rect(436, 90, 8, 200), { fill: C.cream, w: 1.4 });
  p.draw(S.rect(326, 186, 228, 8), { fill: C.cream, w: 1.4 });
  p.draw(S.rect(298, 300, 284, 16, 4), { fill: C.cream, w: 1.8 });
  p.draw([[516, 300], [520, 280], [548, 280], [552, 300]], { fill: '#e9b9a4', w: 1.6 });
  for (const [x, y] of [[526, 268], [536, 262], [546, 270], [534, 274]]) p.draw(S.ell(x, y, 6, 5.5), { fill: C.apple, w: 1.2 });
  });

  part('shop.curtains', () => {
  // ---- curtains: real drapes — gathered on the rod, pinched by a tie-back, flaring to a frilled hem ----
  const drape = (m) => {          // m(x) mirrors around the window centre for the right panel
    const X = x => m(x);
    const outline = S.curve([[X(284), 66], [X(318), 64], [X(352), 67], [X(342), 120], [X(322), 186], [X(318), 204], [X(332), 252], [X(346), 314], [X(318), 318], [X(296), 316], [X(282), 318], [X(282), 250], [X(286), 204], [X(282), 150]], true, 7);
    p.draw(outline, { fill: '#fffdf8', w: 1.8, blooms: 3 });
    // shadow in the inner folds
    p.wash(S.curve([[X(320), 70], [X(336), 70], [X(316), 186], [X(308), 186]], true, 5), { color: '#e9e4da', edge: 0, alpha: .9 });
    p.wash(S.curve([[X(306), 212], [X(318), 212], [X(334), 312], [X(318), 314]], true, 5), { color: '#e9e4da', edge: 0, alpha: .9 });
    // polka dots, following the cloth
    for (const [x, y] of [[292, 84], [310, 98], [330, 82], [298, 128], [318, 140], [300, 168], [292, 236], [306, 262], [322, 286], [296, 296], [334, 296], [312, 232]]) p.dot(X(x), y, 2.2, C.dot);
    // fold lines: top gathers converge into the tie-back, then fan out below it
    for (const [x0, x1] of [[296, 300], [312, 306], [328, 312], [342, 318]]) p.ink(S.curve([[X(x0), 68], [X((x0 + x1) / 2 + 2), 130], [X(x1), 190]]), { w: 1, color: C.soft, amp: .5 });
    for (const [x0, x1] of [[298, 290], [306, 306], [314, 324], [320, 340]]) p.ink(S.curve([[X(x0), 210], [X((x0 + x1) / 2), 262], [X(x1), 312]]), { w: 1, color: C.soft, amp: .5 });
    // tie-back band wrapped around the waist + a small bow
    p.draw(S.curve([[X(280), 192], [X(302), 190], [X(324), 194], [X(324), 206], [X(302), 204], [X(280), 206]], true, 5), { fill: C.pink, w: 1.4 });
    p.draw(S.ell(X(330), 199, 8, 6, 0, 6.29, .4), { fill: C.pink, w: 1.2 });
    p.ink([[X(328), 203], [X(334), 218]], { w: 1.2, color: C.pinkD }); p.ink([[X(330), 203], [X(340), 214]], { w: 1.2, color: C.pinkD });
    // dark frill along the hem, like the collar of her blouse
    const hem = []; for (let i = 0; i <= 16; i++) { const t = i / 16, x = lerp(282, 346, t); hem.push([X(x), 316 + Math.sin(t * Math.PI * 8) * 3]); }
    for (let i = 16; i >= 0; i--) { const t = i / 16, x = lerp(282, 346, t); hem.push([X(x), 326 + Math.abs(Math.sin(t * Math.PI * 8)) * 4]); }
    p.draw(hem, { fill: C.dark, w: 1.2 });
    // rings on the rod
    for (let x = 288; x <= 348; x += 12) p.ink(S.ell(X(x), 62, 3.5, 5), { w: 1.1, closed: true, color: C.soft });
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  drape(x => x);
  drape(x => 880 - x);
  // rod with round finials, short scalloped valance
  p.draw(S.rect(270, 57, 340, 6, 3), { fill: '#c9ab83', w: 1.4 });
  p.dot(268, 60, 6, '#c9ab83', { line: C.line, w: 1.2 }); p.dot(612, 60, 6, '#c9ab83', { line: C.line, w: 1.2 });
  p.draw(S.rect(326, 64, 228, 12, 2), { fill: C.dark, w: 1.3 });
  p.draw(S.scallops(326, 554, 76, 19), { fill: C.dark, w: 1.2 });
  });

  part('shop.fridge', () => {
  // ---- fridge (retro, two doors) ----
  p.wash(S.rect(648, 160, 150, 300, 18), { color: '#7a6c66', alpha: .1, edge: 0, off: 0 });
  p.draw(S.rect(640, 150, 150, 310, 18), { fill: '#e6f0e1', w: 2 });
  p.wash(S.rect(770, 160, 16, 290, 8), { color: '#cfdcc8', edge: 0, alpha: .7 });
  p.ink([[642, 236], [788, 236]], { w: 1.8 });
  p.draw(S.rect(764, 168, 9, 50, 4), { fill: '#e2e4e0', w: 1.3 });
  p.draw(S.rect(764, 250, 9, 80, 4), { fill: '#e2e4e0', w: 1.3 });
  p.ink([[654, 160], [654, 226]], { w: 1.4, color: '#ffffff' }); p.ink([[654, 248], [654, 380]], { w: 1.4, color: '#ffffff' });
  label('冷藏', 700, 262, 11, C.soft);
  // a green-apple magnet and a tiny drawing on the freezer door
  p.dot(744, 180, 7, C.apple, { line: C.line, w: 1 });
  });

  part('shop.chalkboard', () => {
  // ---- small chalkboard menu by the door ----
  p.ink([[868, 46], [818, 84]], { w: 1.3 }); p.ink([[868, 46], [918, 84]], { w: 1.3 }); p.dot(868, 46, 3.5, C.gold, { line: C.line, w: 1 });
  p.draw(S.rect(808, 82, 120, 132, 7), { fill: C.woodD, w: 1.8 });
  p.wash(S.rect(816, 90, 104, 116, 3), { color: C.board, blooms: 6, edge: .1 });
  for (let i = 0; i < 4; i++) p.wash(S.ell(p.rand(830, 906), p.rand(104, 196), p.rand(14, 26), p.rand(6, 10)), { color: '#ffffff', alpha: .05, edge: 0 });
  p.ink(S.rect(816, 90, 104, 116, 3), { w: 1.3, closed: true });
  });

  if (unl.burger) part('shop.rack', () => {
    p.c.save(); p.c.translate(619, 0); p.c.scale(.82, 1); p.c.translate(-612, 0);   // squeeze between curtain and fridge
    for (const y of [248, 298]) { p.draw(S.rect(586, y, 52, 7, 2), { fill: C.wood, w: 1.5 }); p.ink([[592, y + 7], [600, y + 16]], { w: 1.3 }); p.ink([[632, y + 7], [624, y + 16]], { w: 1.3 }); }
    p.ink([[588, 200], [588, 248]], { w: 1.2, color: C.soft }); p.ink([[636, 200], [636, 248]], { w: 1.2, color: C.soft });
    p.draw(S.rect(594, 212, 36, 36, 9), { fill: '#f3f7f2', fillAlpha: .85, w: 1.5 });
    for (const [x, y] of [[605, 230], [619, 233], [611, 240]]) { p.draw(S.ell(x, y, 8, 5.5), { fill: '#f6d76a', w: .9 }); p.dot(x, y, 1.8, '#f3f7f2'); }
    p.draw(S.rect(597, 206, 30, 8, 3), { fill: '#e2c48c', w: 1.2 });
    p.draw(S.ell(612, 290, 22, 9, 0, Math.PI).concat([[590, 290]]), { fill: '#e8f0f4', w: 1.4 });
    for (const [x, y] of [[602, 284], [614, 281], [624, 285]]) p.draw(S.ell(x, y, 6.5, 8), { fill: '#fbf2e2', w: 1.1 });
    p.ink(S.ell(612, 290, 22, 4), { w: 1.2, closed: true });
    p.c.restore();
  });
  part('shop.bell', () => {
  // hanging service bell on the wall right of the door (pull the rope / press space to serve)
  p.draw(S.rect(1154, 190, 42, 8, 3), { fill: C.wood, w: 1.5 }); p.ink([[1160, 198], [1168, 208]], { w: 1.3 });
  p.ink([[1180, 198], [1180, 212]], { w: 1.2 });
  p.draw(S.curve([[1166, 240], [1166, 226], [1172, 214], [1180, 212], [1188, 214], [1194, 226], [1194, 240]], false).concat([[1166, 240]]), { fill: C.gold, w: 1.7 });
  p.draw(S.rect(1162, 238, 36, 6, 3), { fill: '#e6c47c', w: 1.3 }); p.dot(1180, 248, 3.5, C.gold, { line: C.line, w: 1 });
  p.ink([[1180, 250], [1178, 276], [1181, 294]], { w: 1.2, color: '#c9a77d' }); p.draw(S.ell(1181, 298, 4, 5), { fill: '#e9b9a4', w: 1 });
  });
  if (unl.lime) {
    part('shop.drinkBar', () => {     // waist-high drink cabinet between the fridge and the door
      p.wash(S.rect(800, 338, 140, 226, 6), { color: '#7a6c66', alpha: .1, edge: 0, off: 0 });
      p.draw(S.rect(796, 330, 140, 232, 6), { fill: '#e4efe6', w: 2 });
      p.draw(S.rect(790, 322, 152, 14, 4), { fill: C.wood, w: 1.8 });
      p.draw(S.rect(806, 352, 56, 92, 4), { fill: '#d7e6db', w: 1.4 }); p.draw(S.rect(870, 352, 56, 92, 4), { fill: '#d7e6db', w: 1.4 });
      p.dot(854, 398, 3, C.gold, { line: C.line, w: .9 }); p.dot(878, 398, 3, C.gold, { line: C.line, w: .9 });
      p.ink([[804, 464], [928, 464]], { w: 1.2, color: '#b9c7b2' });
      for (const x of [822, 848, 874, 900]) p.dot(x, 504, 2.2, C.dot);
    });
    part('shop.soda', () => {         // wall soda dispenser: tank, pink lever, nozzle over the bar
      p.wash(S.rect(888, 230, 50, 58, 8), { color: '#7a6c66', alpha: .1, edge: 0, off: 0 });
      p.draw(S.rect(884, 226, 50, 58, 8), { fill: '#d3e3ee', w: 1.7 });
      p.draw(S.rect(890, 232, 38, 18, 4), { fill: '#f5fafc', w: 1.1 });
      label('苏打', 909, 245, 10);
      for (const [x, y] of [[893, 268], [901, 274], [925, 266]]) p.dot(x, y, 2.4, '#ffffff', { line: '#a3bfdd', w: .7 });
      p.draw(S.rect(924, 258, 20, 7, 3), { fill: C.pinkD, w: 1.2 });
      p.draw(S.rect(902, 284, 14, 9, 2), { fill: '#bfc9cf', w: 1.3 });
      p.ink([[909, 293], [909, 298]], { w: 2.4, color: '#9aa8b0' });
    });
    part('shop.iceBucket', () => {     // a steel bucket of ice + a stack of glasses
      p.draw(S.curve([[800, 300], [802, 324], [834, 324], [836, 300]], false).concat([[800, 300]]), { fill: '#dfe4e6', w: 1.6 });
      for (const [x, y] of [[808, 298], [818, 295], [828, 299], [813, 302], [824, 303]]) p.draw(S.rect(x - 4, y - 4, 8, 8, 2), { fill: '#f2f9fc', w: .9, line: '#9fbedf' });
      p.ink(S.ell(818, 300, 18, 4), { w: 1.2, closed: true });
      for (let k = 0; k < 3; k++) p.draw(S.curve([[839, 324 - k * 7], [840, 312 - k * 7], [850, 312 - k * 7], [851, 324 - k * 7]], false), { w: 1.1, fill: '#f5fafc', fillAlpha: .6 });
    });
    part('shop.limeBasket', () => {    // a little basket of limes
      p.draw([[852, 310], [882, 310], [878, 326], [856, 326]], { fill: '#d9b98a', w: 1.5 });
      for (let x = 856; x < 880; x += 6) p.ink([[x, 312], [x + 1, 324]], { w: .8, color: '#b8956a' });
      for (const [x, y] of [[860, 306], [873, 305], [866, 298]]) p.draw(S.ell(x, y, 7.5, 6.5), { fill: '#c3dc5c', w: 1.1 });
      p.dot(864, 296, 1.4, '#f4f7d0'); p.dot(871, 303, 1.2, '#f4f7d0');
    });
  }

  part('shop.lamp', () => {
  // ---- lamp ----
  for (const lx of [606]) {
    p.ink([[lx, -5], [lx + p.rand(-1, 1), 40]], { w: 1.4 });
    p.draw(S.ell(lx, 66, 28, 26, Math.PI, Math.PI * 2).concat([[lx - 28, 66]]), { fill: '#f7e7b9', w: 1.8 });
    p.draw(S.ell(lx, 68, 29, 4), { fill: '#f2d896', w: 1.4 });
    p.dot(lx, 76, 6, '#fff6d6', { line: C.line, w: 1 });
  }
  });

  part('shop.door', () => {
  // ---- door ----
  p.draw(S.rect(944, 178, 204, 386, 6), { fill: C.cream, w: 2 });
  p.draw(S.rect(958, 192, 176, 368, 5), { fill: C.mist, w: 1.8 });
  p.draw(S.rect(976, 410, 140, 120, 6), { fill: '#c6d8e5', w: 1.4 });
  p.draw(S.ell(1046, 280, 46, 46), { fill: C.cream, w: 1.8 });
  p.wash(S.ell(1046, 280, 38, 38), { color: C.sky, edge: .15 });
  p.wash(S.ell(1040, 300, 30, 12), { color: '#cfe3b0', edge: 0 });
  p.ink(S.ell(1046, 280, 38, 38), { w: 1.4, closed: true });
  p.ink([[1046, 242], [1046, 318]], { w: 1.4 }); p.ink([[1008, 280], [1084, 280]], { w: 1.4 });
  p.dot(1114, 394, 7, C.gold, { line: C.line, w: 1.2 });
  // bell bracket
  p.ink([[946, 170], [972, 170], [972, 182]], { w: 1.8, amp: .3 });
  p.draw(S.ell(972, 198, 12, 14, Math.PI, Math.PI * 2).concat([[960, 198]]), { fill: C.gold, w: 1.6 });
  p.dot(972, 201, 3, C.gold, { line: C.line, w: .8 });
  });
  part('shop.doormat', () => {
  // doormat
  p.draw(S.rect(968, 566, 160, 26, 10), { fill: C.pink, w: 1.6 });
  for (let x = 980; x < 1120; x += 14) p.ink([[x, 572], [x + 6, 586]], { w: 1.1, color: C.pinkD });
  });

  part('shop.basketBed', () => {
  // ---- her basket bed (by the door) ----
  p.draw(S.ell(930, 660, 76, 34), { fill: '#d9b98a', w: 2 });
  p.draw(S.ell(930, 642, 70, 20, Math.PI, Math.PI * 2).concat([[860, 642]]), { fill: C.white, w: 1.6 });
  for (let i = 0; i < 9; i++) p.dot(p.rand(872, 990), p.rand(630, 650), 2.2, C.dot);
  for (let x = 868; x < 996; x += 12) p.ink([[x, 660], [x + 4, 688]], { w: 1, color: '#b8956a' });
  p.draw(S.ell(964, 628, 18, 15), { fill: C.apple, w: 1.4 });
  p.ink([[964, 614], [968, 606]], { w: 1.4 });
  });
  drawDecor(p, decor);
}

/* ---------------- front layer: the counter ---------------- */
function drawFront(p, unl = {}) {
  const part = (k, f, box) => Skin.part(p, k, f, box);
  part('shop.counter', () => {
  // counter top
  p.draw(S.rect(26, 414, 846, 32, 8), { fill: C.wood, w: 2.2 });
  p.ink([[40, 424], [858, 426]], { w: 1, color: C.woodD });
  // front panel
  p.draw(S.rect(42, 444, 814, 300, 2), { fill: C.cream, w: 2.2 });
  // dark band + polka frill (like her skirt hem)
  p.draw(S.rect(42, 444, 814, 24), { fill: C.dark, w: 1.6 });
  const fr = S.scallops(42, 856, 468, 30);
  p.draw(fr, { fill: C.white, w: 1.6 });
  for (let x = 60; x < 850; x += 30) p.dot(x + p.rand(-3, 3), 476 + p.rand(-2, 2), 2.4, C.dot);
  // vertical panel seams
  for (let x = 150; x < 850; x += 116) p.ink([[x, 500], [x + p.rand(-2, 2), 720]], { w: 1.2, color: '#d9cdb8' });
  });
  part('shop.emblem', () => {
  // apron bunny emblem
  p.draw(S.ell(449, 600, 66, 58), { fill: C.white, w: 1.8 });
  p.draw(S.scallops(383, 515, 600, 12).concat([[515, 600]]), { fill: C.white, w: 1.2, line: C.soft });
  p.draw(S.ell(428, 560, 11, 24, 0, 6.29, -.12), { fill: C.apple, w: 1.6 });
  p.draw(S.ell(470, 560, 11, 24, 0, 6.29, .12), { fill: C.apple, w: 1.6 });
  p.wash(S.ell(428, 560, 5, 15, 0, 6.29, -.12), { color: C.pink, edge: 0 });
  p.wash(S.ell(470, 560, 5, 15, 0, 6.29, .12), { color: C.pink, edge: 0 });
  p.draw(S.ell(449, 606, 38, 32), { fill: C.apple, w: 1.8 });
  p.dot(436, 602, 2.6, C.line); p.dot(462, 602, 2.6, C.line);
  p.ink([[444, 612], [454, 620]], { w: 1.6 }); p.ink([[454, 612], [444, 620]], { w: 1.6 });
  });

  // ---- counter-top fixtures (contents are drawn live by the game) ----
  part('shop.board', () => {
  // wooden cutting board with a handle and a little knife
  p.draw(S.curve([[214, 412], [214, 400], [222, 394], [316, 394], [326, 398], [342, 398], [348, 403], [342, 408], [326, 408], [324, 412]], true, 5), { fill: '#e2c69e', w: 1.7 });
  p.dot(336, 403, 3, '#c9ab83', { line: C.line, w: .9 });
  p.ink([[222, 398], [314, 398]], { w: .8, color: '#c9ab83' });
  });
  // three serving plates
  for (const px of [392, 458, 524]) part('shop.plate', () => {
    p.wash(S.ell(px, 412, 32, 6), { color: '#7a6c66', alpha: .1, edge: 0, off: 0 });
    p.draw(S.ell(px, 408, 30, 8), { fill: '#ffffff', w: 1.6 });
    p.ink(S.ell(px, 408, 21, 5), { w: 1, closed: true, color: C.soft });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; p.dot(px + Math.cos(a) * 25.5, 408 + Math.sin(a) * 6.5, 1.3, C.dot); }
  }, [px - 32, 396, 64, 20]);
  // caramel squeeze bottle
  const bottle = (cx, col, txt) => {
    p.draw(S.curve([[cx - 16, 414], [cx - 18, 378], [cx - 12, 368], [cx + 12, 368], [cx + 18, 378], [cx + 16, 414]], true, 6), { fill: col, w: 1.7 });
    p.draw([[cx - 8, 368], [cx - 4, 352], [cx + 4, 352], [cx + 8, 368]], { fill: '#f1e3cf', w: 1.3 });
    p.ink([[cx, 352], [cx, 342]], { w: 2, color: C.line });
    p.draw(S.rect(cx - 12, 386, 24, 16, 3), { fill: C.white, w: 1 });
    const c = p.c; c.save(); c.font = '9px "LXGW WenKai", serif'; c.fillStyle = C.line; c.textAlign = 'center'; c.fillText(txt, cx, 398); c.restore();
  };
  part('shop.caramel', () => bottle(690, '#c99868', '焦糖'));
  if (unl.choco) part('shop.choco', () => bottle(730, '#7a5240', '可可'));
  if (unl.burger) {
  part('shop.bread', () => {
    // wicker bread basket with buns
    p.draw(S.curve([[570, 396], [572, 414], [616, 414], [618, 396]], false).concat([[570, 396]]), { fill: '#d9b98a', w: 1.6 });
    for (let x = 576; x < 616; x += 8) p.ink([[x, 398], [x + 2, 412]], { w: .8, color: '#b8956a' });
    for (const [x, y] of [[584, 392], [602, 391], [593, 386]]) p.draw(S.curve([[x - 10, y + 4], [x - 9, y - 3], [x, y - 7], [x + 9, y - 3], [x + 10, y + 4]], true, 4), { fill: '#e6b876', w: 1.1 });
    p.dot(590, 384, .9, '#fffaf0'); p.dot(598, 383, .9, '#fffaf0');
  });
  part('shop.lettuce', () => {
    // a bowl of lettuce
    p.draw(S.ell(644, 404, 20, 8, 0, Math.PI).concat([[624, 404]]), { fill: '#f3f7f2', w: 1.4 });
    for (const [x, y] of [[634, 400], [644, 396], [654, 400], [640, 402], [650, 403]]) p.draw(S.ell(x, y, 7, 5), { fill: '#a9d06a', w: .9 });
    p.ink(S.ell(644, 404, 20, 3.5), { w: 1.1, closed: true });
  });
  } else {
  part('shop.tipjar', () => {
    // tip jar
    p.draw(S.rect(790, 372, 50, 44, 10), { fill: '#eef5f8', fillAlpha: .7, w: 1.6 });
    for (const [x, y] of [[802, 406], [816, 404], [828, 407], [809, 396], [823, 397]]) p.dot(x, y, 5, C.gold, { line: C.line, w: .8 });
    p.draw(S.rect(786, 366, 58, 9, 3), { fill: '#d6b48a', w: 1.3 });
    const c = p.c; c.save(); c.font = '10px "LXGW WenKai", serif'; c.fillStyle = C.soft; c.textAlign = 'center'; c.fillText('小费', 815, 390); c.restore();
  });
  }
}

/* ---------------- a customer, seen from behind (hedgehog) ---------------- */
function custHedgehog(p) {
  // seen from behind: a round spiky back, two little ears, a green scarf knot
  p.wash(S.ell(80, 136, 54, 9), { color: '#7a6c66', alpha: .12, edge: 0 });
  p.draw(S.ell(62, 132, 12, 7), { fill: '#e7c9ad', w: 1.3 }); p.draw(S.ell(100, 132, 12, 7), { fill: '#e7c9ad', w: 1.3 });
  const back = []; for (let i = 0; i <= 30; i++) { const a = Math.PI * (.92 + i / 30 * 1.16), r = i % 2 ? 52 : 61; back.push([80 + Math.cos(a) * r, 96 + Math.sin(a) * r]); }
  back.push([128, 128], [32, 128]);
  p.draw(back, { fill: '#a8876d', w: 1.8 });
  p.wash(S.ell(80, 100, 40, 32), { color: '#bb9a7f', edge: 0, alpha: .8 });
  for (let i = 0; i < 26; i++) { const a = p.rand(Math.PI * 1.05, Math.PI * 1.95), r = p.rand(10, 46), x = 80 + Math.cos(a) * r, y = 100 + Math.sin(a) * r * .9; p.ink([[x, y], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]], { w: 1.3, color: '#7d6150', taper: true }); }
  p.draw(S.ell(56, 44, 8, 9), { fill: '#e7c9ad', w: 1.4 }); p.draw(S.ell(104, 44, 8, 9), { fill: '#e7c9ad', w: 1.4 });
  p.draw(S.curve([[34, 112], [80, 122], [126, 112], [126, 124], [80, 134], [34, 124]], true, 5), { fill: C.apple, w: 1.4 });
  p.draw([[96, 124], [102, 146], [112, 142], [106, 122]], { fill: C.apple, w: 1.3 });
  p.draw([[90, 124], [80, 144], [90, 146], [98, 124]], { fill: C.appleD, w: 1.3 });
}


/* ---------------- more customers, all seen from behind ---------------- */
function custSquirrel(p) {
  p.wash(S.ell(80, 138, 50, 8), { color: '#7a6c66', alpha: .12, edge: 0 });
  p.draw(S.curve([[104, 128], [138, 112], [150, 70], [134, 30], [104, 22], [92, 44], [112, 52], [124, 76], [112, 104], [96, 116]], true, 6), { fill: '#e2a774', w: 1.8 });
  p.wash(S.curve([[110, 110], [132, 92], [138, 64], [124, 40], [110, 38], [118, 64], [114, 96]], true, 6), { color: '#f1c89c', edge: 0, alpha: .8 });
  p.draw(S.ell(68, 104, 40, 36), { fill: '#d39360', w: 1.8 });
  p.draw(S.ell(68, 58, 28, 25), { fill: '#d39360', w: 1.6 });
  p.draw([[46, 44], [44, 22], [58, 38]], { fill: '#c98552', w: 1.4 }); p.draw([[90, 44], [92, 22], [78, 38]], { fill: '#c98552', w: 1.4 });
  p.draw(S.curve([[40, 80], [68, 88], [96, 80], [96, 90], [68, 98], [40, 90]], true, 5), { fill: C.pink, w: 1.3 });
  p.draw(S.ell(54, 138, 10, 6), { fill: '#c98552', w: 1.2 }); p.draw(S.ell(82, 138, 10, 6), { fill: '#c98552', w: 1.2 });
}
function custDuck(p) {
  p.wash(S.ell(80, 138, 46, 8), { color: '#7a6c66', alpha: .12, edge: 0 });
  p.draw(S.ell(64, 140, 11, 5), { fill: '#f0a868', w: 1.2 }); p.draw(S.ell(96, 140, 11, 5), { fill: '#f0a868', w: 1.2 });
  p.draw(S.ell(80, 104, 44, 36), { fill: '#f5dc86', w: 1.8 });
  p.draw([[76, 72], [80, 60], [86, 72]], { fill: '#f5dc86', w: 1.2 });
  p.draw(S.ell(80, 58, 27, 25), { fill: '#f5dc86', w: 1.6 });
  p.draw(S.ell(38, 104, 9, 18, 0, 6.29, .4), { fill: '#efd075', w: 1.3 }); p.draw(S.ell(122, 104, 9, 18, 0, 6.29, -.4), { fill: '#efd075', w: 1.3 });
  p.draw(S.curve([[60, 46], [80, 30], [100, 46], [96, 54], [64, 54]], true, 5), { fill: C.mist, w: 1.4 });
  p.draw([[80, 50], [66, 64], [74, 68]], { fill: C.mist, w: 1.2 }); p.draw([[80, 50], [94, 64], [86, 68]], { fill: C.mist, w: 1.2 });
}
function custBear(p) {
  p.wash(S.ell(80, 140, 52, 8), { color: '#7a6c66', alpha: .12, edge: 0 });
  p.draw(S.ell(80, 104, 48, 40), { fill: '#b98c69', w: 1.8 });
  p.draw(S.ell(80, 54, 32, 29), { fill: '#b98c69', w: 1.7 });
  p.draw(S.ell(54, 30, 11, 10), { fill: '#b98c69', w: 1.5 }); p.draw(S.ell(106, 30, 11, 10), { fill: '#b98c69', w: 1.5 });
  p.wash(S.ell(54, 31, 5, 5), { color: '#e2b9a0', edge: 0 }); p.wash(S.ell(106, 31, 5, 5), { color: '#e2b9a0', edge: 0 });
  p.ink([[58, 76], [62, 96]], { w: 2, color: '#8aa8c6' }); p.ink([[102, 76], [98, 96]], { w: 2, color: '#8aa8c6' });
  p.draw(S.rect(56, 84, 48, 46, 12), { fill: C.mist, w: 1.6 });
  p.draw(S.rect(62, 108, 36, 16, 5), { fill: '#c6d8e5', w: 1.2 });
  p.dot(80, 96, 3, C.apple, { line: C.line, w: .8 });
  p.draw(S.ell(80, 136, 7, 6), { fill: '#a87d5c', w: 1.2 });
}
function custSheep(p) {
  p.wash(S.ell(80, 140, 50, 8), { color: '#7a6c66', alpha: .12, edge: 0 });
  p.draw(S.rect(58, 120, 8, 22, 3), { fill: '#6f6662', w: 1.2 }); p.draw(S.rect(94, 120, 8, 22, 3), { fill: '#6f6662', w: 1.2 });
  const puffs = [[80, 104, 30], [54, 100, 20], [106, 100, 20], [62, 80, 20], [98, 80, 20], [80, 74, 22], [54, 120, 16], [106, 120, 16], [80, 124, 18]];
  for (const [x, y, r] of puffs) p.draw(S.ell(x, y, r, r * .92), { fill: '#fbf6ea', w: 1.4, line: C.soft });
  p.draw(S.ell(80, 50, 20, 19), { fill: '#6f6662', w: 1.4 });
  p.draw(S.ell(56, 52, 12, 6, 0, 6.29, .3), { fill: '#6f6662', w: 1.2 }); p.draw(S.ell(104, 52, 12, 6, 0, 6.29, -.3), { fill: '#6f6662', w: 1.2 });
  for (const [x, y] of [[72, 36], [82, 32], [90, 38]]) p.draw(S.ell(x, y, 8, 7), { fill: '#fbf6ea', w: 1.1, line: C.soft });
  p.draw(S.ell(80, 64, 9, 4), { fill: C.pink, w: 1 });
}

/* ---------------- dishes ---------------- */
const BASE_COL = { jelly: C.apple, pudding: '#f6e3a8', soda: '#a9c6e6' };
function drawDish(p, base, tops = []) {
  if (!base) return;
  let topY;
  p.wash(S.ell(50, 95, 30, 4), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
  if (base === 'soda') {
    p.wash([[34, 40], [66, 40], [64, 92], [36, 92]], { color: BASE_COL.soda, alpha: .9 });
    for (let i = 0; i < 6; i++) p.dot(p.rand(38, 62), p.rand(48, 88), 1.5, '#ffffff');
    p.draw(S.rect(40, 42, 12, 11, 2), { fill: '#eef6fb', w: 1, line: C.soft }); p.draw(S.rect(50, 48, 11, 10, 2), { fill: '#eef6fb', w: 1, line: C.soft });
    p.ink([[56, 46], [62, 14], [70, 10]], { w: 2.4, color: C.pinkD });
    p.draw([[32, 30], [68, 30], [66, 94], [34, 94]], { fill: C.mist, fillAlpha: .22, w: 1.7, blooms: 1 });
    p.ink([[37, 36], [38, 84]], { w: 1.6, color: '#ffffff' });
    topY = 32;
  } else {
    const col = BASE_COL[base];
    if (base === 'jelly') {
      p.draw(S.curve([[26, 60], [27, 44], [36, 34], [50, 30], [64, 34], [73, 44], [74, 60]], false).concat([[26, 60]]), { fill: col, w: 1.6 });
      p.draw(S.ell(41, 28, 4.5, 10, 0, 6.29, -.2), { fill: col, w: 1.2 }); p.draw(S.ell(59, 28, 4.5, 10, 0, 6.29, .2), { fill: col, w: 1.2 });
      p.dot(44, 46, 1.6, C.line); p.dot(56, 46, 1.6, C.line);
      p.wash(S.ell(38, 42, 3, 6, 0, 6.29, .5), { color: '#ffffff', edge: 0, alpha: .8 });
      topY = 30;
    } else {
      p.draw(S.curve([[28, 60], [30, 44], [40, 36], [60, 36], [70, 44], [72, 60]], false).concat([[28, 60]]), { fill: col, w: 1.6 });
      p.draw(S.curve([[34, 44], [42, 36], [58, 36], [66, 44], [58, 48], [42, 48]], true, 5), { fill: '#c99868', w: 1.2 });
      p.wash(S.ell(40, 52, 3, 5, 0, 6.29, .5), { color: '#ffffff', edge: 0, alpha: .7 });
      topY = 36;
    }
    p.wash([[24, 60], [76, 60], [71, 92], [29, 92]], { color: col, alpha: .55, edge: .1 });
    p.draw([[20, 58], [80, 58], [73, 94], [27, 94]], { fill: C.mist, fillAlpha: .25, w: 1.7, blooms: 1 });
    p.ink([[26, 64], [30, 88]], { w: 1.6, color: '#ffffff' });
  }
  if (tops.includes('cream')) p.draw(S.curve([[36, topY + 4], [40, topY - 8], [50, topY - 4], [52, topY - 16], [60, topY - 6], [66, topY + 4]], false).concat([[36, topY + 4]]), { fill: '#fffdf6', w: 1.4 });
  if (tops.includes('apple')) for (const [x, a] of [[30, -.5], [38, -.2]]) p.draw(S.ell(x, topY + 18, 11, 6, Math.PI, Math.PI * 2, a).concat([[x - 10, topY + 22]]), { fill: '#f6f2c4', w: 1.2, line: C.appleD });
  if (tops.includes('cookie')) { const x = 70, y = topY + 14; p.draw(S.ell(x, y, 10, 9), { fill: '#e9c48f', w: 1.3 }); p.draw(S.ell(x - 4, y - 11, 3, 6), { fill: '#e9c48f', w: 1 }); p.draw(S.ell(x + 4, y - 11, 3, 6), { fill: '#e9c48f', w: 1 }); p.dot(x - 3, y, 1.2, C.line); p.dot(x + 3, y, 1.2, C.line); }
}

/* ---------------- decorations (drawn into the back layer once bought) ---------------- */
const DECOR = THEME.shopDecor;      // theme/shop-decor.json
const HAND_DECOR = ['lights', 'chime', 'lamp', 'frame', 'rug', 'sapling'];
function drawDecor(p, d) {
  const part = (k, f) => Skin.part(p, k, f);
  // decorations added in the theme (not drawn by hand): their picture goes into their own box
  for (const dd of DECOR) if (d.has(dd.id) && dd.box && !HAND_DECOR.includes(dd.id))
    Skin.part(p, 'decor.' + dd.id, () => p.draw(S.rect(dd.box[0], dd.box[1], dd.box[2], dd.box[3], 8), { fill: '#fbf8f0', w: 1.4 }), dd.box);
  if (d.has('lights')) part('decor.lights', () => {
    const gy = x => 26 + Math.sin((x - 40) / 1120 * Math.PI) * 26;
    p.ink(S.curve([[30, 30], [300, 54], [600, 64], [900, 54], [1170, 30]]), { w: 1.2, color: C.soft });
    for (let x = 86, i = 0; x < 1150; x += 52, i++) {
      const y = gy(x) + 12, col = ['#ffe9a8', C.pink, C.appleL][i % 3];
      p.wash(S.ell(x, y + 6, 14, 14), { color: col, alpha: .35, edge: 0, off: 0 });
      p.draw(S.ell(x, y + 6, 5, 7), { fill: col, w: 1.1 });
    }
  });

  if (d.has('chime')) part('decor.chime', () => {
    p.ink([[440, 76], [440, 92]], { w: 1.2 });
    p.draw(S.ell(440, 96, 16, 6), { fill: C.white, w: 1.3 });
    for (const [x, h] of [[430, 22], [440, 30], [450, 20]]) { p.ink([[x, 98], [x, 104]], { w: 1 }); p.draw(S.rect(x - 3, 104, 6, h, 2), { fill: C.mist, w: 1.1 }); }
    p.ink([[440, 100], [440, 142]], { w: 1 }); p.draw(S.rect(433, 142, 14, 22, 2), { fill: C.appleL, w: 1.1 });
  });

  if (d.has('lamp')) part('decor.lamp', () => {
    p.draw(S.rect(330, 288, 26, 12, 3), { fill: C.woodD, w: 1.3 });
    p.wash(S.ell(343, 266, 30, 30), { color: '#fff1bf', alpha: .5, edge: 0, off: 0 });
    p.draw(S.ell(343, 270, 16, 18), { fill: '#fffaf0', w: 1.5 });
    p.draw(S.ell(336, 248, 4.5, 11, 0, 6.29, -.15), { fill: '#fffaf0', w: 1.2 }); p.draw(S.ell(350, 248, 4.5, 11, 0, 6.29, .15), { fill: '#fffaf0', w: 1.2 });
    p.dot(339, 270, 1.4, C.line); p.dot(347, 270, 1.4, C.line);
  });

  if (d.has('frame')) part('decor.frame', () => {
    p.c.save(); p.c.translate(140, -46);
    p.draw(S.rect(862, 126, 70, 82, 4), { fill: C.woodD, w: 1.6 });
    p.wash(S.rect(870, 134, 54, 66, 2), { color: '#fbe6ea' });
    p.draw(S.ell(884, 182, 10, 9), { fill: C.white, w: 1.1 }); p.draw(S.ell(881, 168, 3, 7), { fill: C.white, w: 1 }); p.draw(S.ell(888, 168, 3, 7), { fill: C.white, w: 1 });
    p.draw(S.ell(908, 156, 7, 7), { fill: '#f1d9c3', w: 1.1 }); p.draw([[900, 196], [902, 166], [914, 166], [916, 196]], { fill: C.apple, w: 1.1 });
    p.ink([[894, 178], [902, 172]], { w: 1.1 });
    p.c.restore();
  });

  if (d.has('rug')) part('decor.rug', () => {
    p.draw(S.ell(1104, 690, 84, 22), { fill: '#fbf6ea', w: 1.6 });
    for (let i = 0; i < 12; i++) p.dot(1104 + p.rand(-66, 66), 690 + p.rand(-12, 12), 2.4, C.apple);
    for (let x = 1028; x < 1184; x += 10) p.ink([[x, 708 - Math.abs(x - 1104) * .1], [x, 716 - Math.abs(x - 1104) * .1]], { w: 1, color: C.soft });
  });

  if (d.has('sapling')) part('decor.sapling', () => {
    p.draw([[1150, 712], [1146, 670], [1192, 670], [1188, 712]], { fill: '#e9b9a4', w: 1.6 });
    p.ink([[1168, 670], [1170, 600]], { w: 3, color: '#a58a6c' });
    for (const [x, y, r] of [[1154, 596, 20], [1184, 592, 22], [1168, 572, 22]]) p.draw(S.ell(x, y, r, r * .85), { fill: '#b9d88c', w: 1.3, line: C.soft });
    for (const [x, y] of [[1158, 600], [1180, 584], [1172, 606]]) p.dot(x, y, 4, '#e4f2a8', { line: C.soft, w: .8 });
  });

}
function decorIcon(p, id) {
  const at = { chime: [440, 120, 1.15], lamp: [343, 268, 1.5], frame: [1037, 121, .8], rug: [1104, 692, .4], sapling: [1170, 640, .5], lights: [300, 58, .32] }[id];
  const dd = DECOR.find(x => x.id === id); const at2 = at || (dd && dd.box ? [dd.box[0] + dd.box[2] / 2, dd.box[1] + dd.box[3] / 2, 70 / Math.max(dd.box[2], dd.box[3])] : [40, 40, 1]);
  p.c.save(); p.c.translate(40, 40); p.c.scale(at2[2], at2[2]); p.c.translate(-at2[0], -at2[1]);
  drawDecor(p, new Set([id]));
  p.c.restore();
}


/* ================= live station drawings (re-drawn when their state changes) =================
   Each drawer paints into its own small canvas; boxes are in shop logical coords (x, y, w, h). */
const BOX = {
  stove:   [30, 186, 136, 120],
  steamer: [166, 168, 124, 138],
  bowl:    [104, 334, 112, 86],
  board:   [212, 356, 124, 56],
  plate0:  [352, 334, 80, 80], plate1: [418, 334, 80, 80], plate2: [484, 334, 80, 80],
  griddle: [752, 350, 120, 70],
  fridge0: [656, 284, 50, 54], fridge1: [710, 284, 50, 54],
};
const STEEL = '#dfe4e6', BAMBOO = '#e6cc98', CUSTARD = '#f6e3a8', CARAMEL = '#b98150', JELLY = '#b7d86d';

function appleShape(p, x, y, r) {
  p.draw(S.curve([[x, y - r * .7], [x + r * .95, y - r * 1.05], [x + r * 1.15, y + r * .25], [x + r * .45, y + r * .95], [x, y + r * .85], [x - r * .45, y + r * .95], [x - r * 1.15, y + r * .25], [x - r * .95, y - r * 1.05]], true, 6), { fill: '#c3dd7c', w: 1.4 });
  p.ink([[x, y - r * .6], [x + r * .2, y - r * 1.15]], { w: 1.3 });
  p.draw(S.ell(x + r * .5, y - r * 1.05, r * .34, r * .15, 0, 6.29, -.5), { fill: '#86b04b', w: 1 });
  p.wash(S.ell(x - r * .4, y - r * .2, r * .16, r * .3, 0, 6.29, .5), { color: '#ffffff', edge: 0, alpha: .75 });
}
function cube(p, x, y, s, a = 0) {
  const co = Math.cos(a), si = Math.sin(a), pt = (u, v) => [x + u * co - v * si, y + u * si + v * co];
  p.draw([pt(-s, -s), pt(s, -s), pt(s, s), pt(-s, s)], { fill: '#f1f2c8', w: 1, line: '#93bb57', blooms: 0, edge: 0 });
}

function drawStove(p, s) {
  if (Skin.img(p, 'stove.' + (s.state === 'idle' ? (s.apple && s.gel ? 'full' : s.apple ? 'apple' : s.gel ? 'gel' : 'empty') : s.state))) return;
  const lit = s.state === 'cooking' || s.state === 'done' || s.state === 'burnt';
  // cassette stove body
  p.draw(S.rect(12, 92, 112, 22, 5), { fill: '#ece7db', w: 1.6 });
  p.draw(S.rect(84, 96, 30, 14, 3), { fill: '#d8d2c4', w: 1.1 });
  p.dot(99, 103, 4, lit ? '#e7849c' : '#bcb4a6', { line: C.line, w: .9 });
  p.ink([[22, 90], [114, 90]], { w: 1.6, color: '#7a6c66' });
  if (lit) for (let i = 0; i < 5; i++) { const x = 40 + i * 14; p.draw([[x - 4, 90], [x, 79 - (i % 2) * 3], [x + 4, 90]], { fill: '#9fc1ee', w: .8, line: '#7fa3d6', blooms: 0 }); }
  // pot
  p.draw(S.rect(4, 56, 20, 7, 3), { fill: STEEL, w: 1.2 });
  p.draw(S.rect(108, 54, 26, 7, 3), { fill: '#7b6a58', w: 1.2 });
  p.draw(S.curve([[24, 50], [24, 76], [30, 84], [102, 84], [108, 76], [108, 50]], false).concat([[24, 50]]), { fill: STEEL, w: 1.7 });
  p.ink([[30, 58], [30, 78]], { w: 1.4, color: '#ffffff' });
  // what's inside, seen over the rim
  let col = '#b9c0c3';
  if (s.state === 'cooking') col = '#cfe597'; else if (s.state === 'done') col = '#a9d062'; else if (s.state === 'burnt') col = '#6e5646';
  else if (s.apple && s.gel) col = '#e1ecc0'; else if (s.gel) col = '#eef3e3'; else if (s.apple) col = '#d7dcd0';
  p.draw(S.ell(66, 50, 42, 8), { fill: col, w: 1.5 });
  if (s.state === 'idle' && s.apple) for (let i = 0; i < 6; i++) cube(p, 42 + i * 9, 50 + (i % 2) * 2, 3, i);
  if (s.state === 'idle' && s.gel) { p.draw(S.rect(70, 45, 22, 8, 2), { fill: '#fbf8e8', fillAlpha: .7, w: .9, line: C.soft }); }
  if (s.state === 'cooking') for (let i = 0; i < 6; i++) p.dot(40 + i * 10, 49 + (i % 2) * 2, 2.2, '#f2f8de', { line: '#93bb57', w: .6 });
  if (s.state === 'done') p.wash(S.ell(52, 48, 10, 2.4), { color: '#ffffff', edge: 0, alpha: .8 });
  if (s.state === 'burnt') for (let i = 0; i < 4; i++) p.dot(46 + i * 12, 50, 2.6, '#4b3a30');
}

function drawSteamer(p, s) {
  if (Skin.img(p, 'steamer.' + (s.state === 'reserved' ? 'empty' : s.state))) return;
  p.draw(S.curve([[16, 108], [16, 124], [22, 130], [102, 130], [108, 124], [108, 108]], false).concat([[16, 108]]), { fill: STEEL, w: 1.6 });
  p.ink([[22, 112], [22, 126]], { w: 1.2, color: '#ffffff' });
  const tier = (y0, y1) => {
    p.draw(S.rect(10, y0, 104, y1 - y0, 6), { fill: BAMBOO, w: 1.6 });
    p.ink([[12, y0 + 6], [112, y0 + 6]], { w: 1, color: '#c4a46c' }); p.ink([[12, y1 - 6], [112, y1 - 6]], { w: 1, color: '#c4a46c' });
    for (let x = 18; x < 110; x += 9) p.ink([[x, y0 + 8], [x + 1, y1 - 8]], { w: .7, color: '#c9ab76' });
  };
  tier(82, 108); tier(56, 82);
  const lift = s.state === 'done' ? 8 : 0;
  if (s.state === 'done') for (let i = 0; i < 3; i++) p.draw(S.ell(34 + i * 28, 54, 10, 4), { fill: CUSTARD, w: 1 });
  p.draw(S.ell(62, 56 - lift, 54, 26, Math.PI, Math.PI * 2).concat([[8, 56 - lift]]), { fill: '#e2c48c', w: 1.6 });
  for (let i = 1; i < 6; i++) p.ink(S.ell(62, 56 - lift, 54 - i * 9, 26 - i * 4.4, Math.PI * 1.05, Math.PI * 1.95), { w: .7, closed: false, color: '#c4a46c' });
  p.draw(S.ell(62, 28 - lift, 9, 5), { fill: '#d0ae72', w: 1.2 });
  if (s.state === 'burnt') { p.wash(S.rect(8, 26, 108, 84, 10), { color: '#5d4a3e', alpha: .38, edge: 0 }); }
}

function drawBowl(p, s) {
  if (Skin.img(p, 'bowl.' + (s.mixed ? (s.flour ? 'batter' : 'mixed') : s.egg && s.milk && (s.sugar || s.flour) ? 'ready' : s.egg || s.milk || s.sugar || s.flour ? 'partial' : 'empty'))) return;
  // back rim + inside
  p.draw(S.ell(56, 44, 48, 12), { fill: '#ece5d6', w: 1.5 });
  const any = s.egg || s.milk || s.sugar || s.flour;
  if (any) {
    const k = s.mixed ? 1 : s.stir / 3;
    const base = s.milk ? '#fffdf6' : '#f7efd9';
    const mix = k > 0 ? (k >= 1 ? (s.flour ? '#f1d6a4' : CUSTARD) : '#fbf0cf') : (s.flour && !s.milk ? '#f7f3ea' : base);
    p.draw(S.ell(56, 47, 40, 8), { fill: mix, w: 1, line: C.soft });
    if (!s.mixed && s.egg && s.stir < 2) { p.draw(S.ell(46, 46, 7, 4.5), { fill: '#f5c35a', w: 1, line: '#d9a043' }); p.draw(S.ell(64, 48, 7, 4.5), { fill: '#f5c35a', w: 1, line: '#d9a043' }); }
    if (!s.mixed && s.flour && s.stir < 2) p.wash(S.ell(58, 46, 16, 4), { color: '#ffffff', edge: 0, alpha: .9 });
    if (!s.mixed && s.sugar && s.stir < 2) for (let i = 0; i < 9; i++) p.dot(30 + p.rand(0, 52), 44 + p.rand(0, 7), .9, '#ffffff', { line: '#cfc6b4', w: .4 });
    if (k > 0) p.ink(S.curve([[34, 47], [46, 43], [58, 50], [70, 44], [80, 48]]), { w: 1, color: '#e3cf98' });
  }
  // whisk
  if (s.stir > 0 || s.mixed) {
    const a = -.5 + (s.stir % 2) * .5;
    const hx = 58 + Math.cos(a - 1.2) * 46, hy = 46 + Math.sin(a - 1.2) * 46;
    p.ink([[58, 46], [hx, hy]], { w: 2.4, color: '#a39089' });
    for (const r of [5, 8]) p.ink(S.ell(58, 50, r, 8, 0, 6.29, a), { w: 1, closed: true, color: '#bdb5aa' });
  }
  // front of the bowl (ceramic, blue band)
  const front = S.ell(56, 44, 48, 12, 0, Math.PI).reverse().concat(S.curve([[8, 44], [12, 62], [30, 78], [56, 82], [82, 78], [100, 62], [104, 44]]));
  p.draw(front, { fill: '#faf7f0', w: 1.7 });
  p.ink(S.curve([[12, 58], [34, 68], [56, 70], [78, 68], [100, 58]]), { w: 2.4, color: '#a9c3df' });
  p.ink([[18, 52], [22, 64]], { w: 1.3, color: '#ffffff' });
}

function limeWheel(p, x, y, r) {
  p.draw(S.ell(x, y, r, r * .92), { fill: '#e9f3b0', w: 1, line: '#7c9a3a' });
  p.ink(S.ell(x, y, r * .78, r * .72), { w: 1.6, closed: true, color: '#b6d24e' });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; p.ink([[x, y], [x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .65]], { w: .7, color: '#cfe07a' }); }
}
/* a tall glass of lime soda: ice, lime wheel on the rim, soda (level 0..1 or full), straw when done */
function drawDrink(p, st) {
  const x0 = 26, x1 = 54, top = 24, bot = 72;
  const lvl = st.soda ? .86 : (st.level || 0);
  p.wash(S.ell(40, bot + 2, 16, 3), { color: '#7a6c66', alpha: .12, edge: 0, off: 0 });
  p.draw(S.curve([[x0, top], [x0 + 2, bot], [x1 - 2, bot], [x1, top]], false).concat([[x0, top]]), { fill: '#f3f9fb', fillAlpha: .45, w: 1.4 });
  if (lvl > 0) {
    const y = bot - (bot - top) * Math.min(1, lvl);
    p.wash(S.rect(x0 + 2, y, x1 - x0 - 4, bot - y - 1), { color: st.melted ? '#e4eef2' : '#cdeedd', alpha: .95, edge: .15, off: 0 });
    if (!st.melted) for (let i = 0; i < 7; i++) p.dot(p.rand(x0 + 5, x1 - 5), p.rand(y + 3, bot - 4), 1.1, '#ffffff', { line: '#a3bfdd', w: .5 });
  }
  const ice = st.melted ? [[37, 62, 3.5, .2], [45, 66, 3, -.3]] : [[34, 60, 5, .2], [45, 56, 5, -.3], [40, 66, 4.5, .5]];
  for (const [x, y, r, a] of ice) { p.c.save(); p.c.translate(x, y); p.c.rotate(a); p.draw(S.rect(-r, -r, r * 2, r * 2, 1.5), { fill: '#f6fbfd', fillAlpha: .8, w: .9, line: '#9fbedf' }); p.c.restore(); }
  if (st.lime) limeWheel(p, x1 - 3, top + 4, 8);
  if (st.soda) { p.ink([[44, 64], [50, top - 12], [56, top - 16]], { w: 3, color: C.pinkD }); p.ink([[44, 64], [50, top - 12], [56, top - 16]], { w: 1, color: '#ffffff' }); }
  p.ink([[x0 + 4, top + 6], [x0 + 5, bot - 8]], { w: 1.4, color: '#ffffff' });
}
function drawBoard(p, s) {
  if (Skin.img(p, 'board.' + (s.state === 'apple' ? 'apple' : s.state === 'chopped' ? 'chopped' : 'empty'))) return;
  // knife resting along the top edge
  p.draw([[70, 18], [104, 16], [106, 22], [72, 23]], { fill: '#e7eaec', w: 1.1 });
  p.draw(S.rect(104, 14, 16, 8, 3), { fill: '#8d7660', w: 1.1 });
  if (s.fruit === 'lime') {
    if (s.state === 'apple') { p.draw(S.ell(46, 30, 13, 11), { fill: '#c3dc5c', w: 1.2 }); for (let k = 0; k < s.chop; k++) p.ink([[38 + k * 9, 19], [36 + k * 9, 41]], { w: 1.2, color: '#7c9a3a' }); }
    if (s.state === 'chopped') for (let i = 0; i < 4; i++) limeWheel(p, 26 + i * 15, 34 + (i % 2) * 4, 7);
    return;
  }
  if (s.state === 'apple') { if (s.chop === 0) appleShape(p, 46, 26, 14);
    else { p.draw(S.ell(38, 30, 12, 13, Math.PI * .5, Math.PI * 1.5).concat([[38, 17]]), { fill: '#f1f2c8', w: 1.1, line: '#93bb57' }); p.draw(S.ell(56, 30, 12, 13, -Math.PI * .5, Math.PI * .5).concat([[56, 43]]), { fill: '#f1f2c8', w: 1.1, line: '#93bb57' });
      if (s.chop > 1) for (let i = 0; i < 3; i++) cube(p, 30 + i * 13, 44, 3.5, i); } }
  if (s.state === 'chopped') for (let i = 0; i < 9; i++) cube(p, 22 + (i % 5) * 11 + (i > 4 ? 6 : 0), 32 + (i > 4 ? 10 : 0), 4, i * .7);
}

function drawPlateItem(p, it) {
  if (!it) return;
  const plain = (it.dish === 'pudding' && !it.caramel) || (it.dish === 'choco' && !it.sauce) || (it.dish === 'lime' && !it.soda);
  if (it.dish !== 'burger' && Skin.img(p, `dish.${it.dish}${plain ? '.plain' : ''}`)) return;
  if (it.dish === 'burger' && (it.layers || []).length === 5 && !it.messy && Skin.img(p, 'dish.burger')) return;
  if (it.dish === 'lime') return drawDrink(p, it);
  if (it.dish === 'burger') {
    let y = 70; const L = it.layers || [];
    L.forEach((id, i) => { const tilt = it.messy ? (i % 2 ? .18 : -.14) : 0; burgerLayer(p, id, 40 + (it.messy ? (i % 2 ? 5 : -5) : 0), y, tilt); y -= LAYER_H[id]; });
    return;
  }
  if (it.dish === 'choco') {
    for (const [y, w] of [[68, 22], [62, 21]]) { p.draw(S.curve([[40 - w, y], [40 - w, y - 4], [40 + w, y - 4], [40 + w, y]], true, 4).concat(S.ell(40, y, w, 3, 0, Math.PI)), { fill: '#d9a35c', w: 1.1 }); p.draw(S.ell(40, y - 4, w, 3), { fill: '#e6b876', w: 1 }); }
    p.draw(S.rect(35, 50, 9, 6, 1.5), { fill: '#fbefc4', w: .8 });
    if (it.sauce) p.draw(S.curve([[22, 57], [30, 55], [36, 60], [44, 54], [52, 59], [58, 56], [57, 62], [50, 60], [46, 66], [40, 60], [32, 64], [26, 60]], true, 4), { fill: '#6e4634', w: 1 });
    return;
  }
  if (it.dish === 'pudding') {
    p.draw(S.curve([[22, 70], [24, 48], [30, 40], [50, 40], [56, 48], [58, 70]], false).concat([[22, 70]]), { fill: CUSTARD, w: 1.5 });
    p.wash(S.ell(32, 54, 3, 7, 0, 6.29, .2), { color: '#ffffff', edge: 0, alpha: .7 });
    if (it.caramel) { p.draw(S.curve([[28, 44], [33, 38], [47, 38], [52, 44], [52, 52], [49, 48], [46, 55], [43, 47], [38, 52], [35, 46], [31, 51]], true, 5), { fill: CARAMEL, w: 1.1 }); }
    else p.draw(S.ell(40, 41, 12, 3), { fill: '#fbefc4', w: 1 });
  } else if (it.dish === 'jelly') {
    p.draw(S.curve([[18, 70], [19, 54], [26, 44], [40, 39], [54, 44], [61, 54], [62, 70]], false).concat([[18, 70]]), { fill: JELLY, w: 1.5 });
    p.draw(S.ell(31, 34, 5, 11, 0, 6.29, -.2), { fill: JELLY, w: 1.2 }); p.draw(S.ell(49, 34, 5, 11, 0, 6.29, .2), { fill: JELLY, w: 1.2 });
    p.dot(34, 54, 1.7, C.line); p.dot(46, 54, 1.7, C.line);
    p.ink([[38, 59], [42, 63]], { w: 1.1 }); p.ink([[42, 59], [38, 63]], { w: 1.1 });
    p.wash(S.ell(27, 50, 3, 7, 0, 6.29, .4), { color: '#ffffff', edge: 0, alpha: .8 });
  }
}
/* double griddle on the counter: two wells, each frying one thing */
function friedThing(p, cx, cy, sl) {
  if (!sl) return;
  const fk = Skin.pick([`fry.${sl.item}.${sl.state}`, `fry.${sl.item}.${sl.state === 'burnt' ? 'burnt' : sl.state === 'done' ? 'done' : 'raw'}`]);
  if (fk && Skin.img(p, fk, [cx - 25, cy - 12, 50, 24])) return;
  const burnt = sl.state === 'burnt', done = sl.state === 'done';
  if (sl.item === 'egg') {
    const white = S.curve([[cx - 16, cy], [cx - 12, cy - 5], [cx - 2, cy - 7], [cx + 10, cy - 6], [cx + 17, cy - 1], [cx + 12, cy + 4], [cx, cy + 5], [cx - 12, cy + 4]], true, 5);
    p.draw(white, { fill: burnt ? '#8a6a52' : done ? '#fffaf0' : '#f4f1ea', fillAlpha: done || burnt ? 1 : .75, w: 1 });
    p.draw(S.ell(cx + 1, cy - 1, 5, 3.5), { fill: burnt ? '#5d4434' : '#f5b84a', w: .9 });
  } else if (sl.item === 'pine') {
    p.draw(S.ell(cx, cy, 15, 6), { fill: burnt ? '#6e5646' : done ? '#e9b44c' : '#f6d76a', w: 1.1 });
    p.draw(S.ell(cx, cy, 4.5, 2), { fill: '#3f423d', w: .8 });
    if (done) for (const dx of [-8, 0, 8]) p.ink([[cx + dx - 3, cy - 4], [cx + dx + 3, cy + 4]], { w: 1, color: '#b9802f' });
  } else if (sl.item === 'cake') {
    const top = burnt ? '#6e5646' : (sl.state === 'cooking2' || done) ? '#d9a35c' : '#f3dcae';
    p.draw(S.ell(cx, cy, 20, 6.5), { fill: top, w: 1.1 });
    if (sl.state === 'cooking' || sl.state === 'flip') for (let i = 0; i < 5; i++) p.dot(cx + p.rand(-12, 12), cy + p.rand(-3, 3), 1.2, '#fbefd6', { line: '#d9b98a', w: .4 });
    if (sl.state === 'flip') p.wash(S.ell(cx, cy + 4, 20, 2.5), { color: '#c9893f', edge: 0, alpha: .9 });
  }
}
function drawGriddle(p, slots) {
  if (Skin.img(p, 'griddle')) { for (const [i, cx] of [[0, 35], [1, 85]]) friedThing(p, cx, 44, slots[i]); return; }
  // a low cast-iron double pan with wooden handles, seen from slightly above
  p.wash(S.ell(60, 64, 60, 6), { color: '#7a6c66', alpha: .14, edge: 0, off: 0 });
  p.draw(S.rect(-2, 44, 14, 7, 3), { fill: '#b8916a', w: 1.2 }); p.draw(S.rect(108, 44, 14, 7, 3), { fill: '#b8916a', w: 1.2 });
  p.draw(S.rect(8, 30, 104, 32, 12), { fill: '#7d817a', w: 1.7 });
  p.ink([[14, 56], [106, 56]], { w: 1, color: '#9da19a' });
  for (const [i, cx] of [[0, 35], [1, 85]]) {
    p.draw(S.ell(cx, 44, 23, 11), { fill: '#5b5f59', w: 1.3 });
    p.ink(S.ell(cx, 45, 18, 7.5, Math.PI * 1.1, Math.PI * 1.6), { w: 1, color: '#8b8f88' });
    friedThing(p, cx, 44, slots[i]);
    const sl = slots[i];
    if (sl && sl.state !== 'burnt') for (const dx of [-6, 4]) p.ink([[cx + dx, 30], [cx + dx + 3, 24], [cx + dx, 18]], { w: 1, color: '#ffffffaa' });
  }
}
const LAYER_H = { bunB: 9, lettuce: 4, pine: 5, egg: 5, cheese: 4, bunT: 15 };
const BURGER_LAYERS = ['bunB', 'lettuce', 'pine', 'egg', 'bunT'];
function burgerLayer(p, id, cx, y, tilt) {     // y = bottom of this layer
  p.c.save(); p.c.translate(cx, y); p.c.rotate(tilt);
  if (Skin.img(p, 'layer.' + id, [-24, -18, 48, 19])) { p.c.restore(); return; }
  if (id === 'bunB') p.draw(S.curve([[-20, 0], [-21, -6], [-18, -9], [18, -9], [21, -6], [20, 0]], true, 4), { fill: '#e6b876', w: 1.2 });
  if (id === 'lettuce') p.draw(S.curve([[-23, -1], [-16, -5], [-8, -2], [0, -5], [8, -2], [16, -5], [23, -1], [16, 1], [-16, 1]], true, 4), { fill: '#a9d06a', w: 1 });
  if (id === 'pine') { p.draw(S.rect(-17, -5, 34, 5, 2), { fill: '#e9b44c', w: 1 }); p.ink([[-8, -4], [-4, -1]], { w: .9, color: '#b9802f' }); p.ink([[4, -4], [8, -1]], { w: .9, color: '#b9802f' }); }
  if (id === 'egg') { p.draw(S.curve([[-20, 0], [-16, -4], [-4, -6], [10, -5], [20, -1], [10, 1], [-10, 1]], true, 4), { fill: '#fffaf0', w: 1 }); p.draw(S.ell(2, -3, 5, 2.5), { fill: '#f5b84a', w: .8 }); }
  if (id === 'cheese') p.draw([[-19, -4], [19, -4], [21, 0], [14, 3], [8, 0], [-8, 0], [-14, 4], [-21, 0]], { fill: '#f6d76a', w: 1 });
  if (id === 'bunT') { p.draw(S.curve([[-21, 0], [-20, -8], [-12, -15], [0, -17], [12, -15], [20, -8], [21, 0]], false).concat([[-21, 0]]), { fill: '#e6b876', w: 1.3 }); for (const [x, yy] of [[-8, -11], [0, -14], [8, -11], [-3, -8], [6, -7]]) p.dot(x, yy, 1.1, '#fffaf0'); }
  p.c.restore();
}
function drawOrder(p, dish) {
  p.draw(S.ell(40, 72, 34, 8), { fill: '#ffffff', w: 1.4 });
  drawPlateItem(p, { dish, caramel: true, sauce: true, layers: BURGER_LAYERS });
}

function drawMagnet(p, slot) {
  if (Skin.img(p, 'magnet.' + slot.state)) return;
  if (slot.state === 'empty') { p.ink(S.rect(6, 6, 38, 42, 8), { w: 1, closed: true, color: '#b9c7b2' }); return; }
  const ready = slot.state === 'ready';
  p.draw(S.rect(4, 6, 42, 44, 9), { fill: ready ? '#f4f9ea' : '#eef5f7', w: 1.3 });
  p.draw(S.curve([[12, 42], [13, 32], [18, 26], [25, 24], [32, 26], [37, 32], [38, 42]], false).concat([[12, 42]]), { fill: ready ? JELLY : '#dbead0', w: 1.2 });
  p.draw(S.ell(20, 21, 3, 7, 0, 6.29, -.2), { fill: ready ? JELLY : '#dbead0', w: 1 }); p.draw(S.ell(30, 21, 3, 7, 0, 6.29, .2), { fill: ready ? JELLY : '#dbead0', w: 1 });
  if (!ready) for (let i = 0; i < 6; i++) p.dot(p.rand(10, 40), p.rand(12, 44), 1.1, '#ffffff', { line: '#bcd3e3', w: .5 });
}

function drawCarry(p, id) {
  if (Skin.img(p, 'carry.' + id)) return;
  switch (id) {
    case 'egg': p.draw(S.ell(30, 32, 11, 14), { fill: '#fbf2e2', w: 1.4 }); break;
    case 'milk': p.draw(S.curve([[22, 50], [21, 28], [26, 20], [27, 12], [33, 12], [34, 20], [39, 28], [38, 50]], true, 6), { fill: '#fdfcf8', w: 1.4 }); p.draw(S.rect(26, 7, 8, 6, 2), { fill: '#9fbedf', w: 1 }); break;
    case 'sugar': p.draw(S.curve([[12, 34], [48, 34], [44, 46], [16, 46]], true, 4), { fill: '#e2e6ea', w: 1.3 }); for (let i = 0; i < 8; i++) p.dot(p.rand(18, 42), p.rand(30, 36), 1.2, '#ffffff', { line: '#cfc6b4', w: .4 }); p.ink([[48, 38], [58, 30]], { w: 2, color: C.soft }); break;
    case 'apple': appleShape(p, 30, 34, 13); break;
    case 'gel': p.draw(S.rect(16, 20, 28, 22, 2), { fill: '#fbf8e8', fillAlpha: .85, w: 1.2 }); p.ink([[20, 26], [40, 26]], { w: .8, color: C.soft }); p.ink([[20, 32], [40, 32]], { w: .8, color: C.soft }); break;
    case 'chopped': p.draw(S.ell(30, 38, 20, 9, 0, Math.PI).concat([[10, 38]]), { fill: '#faf7f0', w: 1.3 }); for (let i = 0; i < 5; i++) cube(p, 18 + i * 6, 34 - (i % 2) * 3, 3.2, i); break;
    case 'batter': for (const x of [20, 40]) { p.draw([[x - 9, 30], [x + 9, 30], [x + 7, 46], [x - 7, 46]], { fill: '#f7f1e2', w: 1.2 }); p.draw(S.ell(x, 30, 9, 3), { fill: '#fbefc4', w: .9 }); } break;
    case 'mold': p.draw(S.rect(10, 26, 40, 22, 6), { fill: '#e3e8ea', w: 1.3 }); p.draw(S.ell(30, 27, 18, 5), { fill: '#cfe597', w: 1 }); break;
    case 'caramel': p.draw(S.curve([[22, 50], [21, 26], [26, 20], [34, 20], [39, 26], [38, 50]], true, 6), { fill: '#c99868', w: 1.3 }); p.ink([[30, 20], [30, 10]], { w: 1.8 }); break;
    case 'pine': p.draw(S.ell(30, 34, 16, 7), { fill: '#f6d76a', w: 1.2 }); p.draw(S.ell(30, 34, 5, 2.2), { fill: '#fffdf6', w: .8 }); break;
    case 'flour': p.draw(S.curve([[14, 50], [12, 26], [20, 16], [30, 20], [40, 14], [48, 26], [46, 50]], true, 6), { fill: '#f3ecdc', w: 1.3 }); break;
    case 'bunB': case 'lettuce': case 'cheese': case 'bunT': case 'eggC': case 'pineC':
      burgerLayer(p, id === 'eggC' ? 'egg' : id === 'pineC' ? 'pine' : id, 30, 40, 0); break;
    case 'cakeC': p.draw(S.ell(30, 36, 20, 6.5), { fill: '#d9a35c', w: 1.1 }); break;
    case 'chocoB': p.draw(S.curve([[22, 50], [21, 26], [26, 20], [34, 20], [39, 26], [38, 50]], true, 6), { fill: '#7a5240', w: 1.3 }); p.ink([[30, 20], [30, 10]], { w: 1.8 }); break;
    case 'cup': p.c.save(); p.c.translate(9, 4); p.c.scale(.62, .62); drawDrink(p, carryItem || { ice: true }); p.c.restore(); break;
    case 'lime': p.draw(S.ell(30, 34, 11, 9.5), { fill: '#c3dc5c', w: 1.3 }); p.dot(27, 30, 1.6, '#f4f7d0'); break;
    case 'limeSlice': limeWheel(p, 24, 36, 8); limeWheel(p, 38, 34, 8); break;
    case 'burger': case 'choco':
    case 'pudding': case 'jelly': p.c.save(); p.c.translate(5, 2); p.c.scale(.62, .62); p.draw(S.ell(40, 72, 34, 8), { fill: '#ffffff', w: 1.4 }); drawPlateItem(p, carryItem || { dish: id, caramel: true }); p.c.restore(); break;
  }
}
let carryItem = null;
function setCarryItem(it) { carryItem = it; }

// theme/customers.json; the drawing comes from the image in the theme (later) or the built-in hand drawing by id
const CUST_DRAW = { hedgehog: custHedgehog, squirrel: custSquirrel, duck: custDuck, bear: custBear, sheep: custSheep };
const CUSTOMERS = THEME.customers.map(c => { const hand = CUST_DRAW[c.id] || custHedgehog; return { ...c, hand, draw: p => Skin.img(p, 'customer.' + c.id) || hand(p) }; });
for (const c of CUSTOMERS) Skin.add('customer.' + c.id, `客人：${c.name}（背影）`, '客人', [0, 0, 170, 160], { draw: c.hand, kind: 'small' });


/* ================= adapters: generic kitchen state (theme/kitchen.json) → this theme's drawings =================
   bench: { inputs, taps, made }   cooker slot: { inputs, state: idle|cooking|flip|cooking2|done|burnt, t, rule }
   plate: { dish, base, tops, layers, messy } */
const hasIn = (st, x) => st.inputs.includes(x);
const LAYER_ART = { lettuce: 'lettuce', friedPine: 'pine', friedEgg: 'egg' };
function toArtPlate(it) {
  if (!it) return null;
  if (it.layers) return { dish: it.dish, messy: it.messy, layers: it.layers.map((l, i) => l === 'bun' ? (i === 0 ? 'bunB' : 'bunT') : LAYER_ART[l] || l) };
  const tops = it.tops || [];
  return { dish: it.dish, caramel: tops.includes('caramel'), sauce: tops.includes('chocoSauce'), lime: tops.includes('limeSlice'), soda: tops.includes('soda'), melted: !!it.melted, tops };
}
const FRY_ART = { egg: 'egg', pine: 'pine', batter: 'cake' };
const STATION_DRAW = {
  bowl: (p, b) => drawBowl(p, { egg: hasIn(b, 'egg'), milk: hasIn(b, 'milk'), sugar: hasIn(b, 'sugar'), flour: hasIn(b, 'flour'), stir: b.taps, mixed: !!b.made }),
  board: (p, b) => drawBoard(p, { state: b.made ? 'chopped' : (hasIn(b, 'apple') || hasIn(b, 'lime')) ? 'apple' : 'empty', fruit: hasIn(b, 'lime') || b.made === 'limeSlice' ? 'lime' : 'apple', chop: b.taps }),
  // the glass being filled, shown in a little bubble so she doesn't hide it while standing at the tap
  sodaCup: (p, f) => { if (!f.cup || (f.state !== 'ready' && f.state !== 'filling' && f.state !== 'back')) return;
    p.draw(S.rect(2, 2, 50, 66, 12), { fill: '#fffdf6', w: 1.6 }); p.draw([[18, 66], [26, 74], [30, 66]], { fill: '#fffdf6', w: 1.4 });
    p.c.save(); p.c.translate(-9, -4); p.c.scale(.9, .9); drawDrink(p, { ...toArtPlate(f.cup), level: f.level, soda: f.state === 'back' }); p.c.restore(); },
  stove: (p, sl) => drawStove(p, { state: sl.state, apple: hasIn(sl, 'chopped'), gel: hasIn(sl, 'gel'), t: sl.t }),
  steamer: (p, sl) => drawSteamer(p, { state: { idle: 'empty', cooking: 'steaming' }[sl.state] || sl.state, t: sl.t }),
  magnet: (p, sl) => drawMagnet(p, { state: { idle: 'empty', cooking: 'chill', done: 'ready' }[sl.state] || sl.state, t: sl.t }),
  griddle: (p, slots) => drawGriddle(p, slots.map(sl => sl.state === 'idle' ? null : { item: FRY_ART[sl.inputs[0]] || sl.inputs[0], state: sl.state, t: sl.t })),
};
function drawStation(p, name, st) { const f = STATION_DRAW[name]; if (f) f(p, st); }
function drawPlate(p, it) { drawPlateItem(p, toArtPlate(it)); }

/* ================= replaceable elements (theme images override these; see theme/README.md) ================= */
{
  const ALL = new Set(DECOR.map(d => d.id)), ON = Object.fromEntries(THEME.dishes.map(d => [d.id, true])), OFF = {};
  const scene = (key, label, box, unl = ON, opt = {}) => Skin.add(key, label, '店面', box, { ...opt, draw: p => { drawBack(p, ALL, unl); drawFront(p, unl); } });
  scene('shop.room', '墙、墙裙、地板、彩旗（整张底图）', [0, 0, 1200, 720], ON, { fit: 'stretch', kind: 'scene' });
  scene('shop.shelves', '原料架（两层木板）', [28, 116, 256, 112]);
  scene('shop.egg', '蛋托（拿鸡蛋）', [44, 78, 80, 46]);
  scene('shop.milk', '牛奶瓶', [124, 66, 56, 58]);
  scene('shop.sugar', '糖罐', [186, 74, 52, 50]);
  scene('shop.flour', '面粉袋（第 5 天起）', [238, 84, 42, 40]);
  scene('shop.clover', '三叶草小盆（面粉解锁前）', [244, 88, 34, 34], OFF);
  scene('shop.apple', '青苹果篮', [38, 138, 94, 60]);
  scene('shop.gel', '吉利丁盒', [146, 148, 72, 50]);
  scene('shop.honey', '蜂蜜罐（装饰）', [224, 158, 44, 38]);
  scene('shop.backCounter', '后面的操作台（放锅和蒸笼）', [20, 290, 294, 162]);
  scene('shop.windowView', '窗外风景（玻璃里面）', [326, 90, 228, 200], ON, { fit: 'stretch' });
  scene('shop.window', '窗框、窗台、小盆栽（玻璃要透明）', [296, 86, 290, 232]);
  scene('shop.curtains', '窗帘（左右两片 + 帘杆）', [262, 52, 356, 282]);
  scene('shop.fridge', '冰箱', [636, 146, 166, 318]);
  scene('shop.chalkboard', '黑板（菜单字是网页文字，不用画）', [806, 40, 124, 176]);
  scene('shop.rack', '墙上挂架：菠萝罐 + 煎蛋用鸡蛋（第 3 天起）', [594, 196, 50, 124]);
  scene('shop.bell', '出餐吊铃（门右边墙上）', [1150, 186, 50, 118]);
  scene('shop.lamp', '吊灯', [574, 0, 64, 84]);
  scene('shop.door', '门（含门铃）', [940, 164, 212, 402]);
  scene('shop.doormat', '门垫', [966, 564, 164, 30]);
  scene('shop.basketBed', '门边的小篮子窝', [852, 600, 156, 96]);
  scene('shop.counter', '前柜台（台面 + 前板 + 花边）', [24, 410, 850, 310], ON, { fit: 'stretch', kind: 'scene' });
  scene('shop.emblem', '柜台上的兔子徽章', [380, 500, 140, 128]);
  scene('shop.board', '砧板（空）', [212, 392, 138, 22]);
  scene('shop.plate', '出餐盘（空盘，3 个共用一张）', [360, 396, 64, 20]);
  scene('shop.caramel', '焦糖瓶', [672, 340, 36, 76]);
  scene('shop.choco', '巧克力酱瓶（第 5 天起）', [712, 340, 36, 76]);
  scene('shop.bread', '面包篮（第 3 天起）', [568, 378, 52, 38]);
  scene('shop.lettuce', '生菜碗（第 3 天起）', [622, 392, 44, 20]);
  scene('shop.tipjar', '小费罐（汉堡解锁前）', [784, 364, 62, 54], OFF);
  scene('shop.drinkBar', '饮料小吧台（柜子，第 7 天起）', [788, 320, 156, 244]);
  scene('shop.soda', '墙上的苏打水龙头', [882, 222, 64, 78]);
  scene('shop.iceBucket', '冰桶 + 杯子', [798, 286, 56, 40]);
  scene('shop.limeBasket', '青柠筐', [850, 290, 36, 38]);
  const deco = (id, box, opt) => Skin.add('decor.' + id, `店里装饰：${(DECOR.find(d => d.id === id) || {}).name || id}`, '店里装饰', box, { ...opt, draw: p => drawDecor(p, new Set([id])) });
  deco('lights', [20, 20, 1160, 64], { fit: 'stretch' }); deco('chime', [420, 74, 40, 92]); deco('lamp', [312, 234, 62, 68]);
  deco('frame', [998, 76, 78, 90]); deco('rug', [1016, 664, 176, 56]); deco('sapling', [1140, 566, 60, 148]);
  for (const d of DECOR) if (!Skin.catalog.has('decor.' + d.id)) deco(d.id, d.box || [0, 0, 120, 120]);   // decorations added in the theme only

  const station = (key, label, box, draw) => Skin.add(key, label, '厨房设备', [0, 0, box[2], box[3]], { draw, kind: 'small' });
  const st = A => ({ stove: BOX.stove, steamer: BOX.steamer, bowl: BOX.bowl, board: BOX.board, griddle: BOX.griddle, magnet: [0, 0, 50, 54] }[A]);
  for (const [k, l, s] of [['empty', '空锅', { state: 'idle' }], ['apple', '锅里有苹果', { state: 'idle', apple: true }], ['gel', '锅里有吉利丁', { state: 'idle', gel: true }],
    ['full', '苹果 + 吉利丁', { state: 'idle', apple: true, gel: true }], ['cooking', '在煮', { state: 'cooking', apple: true, gel: true, t: 2 }], ['done', '煮好了', { state: 'done', apple: true, gel: true, t: 6 }], ['burnt', '煮焦了', { state: 'burnt' }]])
    station('stove.' + k, '小锅 · ' + l, st('stove'), p => drawStove(p, s));
  for (const [k, l] of [['empty', '空'], ['steaming', '在蒸'], ['done', '蒸好了'], ['burnt', '蒸老了']]) station('steamer.' + k, '蒸笼 · ' + l, st('steamer'), p => drawSteamer(p, { state: k, t: 2 }));
  for (const [k, l, s] of [['empty', '空碗', {}], ['partial', '放了一部分', { egg: true }], ['ready', '料齐了（没搅）', { egg: true, milk: true, sugar: true, stir: 0 }],
    ['mixed', '布丁液', { egg: true, milk: true, sugar: true, stir: 3, mixed: true }], ['batter', '松饼面糊', { egg: true, milk: true, flour: true, stir: 3, mixed: true }]])
    station('bowl.' + k, '搅拌碗 · ' + l, st('bowl'), p => drawBowl(p, s));
  for (const [k, l, s] of [['empty', '空', { state: 'empty', chop: 0 }], ['apple', '放了苹果', { state: 'apple', chop: 0 }], ['chopped', '切好了', { state: 'chopped', chop: 3 }]])
    station('board.' + k, '砧板上 · ' + l, [0, 0, 124, 56], p => drawBoard(p, s));
  station('griddle', '双格平底锅（空）', st('griddle'), p => drawGriddle(p, [null, null]));
  for (const [it, n] of [['egg', '煎蛋'], ['pine', '菠萝片'], ['cake', '松饼']])
    for (const [k, l, state] of [['raw', '刚下锅', 'cooking'], ...(it === 'cake' ? [['flip', '冒泡要翻面', 'flip'], ['cooking2', '翻面后', 'cooking2']] : []), ['done', '好了', 'done'], ['burnt', '糊了', 'burnt']])
      Skin.add(`fry.${it}.${k}`, `平底锅里的${n} · ${l}`, '厨房设备', [0, 0, 50, 24], { draw: p => friedThing(p, 25, 12, { item: it, state }), kind: 'small' });
  for (const [k, l] of [['chill', '冷藏中'], ['ready', '凝固了']]) station('magnet.' + k, '冰箱格子 · ' + l, st('magnet'), p => drawMagnet(p, { state: k, t: 2 }));

  const dish = (key, label, it) => Skin.add(key, label, '菜品', [0, 0, 80, 80], { draw: p => drawPlateItem(p, it), kind: 'small', note: '不含盘子（盘子是 shop.plate）' });
  dish('dish.pudding', '牛奶布丁（淋好焦糖）', { dish: 'pudding', caramel: true }); dish('dish.pudding.plain', '牛奶布丁（还没淋焦糖）', { dish: 'pudding', caramel: false });
  dish('dish.jelly', '青苹果果冻', { dish: 'jelly' });
  dish('dish.burger', '菠萝鸡蛋堡（做好）', { dish: 'burger', layers: BURGER_LAYERS });
  dish('dish.choco', '巧克力松饼（淋好酱）', { dish: 'choco', sauce: true });
  dish('dish.lime', '青柠气泡水（做好，带吸管）', { dish: 'lime', lime: true, soda: true }); dish('dish.lime.plain', '青柠气泡水（还没灌苏打）', { dish: 'lime', lime: true }); dish('dish.choco.plain', '巧克力松饼（还没淋酱）', { dish: 'choco', sauce: false });
  for (const [id, n] of [['bunB', '面包底'], ['lettuce', '生菜'], ['pine', '煎菠萝'], ['egg', '煎蛋'], ['bunT', '面包顶']])
    Skin.add('layer.' + id, `汉堡的一层：${n}`, '菜品', [0, 0, 48, 19], { draw: p => burgerLayer(p, id, 24, 18, 0), kind: 'small', note: '底边对齐，叠的时候一层压一层' });
  const CARRY = { egg: '鸡蛋', milk: '牛奶', sugar: '糖', flour: '面粉', apple: '青苹果', gel: '吉利丁', chopped: '切好的苹果', batter: '一碗面糊/布丁液', mold: '果冻模具', caramel: '焦糖瓶', pine: '菠萝片', bunB: '面包底', lettuce: '生菜', bunT: '面包顶', eggC: '煎好的蛋', pineC: '煎好的菠萝', cakeC: '煎好的松饼', chocoB: '巧克力酱瓶', cup: '一杯冰', lime: '青柠', limeSlice: '青柠片' };
  for (const [id, n] of Object.entries(CARRY)) Skin.add('carry.' + id, `果冻手上拿着：${n}`, '手上拿的', [0, 0, 60, 60], { draw: p => drawCarry(p, id), kind: 'small' });
}

return { C, LW, LH, BOX, drawBack, drawFront, drawDish, drawDecor, decorIcon, DECOR, CUSTOMERS, drawStove, drawSteamer, drawBowl, drawBoard, drawPlateItem, drawOrder, drawMagnet, drawCarry, setCarryItem, drawGriddle, drawStation, drawPlate, toArtPlate };
})();
