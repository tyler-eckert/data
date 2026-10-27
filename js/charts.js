/* Tiny SVG chart kit for eckert.data — one data shape, many looks. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const H = 3600e3, D = 864e5;
  const tip = () => document.getElementById('tip');

  // ---------- numbers & dates ----------
  const nv = (e) => (e.v == null || isNaN(e.v) ? 1 : +e.v);            // blank value = one occurrence
  function fmt(v, dec = 1) {
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e5) return (v / 1e3).toFixed(0) + 'k';
    return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  }
  const md = (t, yr = true) => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + (yr ? '/' + String(d.getFullYear()).slice(-2) : ''); };
  const mdy = (t) => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); };
  const hm = (t) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ---------- aggregation ----------
  function aggregate(list, agg) {
    if (!list.length) return null;
    const vs = list.map(nv);
    switch (agg) {
      case 'sum': return vs.reduce((a, b) => a + b, 0);
      case 'min': return Math.min(...vs);
      case 'max': return Math.max(...vs);
      case 'count': return list.length;
      case 'last': { let l = list[0]; for (const e of list) if (e.t >= l.t) l = e; return nv(l); }
      default: return vs.reduce((a, b) => a + b, 0) / vs.length;
    }
  }
  function bStart(t, b) {
    const d = new Date(t);
    if (b === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (b === 'week') s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    return s.getTime();
  }
  function bNext(t, b) {
    const d = new Date(t);
    if (b === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    d.setDate(d.getDate() + (b === 'week' ? 7 : 1)); return d.getTime();
  }
  function bucketize(entries, bucket, agg) {
    if (bucket === 'raw') return entries.map(e => ({ t: e.t, t0: e.t, t1: e.t, v: nv(e), n: 1, notes: e.notes, raw: true }));
    const m = new Map();
    for (const e of entries) { const k = bStart(e.t, bucket); (m.get(k) || m.set(k, []).get(k)).push(e); }
    return [...m.keys()].sort((a, b) => a - b).map(k => {
      const items = m.get(k), k1 = bNext(k, bucket);
      return { t: (k + k1) / 2, t0: k, t1: k1, v: aggregate(items, agg), n: items.length };
    });
  }

  // ---------- scales & ticks ----------
  function niceTicks(lo, hi, count = 5, int = false) {
    if (lo === hi) { const p = Math.abs(lo) * .1 || 1; lo -= p; hi += p; }
    const raw = (hi - lo) / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    let step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(s => s >= raw) || raw;
    if (int) step = Math.max(1, [1, 2, 5, 10].map(x => x * mag).find(s => s >= raw) || Math.ceil(raw));
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
    for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function timeTicks(t0, t1, maxN) {
    const span = t1 - t0;
    const opts = [[H, 'h', 1], [3 * H, 'h', 3], [6 * H, 'h', 6], [12 * H, 'h', 12], [D, 'd', 1], [2 * D, 'd', 2], [7 * D, 'w', 1], [14 * D, 'w', 2],
      [30 * D, 'm', 1], [61 * D, 'm', 2], [91 * D, 'm', 3], [182 * D, 'm', 6], [365 * D, 'y', 1], [730 * D, 'y', 2], [1826 * D, 'y', 5]];
    const [, u, n] = opts.find(o => span / o[0] <= maxN) || opts[opts.length - 1];
    const d = new Date(t0), out = [];
    if (u === 'h') { d.setMinutes(0, 0, 0); d.setHours(Math.ceil(d.getHours() / n) * n); }
    else { d.setHours(0, 0, 0, 0); }
    if (u === 'w') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (u === 'm') { d.setDate(1); d.setMonth(Math.floor(d.getMonth() / n) * n); }
    if (u === 'y') { d.setMonth(0, 1); d.setFullYear(Math.floor(d.getFullYear() / n) * n); }
    for (let i = 0; i < 400; i++) {
      if (d.getTime() >= t0 && d.getTime() <= t1) out.push(d.getTime());
      if (d.getTime() > t1) break;
      if (u === 'h') d.setHours(d.getHours() + n);
      else if (u === 'd') d.setDate(d.getDate() + n);
      else if (u === 'w') d.setDate(d.getDate() + 7 * n);
      else if (u === 'm') d.setMonth(d.getMonth() + n);
      else d.setFullYear(d.getFullYear() + n);
    }
    const lab = u === 'h' ? (t => new Date(t).getHours() === 0 ? md(t, false) : new Date(t).toLocaleTimeString('en-US', { hour: 'numeric' }))
      : u === 'y' ? (t => String(new Date(t).getFullYear())) : (t => md(t));
    return out.map(t => ({ t, l: lab(t) }));
  }

  // ---------- svg helpers ----------
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n); return n;
  }
  function svgRoot(host, w, h) { host.innerHTML = ''; return el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h }, host); }
  function showTip(evt, html) {
    const t = tip(); t.innerHTML = html; t.classList.add('on');
    const p = evt.touches ? evt.touches[0] : evt, r = t.getBoundingClientRect();
    let x = p.clientX + 14, y = p.clientY - r.height - 10;
    if (x + r.width > innerWidth - 8) x = p.clientX - r.width - 14;
    if (y < 8) y = p.clientY + 16;
    t.style.left = Math.max(8, x) + 'px'; t.style.top = y + 'px';
  }
  const hideTip = () => tip().classList.remove('on');
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- render ----------
  function render(host, o) {
    host._chart = o;
    // svg charts fill whatever height their card gives them (cards in a row stretch to match)
    const fill = !['calendar', 'monthcal', 'number'].includes(o.type) && o.entries.length > 0;
    host.classList.toggle('fill', fill);
    host.classList.toggle('flow', !fill);
    host.style.minHeight = fill || o.type === 'number' ? (o.height || 220) + 'px' : '';
    if (!host._ro && window.ResizeObserver) {
      host._ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight;
        if (w && (Math.abs(w - (host._lw || 0)) > 2 || (host.classList.contains('fill') && Math.abs(h - (host._lh || 0)) > 2))) { host._lw = w; host._lh = h; draw(host, host._chart); } });
      host._ro.observe(host);
    }
    host._lw = host.clientWidth; host._lh = host.clientHeight;
    draw(host, o);
  }

  function draw(host, o) {
    const W = Math.max(240, host.clientWidth || 600), Ht = host.classList.contains('fill') ? Math.max(120, Math.floor(host.clientHeight) || o.height || 220) : (o.height || 220);
    const ents = o.entries;
    if (!ents.length) { host.innerHTML = '<div class="empty">No entries in this range yet</div>'; return; }
    if (o.type === 'calendar') return calendar(host, o, W);
    if (o.type === 'monthcal') return monthCal(host, o, W);
    if (o.type === 'histogram') return histogram(host, o, W, Ht);
    if (o.type === 'number') return bigNumber(host, o, W);
    return timeChart(host, o, W, Ht);
  }

  function axesY(svg, ticks, y, x0, x1, dec) {
    const mi = Math.max(1, Math.floor(ticks.length / 2)), st = Math.abs(ticks[mi] - ticks[mi - 1]), dd = st >= 1 && st % 1 === 0 ? 0 : st * 10 % 1 === 0 || Math.abs(st * 10 - Math.round(st * 10)) < 1e-9 ? 1 : 2;
    for (const v of ticks) {
      el('line', { x1: x0, x2: x1, y1: y(v), y2: y(v), class: v === 0 ? 'gl gl0' : 'gl' }, svg);
      el('text', { x: x0 - 8, y: y(v) + 3.5, 'text-anchor': 'end' }, svg).textContent = fmt(v, dd);
    }
  }
  function axesX(svg, ticks, x, y0, y1) {
    let lastX = -1e9;
    for (const tk of ticks) {
      const px = x(tk.t);
      el('line', { x1: px, x2: px, y1: y0, y2: y1, class: 'gl' }, svg);   // major vertical gridlines
      if (px - lastX < 46) continue; lastX = px;
      el('text', { x: px, y: y1 + 16, 'text-anchor': 'middle' }, svg).textContent = tk.l;
    }
  }

  function timeChart(host, o, W, Ht) {
    const type = o.type, color = o.color;
    let bucket = o.bucket, agg = o.agg;
    if (type === 'cumulative') { agg = 'sum'; if (bucket === 'raw') bucket = 'raw'; }
    let pts = bucketize(o.entries, bucket, agg);
    if (type === 'cumulative') { let s = 0; pts = pts.map(p => ({ ...p, v: (s += p.v) })); }
    const P = { l: 46, r: 12, t: 12, b: 26 };
    const pw = W - P.l - P.r, ph = Ht - P.t - P.b;
    let t0 = o.t0 ?? pts[0].t0, t1 = o.t1 ?? pts[pts.length - 1].t1;
    if (o.t0 == null) { const pad = Math.max((t1 - t0) * .03, bucket === 'raw' ? H : 0); t0 -= pad; t1 += pad; }
    if (t1 <= t0) { t0 -= D / 2; t1 += D / 2; }
    const vs = pts.map(p => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (['bar', 'cumulative'].includes(type)) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
    else { const pad = (hi - lo) * .08 || Math.abs(hi) * .05 || 1; lo -= pad; hi += pad; }
    const fixLo = o.ymin != null && isFinite(o.ymin), fixHi = o.ymax != null && isFinite(o.ymax);
    if (fixLo) lo = +o.ymin; if (fixHi) hi = +o.ymax;
    if (hi <= lo) { if (fixHi && !fixLo) lo = hi - (Math.abs(hi) || 1); else hi = lo + (Math.abs(lo) || 1); }
    let yt = niceTicks(lo, hi, Math.max(3, Math.round(ph / 45)));
    const stp = yt[1] - yt[0];
    if (fixLo) yt = [lo, ...yt.filter(v => v > lo + stp * .35)];
    if (fixHi) yt = [...yt.filter(v => v < hi - stp * .35), hi];
    const y0v = yt[0], y1v = yt[yt.length - 1];
    const x = t => P.l + (t - t0) / (t1 - t0) * pw;
    const y = v => P.t + ph - (v - y0v) / (y1v - y0v) * ph;
    const svg = svgRoot(host, W, Ht);
    axesY(svg, yt, y, P.l, W - P.r, o.decimals);
    axesX(svg, timeTicks(t0, t1, Math.max(2, Math.floor(pw / 70))), x, P.t, P.t + ph);

    const cid = 'cp' + Math.random().toString(36).slice(2, 8);
    el('rect', { x: P.l - 6, y: P.t - 6, width: pw + 12, height: ph + 12 }, el('clipPath', { id: cid }, el('defs', {}, svg)));
    const g = el('g', { 'clip-path': `url(#${cid})` }, svg);
    const base = y(Math.max(y0v, Math.min(0, y1v)));
    const line = (step) => pts.map((p, i) => {
      const X = x(p.t).toFixed(1), Y = y(p.v).toFixed(1);
      if (!i) return `M${X},${Y}`;
      return step ? `H${X}V${Y}` : `L${X},${Y}`;
    }).join('');
    if (type === 'bar') {
      const slot = bucket === 'raw' ? pw / Math.max(pts.length, 1) : null;
      for (const p of pts) {
        const bw = Math.max(2, Math.min(28, slot ? slot * .7 : (x(p.t1) - x(p.t0)) * .72));
        const yy = y(p.v), top = Math.min(yy, base), h = Math.max(1, Math.abs(base - yy));
        el('rect', { x: x(p.t) - bw / 2, y: top, width: bw, height: h, rx: Math.min(4, bw / 3), fill: color, 'data-i': 1 }, g);
      }
    } else if (type === 'dots') {
      for (const p of pts) el('circle', { cx: x(p.t), cy: y(p.v), r: 3.6, fill: color, 'fill-opacity': .85 }, g);
    } else {
      const step = type === 'step' || type === 'cumulative';
      const d = line(step);
      if (type === 'area' || type === 'cumulative') {
        const id = 'gr' + Math.random().toString(36).slice(2, 8);
        const lg = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
        el('stop', { offset: 0, 'stop-color': color, 'stop-opacity': .32 }, lg);
        el('stop', { offset: 1, 'stop-color': color, 'stop-opacity': .02 }, lg);
        const last = pts[pts.length - 1], first = pts[0];
        el('path', { d: d + `L${x(last.t)},${base}L${x(first.t)},${base}Z`, fill: `url(#${id})` }, g);
      }
      el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
      if (pts.length <= 60 && type === 'line') for (const p of pts) el('circle', { cx: x(p.t), cy: y(p.v), r: 2.6, fill: 'var(--surface)', stroke: color, 'stroke-width': 1.8 }, g);
    }

    // hover
    const hl = el('line', { y1: P.t, y2: P.t + ph, class: 'hl', visibility: 'hidden' }, svg);
    const hc = el('circle', { r: 4.5, fill: color, stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' }, svg);
    const ov = el('rect', { x: P.l, y: P.t, width: pw, height: ph, fill: 'transparent' }, svg);
    const xs = pts.map(p => x(p.t));
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), pt = ev.touches ? ev.touches[0] : ev;
      const mx = (pt.clientX - r.left) * (W / r.width);
      let bi = 0, bd = 1e9; xs.forEach((v, i) => { const dd = Math.abs(v - mx); if (dd < bd) { bd = dd; bi = i; } });
      const p = pts[bi];
      hl.setAttribute('x1', xs[bi]); hl.setAttribute('x2', xs[bi]); hl.setAttribute('visibility', 'visible');
      hc.setAttribute('cx', xs[bi]); hc.setAttribute('cy', y(p.v)); hc.setAttribute('visibility', 'visible');
      const when = p.raw ? `${mdy(p.t)} · ${hm(p.t)}` : bucket === 'day' ? mdy(p.t0) : bucket === 'week' ? `Week of ${mdy(p.t0)}` : `${MON[new Date(p.t0).getMonth()]} ${new Date(p.t0).getFullYear()}`;
      const lab = type === 'cumulative' ? 'Running total' : p.raw ? 'Value' : ({ sum: 'Total', avg: 'Average', min: 'Min', max: 'Max', last: 'Last', count: 'Count' })[agg];
      showTip(ev, `<div class="t">${when}</div><div class="r"><span class="sw" style="background:${color}"></span>${lab}: <b class="num">${fmt(p.v, o.decimals)}${o.unit && agg !== 'count' ? ' ' + esc(o.unit) : ''}</b></div>`
        + (!p.raw && p.n > 1 ? `<div class="n">${p.n} entries</div>` : '') + (p.notes ? `<div class="n">${esc(p.notes)}</div>` : ''));
    };
    const leave = () => { hl.setAttribute('visibility', 'hidden'); hc.setAttribute('visibility', 'hidden'); hideTip(); };
    ov.addEventListener('mousemove', move); ov.addEventListener('mouseleave', leave);
    ov.addEventListener('touchstart', move, { passive: true }); ov.addEventListener('touchmove', move, { passive: true }); ov.addEventListener('touchend', leave);
  }

  function calendar(host, o, W) {
    const agg = o.agg === 'last' ? 'last' : o.agg;
    const end = bStart(o.t1 ?? Date.now(), 'day');
    let start = bStart(o.t0 ?? o.entries[0].t, 'day');
    if (end - start > 370 * D) start = end - 364 * D;
    const s = new Date(start); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); start = s.getTime();
    const days = bucketize(o.entries.filter(e => e.t >= start), 'day', agg);
    const map = new Map(days.map(d => [d.t0, d]));
    const weeks = Math.ceil((end - start) / (7 * D) + 1);
    const L = 28, T = 18, cell = Math.max(6, Math.min(weeks <= 14 ? 26 : 18, Math.floor((W - L - 4) / weeks) - 2)), gap = 2;
    const Ht = T + 7 * (cell + gap) + 4;
    const svg = svgRoot(host, Math.max(W, L + weeks * (cell + gap)), Ht);
    const max = o.ymax != null && isFinite(o.ymax) ? +o.ymax : (Math.max(...days.map(d => d.v), 0) || 1), min = o.ymin != null && isFinite(o.ymin) ? +o.ymin : Math.min(0, ...days.map(d => d.v));
    ['Mon', '', 'Wed', '', 'Fri', '', ''].forEach((l, i) => l && (el('text', { x: 0, y: T + i * (cell + gap) + cell - 2 }, svg).textContent = l));
    let lastMonth = -1;
    const d = new Date(start);
    for (let w = 0; w < weeks; w++) {
      for (let r = 0; r < 7; r++) {
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + w * 7 + r).getTime();
        if (t > end) continue;
        if (r === 0) { const m = new Date(t).getMonth(); if (m !== lastMonth && new Date(t).getDate() <= 7) { lastMonth = m; el('text', { x: L + w * (cell + gap), y: 11 }, svg).textContent = MON[m]; } }
        const p = map.get(t);
        const op = p ? .18 + .82 * Math.max(0, Math.min(1, (p.v - min) / ((max - min) || 1))) : 1;
        const rc = el('rect', { x: L + w * (cell + gap), y: T + r * (cell + gap), width: cell, height: cell, rx: Math.min(3, cell / 4),
          fill: p ? o.color : 'var(--surface-3)', 'fill-opacity': op.toFixed(2) }, svg);
        const html = `<div class="t">${mdy(t)}</div>` + (p ? `<div class="r"><span class="sw" style="background:${o.color}"></span><b class="num">${fmt(p.v, o.decimals)}${o.unit && agg !== 'count' ? ' ' + esc(o.unit) : ''}</b></div>${p.n > 1 ? `<div class="n">${p.n} entries</div>` : ''}` : '<div class="r muted">No entry</div>');
        rc.addEventListener('mousemove', ev => showTip(ev, html)); rc.addEventListener('mouseleave', hideTip);
        rc.addEventListener('touchstart', ev => showTip(ev, html), { passive: true });
      }
    }
    host.style.overflowX = 'auto';
  }

  function histogram(host, o, W, Ht) {
    const vals = o.entries.map(nv).sort((a, b) => a - b);
    const lo = vals[0], hi = vals[vals.length - 1];
    const ints = vals.every(v => Number.isInteger(v)) && hi - lo <= 24;
    let bins;
    if (ints) { bins = []; for (let v = lo; v <= hi; v++) bins.push({ a: v - .5, b: v + .5, n: 0, l: fmt(v, 0) }); }
    else {
      const k = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(vals.length)))), st = (hi - lo) / k || 1;
      bins = Array.from({ length: k }, (_, i) => ({ a: lo + i * st, b: lo + (i + 1) * st, n: 0 }));
      bins.forEach(b => b.l = fmt((b.a + b.b) / 2, o.decimals));
    }
    for (const v of vals) { const b = bins.find((b, i) => v >= b.a && (v < b.b || i === bins.length - 1)); if (b) b.n++; }
    const P = { l: 46, r: 12, t: 12, b: 26 }, pw = W - P.l - P.r, ph = Ht - P.t - P.b;
    const yt = niceTicks(0, Math.max(...bins.map(b => b.n)), Math.max(3, Math.round(ph / 45)), true);
    const ymax = yt[yt.length - 1], y = v => P.t + ph - v / ymax * ph;
    const svg = svgRoot(host, W, Ht);
    axesY(svg, yt, y, P.l, W - P.r, 0);
    const slot = pw / bins.length, every = Math.ceil(bins.length / Math.max(1, Math.floor(pw / 48)));
    bins.forEach((b, i) => {
      const bw = Math.min(64, slot * .8), bx = P.l + i * slot + (slot - bw) / 2;
      if (i % every === 0) el('text', { x: bx + bw / 2, y: P.t + ph + 16, 'text-anchor': 'middle' }, svg).textContent = b.l;
      if (!b.n) return;
      const r = el('rect', { x: bx, y: y(b.n), width: bw, height: P.t + ph - y(b.n), rx: Math.min(4, bw / 3), fill: o.color }, svg);
      const html = `<div class="t">${ints ? b.l : fmt(b.a, o.decimals) + ' – ' + fmt(b.b, o.decimals)}${o.unit ? ' ' + esc(o.unit) : ''}</div><div class="r"><b class="num">${b.n}</b> ${b.n === 1 ? 'entry' : 'entries'}</div>`;
      r.addEventListener('mousemove', ev => showTip(ev, html)); r.addEventListener('mouseleave', hideTip);
      r.addEventListener('touchstart', ev => showTip(ev, html), { passive: true });
    });
  }

  function bigNumber(host, o, W) {
    const v = aggregate(o.entries, o.agg);
    const lab = ({ sum: 'Total', avg: 'Average', min: 'Lowest', max: 'Highest', last: 'Latest', count: 'Times logged' })[o.agg];
    host.innerHTML = `<div class="big-num"><div class="muted" style="font-size:var(--fs-sm);font-weight:600">${lab}</div>
      <div class="v num">${fmt(v, o.decimals)}${o.unit && o.agg !== 'count' ? `<small>${esc(o.unit)}</small>` : ''}</div>
      <div class="spark"></div></div>`;
    const sp = host.querySelector('.spark');
    const pts = bucketize(o.entries, o.bucket === 'raw' ? 'day' : o.bucket, o.agg === 'count' ? 'count' : o.agg);
    if (pts.length < 2) return;
    const w = Math.min(W, 520), h = 54, lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, style: 'margin-top:14px;max-width:100%' }, sp);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((p.t - t0) / (t1 - t0) * (w - 4) + 2).toFixed(1)},${(h - 4 - (p.v - lo) / ((hi - lo) || 1) * (h - 8)).toFixed(1)}`).join('');
    el('path', { d, fill: 'none', stroke: o.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
  }

  // real month-grid calendar (Sun–Sat), most recent month first
  function monthCal(host, o, W) {
    host.style.overflowX = '';
    const agg = o.agg, days = bucketize(o.entries, 'day', agg), map = new Map(days.map(d => [d.t0, d]));
    const vs = days.map(d => d.v);
    const max = o.ymax != null && isFinite(o.ymax) ? +o.ymax : Math.max(...vs, 0) || 1;
    const min = o.ymin != null && isFinite(o.ymin) ? +o.ymin : Math.min(0, ...vs);
    const endT = o.t1 ?? Date.now(), startT = o.t0 ?? o.entries[0].t;
    const end = new Date(endT), months = [];
    for (let d = new Date(end.getFullYear(), end.getMonth(), 1); d.getTime() >= new Date(new Date(startT).getFullYear(), new Date(startT).getMonth(), 1).getTime() && months.length < 12; d.setMonth(d.getMonth() - 1)) months.push(new Date(d));
    const today = bStart(Date.now(), 'day'), MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const cols = Math.max(1, Math.min(months.length, Math.floor((W + 16) / 200)));
    const cell = (W - (cols - 1) * 16) / cols / 7;
    const showVal = cell >= 27, u = o.unit && agg !== 'count' ? ' ' + esc(o.unit) : '';
    let h = `<div class="mcal-wrap${showVal && cell < 40 ? ' compact' : ''}" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">`;
    for (const m of months) {
      const y = m.getFullYear(), mo = m.getMonth(), first = m.getDay(), n = new Date(y, mo + 1, 0).getDate();
      h += `<div class="mcal"><div class="mcal-h">${MONF[mo]} ${y}</div><div class="mcal-g">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<span class="dow">${x}</span>`).join('')}`;
      for (let i = 0; i < first; i++) h += '<span></span>';
      for (let dd = 1; dd <= n; dd++) {
        const t = new Date(y, mo, dd).getTime(), p = map.get(t);
        const out = (o.t0 != null && t < bStart(o.t0, 'day')) || t > endT;
        let st = '', cls = 'd' + (t === today ? ' today' : '') + (out ? ' out' : '');
        if (p) {
          const k = Math.max(0, Math.min(1, (p.v - min) / ((max - min) || 1))), pct = Math.round(22 + 78 * k);
          st = `background:color-mix(in srgb,${o.color} ${pct}%,var(--surface));` + (pct > 55 ? 'color:#fff;' : '');
          cls += ' has';
        }
        h += `<div class="${cls}" style="${st}" data-t="${t}"><i>${dd}</i>${p && showVal ? `<b class="num">${fmt(p.v, o.decimals)}</b>` : ''}</div>`;
      }
      h += '</div></div>';
    }
    host.innerHTML = h + '</div>';
    host.querySelectorAll('.d').forEach(c => {
      const t = +c.dataset.t, p = map.get(t);
      const html = `<div class="t">${mdy(t)}</div>` + (p ? `<div class="r"><span class="sw" style="background:${o.color}"></span><b class="num">${fmt(p.v, o.decimals)}${u}</b></div>${p.n > 1 ? `<div class="n">${p.n} entries</div>` : ''}` : '<div class="r muted">No entry</div>');
      c.addEventListener('mousemove', ev => showTip(ev, html)); c.addEventListener('mouseleave', hideTip);
      c.addEventListener('touchstart', ev => showTip(ev, html), { passive: true });
    });
  }

  window.Charts = { render, aggregate, bucketize, fmt, mdy, md, hm, esc };
})();
