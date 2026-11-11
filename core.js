// 荒：达尔文萨里那片荒原的规矩（第一个，第 18 天 04:20，照 ~/碰/围/荒.py 搬的；数跟 python 那份不是同一串骰子，规矩一样）
(function () {
  const W = 100, H = 60, HEATHER = 0.4, REACH = 1.3, HERD = 6500;

  // 一个字串变一串骰子：cyrb53 取种子，mulberry32 往下掷
  function h53(str, seed) {
    let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0) ^ (h1 >>> 0);
  }
  function Dice(key) {
    let a = h53(key) >>> 0;
    const r = function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.uniform = (lo, hi) => lo + (hi - lo) * r();
    r.randint = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.expo = (mean) => -Math.log(1 - r()) * mean;
    return r;
  }

  function World(seed, map) {
    this.seed = seed || 7; this.map = map || 1; this.trees = []; this.nid = 0; this.yr = 0;
    this.fences = []; this.keep = new Set(); this.canopy = new Set(); this.press = 0; this.graze = 0;
    const r = this.R('old');
    // 第二块荒原（第 18 天 04:47 加）：规矩、骰子都一样，只把山顶那几丛老松挪到右下
    const spots = this.map === 2 ? [[80, 46], [86, 52], [74, 53], [91, 43]] : [[8, 6], [14, 4], [6, 12], [18, 9]];
    for (const [cx, cy] of spots)
      for (let k = 0; k < 3; k++) {
        const t = this.add(cx + r.uniform(-2, 2), cy + r.uniform(-2, 2), r.uniform(12, 16), r.randint(60, 90), '山');
        t.line = '山';
      }
  }
  World.prototype.R = function (...k) { return Dice([this.seed, ...k].join('|')); };
  World.prototype.add = function (x, y, h, age, ml, tid) {
    if (tid == null) tid = 'o' + this.nid;
    const t = { id: tid, x, y, h, age, roots: age, dead: null, born: this.yr, bit: 0, line: null, ml };
    this.nid++; this.trees.push(t); return t;
  };
  World.prototype.fenced = function (x, y, yr) {
    if (yr == null) yr = this.yr;
    for (const [x0, y0, x1, y1, a, b] of this.fences)
      if (yr >= a && (b == null || yr < b) && x0 <= x && x < x1 && y0 <= y && y < y1) return true;
    return false;
  };
  World.prototype.live = function () { return this.trees.filter(t => t.dead == null); };
  World.prototype.look = function () {
    const live = this.live(), canopy = new Set();
    for (const t of live) {
      if (t.h >= 6) {
        const rad = Math.min(3, t.h / 5), ir = Math.floor(rad), cx = Math.floor(t.x), cy = Math.floor(t.y);
        for (let dx = -ir; dx <= ir; dx++) for (let dy = -ir; dy <= ir; dy++)
          if (dx * dx + dy * dy <= rad * rad) canopy.add((cx + dx) * 1000 + (cy + dy));
      }
    }
    let graze = 0;
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++)
      if (!canopy.has(x * 1000 + y) && !this.fenced(x + .5, y + .5)) graze++;
    this.canopy = canopy; this.graze = graze; this.press = HERD / Math.max(graze, 1);
    return live;
  };
  World.prototype.step = function () {
    const live = this.look(), yr = this.yr, canopy = this.canopy, press = this.press;
    for (const t of live) {
      if (t.h >= 5 && t.age >= 12) {
        const rr = this.R('seed', t.id, yr), n = Math.floor(6 + t.h);
        for (let k = 0; k < n; k++) {
          const a = rr.uniform(0, 2 * Math.PI), d = rr.expo(14);
          const x = t.x + d * Math.cos(a), y = t.y + d * Math.sin(a);
          if (x >= 0 && x < W && y >= 0 && y < H) {
            const g = canopy.has(Math.floor(x) * 1000 + Math.floor(y)) ? 0.04 : 0.35;
            if (rr() < g) this.add(x, y, 0.05, 0, t.line, t.id + '-' + yr + '-' + k);
          }
        }
      }
    }
    const bucket = new Map();
    for (const t of live) {
      const key = Math.floor(t.x) * 1000 + Math.floor(t.y);
      if (!bucket.has(key)) bucket.set(key, []); bucket.get(key).push(t);
    }
    for (const t of live) {
      const rr = this.R('grow', t.id, yr);
      if (t.age > 200 || rr() < (t.h < 4 ? 0.025 : 0.006)) { t.dead = yr; t.why = t.h >= 4 ? '倒' : '枯'; continue; }
      let shade = 0; const cx = Math.floor(t.x), cy = Math.floor(t.y);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const b = bucket.get((cx + dx) * 1000 + (cy + dy)); if (!b) continue;
        for (const o of b) if (o !== t && o.dead == null && o.h > t.h + 1.5) shade++;
      }
      let g = (0.12 + 0.025 * Math.min(t.roots, 14)) * Math.pow(0.5, shade);
      if (t.h > 6) g = Math.min(g, 0.45) * Math.max(0, 1 - t.h / 24);
      if (shade >= 3 && rr() < 0.15) { t.dead = yr; t.why = '罩'; continue; }
      t.h += g; t.age += 1;
      if (t.h < REACH && !this.fenced(t.x, t.y) && !canopy.has(cx * 1000 + cy)) {
        if (rr() < Math.min(0.995, press * 0.9)) {
          t.h = Math.min(t.h, HEATHER * rr.uniform(0.3, 0.8)); t.bit += 1;
          if (rr() < 0.035) { t.dead = yr; t.why = '啃'; continue; }
        }
      }
      t.roots += 1;
      if (t.line == null && t.h >= REACH) t.line = this.fenced(t.x, t.y) ? '围' : t.ml;
    }
    this.yr += 1;
    if (this.yr % 10 === 0) {
      const keep = this.keep, y = this.yr;
      this.trees = this.trees.filter(t => t.dead == null || t.dead > y - 10 || keep.has(t.id));
    }
  };
  World.prototype.dump = function () {
    return JSON.stringify({ seed: this.seed, trees: this.trees, nid: this.nid, yr: this.yr, fences: this.fences, map: this.map });
  };
  World.load = function (s) {
    const d = JSON.parse(s), w = Object.create(World.prototype);
    Object.assign(w, d); w.keep = new Set(); w.canopy = new Set(); w.press = 0; w.graze = 0; return w;
  };
  window.荒 = { World, W, H, HEATHER, REACH };
})();
