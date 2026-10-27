/* eckert.data — app */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { fmt, mdy, hm, esc } = Charts;
  const D = 864e5;
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  const S = { metrics: [], entries: [], page: store.get('data-page', 'entry'), range: store.get('data-range', '30d'), cat: store.get('data-cat', ''),
    rFilter: '', rLimit: 50, tsTouched: false };
  const PALETTE = ['#1a8f4e', '#2a78d6', '#eda100', '#6250d6', '#eb6834', '#d14343', '#0e9aa7', '#c2185b', '#8a5d00', '#434c47'];
  const TYPES = [
    ['line', 'Line', '<path d="M3 17l5-6 4 3 8-9"/>'],
    ['area', 'Area', '<path d="M3 17l5-6 4 3 8-9v15H3z" fill="currentColor" fill-opacity=".25"/><path d="M3 17l5-6 4 3 8-9"/>'],
    ['bar', 'Bars', '<path d="M5 20v-7M10 20V8M15 20v-5M20 20V5"/>'],
    ['step', 'Step', '<path d="M3 18h5v-6h5V8h8"/>'],
    ['dots', 'Scatter', '<circle cx="6" cy="15" r="1.6" fill="currentColor"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/><circle cx="14" cy="13" r="1.6" fill="currentColor"/><circle cx="18" cy="6" r="1.6" fill="currentColor"/>'],
    ['cumulative', 'Running total', '<path d="M3 20h18"/><path d="M4 18c6-1 10-5 16-13"/><path d="M15 5h5v5"/>'],
    ['calendar', 'Calendar heatmap', '<rect x="3.5" y="3.5" width="5" height="5" rx="1"/><rect x="9.5" y="3.5" width="5" height="5" rx="1" fill="currentColor"/><rect x="15.5" y="3.5" width="5" height="5" rx="1"/><rect x="3.5" y="9.5" width="5" height="5" rx="1" fill="currentColor"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="15.5" y="9.5" width="5" height="5" rx="1" fill="currentColor"/><rect x="3.5" y="15.5" width="5" height="5" rx="1"/><rect x="9.5" y="15.5" width="5" height="5" rx="1" fill="currentColor"/>'],
    ['monthcal', 'Monthly calendar', '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="6.5" y="12.5" width="3" height="2.5" rx=".5" fill="currentColor" stroke="none"/><rect x="10.5" y="12.5" width="3" height="2.5" rx=".5" fill="currentColor" stroke="none"/><rect x="14.5" y="16" width="3" height="2.5" rx=".5" fill="currentColor" stroke="none"/>'],
    ['histogram', 'Distribution', '<path d="M3 20h18"/><rect x="4" y="13" width="4" height="7"/><rect x="8" y="6" width="4" height="14"/><rect x="12" y="9" width="4" height="11"/><rect x="16" y="15" width="4" height="5"/>'],
    ['number', 'Big number', '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>'],
  ];
  const AGGS = [['avg', 'Average'], ['sum', 'Total'], ['min', 'Min'], ['max', 'Max'], ['last', 'Last'], ['count', 'Count']];
  const AGG_SHORT = { avg: 'avg', sum: 'total', min: 'low', max: 'high', last: 'latest', count: 'entries' };
  const BUCKETS = [['raw', 'Each'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']];
  const RANGES = [['7d', '7D', 7], ['30d', '30D', 30], ['90d', '90D', 90], ['1y', '1Y', 365], ['all', 'All', null]];
  const svgI = (p, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    edit: svgI('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), trash: svgI('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    up: svgI('<path d="M12 19V5M6 11l6-6 6 6"/>'), down: svgI('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    wide: svgI('<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>'), hide: svgI('<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c5 0 9 6 9 6a15 15 0 01-2.9 3.4M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6a8.7 8.7 0 004.4-1.2"/>'),
    gear: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>', 1.8),
    check: svgI('<path d="M5 12l5 5L20 7"/>', 2.4), cards: svgI('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  };

  // ---------- small utils ----------
  const mById = (id) => S.metrics.find(m => m.id === id);
  const chartOf = (m) => ({ type: 'line', bucket: 'day', agg: 'avg', span: 6, hidden: false, ...(m.chart || {}) });
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fromLocalInput = (s) => new Date(s).toISOString();
  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 86400 * 45) return Math.floor(s / 86400) + 'd ago'; return mdy(t); };
  const valStr = (m, v) => v == null ? '<span class="muted">✓</span>' : fmt(+v, m ? m.decimals : 2) + (m && m.unit ? ` <span class="muted">${esc(m.unit)}</span>` : '');
  const cats = () => [...new Set(S.metrics.map(m => m.category).filter(Boolean))].sort();
  const rangeWin = () => { const r = RANGES.find(x => x[0] === S.range); const t1 = Date.now(); return r[2] ? { t0: t1 - r[2] * D, t1, len: r[2] * D } : { t0: null, t1, len: null }; };

  function setSync(state, txt) { const d = $('#syncDot'); d.className = 'dot' + (state === 'ok' ? '' : ' ' + state); $('#syncTxt').textContent = txt; }
  let toastT;
  function toast(msg, undo) {
    const t = $('#toast');
    t.innerHTML = IC.check + `<span>${msg}</span>` + (undo ? '<button>Undo</button>' : '');
    if (undo) t.querySelector('button').onclick = () => { t.classList.remove('on'); undo(); };
    t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), undo ? 6000 : 2600);
  }
  async function guard(fn, okMsg) {
    setSync('busy', 'Saving…');
    try { const r = await fn(); setSync('ok', DB.demo ? 'Demo mode' : 'Synced'); if (okMsg) toast(okMsg); return r; }
    catch (e) { console.error(e); setSync('err', 'Error'); toast('⚠︎ ' + (e.message || 'Something went wrong')); throw e; }
  }

  // ---------- modal ----------
  function openModal(html, mount) {
    const m = $('#modal'); m.innerHTML = html; m.classList.add('on'); $('#scrim').classList.add('on');
    mount && mount(m); const f = m.querySelector('input,select,textarea'); if (f && innerWidth > 860) setTimeout(() => f.focus(), 50);
  }
  function closeModal() { $('#modal').classList.remove('on'); $('#scrim').classList.remove('on'); }
  $('#scrim').onclick = closeModal;
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ---------- theme ----------
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = cur;
    $$('#themeToggle button').forEach(b => b.classList.toggle('on', b.dataset.t === cur));
    document.querySelector('meta[name=theme-color]').content = cur === 'dark' ? '#030504' : '#f4f6f5';
    if (S.page === 'overview' && S.metrics.length) renderOverview();
  }
  $$('#themeToggle button').forEach(b => b.onclick = () => { try { localStorage.setItem('data-theme', b.dataset.t); } catch (e) {} applyTheme(b.dataset.t); });
  $('#themeMob').onclick = () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('data-theme', n); } catch (e) {} applyTheme(n); };

  // ---------- navigation ----------
  function setPage(p) {
    S.page = p; store.set('data-page', p);
    $$('.page').forEach(s => s.classList.toggle('on', s.id === 'p-' + p));
    $$('[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    $('#pageTitle').textContent = p === 'entry' ? 'Data entry' : 'Overview';
    renderTop();
    if (p === 'overview') renderOverview(); else renderEntry();
    scrollTo(0, 0);
  }
  $$('[data-page]').forEach(b => b.onclick = () => setPage(b.dataset.page));

  function renderTop() {
    const a = $('#topActions');
    if (S.page === 'entry') {
      const n = S.entries.length;
      $('#pageSub').textContent = n ? `${n.toLocaleString()} entries across ${S.metrics.length} metric${S.metrics.length === 1 ? '' : 's'}` : 'Log anything — weights, hours, miles, inches of rain…';
      a.innerHTML = ''; return;
    }
    $('#pageSub').textContent = 'Change any card’s chart type, grouping and math on the fly';
    const cs = cats();
    a.innerHTML = `<div class="seg" id="rangeSeg">${RANGES.map(r => `<button data-r="${r[0]}" class="${S.range === r[0] ? 'on' : ''}">${r[1]}</button>`).join('')}</div>`
      + (cs.length ? `<select class="in sel" id="catSel"><option value="">All categories</option>${cs.map(c => `<option ${S.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : '')
      + `<button class="btn" id="cardsBtn" title="Show or hide metric cards">${IC.cards}<span>Cards</span></button>`
      + `<button class="btn ${LAY.edit ? 'primary' : ''}" id="layoutBtn" title="Resize, rearrange or hide cards on this page">${svgI('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M10 9v12"/>')}<span>Layout</span></button>`;
    $$('#rangeSeg button').forEach(b => b.onclick = () => { S.range = b.dataset.r; store.set('data-range', S.range); renderTop(); renderOverview(); });
    const cSel = $('#catSel'); if (cSel) cSel.onchange = () => { S.cat = cSel.value; store.set('data-cat', S.cat); renderOverview(); };
    $('#cardsBtn').onclick = cardsModal;
    $('#layoutBtn').onclick = () => { LAY.edit = !LAY.edit; renderTop(); renderOverview(); };
  }

  // =====================================================================
  // DATA ENTRY
  // =====================================================================
  function metricOptions(sel, includeNew) {
    const act = S.metrics.filter(m => !m.archived), groups = {};
    act.forEach(m => (groups[m.category || ''] ||= []).push(m));
    const opt = m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.name)}${m.unit ? ` (${esc(m.unit)})` : ''}</option>`;
    const keys = Object.keys(groups).sort((a, b) => (a === '') - (b === '') || a.localeCompare(b));
    let h = keys.length > 1 ? keys.map(k => `<optgroup label="${esc(k || 'Other')}">${groups[k].map(opt).join('')}</optgroup>`).join('') : act.map(opt).join('');
    if (!act.length) h = '<option value="">No metrics yet</option>';
    if (includeNew) h += '<option value="__new">＋ New metric…</option>';
    return h;
  }
  function renderEntry() {
    renderTop();
    const sel = $('#eMetric');
    let cur = sel.value && sel.value !== '__new' ? sel.value : store.get('data-last-metric', '');
    if (!mById(cur) || mById(cur).archived) cur = (S.metrics.find(m => !m.archived) || {}).id;
    sel.innerHTML = metricOptions(cur, true);
    if (cur) sel.value = cur;
    syncUnit();
    if (!S.tsTouched) $('#eTs').value = toLocalInput(Date.now());
    $('#eHint').textContent = 'Leave value blank to log an occurrence';
    renderMetricTable(); renderRecent();
  }
  function syncUnit() { const m = mById($('#eMetric').value); $('#eUnit').textContent = m && m.unit ? m.unit : ''; }
  $('#eMetric').onchange = () => {
    if ($('#eMetric').value === '__new') { metricModal(null, (m) => { renderEntry(); $('#eMetric').value = m.id; syncUnit(); }); $('#eMetric').value = store.get('data-last-metric', '') || ''; return; }
    store.set('data-last-metric', $('#eMetric').value); syncUnit(); $('#eValue').focus();
  };
  const newAndSelect = () => metricModal(null, (m) => { store.set('data-last-metric', m.id); renderEntry(); $('#eMetric').value = m.id; syncUnit(); });
  $('#eNewMetric').onclick = newAndSelect;
  $('#mNew').onclick = () => newAndSelect();
  $('#eTs').addEventListener('input', () => S.tsTouched = true);
  $('#eNow').onclick = () => { S.tsTouched = false; $('#eTs').value = toLocalInput(Date.now()); };
  setInterval(() => { if (!S.tsTouched && document.activeElement !== $('#eTs')) $('#eTs').value = toLocalInput(Date.now()); }, 15000);

  $('#entryF').onsubmit = async (ev) => {
    ev.preventDefault();
    const m = mById($('#eMetric').value);
    if (!m) { metricModal(null, (n) => { renderEntry(); $('#eMetric').value = n.id; syncUnit(); }); return; }
    const raw = $('#eValue').value.trim();
    const e = { metric_id: m.id, ts: fromLocalInput($('#eTs').value || toLocalInput(Date.now())), value: raw === '' ? null : +raw, notes: $('#eNotes').value.trim() || null };
    if (raw !== '' && isNaN(e.value)) return toast('Value must be a number');
    $('#eSave').disabled = true;
    try {
      const row = await guard(() => DB.saveEntry(e));
      S.entries.unshift(norm(row)); sortEntries();
      store.set('data-last-metric', m.id);
      toast(`Saved ${esc(m.name)} · ${raw === '' ? 'logged' : fmt(e.value, m.decimals) + (m.unit ? ' ' + esc(m.unit) : '')}`);
      $('#eValue').value = ''; $('#eNotes').value = ''; S.tsTouched = false; $('#eTs').value = toLocalInput(Date.now());
      renderEntry(); if (innerWidth > 860) $('#eValue').focus();
    } finally { $('#eSave').disabled = false; }
  };

  function renderMetricTable() {
    const t = $('#mTable');
    if (!S.metrics.length) { t.innerHTML = `<tr><td><div class="empty-state"><h3>Create your first metric</h3><div>A metric is anything you want to track — “Weight (lb)”, “Sleep (hrs)”, “Rainfall (in)”, “Mowed the lawn”.</div><button class="btn primary" id="mFirst">New metric</button></div></td></tr>`; $('#mFirst').onclick = () => metricModal(null, () => renderEntry()); return; }
    const cnt = {}, last = {};
    for (const e of S.entries) { cnt[e.metric_id] = (cnt[e.metric_id] || 0) + 1; if (!last[e.metric_id] || e.t > last[e.metric_id]) last[e.metric_id] = e.t; }
    t.innerHTML = `<tr><th>Metric</th><th class="hide-m">Category</th><th class="r">Entries</th><th class="r hide-m">Last</th><th></th></tr>`
      + S.metrics.map((m, i) => `<tr data-id="${m.id}" style="${m.archived ? 'opacity:.5' : ''}">
        <td><span class="mname"><span class="sw" style="background:${m.color}"></span>${esc(m.name)}${m.unit ? ` <span class="muted" style="font-weight:500">${esc(m.unit)}</span>` : ''}${m.archived ? ' <span class="chip">archived</span>' : ''}</span></td>
        <td class="hide-m muted">${esc(m.category || '—')}</td><td class="r">${(cnt[m.id] || 0).toLocaleString()}</td>
        <td class="r hide-m muted">${last[m.id] ? ago(last[m.id]) : '—'}</td>
        <td class="act"><button class="icon-btn" data-mv="-1" title="Move up" ${i ? '' : 'disabled style="opacity:.3"'}>${IC.up}</button><button class="icon-btn" data-mv="1" title="Move down" ${i < S.metrics.length - 1 ? '' : 'disabled style="opacity:.3"'}>${IC.down}</button><button class="icon-btn" data-ed title="Edit">${IC.edit}</button></td></tr>`).join('');
    $$('tr[data-id]', t).forEach(tr => {
      const m = mById(tr.dataset.id);
      tr.querySelector('[data-ed]').onclick = () => metricModal(m, () => renderEntry());
      tr.querySelector('td').onclick = () => metricModal(m, () => renderEntry());
      tr.querySelector('td').style.cursor = 'pointer';
      $$('[data-mv]', tr).forEach(b => b.onclick = () => moveMetric(m, +b.dataset.mv));
    });
  }
  async function moveMetric(m, dir) {
    const i = S.metrics.indexOf(m), j = i + dir; if (j < 0 || j >= S.metrics.length) return;
    [S.metrics[i], S.metrics[j]] = [S.metrics[j], S.metrics[i]];
    S.metrics.forEach((x, k) => x.sort_order = k);
    renderMetricTable();
    await guard(() => Promise.all([S.metrics[i], S.metrics[j]].map(x => DB.saveMetric({ id: x.id, sort_order: x.sort_order }))));
  }

  function filteredRecent() { return S.rFilter ? S.entries.filter(e => e.metric_id === S.rFilter) : S.entries; }
  function renderRecent() {
    const sel = $('#rMetric');
    sel.innerHTML = '<option value="">All metrics</option>' + S.metrics.map(m => `<option value="${m.id}" ${S.rFilter === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
    const list = filteredRecent(), shown = list.slice(0, S.rLimit);
    $('#rCount').textContent = list.length ? `${list.length.toLocaleString()} entr${list.length === 1 ? 'y' : 'ies'}, newest first` : '';
    const t = $('#rTable');
    if (!list.length) { t.innerHTML = '<tr><td class="muted" style="padding:20px 0">Nothing logged yet.</td></tr>'; $('#rMore').innerHTML = ''; return; }
    t.innerHTML = `<tr><th>When</th><th>Metric</th><th class="r">Value</th><th>Notes</th><th></th></tr>` + shown.map(e => {
      const m = mById(e.metric_id);
      return `<tr data-id="${e.id}"><td class="num" style="white-space:nowrap">${mdy(e.t)} <span class="muted">${hm(e.t)}</span></td>
        <td><span class="mname"><span class="sw" style="background:${m ? m.color : '#999'}"></span>${esc(m ? m.name : '?')}</span></td>
        <td class="r">${valStr(m, e.v)}</td><td class="nt" title="${esc(e.notes || '')}">${esc(e.notes || '')}</td>
        <td class="act"><button class="icon-btn" data-ed title="Edit">${IC.edit}</button><button class="icon-btn" data-del title="Delete">${IC.trash}</button></td></tr>`;
    }).join('');
    $$('tr[data-id]', t).forEach(tr => {
      const e = S.entries.find(x => x.id === tr.dataset.id);
      tr.querySelector('[data-ed]').onclick = () => entryModal(e);
      tr.querySelector('[data-del]').onclick = () => deleteEntry(e);
    });
    $('#rMore').innerHTML = list.length > S.rLimit ? `<button class="btn sm">Show more (${(list.length - S.rLimit).toLocaleString()} left)</button>` : '';
    const mb = $('#rMore button'); if (mb) mb.onclick = () => { S.rLimit += 100; renderRecent(); };
  }
  $('#rMetric').onchange = () => { S.rFilter = $('#rMetric').value; S.rLimit = 50; renderRecent(); };
  $('#rExport').onclick = () => {
    const rows = [['timestamp', 'metric', 'value', 'unit', 'notes']].concat(filteredRecent().map(e => { const m = mById(e.metric_id) || {}; return [new Date(e.t).toISOString(), m.name, e.v ?? '', m.unit || '', e.notes || '']; }));
    const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `eckert-data-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  async function deleteEntry(e) {
    await guard(() => DB.deleteEntry(e.id));
    S.entries = S.entries.filter(x => x.id !== e.id); rerender();
    const m = mById(e.metric_id);
    toast(`Deleted ${esc(m ? m.name : 'entry')} entry`, async () => {
      const row = await guard(() => DB.saveEntry({ ...e, ts: new Date(e.t).toISOString(), value: e.v, _restore: true }));
      S.entries.push(norm(row)); sortEntries(); rerender();
    });
  }

  function entryModal(e) {
    openModal(`<h2>Edit entry</h2><form class="form" id="xF">
      <div class="full"><label>Metric</label><select class="in" id="xM">${metricOptions(e.metric_id, false)}</select></div>
      <div><label>Value</label><input class="in num" id="xV" type="number" step="any" inputmode="decimal" value="${e.v ?? ''}" placeholder="blank = occurrence"></div>
      <div><label>Timestamp</label><input class="in" id="xT" type="datetime-local" value="${toLocalInput(e.t)}"></div>
      <div class="full"><label>Notes</label><textarea class="in" id="xN" rows="3">${esc(e.notes || '')}</textarea></div></form>
      <div class="form-actions"><button class="btn danger" id="xDel">Delete</button><span class="sp"></span><button class="btn" id="xC">Cancel</button><button class="btn primary" form="xF">Save</button></div>`, (m) => {
      if (!mById(e.metric_id) || mById(e.metric_id).archived) $('#xM', m).insertAdjacentHTML('afterbegin', `<option value="${e.metric_id}" selected>${esc((mById(e.metric_id) || {}).name || '?')}</option>`);
      $('#xC', m).onclick = closeModal;
      $('#xDel', m).onclick = () => { closeModal(); deleteEntry(e); };
      $('#xF', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const raw = $('#xV', m).value.trim();
        const upd = { id: e.id, metric_id: $('#xM', m).value, ts: fromLocalInput($('#xT', m).value), value: raw === '' ? null : +raw, notes: $('#xN', m).value.trim() || null };
        const row = await guard(() => DB.saveEntry(upd), 'Entry updated');
        Object.assign(e, norm(row)); sortEntries(); closeModal(); rerender();
      };
    });
  }

  function metricModal(m, done) {
    const isNew = !m; m = m || { name: '', unit: '', category: '', color: PALETTE[S.metrics.length % PALETTE.length], decimals: 1, chart: {} };
    const c = chartOf(m);
    const n = S.entries.filter(e => e.metric_id === m.id).length;
    openModal(`<h2>${isNew ? 'New metric' : 'Edit metric'}</h2><form class="form" id="mF">
      <div class="full"><label>Name</label><input class="in" id="mN" required maxlength="60" value="${esc(m.name)}" placeholder="e.g. Weight, Sleep, Rainfall, Mowed lawn"></div>
      <div><label>Unit</label><input class="in" id="mU" maxlength="16" value="${esc(m.unit || '')}" placeholder="lb, hrs, mi, in… (optional)"></div>
      <div><label>Category</label><input class="in" id="mC" list="catList" maxlength="40" value="${esc(m.category || '')}" placeholder="Optional"><datalist id="catList">${cats().map(x => `<option>${esc(x)}</option>`).join('')}</datalist></div>
      <div class="full"><label>Color</label><div class="palette" id="mPal">${PALETTE.map(p => `<button type="button" data-c="${p}" style="background:${p}" class="${p === m.color ? 'on' : ''}"></button>`).join('')}<input type="color" id="mCol" value="${m.color}" title="Custom color"></div></div>
      <div><label>Default chart</label><select class="in" id="mT">${TYPES.map(t => `<option value="${t[0]}" ${c.type === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></div>
      <div><label>Summarize by</label><select class="in" id="mA">${AGGS.map(a => `<option value="${a[0]}" ${c.agg === a[0] ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></div>
      <div><label>Decimals</label><select class="in" id="mD">${[0, 1, 2, 3, 4].map(d => `<option ${+m.decimals === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div><label>Group by</label><select class="in" id="mB">${BUCKETS.map(b => `<option value="${b[0]}" ${c.bucket === b[0] ? 'selected' : ''}>${b[0] === 'raw' ? 'Each entry' : b[1]}</option>`).join('')}</select></div>
      <div class="full" style="display:flex;gap:22px;flex-wrap:wrap"><label class="check"><input type="checkbox" id="mS" ${c.hidden ? '' : 'checked'}>Show on Overview</label>${isNew ? '' : `<label class="check"><input type="checkbox" id="mR" ${m.archived ? 'checked' : ''}>Archived (hide from entry list)</label>`}</div>
      </form>
      <div class="form-actions">${isNew ? '' : '<button class="btn danger" id="mDel">Delete</button>'}<span class="sp"></span><button class="btn" id="mX">Cancel</button><button class="btn primary" form="mF">${isNew ? 'Create' : 'Save'}</button></div>`, (el) => {
      let color = m.color;
      const pick = (c) => { color = c; $$('#mPal button', el).forEach(b => b.classList.toggle('on', b.dataset.c === c)); $('#mCol', el).value = c; };
      $$('#mPal button', el).forEach(b => b.onclick = () => pick(b.dataset.c));
      $('#mCol', el).oninput = (e) => pick(e.target.value);
      $('#mX', el).onclick = closeModal;
      if (!isNew) $('#mDel', el).onclick = async () => {
        if (!confirm(`Delete “${m.name}”${n ? ` and its ${n.toLocaleString()} entr${n === 1 ? 'y' : 'ies'}` : ''}? This can’t be undone.${n ? '\n\nTip: “Archived” hides it without losing data.' : ''}`)) return;
        await guard(() => DB.deleteMetric(m.id), `Deleted ${esc(m.name)}`);
        S.metrics = S.metrics.filter(x => x.id !== m.id); S.entries = S.entries.filter(e => e.metric_id !== m.id);
        if (S.rFilter === m.id) S.rFilter = '';
        closeModal(); rerender();
      };
      $('#mF', el).onsubmit = async (ev) => {
        ev.preventDefault();
        const name = $('#mN', el).value.trim();
        if (S.metrics.some(x => x.id !== m.id && x.name.toLowerCase() === name.toLowerCase())) return toast('You already have a metric with that name');
        const row = { id: m.id, name, unit: $('#mU', el).value.trim() || null, category: $('#mC', el).value.trim() || null, color, decimals: +$('#mD', el).value,
          chart: { ...c, type: $('#mT', el).value, agg: $('#mA', el).value, bucket: $('#mB', el).value, hidden: !$('#mS', el).checked } };
        if (!isNew) row.archived = $('#mR', el).checked; else row.sort_order = S.metrics.length;
        const saved = await guard(() => DB.saveMetric(row), isNew ? `Created ${esc(name)}` : 'Metric saved');
        if (isNew) S.metrics.push(saved); else Object.assign(m, saved);
        closeModal(); done ? done(saved) : rerender();
      };
    });
  }

  // =====================================================================
  // OVERVIEW
  // =====================================================================
  function dayKey(t) { const d = new Date(t); return d.getFullYear() * 1e4 + d.getMonth() * 100 + d.getDate(); }
  function renderOverview() {
    const { t0, t1, len } = rangeWin();
    const inR = S.entries.filter(e => t0 == null || e.t >= t0);
    const prev = len ? S.entries.filter(e => e.t >= t0 - len && e.t < t0) : null;
    const days = new Set(inR.map(e => dayKey(e.t)));
    let streak = 0; const all = new Set(S.entries.map(e => dayKey(e.t)));
    for (let d = new Date(); ; d.setDate(d.getDate() - 1)) { if (all.has(dayKey(d))) streak++; else if (streak || dayKey(d) !== dayKey(Date.now())) break; }
    const rLab = S.range === 'all' ? 'all time' : 'last ' + RANGES.find(r => r[0] === S.range)[1].replace('D', ' days').replace('1Y', 'year');
    const delta = prev && prev.length ? (inR.length - prev.length) / prev.length : null;
    const spanDays = t0 ? Math.round(len / D) : (S.entries.length ? Math.max(1, Math.round((Date.now() - S.entries[S.entries.length - 1].t) / D)) : 0);
    $('#ovKpis').innerHTML = `
      <div class="card hero kpi c-3 kp"><div class="label">Entries · ${rLab}</div><div class="val num">${inR.length.toLocaleString()}</div>
        <div class="delta">${delta == null ? '&nbsp;' : `<span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta * 100).toFixed(0)}%</span> vs prior period`}</div></div>
      <div class="card kpi c-3 kp"><div class="label">Metrics with data</div><div class="val num">${new Set(inR.map(e => e.metric_id)).size}<span class="muted" style="font-size:var(--fs-lg)"> / ${S.metrics.filter(m => !m.archived).length}</span></div><div class="delta muted">${cats().length} categor${cats().length === 1 ? 'y' : 'ies'}</div></div>
      <div class="card kpi c-3 kp"><div class="label">Days logged</div><div class="val num">${days.size}</div><div class="delta muted">${spanDays ? Math.min(100, Math.round(days.size / (spanDays + 1) * 100)) + '% of days' : '&nbsp;'}</div></div>
      <div class="card kpi c-3 kp"><div class="label">Current streak</div><div class="val num">${streak} <span class="muted" style="font-size:var(--fs-lg)">day${streak === 1 ? '' : 's'}</span></div><div class="delta muted">${S.entries.length ? 'Last entry ' + ago(S.entries[0].t) : '&nbsp;'}</div></div>`;

    const g = $('#ovGrid');
    document.body.classList.toggle('lay-on', LAY.edit);
    $('#layBanner')?.remove();
    if (LAY.edit) {
      const b = document.createElement('div'); b.className = 'lay-banner'; b.id = 'layBanner';
      b.innerHTML = `${svgI('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M10 9v12"/>')}<span><b>Customizing this page on ${devKey() === 'phone' ? 'phones' : 'computers'}.</b> Drag the handle to move a card (arrows on a phone), drag its right or bottom edge (or use − / +) to resize it, the eye to hide it. Double-click an edge to reset it. Sizes are saved separately for phone and computer.</span><span style="margin-left:auto;display:flex;gap:8px"><button class="btn" id="layReset">Reset page</button><button class="btn primary" id="layDone">Done</button></span>`;
      $('#p-overview').prepend(b);
      $('#layDone').onclick = () => { LAY.edit = false; renderTop(); renderOverview(); toast('Layout saved'); };
      $('#layReset').onclick = () => {
        const dk = devKey(), was = S.metrics.map(m => [m, JSON.parse(JSON.stringify(m.chart || {}))]);
        S.metrics.forEach(m => { const c = chartOf(m); if (c.lay && c.lay[dk]) { const lay = { ...c.lay }; delete lay[dk]; m.chart = { ...c, lay }; if (dk === 'desk') delete m.chart.span; saveChart(m); } });
        renderOverview(); toast('Page layout reset', () => { was.forEach(([m, ch]) => { m.chart = ch; saveChart(m); }); renderOverview(); });
      };
    }
    const ms = S.metrics.filter(m => !m.archived && (LAY.edit || !chartOf(m).hidden) && (!S.cat || m.category === S.cat));
    if (!ms.length) {
      g.innerHTML = `<div class="card c-12"><div class="empty-state"><h3>${S.metrics.length ? 'No cards to show' : 'Nothing to chart yet'}</h3><div>${S.metrics.length ? 'All metrics in this view are hidden. Use “Cards” to bring them back.' : 'Create a metric and log a few entries — each metric gets its own card here.'}</div><button class="btn primary" id="goEntry">${S.metrics.length ? 'Manage cards' : 'Go to data entry'}</button></div></div>`;
      $('#goEntry').onclick = S.metrics.length ? cardsModal : () => setPage('entry'); return;
    }
    g.innerHTML = ms.map(m => `<div class="card" data-mc="${m.id}"></div>`).join('');
    ms.forEach((m, i) => { const el = $(`[data-mc="${m.id}"]`, g), L = layOf(m); el.style.order = L.ord ?? 1000 + i; renderCard(m, el); });
  }

  // =====================================================================
  // LAYOUT (same model as eckert.fin): per device (phone / computer) span on the 12-col grid,
  // extra height in px, and order. Saved into each metric's chart settings, so it syncs everywhere.
  // =====================================================================
  const LAY = { edit: false };
  const devKey = () => innerWidth <= 860 ? 'phone' : 'desk';
  const SIZES = { desk: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12], phone: [4, 6, 12] };
  const SIZE_NAME = n => ({ 2: '⅙', 3: '¼', 4: '⅓', 5: '5/12', 6: '½', 7: '7/12', 8: '⅔', 9: '¾', 10: '⅚', 12: 'Full' })[n] || n + '/12';
  function layOf(m) {
    const c = chartOf(m), dk = devKey(), L = (c.lay && c.lay[dk]) || {};
    return { span: L.span || (dk === 'desk' ? (m.chart && m.chart.span) || 6 : 12), h: L.h || 0, ord: L.ord };
  }
  function setLay(m, patch) {
    const c = chartOf(m), dk = devKey(), lay = { ...(c.lay || {}) };
    lay[dk] = { ...(lay[dk] || {}), ...patch };
    Object.keys(lay[dk]).forEach(k => lay[dk][k] == null && delete lay[dk][k]);
    m.chart = { ...c, lay }; saveChart(m);
  }
  let DEV_NOW = devKey();
  addEventListener('resize', () => { const d = devKey(); if (d !== DEV_NOW) { DEV_NOW = d; if (S.page === 'overview' && S.metrics.length) renderOverview(); } });
  const visualOrder = () => $$('#ovGrid [data-mc]').map((c, i) => ({ id: c.dataset.mc, o: +c.style.order, i })).sort((a, b) => a.o - b.o || a.i - b.i).map(x => x.id);
  function saveOrder(list) { list.forEach((id, i) => { const m = mById(id); if (m && layOf(m).ord !== i) setLay(m, { ord: i }); }); renderOverview(); }

  function applyLayout(m, card) {
    const L = layOf(m), dk = devKey(), hid = chartOf(m).hidden;
    card.style.gridColumn = `span ${L.span}`;
    card.style.minHeight = '';
    card.dataset.extra = L.h || '';
    card.style.alignSelf = ''; card.style.height = '';
    card.classList.toggle('lay-hidden', !!(hid && LAY.edit));
    if (!LAY.edit) { card.removeAttribute('draggable'); return; }
    const ctl = document.createElement('div'); ctl.className = 'lay-ctl';
    ctl.innerHTML = `<button class="grip" title="Drag to move">${svgI('<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>')}</button><button data-mv="-1" title="Move earlier">${IC.up}</button><button data-mv="1" title="Move later">${IC.down}</button><button data-sz="-1" title="Smaller" class="sz">−</button><span class="sz-l">${SIZE_NAME(L.span)}</span><button data-sz="1" title="Larger" class="sz">+</button><button data-hd title="${hid ? 'Show' : 'Hide'}">${hid ? IC.hide : svgI('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}</button>`;
    card.appendChild(ctl); ctl.onclick = e => e.stopPropagation();
    $$('[data-mv]', ctl).forEach(b => b.onclick = () => { const list = visualOrder(), i = list.indexOf(m.id), j = i + +b.dataset.mv; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; saveOrder(list); });
    $$('[data-sz]', ctl).forEach(b => b.onclick = () => { const list = SIZES[dk], now = L.span;
      const n = +b.dataset.sz > 0 ? (list.find(x => x > now) ?? list[list.length - 1]) : ([...list].reverse().find(x => x < now) ?? list[0]);
      setLay(m, { span: n }); renderOverview(); });
    $('[data-hd]', ctl).onclick = () => { m.chart = { ...chartOf(m), hidden: !hid }; saveChart(m); renderOverview(); };

    // drag the right edge: snaps to the 12-column grid (whole steps on a phone)
    const rs = document.createElement('div'); rs.className = 'lay-rs'; rs.title = 'Drag to resize · double-click to reset'; card.appendChild(rs);
    rs.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); rs.setPointerCapture(e.pointerId);
      const grid = card.parentElement, gap = parseFloat(getComputedStyle(grid).columnGap) || 0, colW = (grid.clientWidth - gap * 11) / 12, left = card.getBoundingClientRect().left;
      const list = SIZES[dk], snap = n => list.reduce((b, x) => Math.abs(x - n) < Math.abs(b - n) ? x : b, list[0]);
      let n = L.span; const tag = $('.sz-l', ctl); card.classList.add('lay-sizing'); document.body.classList.add('lay-dragging');
      rs.onpointermove = ev => { n = snap(Math.max(1, Math.min(12, Math.round((ev.clientX - left + gap) / (colW + gap))))); card.style.gridColumn = `span ${n}`; tag.textContent = SIZE_NAME(n); };
      rs.onpointerup = rs.onpointercancel = () => { rs.onpointermove = rs.onpointerup = rs.onpointercancel = null; card.classList.remove('lay-sizing'); document.body.classList.remove('lay-dragging');
        if (n !== L.span) setLay(m, { span: n }); renderOverview(); }; };
    rs.ondblclick = () => { setLay(m, { span: null }); renderOverview(); };

    // drag the bottom edge: charts stretch; snaps every 8px, to the cards beside it, and to its natural height
    const rh = document.createElement('div'); rh.className = 'lay-rh'; rh.title = 'Drag to change the height · double-click to reset'; card.appendChild(rh);
    rh.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); rh.setPointerCapture(e.pointerId);
      // what you see is what you get: a row is as tall as its tallest card, and every card in it (and its chart) fills that height
      const natural = x => { const a = x.style.alignSelf; x.style.alignSelf = 'start'; const h = x.getBoundingClientRect().height; x.style.alignSelf = a; return h; };
      const r0 = card.getBoundingClientRect(), h0 = r0.height, e0 = +(card.dataset.extra || 0), own = natural(card), base = own - e0, y0 = e.clientY;
      const near = $$('#ovGrid .card').filter(x => x !== card && Math.abs(x.getBoundingClientRect().top - r0.top) < 40).map(natural);
      const rowMin = near.length ? Math.max(...near) : 0;
      let ex = e0; card.classList.add('lay-sizing'); document.body.classList.add('lay-dragging');
      const tag = document.createElement('div'); tag.className = 'lay-hl'; card.appendChild(tag);
      rh.onpointermove = ev => { const t = Math.max(160, h0 + ev.clientY - y0);
        let tgt, lab;
        if (rowMin && t <= rowMin + 12) { tgt = rowMin; lab = 'Lined up with the card beside it'; }
        else if (Math.abs(t - base) <= 12) { tgt = base; lab = 'Natural height'; }
        else { tgt = Math.round(t / 8) * 8; lab = null; }
        ex = Math.round(tgt - base);
        card.style.height = Math.max(tgt, rowMin) + 'px';
        tag.textContent = lab || (ex > 0 ? '+' : '') + ex + 'px'; };
      rh.onpointerup = rh.onpointercancel = () => { rh.onpointermove = rh.onpointerup = rh.onpointercancel = null; card.classList.remove('lay-sizing'); document.body.classList.remove('lay-dragging'); tag.remove();
        // lining up with the row = no extra of its own (the row stretch does it)
        const lined = rowMin && Math.abs(base + ex - rowMin) < 1, keep = (lined && base <= rowMin) || Math.abs(ex) < 4 ? null : ex;
        setLay(m, { h: keep }); renderOverview(); }; };
    rh.ondblclick = () => { setLay(m, { h: null }); renderOverview(); };

    // drag the handle to move (desktop)
    const grip = $('.grip', ctl);
    grip.onmousedown = grip.ontouchstart = () => card.setAttribute('draggable', 'true');
    card.ondragstart = e => { e.dataTransfer.setData('text/plain', m.id); e.dataTransfer.effectAllowed = 'move'; };
    card.ondragend = () => card.removeAttribute('draggable');
    card.ondragover = e => { e.preventDefault(); card.classList.add('lay-drop'); };
    card.ondragleave = () => card.classList.remove('lay-drop');
    card.ondrop = e => { e.preventDefault(); card.classList.remove('lay-drop'); const from = e.dataTransfer.getData('text/plain'); if (!from || from === m.id) return;
      const r = card.getBoundingClientRect(), after = (e.clientY - r.top) > r.height / 2 || (e.clientX - r.left) > r.width * .66;
      const list = visualOrder().filter(k => k !== from); list.splice(list.indexOf(m.id) + (after ? 1 : 0), 0, from); saveOrder(list); };
  }

  function renderCard(m, card) {
    const c = chartOf(m), { t0, t1, len } = rangeWin();
    const all = S.entries.filter(e => e.metric_id === m.id);
    const ents = all.filter(e => t0 == null || e.t >= t0).sort((a, b) => a.t - b.t);
    const prev = len ? all.filter(e => e.t >= t0 - len && e.t < t0) : [];
    const latest = all[0];
    const agg = c.type === 'cumulative' ? 'sum' : c.agg;
    const cur = Charts.aggregate(ents, agg), pv = Charts.aggregate(prev, agg);
    const dlt = cur != null && pv ? (cur - pv) / Math.abs(pv) : null;
    const u = (a) => m.unit && a !== 'count' ? `<small>${esc(m.unit)}</small>` : '';
    const rShort = S.range === 'all' ? 'All-time' : RANGES.find(r => r[0] === S.range)[1];
    const noBucket = ['calendar', 'monthcal', 'histogram'].includes(c.type), noAgg = ['histogram', 'cumulative'].includes(c.type);
    const isCal = ['calendar', 'monthcal'].includes(c.type), noAxis = ['histogram', 'number'].includes(c.type);
    const hasAxis = c.ymin != null || c.ymax != null, axOpen = !noAxis && (hasAxis || axisOpen.has(m.id));
    card.innerHTML = `
      <div class="card-h"><div><h3><span class="sw" style="background:${m.color}"></span>${esc(m.name)}</h3><div class="sub">${[m.category, latest ? 'Last logged ' + ago(latest.t) : 'No entries yet'].filter(Boolean).map(esc).join(' · ')}</div></div>
        <div class="right"><button class="icon-btn" data-a="hide" title="Hide card">${IC.hide}</button><button class="icon-btn" data-a="edit" title="Metric settings">${IC.gear}</button></div></div>
      <div class="mc-stats">
        <div class="mc-stat"><div class="l">Latest</div><div class="v num">${latest ? (latest.v == null ? '✓' : fmt(+latest.v, m.decimals)) + (latest.v == null ? '' : u()) : '—'}</div><div class="s">${latest ? mdy(latest.t) : '&nbsp;'}</div></div>
        <div class="mc-stat"><div class="l">${rShort} ${AGG_SHORT[agg]}</div><div class="v num">${fmt(cur, agg === 'count' ? 0 : m.decimals)}${cur == null ? '' : u(agg)}</div><div class="s">${dlt == null || !isFinite(dlt) ? `${ents.length} entr${ents.length === 1 ? 'y' : 'ies'}` : `<span class="chip ${dlt >= 0 ? 'pos' : 'neg'}">${dlt >= 0 ? '▲' : '▼'} ${Math.abs(dlt * 100).toFixed(1)}%</span> vs prior`}</div></div>
      </div>
      <div class="chart"></div>
      <div class="mc-ctl">
        <div class="types">${TYPES.map(t => `<button data-t="${t[0]}" title="${t[1]}" class="${c.type === t[0] ? 'on' : ''}">${svgI(t[2])}</button>`).join('')}</div>
        ${noBucket ? '' : `<div class="seg sm">${BUCKETS.map(b => `<button data-b="${b[0]}" class="${c.bucket === b[0] ? 'on' : ''}">${b[1]}</button>`).join('')}</div>`}
        ${noAgg ? '' : `<select class="in sel sm" data-agg style="width:auto">${AGGS.map(a => `<option value="${a[0]}" ${c.agg === a[0] ? 'selected' : ''}>${a[1]}</option>`).join('')}</select>`}
        ${noAxis ? '' : `<button class="ctl-btn ${hasAxis ? 'on' : ''}" data-a="axis" title="${isCal ? 'Set the color scale' : 'Set the y-axis range'}">${svgI('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>', 2.2)}${isCal ? 'Scale' : 'Y axis'}${hasAxis ? '' : ': auto'}</button>`}
        ${axOpen ? `<div class="yax">${isCal ? 'Color' : 'Y'} <input class="in sm num" type="number" step="any" data-y="ymin" placeholder="Min auto" value="${c.ymin ?? ''}"><span>–</span><input class="in sm num" type="number" step="any" data-y="ymax" placeholder="Max auto" value="${c.ymax ?? ''}">${hasAxis ? '<button class="ctl-btn" data-a="auto">Auto</button>' : ''}</div>` : ''}
      </div>`;
    const host = $('.chart', card);
    Charts.render(host, { type: c.type, bucket: c.bucket, agg: c.agg, color: m.color, unit: m.unit, decimals: m.decimals,
      entries: ents, ymin: c.ymin, ymax: c.ymax, t0, t1: t0 == null ? null : t1, height: Math.max(120, (layOf(m).span >= 8 ? 260 : 220) + layOf(m).h) });
    applyLayout(m, card);
    const ex = layOf(m).h;
    // calendars size to their content, so extra height is added to the card itself
    if (ex && host.classList.contains('flow') && c.type !== 'number') { const hb = [...host.children].reduce((t, x) => t + x.getBoundingClientRect().height, 0); host.style.minHeight = Math.max(0, hb + ex) + 'px'; }
    const set = (patch, full) => { m.chart = { ...c, ...patch }; full ? renderOverview() : renderCard(m, card); saveChart(m); };
    $$('.types [data-t]', card).forEach(b => b.onclick = () => set({ type: b.dataset.t }));
    $$('[data-b]', card).forEach(b => b.onclick = () => set({ bucket: b.dataset.b }));
    const as = $('[data-agg]', card); if (as) as.onchange = () => set({ agg: as.value });
    const ax = $('[data-a=axis]', card);
    if (ax) ax.onclick = () => { if (axisOpen.has(m.id) && !hasAxis) axisOpen.delete(m.id); else axisOpen.add(m.id); renderCard(m, card); const i = $('[data-y=ymin]', card); if (i) i.focus(); };
    $$('[data-y]', card).forEach(i => {
      const apply = () => { const v = i.value.trim(); const nv = v === '' || isNaN(+v) ? null : +v; if (nv !== (c[i.dataset.y] ?? null)) { axisOpen.add(m.id); set({ [i.dataset.y]: nv }); } };
      i.onchange = apply; i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } };
    });
    const au = $('[data-a=auto]', card); if (au) au.onclick = () => { axisOpen.delete(m.id); set({ ymin: null, ymax: null }); };
    $('[data-a=hide]', card).onclick = () => { set({ hidden: true }, true); toast(`Hid ${esc(m.name)}`, () => set({ hidden: false }, true)); };
    $('[data-a=edit]', card).onclick = () => metricModal(m, () => renderOverview());
  }
  const saveT = {}, axisOpen = new Set();
  function saveChart(m) { clearTimeout(saveT[m.id]); saveT[m.id] = setTimeout(() => guard(() => DB.saveMetric({ id: m.id, chart: m.chart })), 700); }

  function cardsModal() {
    const act = S.metrics.filter(m => !m.archived);
    openModal(`<h2>Overview cards</h2><div class="muted" style="margin:-10px 0 16px;font-size:var(--fs-sm)">Choose which metrics get a card. Reorder them from the Metrics list on Data entry.</div>
      <div style="display:flex;flex-direction:column;gap:4px">${act.map(m => `<label class="check" style="padding:8px 4px;border-bottom:1px solid var(--border)"><input type="checkbox" data-id="${m.id}" ${chartOf(m).hidden ? '' : 'checked'}><span class="sw" style="background:${m.color}"></span>${esc(m.name)}<span class="muted" style="margin-left:auto;font-size:var(--fs-sm)">${esc(m.category || '')}</span></label>`).join('') || '<div class="muted">No metrics yet.</div>'}</div>
      <div class="form-actions"><span class="sp"></span><button class="btn primary" id="cDone">Done</button></div>`, (el) => {
      $$('input[data-id]', el).forEach(i => i.onchange = () => { const m = mById(i.dataset.id); m.chart = { ...chartOf(m), hidden: !i.checked }; saveChart(m); renderOverview(); });
      $('#cDone', el).onclick = closeModal;
    });
  }

  // ---------- data ----------
  const norm = (r) => ({ id: r.id, metric_id: r.metric_id, t: new Date(r.ts).getTime(), v: r.value == null ? null : +r.value, notes: r.notes });
  const sortEntries = () => S.entries.sort((a, b) => b.t - a.t);
  function rerender() { S.page === 'overview' ? renderOverview() : renderEntry(); }

  async function load() {
    setSync('busy', 'Loading…');
    const [ms, es] = await Promise.all([DB.metrics(), DB.entries()]);
    S.metrics = ms.map(m => ({ ...m, decimals: m.decimals ?? 1, chart: m.chart || {} }));
    S.entries = es.map(norm); sortEntries();
    setSync('ok', DB.demo ? 'Demo mode' : 'Synced');
    $('#boot').classList.add('gone');
    setPage(S.page === 'overview' ? 'overview' : 'entry');
  }

  function showLogin(err) {
    $('#boot').classList.remove('gone');
    $('#bootBody').innerHTML = `<form class="login" id="loginF" autocomplete="on"><h2>Sign in</h2><p class="muted">Your personal data, private to you.</p>
      ${err ? `<div class="login-err">${esc(err)}</div>` : ''}
      <label>Email<input class="in" type="email" id="lgE" autocomplete="username" required></label>
      <label>Password<input class="in" type="password" id="lgP" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit" style="width:100%;height:44px">Sign in</button></form>`;
    $('#loginF').onsubmit = async (e) => {
      e.preventDefault();
      try { await DB.signIn($('#lgE').value.trim(), $('#lgP').value); await load(); }
      catch (x) { showLogin(x.message || 'Sign-in failed'); }
    };
  }
  $('#signOut').onclick = async () => { await DB.signOut(); S.metrics = []; S.entries = []; showLogin(); };

  (async function boot() {
    applyTheme(document.documentElement.dataset.theme || null);
    if (DB.demo) $('#signOut').textContent = 'Exit demo';
    try { const s = await DB.session(); if (s) await load(); else showLogin(); }
    catch (e) { console.error(e); showLogin(e.message); }
    DB.onAuth(s => { if (!s) showLogin(); });
  })();
})();
