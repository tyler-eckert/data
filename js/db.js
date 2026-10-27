/* Data layer: Supabase (live) or an in-memory demo store (?demo in the URL). */
(function () {
  const cfg = window.DATA_CONFIG || {};
  const demo = /[?&]demo\b/.test(location.search) || cfg.demo;

  // ---------------- live (Supabase) ----------------
  function live() {
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      db: { schema: cfg.schema || 'tracker' },
      auth: { persistSession: true, autoRefreshToken: true },
    });
    const ok = ({ data, error }) => { if (error) throw error; return data; };
    return {
      demo: false,
      async session() { return (await sb.auth.getSession()).data.session; },
      onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s)); },
      async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
      async signOut() { await sb.auth.signOut(); },
      async metrics() {
        return ok(await sb.from('metrics').select('*').order('sort_order').order('name'));
      },
      async entries() {
        const out = [], page = 1000;
        for (let from = 0; ; from += page) {
          const rows = ok(await sb.from('entries').select('id,metric_id,ts,value,notes')
            .order('ts', { ascending: false }).range(from, from + page - 1));
          out.push(...rows);
          if (rows.length < page) break;
        }
        return out;
      },
      async saveMetric(m) {
        const row = { ...m }; delete row.user_id; delete row.created_at;
        if (row.id) return ok(await sb.from('metrics').update(row).eq('id', row.id).select().single());
        delete row.id;
        return ok(await sb.from('metrics').insert(row).select().single());
      },
      async deleteMetric(id) { ok(await sb.from('metrics').delete().eq('id', id)); },
      async saveEntry(e) {
        const row = { metric_id: e.metric_id, ts: e.ts, value: e.value, notes: e.notes || null };
        if (e.id && !e._restore) return ok(await sb.from('entries').update(row).eq('id', e.id).select('id,metric_id,ts,value,notes').single());
        if (e.id) row.id = e.id;
        return ok(await sb.from('entries').insert(row).select('id,metric_id,ts,value,notes').single());
      },
      async deleteEntry(id) { ok(await sb.from('entries').delete().eq('id', id)); },
    };
  }

  // ---------------- demo (in memory, seeded) ----------------
  function mock() {
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
    const M = [
      { name: 'Weight', unit: 'lb', category: 'Health', color: '#1a8f4e', decimals: 1, chart: { type: 'line', bucket: 'day', agg: 'avg' } },
      { name: 'Sleep', unit: 'hrs', category: 'Health', color: '#6250d6', decimals: 1, chart: { type: 'bar', bucket: 'day', agg: 'avg' } },
      { name: 'Miles run', unit: 'mi', category: 'Fitness', color: '#2a78d6', decimals: 1, chart: { type: 'cumulative', bucket: 'day', agg: 'sum' } },
      { name: 'Rainfall', unit: 'in', category: 'Home', color: '#0e9aa7', decimals: 2, chart: { type: 'calendar', bucket: 'day', agg: 'sum' } },
      { name: 'Coffee', unit: 'cups', category: 'Health', color: '#eb6834', decimals: 0, chart: { type: 'histogram', bucket: 'day', agg: 'sum' } },
      { name: 'Mowed lawn', unit: '', category: 'Home', color: '#eda100', decimals: 0, chart: { type: 'number', bucket: 'week', agg: 'count' } },
    ].map((m, i) => ({ id: uid(), sort_order: i, archived: false, ...m }));
    const E = [], now = Date.now(), D = 864e5;
    let w = 214, rnd = (a, b) => a + Math.random() * (b - a);
    for (let d = 200; d >= 0; d--) {
      const day = now - d * D;
      w += rnd(-0.6, 0.5); E.push({ metric_id: M[0].id, ts: day - rnd(0, 2) * 36e5, value: +w.toFixed(1) });
      E.push({ metric_id: M[1].id, ts: day - 10 * 36e5, value: +rnd(5.2, 8.6).toFixed(1) });
      if (Math.random() < .45) E.push({ metric_id: M[2].id, ts: day - 12 * 36e5, value: +rnd(2, 7).toFixed(1), notes: Math.random() < .2 ? 'Trail loop' : null });
      if (Math.random() < .2) E.push({ metric_id: M[3].id, ts: day - 5 * 36e5, value: +rnd(.05, 1.6).toFixed(2) });
      E.push({ metric_id: M[4].id, ts: day - 14 * 36e5, value: Math.round(rnd(1, 4.4)) });
      if (d % 6 === 0) E.push({ metric_id: M[5].id, ts: day - 8 * 36e5, value: null, notes: 'Front + back' });
    }
    E.forEach(e => { e.id = uid(); e.ts = new Date(e.ts).toISOString(); e.notes = e.notes || null; });
    const wait = (x) => new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(x))), 60));
    return {
      demo: true,
      async session() { return { user: { email: 'demo@eckerthaus.com' } }; },
      onAuth() {}, async signIn() {}, async signOut() { location.search = ''; },
      metrics: () => wait(M.slice().sort((a, b) => a.sort_order - b.sort_order)),
      entries: () => wait(E.slice().sort((a, b) => b.ts < a.ts ? -1 : 1)),
      async saveMetric(m) {
        if (m.id) { const i = M.findIndex(x => x.id === m.id); M[i] = { ...M[i], ...m }; return wait(M[i]); }
        const n = { archived: false, sort_order: M.length, chart: {}, ...m, id: uid() }; M.push(n); return wait(n);
      },
      async deleteMetric(id) { M.splice(M.findIndex(x => x.id === id), 1); for (let i = E.length - 1; i >= 0; i--) if (E[i].metric_id === id) E.splice(i, 1); },
      async saveEntry(e) {
        const row = { id: e.id || uid(), metric_id: e.metric_id, ts: e.ts, value: e.value, notes: e.notes || null };
        const i = E.findIndex(x => x.id === row.id); if (i >= 0) E[i] = row; else E.push(row); return wait(row);
      },
      async deleteEntry(id) { E.splice(E.findIndex(x => x.id === id), 1); },
    };
  }

  window.DB = demo ? mock() : live();
})();
