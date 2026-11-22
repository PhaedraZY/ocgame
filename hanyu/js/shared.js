// 浏览器和音频预生成脚本共用：决定每段韩语用谁的声音读
(function (root) {
  // 例句和单词男女声交替，耳朵不只习惯一种嗓音
  function vx(i) { return i % 2 ? 'm' : 'f'; }
  // 单词卡读“原形. 常用形”，例如“먹다. 먹어.”
  function wordSay(w) { return w.say || (w.f && w.f !== w.ko ? w.ko + '. ' + w.f : w.ko); }
  function collect(D) {
    const out = [];
    const add = (t, v) => { if (t) out.push({ t: t, v: v || 'f' }); };
    D.seasons.forEach(s => s.episodes.forEach(e => {
      e.dialogue.forEach(l => add(l.ko, l.v));
      e.vocab.forEach((w, i) => add(wordSay(w), vx(i)));
      e.grammar.forEach(g => g.examples.forEach((x, i) => add(x.ko, vx(i))));
      e.quiz.forEach(q => add(q.say, 'f'));
    }));
    D.packs.forEach(p => p.items.forEach((x, i) => { add(x.say || x.ko, vx(i)); add(x.exSay || x.ex, vx(i + 1)); }));
    D.rules.forEach(r => r.examples.forEach((x, i) => add(x.ko, vx(i))));
    Object.keys(D.gx || {}).forEach(id => D.gx[id].forEach(x => {
      add(x.say, 'f');
      (x.table || []).forEach((r, k) => add(r[2], vx(k)));
      ((x.cmp || {}).rows || []).forEach((c, k) => add(c.ko, vx(k)));
      // 新讲法：分组里的原形和变形、区别里的对比句，都要能单独听，也要能连着听
      (x.parts || []).forEach(p => p.rows.forEach(r => { add(r[0], 'f'); add(r[1], 'm'); }));
      (x.morph || []).forEach(m => { add(m.from, 'f'); add(m.to, 'f'); });
      ((x.diff || {}).pairs || []).forEach(pr => pr.slice(0, 2).forEach((c, k) => add(c.ko, vx(k))));
      (x.quiz || []).forEach(q => add(q.say, 'f'));
    }));
    (D.topics || []).forEach(t => {
      const ws = t.groups.reduce((a, g) => a.concat(g.words), []);
      ws.forEach((w, i) => { add(wordSay(w), vx(i)); add(w.ex, vx(i + 1)); add(w.ko, vx(i)); });  // 听写题只读原形
      t.talk.lines.forEach(l => add(l.ko, l.v));
      let k = 0;
      (t.lesson || []).forEach(sec => sec.rows.forEach(r => add(r.ko, vx(k++))));
      (t.numDrill || []).forEach((d, i) => add(d.ko, vx(i)));
      (t.quiz || []).forEach(q => add(q.say, 'f'));
    });
    // 入门课：所有字、词都用同一个女声，拼读总表每一格也要有
    (D.basics || []).forEach(g => g.lessons.forEach(l => {
      l.secs.forEach(sec => {
        (sec.blocks || []).forEach(t => add(t, 'f'));
        (sec.letters || []).forEach(r => { add(r[1], 'f'); add(r[3], 'f'); });
        (sec.sets || []).forEach(set => set.forEach(t => { if (/[가-힣]/.test(t)) add(t, 'f'); }));
        (sec.rows || []).forEach(r => add(r[1], 'f'));
        (sec.parse || []).forEach(x => add(x.ko, 'f'));
        ((sec.table || {}).rows || []).forEach(r => r.forEach(c => { if (c && typeof c === 'object') add(c.ko, 'f'); }));
        (sec.morph || []).forEach(m => { add(m.from, 'f'); add(m.to, 'f'); });
        (sec.shift || []).forEach(r => { add(r[0], 'f'); add(r[1], 'f'); });
      });
      (l.readq || []).forEach(r => add(r[0], 'f'));
      (l.listen || []).forEach(set => set.forEach(t => add(t, 'f')));
      (l.order || []).forEach(o => add(o.chunks.join(' '), 'f'));
      l.quiz.forEach(q => add(q.say, 'f'));
    }));
    if (D.hangulGrid) {
      const G = D.hangulGrid, L = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', V = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
      G.cons.forEach(c => G.basic.concat(G.compound).forEach(v => add(String.fromCharCode(0xAC00 + (L.indexOf(c) * 21 + V.indexOf(v)) * 28), 'f')));
    }
    // 逐词标注里不在词汇表的实词，点开时会单独朗读
    const vocabKeys = {};
    D.seasons.forEach(s => s.episodes.forEach(e => e.vocab.forEach(w => { vocabKeys[w.id || w.ko] = 1; })));
    Object.values(D.gloss || {}).forEach(arr => arr.forEach(str => str.split(' | ').forEach(t => t.split('+').forEach(x => {
      const f = x.split('/');
      if (f[1] && !/^（.*）$/.test(f[1]) && !vocabKeys[f[2] || f[0]]) add(f[0], 'f');
    }))));
    const seen = {};
    return out.filter(x => { const k = x.v + '|' + x.t; return seen[k] ? false : (seen[k] = 1); });
  }
  root.KShared = { vx: vx, wordSay: wordSay, collect: collect };
})(typeof window !== 'undefined' ? window : globalThis);
