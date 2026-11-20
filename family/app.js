/* Hearth Family OS — single-page app, no build step, all data in this browser's localStorage. */
(function () {
  'use strict';
  const DAY = 86400000;
  const KEY = 'hearth.v1';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const iso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fmtDay = (d) => d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const fmtShort = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const money = (n) => n == null ? '—' : '$' + Number(n).toFixed(2);
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

  const TYPES = {
    misogi: 'Misogi', mini: "Mini-adventure (Kevin's Rule)", habit: 'Quarterly habit', anniversary: 'Anniversary',
    birthday: 'Birthday', vacation: 'Vacation / trip', blocked: 'Blocked / protected', other: 'Other'
  };
  const FEED_KINDS = { google: 'Google Calendar', outlook: 'Outlook / Microsoft 365', icloud: 'iCloud', teamsnap: 'TeamSnap', gamechanger: 'GameChanger', school: 'School', other: 'Other .ics' };
  const RETAILERS = ['Amazon', 'Walmart', 'Pet Supplies Plus', 'Target', 'Costco', 'Other'];

  // ---------------- storage ----------------
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* private mode etc. */ }
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save (storage blocked or full).'); } }
  function feedEventsKey(id) { return KEY + '.feed.' + id; }
  function saveFeedEvents(id, events) { try { localStorage.setItem(feedEventsKey(id), JSON.stringify(events)); } catch (e) { toast('Feed too large to cache.'); } }
  function loadFeedEvents(id) {
    try { const raw = localStorage.getItem(feedEventsKey(id)); if (!raw) return []; return JSON.parse(raw).map(e => Object.assign(e, { start: new Date(e.start), end: new Date(e.end), exdates: (e.exdates || []).map(x => new Date(x)), until: e.until })); } catch (e) { return []; }
  }

  function seed() {
    const now = new Date();
    const y = now.getFullYear();
    const at = (days, h, m) => { const d = startOfDay(new Date(now.getTime() + days * DAY)); d.setHours(h, m || 0); return d.toISOString(); };
    const ago = (days) => iso(new Date(now.getTime() - days * DAY));
    const members = [
      { id: 'p1', name: 'Me', color: '#0a84ff', role: 'parent' },
      { id: 'p2', name: 'Heather', color: '#ff2d55', role: 'parent' },
      { id: 'k1', name: 'Kid 1', color: '#34c759', role: 'kid' },
      { id: 'k2', name: 'Kid 2', color: '#ff9500', role: 'kid' },
    ];
    const P = (retailer, d, price, packQty) => ({ date: ago(d), retailer, price, packQty });
    return {
      version: 1, demo: true,
      members,
      feeds: [],
      hidden: {},
      settings: { corsProxy: '', kevinDays: 56, theme: 'auto' },
      events: [
        { id: uid(), title: 'Example: Soccer practice', start: at(1, 17, 30), end: at(1, 19), memberIds: ['k1'], location: 'Field 3' },
        { id: uid(), title: 'Example: Baseball game', start: at(2, 18), end: at(2, 20), memberIds: ['k2'] },
        { id: uid(), title: 'Example: Work offsite', start: at(2, 17), end: at(2, 19), memberIds: ['p1'] },
        { id: uid(), title: 'Example: Date night', start: at(4, 19), end: at(4, 22), memberIds: ['p1', 'p2'] },
        { id: uid(), title: 'Example: Dentist', start: at(6, 15, 30), end: at(6, 16, 30), memberIds: ['k1', 'p2'] },
      ],
      bigcal: [
        { id: uid(), date: `${y + 1}-07-18`, endDate: `${y + 1}-07-19`, type: 'misogi', title: 'Example misogi: 24-hr family hike', annual: false },
        { id: uid(), date: `${y + 1}-01-24`, type: 'mini', title: 'Example: Ice fishing', annual: false },
        { id: uid(), date: `${y + 1}-03-21`, type: 'mini', title: 'Example: Overnight camping', annual: false },
        { id: uid(), date: `${y + 1}-05-16`, type: 'mini', title: 'Example: Kayak day', annual: false },
        { id: uid(), date: `${y + 1}-01-05`, type: 'habit', title: 'Q1 habit: no phones at dinner', annual: false },
        { id: uid(), date: `2012-06-09`, type: 'anniversary', title: 'Wedding anniversary (set real date)', annual: true },
        { id: uid(), date: `2016-04-02`, type: 'birthday', title: 'Kid 1 birthday (set real date)', annual: true },
        { id: uid(), date: `${y + 1}-08-08`, endDate: `${y + 1}-08-15`, type: 'vacation', title: 'Example: Beach week', annual: false },
      ],
      pantry: [
        { id: uid(), name: 'Toilet paper', unit: 'roll', onHand: 22, usePerWeek: 9, leadDays: 2, safetyDays: 5, maxStock: 72, shelfStable: true, retailer: 'Amazon', lastUpdated: now.toISOString(),
          prices: [P('Amazon', 210, 31.99, 24), P('Walmart', 170, 28.97, 24), P('Amazon', 120, 29.49, 24), P('Walmart', 75, 30.47, 24), P('Amazon', 40, 30.99, 24), P('Amazon', 3, 23.99, 24)] },
        { id: uid(), name: 'Toothpaste', unit: 'tube', onHand: 1, usePerWeek: 0.6, leadDays: 2, safetyDays: 4, maxStock: 8, shelfStable: true, retailer: 'Walmart', lastUpdated: now.toISOString(),
          prices: [P('Walmart', 180, 12.47, 3), P('Amazon', 140, 13.99, 3), P('Walmart', 90, 11.97, 3), P('Target', 40, 12.99, 3), P('Walmart', 5, 12.97, 3)] },
        { id: uid(), name: 'Dog food (30 lb bag)', unit: 'lb', onHand: 26, usePerWeek: 7, leadDays: 3, safetyDays: 5, maxStock: 60, shelfStable: true, retailer: 'Pet Supplies Plus', lastUpdated: now.toISOString(),
          prices: [P('Pet Supplies Plus', 160, 64.99, 30), P('Amazon', 130, 67.49, 30), P('Pet Supplies Plus', 100, 61.99, 30), P('Walmart', 60, 66.88, 30), P('Pet Supplies Plus', 6, 69.99, 30), P('Amazon', 4, 71.20, 30)] },
        { id: uid(), name: 'Dishwasher pods', unit: 'pod', onHand: 48, usePerWeek: 8, leadDays: 2, safetyDays: 5, maxStock: 160, shelfStable: true, retailer: 'Amazon', lastUpdated: now.toISOString(),
          prices: [P('Amazon', 200, 19.99, 81), P('Walmart', 150, 21.47, 81), P('Amazon', 100, 20.49, 81), P('Costco', 60, 22.99, 90)] },
        { id: uid(), name: 'Laundry detergent', unit: 'load', onHand: 30, usePerWeek: 8, leadDays: 2, safetyDays: 5, maxStock: 200, shelfStable: true, retailer: 'Walmart', lastUpdated: now.toISOString(),
          prices: [P('Walmart', 190, 13.97, 64), P('Amazon', 120, 14.49, 64), P('Target', 80, 14.99, 64), P('Walmart', 30, 13.47, 64), P('Walmart', 2, 12.97, 64)] },
      ],
    };
  }

  const safeColor = (c) => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#8e8e93';
  function sanitize(st) {
    (st.members || []).forEach(m => { m.color = safeColor(m.color); });
    (st.feeds || []).forEach(f => { f.color = safeColor(f.color); });
    st.hidden = st.hidden || {}; st.settings = Object.assign({ corsProxy: '', kevinDays: 56, theme: 'auto' }, st.settings || {});
    st.events = st.events || []; st.bigcal = st.bigcal || []; st.pantry = st.pantry || []; st.feeds = st.feeds || [];
    return st;
  }
  let S = sanitize(load());
  let tab = (location.hash || '#today').slice(1);
  let calMode = 'agenda';
  let calCursor = startOfDay(new Date());
  let yearView = new Date().getFullYear() + (new Date().getMonth() >= 10 ? 1 : 0); // plan next year from November on

  function applyTheme() { const t = S.settings.theme; if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }

  // ---------------- burn down inventory on open ----------------
  S.pantry = S.pantry.map(i => Logic.burnDown(i, Date.now()));
  save();

  // ---------------- events ----------------
  const memberById = (id) => S.members.find(m => m.id === id);
  function allEvents(from, to) {
    const out = [];
    for (const e of S.events) {
      const s = new Date(e.start), en = new Date(e.end);
      if (s <= to && en >= from) out.push({ id: e.id, title: e.title, start: s, end: en, allDay: !!e.allDay, memberIds: e.memberIds || [], location: e.location, source: 'manual' });
    }
    for (const f of S.feeds) {
      if (S.hidden['feed:' + f.id]) continue;
      for (const ev of loadFeedEvents(f.id)) {
        for (const o of ICS.expand(ev, from, to)) out.push(Object.assign({}, o, { memberIds: f.memberIds || [], source: f.name, feedId: f.id, color: f.color }));
      }
    }
    // pantry reorder deadlines appear on the calendar as all-day reminders
    for (const i of S.pantry) {
      const st = Logic.pantryStatus(i, Date.now());
      if (st.reorderBy && st.reorderBy >= from && st.reorderBy <= to && st.action !== 'OK') {
        out.push({ id: 'p' + i.id, title: `🛒 Order ${i.name}`, start: startOfDay(st.reorderBy), end: new Date(startOfDay(st.reorderBy).getTime() + DAY), allDay: true, memberIds: [], source: 'Pantry' });
      }
    }
    for (const b of Logic.occurrencesInYear(S.bigcal, from.getFullYear()).concat(from.getFullYear() !== to.getFullYear() ? Logic.occurrencesInYear(S.bigcal, to.getFullYear()) : [])) {
      if (b.on <= to && b.end >= from && b.type !== 'habit') out.push({ id: 'b' + b.id, title: b.title + (b.nth ? ` (${b.nth})` : ''), start: b.on, end: new Date(b.end.getTime() + DAY), allDay: true, memberIds: [], source: 'Big Year', type: b.type });
    }
    return out.filter(e => {
      if (!e.memberIds.length) return true;
      return e.memberIds.some(id => !S.hidden['m:' + id]);
    }).sort((a, b) => a.start - b.start);
  }
  function evColor(e) {
    if (e.memberIds && e.memberIds.length === 1) { const m = memberById(e.memberIds[0]); if (m) return m.color; }
    if (e.memberIds && e.memberIds.length > 1) return '#8e8e93';
    if (e.color) return e.color;
    return e.source === 'Pantry' ? '#ff9500' : '#5e5ce6';
  }
  // Overlap = two timed events overlapping where a parent may need to be in two places.
  function conflicts(events) {
    const timed = events.filter(e => !e.allDay);
    const flagged = new Set();
    for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (b.start >= a.end) continue;
      if (a.start < b.end && b.start < a.end) { flagged.add(a); flagged.add(b); }
    }
    return flagged;
  }

  // ---------------- UI helpers ----------------
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200); }

  // Generic form sheet. fields: [{name,label,type,value,options,step,placeholder,full}]
  function sheet(title, fields, opts) {
    const o = opts || {};
    return new Promise(resolve => {
      const dlg = $('#sheet'), form = $('#sheetForm');
      const fieldHtml = (f) => {
        const v = f.value == null ? '' : f.value;
        if (f.type === 'select') return `<label for="f_${f.name}">${esc(f.label)}</label><select id="f_${f.name}" name="${f.name}">${f.options.map(op => { const [val, lab] = Array.isArray(op) ? op : [op, op]; return `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
        if (f.type === 'multi') return `<label>${esc(f.label)}</label><div class="chips">${f.options.map(([val, lab]) => `<label class="chip" style="margin:0"><input type="checkbox" name="${f.name}" value="${esc(val)}" ${(v || []).includes(val) ? 'checked' : ''} style="width:auto"> ${esc(lab)}</label>`).join('')}</div>`;
        if (f.type === 'checkbox') return `<label class="row" style="color:var(--text)"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''} style="width:auto"> ${esc(f.label)}</label>`;
        if (f.type === 'textarea') return `<label for="f_${f.name}">${esc(f.label)}</label><textarea id="f_${f.name}" name="${f.name}" rows="6" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
        if (f.type === 'html') return f.html;
        return `<label for="f_${f.name}">${esc(f.label)}</label><input id="f_${f.name}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.step ? `step="${f.step}"` : ''} placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''}>`;
      };
      const groups = []; let pair = [];
      fields.forEach(f => { if (f.half) { pair.push(f); if (pair.length === 2) { groups.push(`<div class="two">${pair.map(p => `<div>${fieldHtml(p)}</div>`).join('')}</div>`); pair = []; } } else { if (pair.length) { groups.push(`<div>${fieldHtml(pair[0])}</div>`); pair = []; } groups.push(fieldHtml(f)); } });
      if (pair.length) groups.push(`<div>${fieldHtml(pair[0])}</div>`);
      form.innerHTML = `<h2 style="margin:0 0 6px">${esc(title)}</h2>${o.intro || ''}${groups.join('')}
        <div class="actions">${o.deletable ? '<button type="button" class="danger" value="delete" id="sheetDel">Delete</button><span style="flex:1"></span>' : ''}
        <button type="button" class="secondary" id="sheetCancel">Cancel</button><button type="submit" value="ok">${esc(o.okLabel || 'Save')}</button></div>`;
      const done = (val) => { dlg.close(); resolve(val); };
      $('#sheetCancel', form).onclick = () => done(null);
      if (o.deletable) $('#sheetDel', form).onclick = () => { if (confirm('Delete this?')) done('delete'); };
      form.onsubmit = (ev) => {
        ev.preventDefault();
        const fd = new FormData(form); const out = {};
        fields.forEach(f => {
          if (f.type === 'multi') out[f.name] = fd.getAll(f.name);
          else if (f.type === 'checkbox') out[f.name] = fd.get(f.name) === 'on';
          else if (f.type === 'number') out[f.name] = fd.get(f.name) === '' ? null : Number(fd.get(f.name));
          else if (f.name) out[f.name] = fd.get(f.name);
        });
        done(out);
      };
      dlg.oncancel = () => resolve(null);
      dlg.showModal();
    });
  }

  function ring(pcts, colors) {
    const r = [52, 39, 26], w = 11;
    return `<svg viewBox="0 0 120 120" role="img" aria-label="Progress rings">${pcts.map((p, i) => {
      const c = 2 * Math.PI * r[i]; const v = Math.max(0, Math.min(1, p));
      return `<circle cx="60" cy="60" r="${r[i]}" fill="none" stroke="${colors[i]}" stroke-opacity=".22" stroke-width="${w}"/>
        <circle cx="60" cy="60" r="${r[i]}" fill="none" stroke="${colors[i]}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>`;
    }).join('')}</svg>`;
  }

  // ---------------- views ----------------
  const views = {};

  views.today = function () {
    const now = new Date();
    const statuses = S.pantry.map(i => ({ i, s: Logic.pantryStatus(i, now.getTime()) }));
    const stocked = statuses.length ? statuses.filter(x => x.s.action !== 'NEED').length / statuses.length : 1;
    const yr = now.getFullYear();
    const planYear = now.getMonth() >= 10 ? yr + 1 : yr;
    const score = Logic.yearScore(S.bigcal, planYear);
    const planned = (Math.min(score.misogi, 1) + Math.min(score.minis, 6) + Math.min(score.habits, 4)) / 11;
    const wk = allEvents(startOfDay(now), new Date(startOfDay(now).getTime() + 7 * DAY));
    let freeEvenings = 0;
    for (let d = 0; d < 7; d++) {
      const ds = startOfDay(new Date(now.getTime() + d * DAY)); const eve = new Date(ds); eve.setHours(17); const night = new Date(ds); night.setHours(21);
      if (!wk.some(e => !e.allDay && e.start < night && e.end > eve)) freeEvenings++;
    }
    const upcoming = allEvents(now, new Date(now.getTime() + 2 * DAY)).filter(e => !e.allDay).slice(0, 6);
    const actions = statuses.filter(x => x.s.action === 'NEED' || x.s.action === 'STOCK_UP').sort((a, b) => a.s.daysLeft - b.s.daysLeft);
    const nextAdv = Logic.nextUp(S.bigcal, now.getTime(), ['mini', 'misogi', 'vacation']);
    const nextAnn = Logic.nextUp(S.bigcal, now.getTime(), ['anniversary', 'birthday']);
    const gaps = score.gaps;
    const greet = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    return `
      <p class="muted" style="margin:0 4px 12px">${greet} · ${fmtDay(now)}</p>
      ${S.demo ? `<div class="note">Showing <b>example data</b>. Replace it in Settings (members, calendar feeds) and edit pantry items. Nothing leaves this device.</div>` : ''}
      <div class="card rings">${ring([stocked, planned, freeEvenings / 7], ['var(--ring-move)', 'var(--ring-ex)', 'var(--ring-stand)'])}
        <div class="legend">
          <div><span class="dot" style="background:var(--ring-move)"></span><span>Stocked</span> <b>${Math.round(stocked * 100)}%</b></div>
          <div><span class="dot" style="background:var(--ring-ex)"></span><span>${planYear} planned</span> <b>${Math.round(planned * 100)}%</b></div>
          <div><span class="dot" style="background:var(--ring-stand)"></span><span>Free evenings</span> <b>${freeEvenings}/7</b></div>
        </div></div>
      <div class="grid">
        <div class="card"><h3>Something to look forward to</h3>${nextAdv ? `<div class="kpi" style="margin:4px 0"><div><div class="v">${daysBetween(now, nextAdv.on)}<span class="small muted"> days</span></div><div>${esc(nextAdv.title)}</div><div class="small muted">${fmtShort(nextAdv.on)} · ${esc(TYPES[nextAdv.type])}</div></div></div>` : '<p class="muted">Nothing planned. Kevin\'s Rule says put something on the calendar.</p>'}
          ${gaps.length ? `<p class="small warn">⚠ ${gaps.length} stretch(es) in ${planYear} longer than ${S.settings.kevinDays} days with no adventure.</p>` : `<p class="small good">✓ Kevin's Rule holds for ${planYear}.</p>`}</div>
        <div class="card"><h3>Next milestone</h3>${nextAnn ? `<div class="v" style="font-size:28px;font-weight:700">${daysBetween(now, nextAnn.on)}<span class="small muted"> days</span></div><div>${esc(nextAnn.title)}${nextAnn.nth ? ` · #${nextAnn.nth}` : ''}</div><div class="small muted">${fmtDay(nextAnn.on)}</div>` : '<p class="muted">Add anniversaries and birthdays in Big Year.</p>'}</div>
      </div>
      <h2>Next 48 hours</h2>
      <div class="list">${upcoming.length ? upcoming.map(e => evRow(e)).join('') : '<div class="empty">Nothing scheduled.</div>'}</div>
      <h2>Shopping autopilot</h2>
      <div class="list">${actions.length ? actions.map(({ i, s }) => `<div class="item"><div class="grow"><div class="t">${esc(i.name)}</div><div class="small muted">${esc(s.reason)}</div></div><span class="pill ${s.action}">${s.action === 'NEED' ? 'Buy' : 'Stock up'}</span></div>`).join('') : '<div class="empty">Nothing to buy right now.</div>'}</div>`;
  };

  function evRow(e, flagged) {
    const members = (e.memberIds || []).map(memberById).filter(Boolean);
    return `<div class="item" ${e.source === 'manual' ? `data-edit-ev="${esc(e.id)}" style="cursor:pointer"` : ''}>
      <div class="time">${e.allDay ? 'All day' : fmtTime(e.start)}${!e.allDay ? `<br>${fmtTime(e.end)}` : ''}</div>
      <span class="bar" style="background:${evColor(e)}"></span>
      <div class="grow"><div class="t">${esc(e.title || '(no title)')}</div>
        <div class="small muted">${[members.map(m => esc(m.name)).join(', '), e.location ? esc(e.location) : '', e.source && e.source !== 'manual' ? esc(e.source) : ''].filter(Boolean).join(' · ')}</div>
        ${flagged && flagged.has(e) ? '<div class="conflict">Overlaps another event — who drives?</div>' : ''}</div></div>`;
  }

  views.calendar = function () {
    const chips = `<div class="chips" style="margin:0 0 10px">${S.members.map(m => `<button class="chip ${S.hidden['m:' + m.id] ? 'off' : ''}" data-toggle="m:${m.id}"><span class="dot" style="background:${m.color}"></span>${esc(m.name)}</button>`).join('')}
      ${S.feeds.map(f => `<button class="chip ${S.hidden['feed:' + f.id] ? 'off' : ''}" data-toggle="feed:${f.id}">${esc(f.name)}</button>`).join('')}</div>`;
    const seg = `<div class="row between wrap" style="margin-bottom:10px"><div class="seg"><button data-calmode="agenda" class="${calMode === 'agenda' ? 'on' : ''}">Agenda</button><button data-calmode="month" class="${calMode === 'month' ? 'on' : ''}">Month</button></div>
      <div class="row"><button class="secondary" data-calnav="-1" aria-label="Previous">‹</button><button class="secondary" data-calnav="0">Today</button><button class="secondary" data-calnav="1" aria-label="Next">›</button></div></div>`;
    if (!S.feeds.length) var hint = `<div class="note">No calendar feeds yet. Add Google, Outlook, TeamSnap or GameChanger subscription links in <a href="#settings">Settings</a>.</div>`;
    if (calMode === 'agenda') {
      const from = startOfDay(calCursor), to = new Date(from.getTime() + 14 * DAY);
      const evs = allEvents(from, to);
      const flagged = conflicts(evs);
      let html = '';
      for (let d = 0; d < 14; d++) {
        const ds = new Date(from.getTime() + d * DAY), de = new Date(ds.getTime() + DAY);
        const day = evs.filter(e => e.start < de && e.end > ds);
        if (!day.length) continue;
        const isToday = iso(ds) === iso(new Date());
        html += `<div class="daygroup"><h3 class="${isToday ? 'today' : ''}">${isToday ? 'Today · ' : ''}${fmtDay(ds)}</h3><div class="list">${day.map(e => evRow(e, flagged)).join('')}</div></div>`;
      }
      return (hint || '') + seg + chips + (html || '<div class="empty card">Nothing in the next two weeks.</div>');
    }
    const first = new Date(calCursor.getFullYear(), calCursor.getMonth(), 1);
    const gridStart = new Date(first); gridStart.setDate(1 - first.getDay());
    const gridEnd = new Date(gridStart.getTime() + 42 * DAY);
    const evs = allEvents(gridStart, gridEnd);
    let cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="dh">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const ds = new Date(gridStart); ds.setDate(gridStart.getDate() + i); const de = new Date(ds); de.setDate(ds.getDate() + 1);
      const day = evs.filter(e => e.start < de && e.end > ds);
      cells += `<div class="cell ${ds.getMonth() !== first.getMonth() ? 'other' : ''} ${iso(ds) === iso(new Date()) ? 'today' : ''}"><span class="n">${ds.getDate()}</span>
        ${day.slice(0, 3).map(e => `<div class="ev" style="background:${evColor(e)}22;color:${evColor(e)}">${esc(e.title)}</div>`).join('')}${day.length > 3 ? `<div class="small muted">+${day.length - 3}</div>` : ''}
        <div class="dots">${day.slice(0, 6).map(e => `<span class="dot" style="width:6px;height:6px;background:${evColor(e)}"></span>`).join('')}</div></div>`;
    }
    return (hint || '') + seg + chips + `<h2 style="margin-top:0">${first.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2><div class="month">${cells}</div>`;
  };

  views.year = function () {
    const y = yearView;
    const occ = Logic.occurrencesInYear(S.bigcal, y);
    const score = Logic.yearScore(S.bigcal, y);
    const byDay = {};
    for (const e of occ) {
      for (let d = new Date(e.on); d <= e.end; d = new Date(d.getTime() + DAY)) { (byDay[iso(d)] = byDay[iso(d)] || []).push(e); }
    }
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    let g = '<div></div>' + months.map((m, i) => `<div class="mh" title="${new Date(y, i, 1).toLocaleDateString([], { month: 'long' })}">${m}</div>`).join('');
    const todayIso = iso(new Date());
    for (let d = 1; d <= 31; d++) {
      g += `<div class="dn">${d}</div>`;
      for (let m = 0; m < 12; m++) {
        const dt = new Date(y, m, d);
        if (dt.getMonth() !== m) { g += '<div class="c na"></div>'; continue; }
        const key = iso(dt); const items = byDay[key] || []; const top = items[0];
        const we = dt.getDay() === 0 || dt.getDay() === 6;
        g += `<div class="c ${we ? 'we' : ''} ${top ? 't-' + top.type : ''} ${key === todayIso ? 'td' : ''}" data-day="${key}" title="${esc(dt.toDateString() + (items.length ? ' — ' + items.map(i => i.title).join('; ') : ''))}">${top && iso(top.on) === key ? `<span class="lbl">${esc(top.title.replace(/^Example( misogi)?:\s*/, ''))}</span>` : ''}</div>`;
      }
    }
    const k = (label, val, target, extra) => `<div class="card"><div class="small muted">${label}</div><div class="v ${val >= target ? 'good' : 'warn'}">${val}<span class="small muted">/${target}</span></div>${extra || ''}</div>`;
    const legend = Object.keys(TYPES).map(t => `<span class="chip" style="cursor:default"><span class="dot t-${t}"></span>${esc(TYPES[t])}</span>`).join('');
    return `
      <div class="row between wrap" style="margin-bottom:10px"><div class="row"><button class="secondary" data-yr="-1" aria-label="Previous year">‹</button><b style="font-size:22px">${y}</b><button class="secondary" data-yr="1" aria-label="Next year">›</button></div>
        <div class="row"><button class="secondary" id="exportYear">Export .ics</button><button id="addBig">Add</button></div></div>
      <div class="kpi">${k('Misogi', score.misogi, 1)}${k("Mini-adventures", score.minis, 6)}${k('Quarterly habits', score.habits, 4)}
        <div class="card"><div class="small muted">Kevin's Rule gaps &gt; ${S.settings.kevinDays}d</div><div class="v ${score.gaps.length ? 'bad' : 'good'}">${score.gaps.length}</div>${score.gaps.slice(0, 3).map(gp => `<div class="small muted">${fmtShort(gp.from)} → ${fmtShort(gp.to)} (${gp.days}d)</div>`).join('')}</div></div>
      <div class="year" role="grid" aria-label="${y} at a glance">${g}</div>
      <div class="chips" style="margin:10px 0">${legend}</div>
      <p class="small muted">Tap any day to plan it. Plan the big rocks first — misogi, adventures, anniversaries, protected time — then let everything else fit around them.</p>
      <h2>${y} entries</h2>
      <div class="list">${occ.length ? occ.map(e => `<div class="item" data-edit-big="${esc(e.id)}" style="cursor:pointer"><span class="bar t-${e.type}"></span><div class="time">${fmtShort(e.on)}${+e.end !== +e.on ? `<br>${fmtShort(e.end)}` : ''}</div><div class="grow"><div class="t">${esc(e.title)}${e.nth ? ` · #${e.nth}` : ''}</div><div class="small muted">${esc(TYPES[e.type])}${e.annual ? ' · every year' : ''}</div></div></div>`).join('') : '<div class="empty">Empty year. Start with the misogi.</div>'}</div>
      <h2>The method</h2>
      <div class="card small">
        <p><b>Big calendar:</b> one physical-style, whole-year view. Adventures and protected time go on first; work and errands fill the gaps. Popularised by Jesse Itzler.</p>
        <p><b>Misogi (1 per year):</b> one hard, year-defining challenge — Itzler describes it as hard enough that you might not finish.</p>
        <p><b>Kevin's Rule (~6 per year):</b> a mini-adventure roughly every 8 weeks so there is always something on the calendar to look forward to. Sources disagree on cadence (8 weeks vs quarterly); the gap length is adjustable in Settings.</p>
        <p><b>Quarterly habit (4 per year):</b> one new habit each quarter. The "1-6-4" label is a secondary-source shorthand, not confirmed as Itzler's own wording.</p>
        <p class="muted">These summaries come from podcasts and secondary write-ups, not a primary Itzler text. Check his own material before treating details as canonical.</p>
      </div>`;
  };

  function sparkline(item) {
    const pts = (item.prices || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => ({ t: new Date(p.date).getTime(), u: Logic.unitPrice(p) }));
    if (pts.length < 2) return '';
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1, u0 = Math.min(...pts.map(p => p.u)), u1 = Math.max(...pts.map(p => p.u));
    const x = (t) => 4 + (t - t0) / Math.max(1, t1 - t0) * 292, yy = (u) => 36 - (u - u0) / Math.max(1e-9, u1 - u0) * 32;
    return `<svg class="spark" viewBox="0 0 300 40" preserveAspectRatio="none" aria-label="Unit price history"><polyline fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" points="${pts.map(p => `${x(p.t).toFixed(1)},${yy(p.u).toFixed(1)}`).join(' ')}"/>${pts.map(p => `<circle cx="${x(p.t).toFixed(1)}" cy="${yy(p.u).toFixed(1)}" r="2.5" fill="var(--accent)"/>`).join('')}</svg>`;
  }

  function shopLink(retailer, q) {
    const e = encodeURIComponent(q);
    if (retailer === 'Amazon') return `https://www.amazon.com/s?k=${e}`;
    if (retailer === 'Walmart') return `https://www.walmart.com/search?q=${e}`;
    if (retailer === 'Target') return `https://www.target.com/s?searchTerm=${e}`;
    if (retailer === 'Costco') return `https://www.costco.com/CatalogSearch?keyword=${e}`;
    if (retailer === 'Pet Supplies Plus') return `https://www.google.com/search?q=${encodeURIComponent('site:petsuppliesplus.com ' + q)}`;
    return `https://www.google.com/search?tbm=shop&q=${e}`;
  }

  views.pantry = function () {
    const now = Date.now();
    const rows = S.pantry.map(i => ({ i, s: Logic.pantryStatus(i, now) }));
    const order = { NEED: 0, STOCK_UP: 1, WAIT: 2, OK: 3 };
    rows.sort((a, b) => order[a.s.action] - order[b.s.action] || a.s.daysLeft - b.s.daysLeft);
    const buy = rows.filter(r => r.s.action === 'NEED' || r.s.action === 'STOCK_UP');
    const total = buy.reduce((a, r) => a + (r.s.estCost || 0), 0), saved = buy.reduce((a, r) => a + r.s.savings, 0);
    const byRetailer = {};
    buy.forEach(r => { const k = r.s.best ? r.s.best.retailer : (r.i.retailer || 'Other'); (byRetailer[k] = byRetailer[k] || []).push(r); });
    return `
      <div class="kpi">
        <div class="card"><div class="small muted">To buy now</div><div class="v">${buy.length}</div></div>
        <div class="card"><div class="small muted">Est. cost</div><div class="v">${money(total)}</div></div>
        <div class="card"><div class="small muted">vs. median price</div><div class="v good">${money(saved)}</div><div class="small muted">est. saved</div></div>
      </div>
      ${buy.length ? `<div class="card"><div class="row between"><h3>This run, by store</h3><button class="secondary" id="shareList">Share list</button></div>
        ${Object.keys(byRetailer).map(r => `<p style="margin:8px 0 2px"><b>${esc(r)}</b></p>${byRetailer[r].map(x => `<div class="row between small"><span>${x.s.packs}× ${esc(x.i.name)} <span class="pill ${x.s.action}">${x.s.action === 'NEED' ? 'need' : 'deal'}</span></span><a href="${shopLink(r, x.i.name)}" target="_blank" rel="noopener">Open ${esc(r)} ↗</a></div>`).join('')}`).join('')}
        <p class="small muted" style="margin-bottom:0">Checkout stays manual: no retailer here offers a public consumer cart API this app can safely use. See the blueprint for the automation path.</p></div>` : ''}
      <div class="row between" style="margin:18px 4px 8px"><h2 style="margin:0">Items</h2><button id="addItem">Add item</button></div>
      <div class="grid">${rows.map(({ i, s }) => {
        const pct = isFinite(s.daysLeft) ? Math.min(1, s.daysLeft / Math.max(30, s.reorderDays * 3)) : 1;
        const col = s.action === 'NEED' ? 'var(--red)' : pct < .5 ? 'var(--orange)' : 'var(--green)';
        return `<div class="card">
          <div class="row between"><h3 style="margin:0">${esc(i.name)}</h3><span class="pill ${s.action}">${{ NEED: 'Buy now', STOCK_UP: 'Stock up', WAIT: 'Wait', OK: 'OK' }[s.action]}</span></div>
          <div class="small muted">${Math.round(i.onHand * 10) / 10} ${esc(i.unit)}s on hand · ${isFinite(s.daysLeft) ? `~${Math.round(s.daysLeft)} days` : 'no usage set'}${s.runOut ? ` · out ${fmtShort(s.runOut)}` : ''}</div>
          <div class="meter"><i style="width:${(pct * 100).toFixed(0)}%;background:${col}"></i></div>
          <p class="small" style="margin:8px 0 4px">${esc(s.reason)}</p>
          ${sparkline(i)}
          <table><tr><th>Best now</th><th class="num">Unit</th><th class="num">Median</th><th class="num">Low 20%</th></tr>
          <tr><td>${s.best ? esc(s.best.retailer) : '<span class="muted">no fresh price</span>'}</td><td class="num">${s.best ? '$' + s.best.unit.toFixed(3) : '—'}</td><td class="num">${s.median != null ? '$' + s.median.toFixed(3) : '—'}</td><td class="num">${s.p20 != null ? '$' + s.p20.toFixed(3) : '—'}</td></tr></table>
          <div class="row wrap" style="margin-top:10px"><button class="secondary" data-price="${i.id}">Log price</button><button class="secondary" data-bought="${i.id}">Bought</button><button class="secondary" data-count="${i.id}">Count</button><button class="link" data-item="${i.id}">Edit</button></div>
        </div>`;
      }).join('')}</div>
      <p class="small muted">Prices shown in the example items are illustrative, not real quotes. Log real prices as you see them (receipts, app prices, sale flyers); deal calls wait until an item has 4+ price points.</p>`;
  };

  views.settings = function () {
    return `
      <h2>Family</h2>
      <div class="list">${S.members.map(m => `<div class="item" data-member="${m.id}" style="cursor:pointer"><span class="dot" style="background:${m.color};width:14px;height:14px"></span><div class="grow"><div class="t">${esc(m.name)}</div><div class="small muted">${m.role === 'kid' ? 'Kid' : 'Parent'}${m.email ? ' · ' + esc(m.email) : ''}</div></div><span class="muted">›</span></div>`).join('')}</div>
      <button class="secondary" id="addMember">Add member</button>
      <h2>Calendar feeds</h2>
      <p class="small muted" style="margin:0 4px 8px">Paste each calendar's private subscription link (.ics / webcal). Google: Settings → calendar → "Secret address in iCal format". Outlook: Settings → Calendar → Shared calendars → Publish → ICS. TeamSnap: Schedule → Subscribe/Export. GameChanger: team gear icon → Schedule Sync. Links are stored only on this device; treat them like passwords.</p>
      <div class="list">${S.feeds.length ? S.feeds.map(f => `<div class="item"><span class="dot" style="background:${f.color}"></span><div class="grow"><div class="t">${esc(f.name)}</div><div class="small muted">${esc(FEED_KINDS[f.kind] || f.kind)} · ${(f.memberIds || []).map(id => (memberById(id) || {}).name).filter(Boolean).map(esc).join(', ') || 'whole family'} · ${f.lastSync ? 'synced ' + new Date(f.lastSync).toLocaleString() : 'never synced'} · ${loadFeedEvents(f.id).length} events</div>${f.error ? `<div class="small bad">${esc(f.error)}</div>` : ''}</div>
        <button class="link" data-sync="${f.id}">Sync</button><button class="link" data-paste="${f.id}">Paste</button><button class="link" data-feed="${f.id}">Edit</button></div>`).join('') : '<div class="empty">No feeds yet.</div>'}</div>
      <div class="row wrap"><button id="addFeed">Add feed</button><button class="secondary" id="syncAll">Sync all</button><label class="btn secondary" style="margin:0;color:var(--accent);background:var(--card2);border:1px solid var(--line)">Import .ics file<input type="file" accept=".ics,text/calendar" id="icsFile" hidden></label></div>
      <div class="note">Browsers block most calendar servers from being read directly (CORS). If Sync fails, either use <b>Paste</b> (open the link, copy all, paste) / <b>Import .ics file</b>, or set a CORS proxy you control below. Public third-party proxies would see your private links — don't use them.</div>
      <label for="corsProxy">CORS proxy prefix (optional, self-hosted)</label>
      <input id="corsProxy" placeholder="https://your-worker.example.workers.dev/?url=" value="${esc(S.settings.corsProxy)}">
      <h2>Planning</h2>
      <div class="card"><label for="kevinDays">Kevin's Rule: max days between adventures</label><input id="kevinDays" type="number" min="14" max="180" value="${S.settings.kevinDays}">
        <label for="theme">Appearance</label><select id="theme">${['auto', 'light', 'dark'].map(t => `<option ${S.settings.theme === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <h2>Data</h2>
      <div class="row wrap"><button class="secondary" id="exportJson">Export backup</button><label class="btn secondary" style="margin:0;color:var(--accent);background:var(--card2);border:1px solid var(--line)">Restore backup<input type="file" accept=".json" id="importJson" hidden></label>
        <button class="secondary" id="clearDemo">Remove example data</button><button class="danger" id="resetAll">Reset everything</button></div>
      <h2>Apple devices</h2>
      <div class="card small">
        <p><b>iPhone / iPad:</b> open this page in Safari → Share → <i>Add to Home Screen</i>. It then runs full-screen and works offline.</p>
        <p><b>Apple Watch:</b> a web app can't run on the Watch. Today's bridge: <b>Big Year → Export .ics</b> and subscribe to it (with your Google/TeamSnap feeds) in Apple Calendar — those events then show on every Watch paired to that Apple ID. A native watchOS app is phase 2 in the blueprint.</p>
        <p class="muted">Version 0.1 prototype · data stored only in this browser.</p></div>`;
  };

  // ---------------- feed sync ----------------
  async function syncFeed(f) {
    let url = (f.url || '').trim().replace(/^webcal:\/\//i, 'https://');
    if (!url) { f.error = 'No URL. Use Paste instead.'; save(); return false; }
    const target = S.settings.corsProxy ? S.settings.corsProxy + encodeURIComponent(url) : url;
    try {
      const res = await fetch(target, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('Response was not an iCalendar file');
      ingest(f, text);
      return true;
    } catch (e) {
      f.error = `Sync failed (${e.message || 'blocked'}). Most likely the server blocks browser access (CORS) — use Paste/Import or a self-hosted proxy.`;
      save();
      return false;
    }
  }
  function ingest(f, text) {
    const parsed = ICS.parseICS(text, f.id);
    // Keep a rolling window to bound storage: 60 days back, everything forward (recurrences expand at view time).
    const cutoff = Date.now() - 60 * DAY;
    const keep = parsed.events.filter(e => e.rrule || e.end.getTime() >= cutoff);
    saveFeedEvents(f.id, keep);
    if (!f.name && parsed.name) f.name = parsed.name;
    f.lastSync = new Date().toISOString(); f.error = null;
    save();
    toast(`${f.name}: ${keep.length} events loaded`);
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function yearToICS(y) {
    const pad = (n) => String(n).padStart(2, '0');
    const d8 = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const escT = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hearth//Big Year//EN', 'X-WR-CALNAME:Big Year ' + y];
    for (const e of S.bigcal) {
      const start = new Date(e.date + 'T00:00:00');
      const end = new Date((e.endDate || e.date) + 'T00:00:00'); end.setDate(end.getDate() + 1);
      if (!e.annual && start.getFullYear() !== y && end.getFullYear() !== y) continue;
      lines.push('BEGIN:VEVENT', `UID:${e.id}@hearth`, `DTSTAMP:${stamp}`, `SUMMARY:${escT(e.title)}`, `CATEGORIES:${escT(TYPES[e.type])}`, `DTSTART;VALUE=DATE:${d8(start)}`, `DTEND;VALUE=DATE:${d8(end)}`);
      if (e.annual) lines.push('RRULE:FREQ=YEARLY');
      if (['misogi', 'mini', 'anniversary', 'birthday', 'vacation'].includes(e.type)) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escT(e.title)}`, 'TRIGGER:-P7D', 'END:VALARM');
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  // ---------------- editors ----------------
  const memberOpts = () => S.members.map(m => [m.id, m.name]);
  async function editEvent(id, presetDate) {
    const e = id ? S.events.find(x => x.id === id) : null;
    const local = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
    const def = presetDate ? new Date(presetDate) : new Date(Math.ceil(Date.now() / 3600000) * 3600000);
    const r = await sheet(e ? 'Edit event' : 'New event', [
      { name: 'title', label: 'Title', value: e ? e.title : '', required: true },
      { name: 'start', label: 'Starts', type: 'datetime-local', value: local(e ? e.start : def), half: true },
      { name: 'end', label: 'Ends', type: 'datetime-local', value: local(e ? e.end : new Date(def.getTime() + 3600000)), half: true },
      { name: 'location', label: 'Location', value: e ? e.location : '' },
      { name: 'memberIds', label: 'Who', type: 'multi', options: memberOpts(), value: e ? e.memberIds : [] },
    ], { deletable: !!e });
    if (!r) return;
    if (r === 'delete') S.events = S.events.filter(x => x.id !== id);
    else {
      const obj = { title: r.title, start: new Date(r.start).toISOString(), end: new Date(r.end).toISOString(), location: r.location, memberIds: r.memberIds };
      if (new Date(obj.end) < new Date(obj.start)) obj.end = obj.start;
      if (e) Object.assign(e, obj); else S.events.push(Object.assign({ id: uid() }, obj));
    }
    save(); render();
  }

  async function editBig(id, presetDate) {
    const e = id ? S.bigcal.find(x => x.id === id) : null;
    const r = await sheet(e ? 'Edit plan' : 'Plan something', [
      { name: 'title', label: 'Title', value: e ? e.title : '', required: true },
      { name: 'type', label: 'Type', type: 'select', options: Object.entries(TYPES), value: e ? e.type : 'mini' },
      { name: 'date', label: 'Date', type: 'date', value: e ? e.date : (presetDate || iso(new Date())), half: true },
      { name: 'endDate', label: 'End date (optional)', type: 'date', value: e ? e.endDate || '' : '', half: true },
      { name: 'annual', label: 'Repeats every year (anniversaries, birthdays)', type: 'checkbox', value: e ? e.annual : false },
    ], { deletable: !!e });
    if (!r) return;
    if (r === 'delete') S.bigcal = S.bigcal.filter(x => x.id !== id);
    else {
      if (r.endDate && r.endDate < r.date) r.endDate = '';
      if (r.type === 'anniversary' || r.type === 'birthday') r.annual = r.annual || !e;
      if (e) Object.assign(e, r); else S.bigcal.push(Object.assign({ id: uid() }, r));
    }
    save(); render();
  }

  async function editItem(id) {
    const i = id ? S.pantry.find(x => x.id === id) : null;
    const r = await sheet(i ? 'Edit item' : 'New pantry item', [
      { name: 'name', label: 'Item', value: i ? i.name : '', required: true },
      { name: 'unit', label: 'Count it in (roll, tube, lb, pod, load…)', value: i ? i.unit : 'unit', half: true },
      { name: 'onHand', label: 'On hand now', type: 'number', step: 'any', value: i ? i.onHand : 0, half: true },
      { name: 'usePerWeek', label: 'Used per week', type: 'number', step: 'any', value: i ? i.usePerWeek : 1, half: true },
      { name: 'maxStock', label: 'Max to store', type: 'number', step: 'any', value: i ? i.maxStock : 20, half: true },
      { name: 'leadDays', label: 'Delivery lead time (days)', type: 'number', value: i ? i.leadDays : 2, half: true },
      { name: 'safetyDays', label: 'Safety buffer (days)', type: 'number', value: i ? i.safetyDays : 5, half: true },
      { name: 'retailer', label: 'Usual store', type: 'select', options: RETAILERS, value: i ? i.retailer : 'Amazon' },
      { name: 'shelfStable', label: 'Shelf-stable (OK to stock up on deals)', type: 'checkbox', value: i ? i.shelfStable !== false : true },
    ], { deletable: !!i });
    if (!r) return;
    if (r === 'delete') S.pantry = S.pantry.filter(x => x.id !== id);
    else { r.lastUpdated = new Date().toISOString(); if (i) Object.assign(i, r); else S.pantry.push(Object.assign({ id: uid(), prices: [] }, r)); }
    save(); render();
  }

  async function logPrice(id, bought) {
    const i = S.pantry.find(x => x.id === id);
    const last = (i.prices || []).slice(-1)[0];
    const r = await sheet(bought ? `Bought ${i.name}` : `Log a price · ${i.name}`, [
      { name: 'retailer', label: 'Store', type: 'select', options: RETAILERS, value: last ? last.retailer : i.retailer },
      { name: 'date', label: 'Date', type: 'date', value: iso(new Date()), half: true },
      { name: 'price', label: 'Price paid / seen ($)', type: 'number', step: '0.01', value: last ? last.price : '', half: true, required: true },
      { name: 'packQty', label: `${i.unit}s per pack`, type: 'number', step: 'any', value: last ? last.packQty : 1, half: true },
      bought ? { name: 'packs', label: 'Packs bought', type: 'number', value: 1, half: true } : { type: 'html', html: '' },
    ], { okLabel: bought ? 'Add to stock' : 'Log price' });
    if (!r || r.price == null) return;
    i.prices = i.prices || [];
    i.prices.push({ date: r.date, retailer: r.retailer, price: r.price, packQty: r.packQty || 1 });
    if (bought) { i.onHand = (Number(i.onHand) || 0) + (r.packs || 1) * (r.packQty || 1); i.lastUpdated = new Date().toISOString(); }
    save(); render(); toast(bought ? 'Stock updated' : 'Price logged');
  }

  async function countItem(id) {
    const i = S.pantry.find(x => x.id === id);
    const r = await sheet(`Count ${i.name}`, [{ name: 'onHand', label: `${i.unit}s on hand right now`, type: 'number', step: 'any', value: Math.round(i.onHand * 10) / 10 }], { okLabel: 'Update' });
    if (!r || r.onHand == null) return;
    i.onHand = r.onHand; i.lastUpdated = new Date().toISOString(); save(); render();
  }

  async function editMember(id) {
    const m = id ? memberById(id) : null;
    const r = await sheet(m ? 'Edit member' : 'Add member', [
      { name: 'name', label: 'Name', value: m ? m.name : '', required: true },
      { name: 'role', label: 'Role', type: 'select', options: [['parent', 'Parent'], ['kid', 'Kid']], value: m ? m.role : 'kid', half: true },
      { name: 'color', label: 'Color', type: 'color', value: m ? m.color : '#5e5ce6', half: true },
      { name: 'email', label: 'Email (optional, stored on this device only)', type: 'email', value: m ? m.email || '' : '' },
    ], { deletable: !!m && S.members.length > 1 });
    if (!r) return;
    if (r !== 'delete') r.color = safeColor(r.color);
    if (r === 'delete') S.members = S.members.filter(x => x.id !== id);
    else if (m) Object.assign(m, r); else S.members.push(Object.assign({ id: uid() }, r));
    save(); render();
  }

  async function editFeed(id) {
    const f = id ? S.feeds.find(x => x.id === id) : null;
    const r = await sheet(f ? 'Edit feed' : 'Add calendar feed', [
      { name: 'name', label: 'Name', value: f ? f.name : '', placeholder: 'e.g. Kid 1 – U10 Soccer (TeamSnap)', required: true },
      { name: 'kind', label: 'Source', type: 'select', options: Object.entries(FEED_KINDS), value: f ? f.kind : 'google', half: true },
      { name: 'color', label: 'Color', type: 'color', value: f ? f.color : '#5e5ce6', half: true },
      { name: 'url', label: 'Subscription link (.ics / webcal://)', value: f ? f.url : '', placeholder: 'webcal://…' },
      { name: 'memberIds', label: 'Whose calendar is this?', type: 'multi', options: memberOpts(), value: f ? f.memberIds : [] },
    ], { deletable: !!f });
    if (!r) return;
    if (r === 'delete') { S.feeds = S.feeds.filter(x => x.id !== id); try { localStorage.removeItem(feedEventsKey(id)); } catch (e) { } save(); render(); return; }
    r.color = safeColor(r.color);
    let feed = f;
    if (f) Object.assign(f, r); else { feed = Object.assign({ id: uid() }, r); S.feeds.push(feed); }
    save(); render();
    if (feed.url) { await syncFeed(feed); render(); }
  }

  async function pasteFeed(id) {
    const f = S.feeds.find(x => x.id === id);
    const r = await sheet(`Paste calendar · ${f.name}`, [{ name: 'text', label: 'Paste the full .ics contents (starts with BEGIN:VCALENDAR)', type: 'textarea' }], { okLabel: 'Import' });
    if (!r || !r.text) return;
    if (!/BEGIN:VCALENDAR/.test(r.text)) { toast('That does not look like an .ics calendar.'); return; }
    ingest(f, r.text); render();
  }

  // ---------------- render + events ----------------
  function render() {
    if (!views[tab]) tab = 'today';
    applyTheme();
    document.querySelectorAll('.tabbar button').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
    $('#title').textContent = { today: 'Today', calendar: 'Calendar', year: 'Big Year', pantry: 'Pantry', settings: 'Settings' }[tab];
    $('#topActions').innerHTML = tab === 'calendar' ? '<button id="addEvent">New event</button>' : '';
    $('#view').innerHTML = views[tab]();
  }

  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('button, [data-day], [data-edit-ev], [data-edit-big], [data-member]');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; location.hash = tab; render(); window.scrollTo(0, 0); return; }
    if (d.toggle) { S.hidden[d.toggle] = !S.hidden[d.toggle]; save(); render(); return; }
    if (d.calmode) { calMode = d.calmode; render(); return; }
    if (d.calnav !== undefined) {
      const n = +d.calnav;
      if (n === 0) calCursor = startOfDay(new Date());
      else if (calMode === 'agenda') calCursor = new Date(calCursor.getTime() + n * 14 * DAY);
      else calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + n, 1);
      render(); return;
    }
    if (d.yr) { yearView += +d.yr; render(); return; }
    if (d.day) return editBig(null, d.day);
    if (d.editEv) return editEvent(d.editEv);
    if (d.editBig) return editBig(d.editBig);
    if (d.member) return editMember(d.member);
    if (d.item) return editItem(d.item);
    if (d.price) return logPrice(d.price, false);
    if (d.bought) return logPrice(d.bought, true);
    if (d.count) return countItem(d.count);
    if (d.feed) return editFeed(d.feed);
    if (d.paste) return pasteFeed(d.paste);
    if (d.sync) { const f = S.feeds.find(x => x.id === d.sync); toast('Syncing…'); await syncFeed(f); render(); return; }
    switch (t.id) {
      case 'addEvent': return editEvent();
      case 'addBig': return editBig();
      case 'addItem': return editItem();
      case 'addMember': return editMember();
      case 'addFeed': return editFeed();
      case 'syncAll': { toast('Syncing…'); let ok = 0; for (const f of S.feeds) if (await syncFeed(f)) ok++; render(); toast(`${ok}/${S.feeds.length} feeds synced`); return; }
      case 'exportYear': return download(`big-year-${yearView}.ics`, yearToICS(yearView), 'text/calendar');
      case 'exportJson': return download(`hearth-backup-${iso(new Date())}.json`, JSON.stringify(S, null, 2), 'application/json');
      case 'clearDemo':
        if (!confirm('Remove example events, plans and pantry items?')) return;
        S.events = S.events.filter(e => !/^Example/.test(e.title));
        S.bigcal = S.bigcal.filter(e => !/^Example|\(set real date\)|^Q1 habit: no phones/.test(e.title));
        S.pantry = []; S.demo = false; save(); render(); return;
      case 'resetAll':
        if (!confirm('Erase everything on this device and start over?')) return;
        try { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); } catch (e) { }
        S = seed(); save(); render(); return;
      case 'shareList': {
        const now = Date.now();
        const lines = S.pantry.map(i => ({ i, s: Logic.pantryStatus(i, now) })).filter(x => x.s.packs > 0).map(x => `• ${x.s.packs}× ${x.i.name} — ${x.s.best ? x.s.best.retailer + ' ' + money(x.s.best.entry.price) : x.i.retailer}`);
        const text = 'Shopping list\n' + lines.join('\n');
        if (navigator.share) { try { await navigator.share({ title: 'Shopping list', text }); } catch (e) { } }
        else { try { await navigator.clipboard.writeText(text); toast('List copied'); } catch (e) { toast('Copy failed'); } }
        return;
      }
    }
  });

  document.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.id === 'corsProxy') { S.settings.corsProxy = t.value.trim(); save(); toast('Saved'); }
    if (t.id === 'kevinDays') { S.settings.kevinDays = Math.max(14, Math.min(180, +t.value || 56)); save(); }
    if (t.id === 'theme') { S.settings.theme = t.value; save(); applyTheme(); }
    if (t.id === 'icsFile' && t.files[0]) {
      const text = await t.files[0].text();
      const parsed = ICS.parseICS(text);
      const f = { id: uid(), name: parsed.name || t.files[0].name.replace(/\.ics$/i, ''), kind: 'other', color: '#5e5ce6', url: '', memberIds: [] };
      S.feeds.push(f); ingest(f, text); render();
    }
    if (t.id === 'importJson' && t.files[0]) {
      try { const data = JSON.parse(await t.files[0].text()); if (!data.members || !data.pantry) throw new Error('bad'); S = sanitize(data); save(); render(); toast('Backup restored'); }
      catch (e) { toast('That file is not a Hearth backup.'); }
    }
  });

  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (views[h] && h !== tab) { tab = h; render(); } });
  // Patch the Kevin's Rule gap length into the logic layer.
  const _gaps = Logic.kevinsRuleGaps;
  Logic.kevinsRuleGaps = (entries, year) => _gaps(entries, year, S.settings.kevinDays);
  const _score = Logic.yearScore;
  Logic.yearScore = (entries, year) => Object.assign(_score(entries, year), { gaps: Logic.kevinsRuleGaps(entries, year) });

  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  // Refresh feeds in the background at most every 6 hours.
  const stale = S.feeds.filter(f => f.url && (!f.lastSync || Date.now() - new Date(f.lastSync) > 6 * 3600000));
  if (stale.length) Promise.all(stale.map(syncFeed)).then(render);
})();
