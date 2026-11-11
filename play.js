// 围的一局（第一个，第 18 天 04:22，照 ~/碰/围/围玩.py 搬的）
(function () {
  const L = window.荒;
  const WARM = 40, STEP = 5, TURNS = 20, Y0 = 1850, BS = 10, KNEEL = 3;
  const COLS = 'ABCDEFGHIJ';
  const name = (c, r) => COLS[c] + (r + 1);
  const yearOf = (w) => Y0 + w.yr - WARM;

  function find(w, tid) { for (const t of w.trees) if (t.id === tid) return t; return null; }
  function fate(w, tid) {
    const t = find(w, tid);
    if (!t) return '没了';
    if (t.dead != null) {
      const why = ({ '啃': '又被啃了一回，没再发出来', '罩': '旁边比它高的把它罩在底下，枯了', '倒': '让风刮倒了', '枯': '不知怎么枯了' })[t.why] || '';
      return '没了（' + (Y0 + t.dead - WARM) + ' 年' + (why ? '，' + why : '') + '）';
    }
    if (t.h < L.HEATHER + 0.1) return '还在石南底下，' + t.age + ' 岁，' + Math.round(t.h * 100) + ' 厘米，顶上一共被啃秃了 ' + t.bit + ' 回';
    if (t.h < L.REACH) return '冒出石南了，' + t.age + ' 岁，' + Math.round(t.h * 100) + ' 厘米，牛还够得着';
    return '冒出去了，' + t.age + ' 岁，' + t.h.toFixed(1) + ' 米高，牛够不着了';
  }
  const vis = (w) => w.live().filter(t => t.h >= L.HEATHER + 0.1);
  const tall = (w) => w.live().filter(t => t.h >= L.REACH);

  function Game(seed, map) {
    const w = new L.World(seed, map);
    for (let i = 0; i < WARM; i++) w.step();
    w.look();
    this.w = w; this.turn = 0; this.kn = 0; this.seen = {}; this.met = []; this.start = w.dump(); this.done = false;
  }
  Game.prototype.year = function () { return yearOf(this.w); };
  Game.prototype.fence = function () { return this.w.fences.find(f => f[5] == null) || null; };
  Game.prototype.head = function () {
    const w = this.w, f = this.fence();
    const fs = f ? '围栏立在 ' + name(f[0] / BS, f[1] / BS) + '（' + (Y0 + f[4] - WARM) + ' 年立的）。' : '围栏收着，没立。';
    return this.year() + ' 年。站着望，冒过石南的松 ' + vis(w).length + ' 棵。' + fs;
  };
  Game.prototype.left = function () {
    return '这五年还能蹲 ' + (KNEEL - this.kn) + ' 回。还有 ' + (TURNS - this.turn) + ' 个五年。';
  };
  Game.prototype.kneel = function (c, r) {
    if (this.done) return ['这一局已经走完了。'];
    if (this.kn >= KNEEL) return ['这五年蹲够了，过了再蹲。'];
    const w = this.w, x0 = c * BS, y0 = r * BS, out = [];
    const ts = w.live().filter(t => x0 <= t.x && t.x < x0 + BS && y0 <= t.y && t.y < y0 + BS);
    const low = ts.filter(t => t.h < L.HEATHER + 0.1), up = ts.filter(t => t.h >= L.HEATHER + 0.1);
    const prev = this.met.filter(m => m.c === c && m.r === r);
    let old = null;
    out.push('你在 ' + name(c, r) + ' 蹲下去，扒开石南看。');
    if (!low.length) out.push('底下：没有松苗。');
    else {
      old = low.reduce((a, b) => (b.age > a.age ? b : a));
      let s = '底下：' + low.length + ' 棵小松，都不到石南高。最老的一棵 ' + old.age +
        ' 岁，' + Math.round(old.h * 100) + ' 厘米高，顶上被啃秃了 ' + old.bit + ' 回。';
      const young = low.filter(t => t.age <= 2).length;
      if (young) s += '有 ' + young + ' 棵是这一两年才出的。';
      out.push(s);
    }
    if (up.length) out.push('站着也看得见的：' + up.length + ' 棵。');
    // 第 18 天 05:02 加：抬头看见的（只说看得见的样子，不讲规矩）。四个生人看不懂林子里没挨啃却一直矮着的苗
    let cov = 0;
    for (let x = x0; x < x0 + BS; x++) for (let y = y0; y < y0 + BS; y++) if (w.canopy.has(x * 1000 + y)) cov++;
    if (cov >= 70) out.push('抬头看：这一块大半罩在树冠底下。');
    else if (cov >= 30) out.push('抬头看：这一块有一片罩在树冠底下。');
    else if (cov > 0) out.push('抬头看：边上有几棵的树冠伸过来。');
    for (const m of prev)
      out.push('以前在这儿见过的：' + (Y0 + m.yr - WARM) + ' 年那棵最老的，那时 ' + m.age + ' 岁、' + Math.round(m.h * 100) + ' 厘米，现在' + fate(w, m.id) + '。');
    this.kn += 1;
    this.seen[c + ',' + r] = { n: low.length, yr: w.yr };
    if (old && !this.met.some(m => m.id === old.id)) {
      this.met.push({ c, r, id: old.id, yr: w.yr, age: old.age, h: old.h, bit: old.bit }); w.keep.add(old.id);
    }
    out.push('（这五年还能蹲 ' + (KNEEL - this.kn) + ' 回）');
    return out;
  };
  Game.prototype.move = function (c, r) {   // c == null 是收起来
    if (this.done) return ['这一局已经走完了。'];
    const w = this.w;
    for (const f of w.fences) if (f[5] == null) f[5] = w.yr;
    w.fences = w.fences.filter(f => f[5] == null || f[5] > f[4]);
    if (c == null) return ['围栏收起来了。'];
    w.fences.push([c * BS, r * BS, (c + 1) * BS, (r + 1) * BS, w.yr, null]);
    return ['围栏立在 ' + name(c, r) + ' 了。'];
  };
  Game.prototype.pass = function () {
    if (this.done) return ['这一局已经走完了。'];
    const w = this.w;
    const before = new Set(vis(w).map(t => t.id));
    for (let i = 0; i < STEP; i++) w.step();
    this.turn += 1; this.kn = 0;
    if (this.turn >= TURNS) { this.done = true; return null; }
    const now = vis(w), nw = now.filter(t => !before.has(t.id)), out = [this.head()];
    const nowIds = new Set(now.map(t => t.id));
    let gone = 0, back = 0;
    for (const t of w.trees) if (before.has(t.id) && !nowIds.has(t.id)) { if (t.dead != null) gone++; else back++; }
    if (nw.length) {
      const bl = new Map();
      for (const t of nw) { const k = name(Math.floor(t.x / BS), Math.floor(t.y / BS)); bl.set(k, (bl.get(k) || 0) + 1); }
      const top = [...bl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      out.push('这五年新冒出石南的：' + top.map(([k, v]) => k + ' ' + v + ' 棵').join('、') + (bl.size > 3 ? '……' : ''));
    }
    if (gone || back) out.push('五年前站着看得见的，' + (gone ? '有 ' + gone + ' 棵没了' : '') + (gone && back ? '，' : '') + (back ? '有 ' + back + ' 棵又被啃回石南里' : '') + '。');
    const f = this.fence();
    if (f) {
      const fc = f[0] / BS, fr = f[1] / BS;
      const n = nw.filter(t => Math.floor(t.x / BS) === fc && Math.floor(t.y / BS) === fr).length;
      out.push('围栏里（' + name(fc, fr) + '）这五年新冒出石南 ' + n + ' 棵。');
    }
    out.push(this.left());
    return out;
  };
  Game.prototype.ending = function () {
    const w = this.w;
    const w0 = L.World.load(this.start);
    w0.keep = new Set(this.met.map(m => m.id));
    for (let i = 0; i < TURNS * STEP; i++) w0.step();
    this.w0 = w0;
    const out = ['一百年到了，' + this.year() + ' 年。', ''];
    const hist = w.fences.map(f => name(f[0] / BS, f[1] / BS) + '（' + (Y0 + f[4] - WARM) + '–' + (Y0 + (f[5] != null ? f[5] : w.yr) - WARM) + '）');
    out.push('你围过：' + (hist.length ? hist.join('、') : '一回也没围'));
    out.push('站着望，冒过石南的松 ' + vis(w).length + ' 棵，其中长过牛嘴、牛再也够不着的 ' + tall(w).length + ' 棵。');
    const mine = tall(w).filter(t => t.line === '围');
    out.push('橙的是从你围栏里长过牛嘴的那一支，连它们撒的籽长成的：' + mine.length + ' 棵。');
    if (mine.length) {
      let outside = 0, far = 0;
      for (const t of mine) {
        const inside = w.fences.some(f => f[0] <= t.x && t.x < f[2] && f[1] <= t.y && t.y < f[3]);
        if (!inside) {
          outside++;
          let dd = Infinity;
          for (const f of w.fences) dd = Math.min(dd, Math.hypot(Math.max(f[0] - t.x, 0, t.x - f[2]), Math.max(f[1] - t.y, 0, t.y - f[3])));
          far = Math.max(far, dd);
        }
      }
      out.push('其中 ' + outside + ' 棵长在你从没围过的地上，最远的一棵离你围过的地方 ' + Math.round(far * 3) + ' 米。');
    }
    out.push('要是一道没围：冒过石南的 ' + vis(w0).length + ' 棵，长过牛嘴的 ' + tall(w0).length + ' 棵。');
    if (this.met.length) {
      out.push('', '你蹲下去见过的那几棵最老的：');
      for (const m of this.met) {
        const alt = find(w0, m.id) ? fate(w0, m.id) : '这片荒原上没有这一棵';
        out.push('  ' + name(m.c, m.r) + '，' + (Y0 + m.yr - WARM) + ' 年见的，那时 ' + m.age + ' 岁、' + Math.round(m.h * 100) + ' 厘米、被啃过 ' + m.bit + ' 回。');
        out.push('     现在：' + fate(w, m.id) + '。');
        out.push('     要是一道没围：' + alt + '。');
      }
    }
    out.push('石南底下还等着的小松：' + w.live().filter(t => t.h < L.HEATHER + 0.1).length + ' 棵。');
    return out;
  };
  window.围 = { Game, BS, COLS, WARM, Y0, name, KNEEL, TURNS };
})();
