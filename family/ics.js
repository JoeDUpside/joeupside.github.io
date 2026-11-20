// Minimal iCalendar (RFC 5545) reader for subscription feeds
// (Google, Outlook, TeamSnap, GameChanger all publish .ics / webcal links).
// Scope: VEVENT with DTSTART/DTEND/DURATION/SUMMARY/LOCATION/UID,
// all-day dates, UTC "Z" times, floating/TZID times (treated as local time),
// and simple RRULE expansion (DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY for WEEKLY)
// plus EXDATE. Anything more exotic is skipped rather than guessed.
(function (root) {
  'use strict';

  function unfold(text) {
    return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  }

  function unescapeText(v) {
    return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
  }

  function parseLine(line) {
    const idx = line.indexOf(':');
    if (idx < 0) return null;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const parts = left.split(';');
    const name = parts[0].toUpperCase();
    const params = {};
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq > 0) params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
    }
    return { name, params, value };
  }

  // Returns { date: Date, allDay: bool } or null
  function parseDate(value, params) {
    const v = value.trim();
    if ((params && params.VALUE === 'DATE') || /^\d{8}$/.test(v)) {
      const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
      if (!m) return null;
      return { date: new Date(+m[1], +m[2] - 1, +m[3]), allDay: true };
    }
    const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0))), allDay: false };
    // TZID or floating: interpreted in the device's local zone. Correct for a family living
    // in one time zone; events authored in another zone will be off by the zone difference.
    return { date: new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
  }

  function parseDuration(v) {
    const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) return 0;
    const sign = m[1] === '-' ? -1 : 1;
    const ms = ((+m[2] || 0) * 7 * 86400 + (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
    return sign * ms;
  }

  function parseRRule(v) {
    const out = {};
    v.split(';').forEach(p => {
      const [k, val] = p.split('=');
      if (k && val) out[k.toUpperCase()] = val;
    });
    return out;
  }

  const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  function addInterval(d, freq, n) {
    const x = new Date(d.getTime());
    if (freq === 'DAILY') x.setDate(x.getDate() + n);
    else if (freq === 'WEEKLY') x.setDate(x.getDate() + 7 * n);
    else if (freq === 'MONTHLY') x.setMonth(x.getMonth() + n);
    else if (freq === 'YEARLY') x.setFullYear(x.getFullYear() + n);
    return x;
  }

  // Expand occurrences of a recurring event that start inside [winStart, winEnd].
  function expand(ev, winStart, winEnd, maxOcc) {
    const limit = maxOcc || 500;
    if (!ev.rrule) return (ev.start <= winEnd && ev.end >= winStart) ? [ev] : [];
    const r = ev.rrule;
    const freq = r.FREQ;
    if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return [ev];
    const interval = Math.max(1, parseInt(r.INTERVAL || '1', 10));
    const count = r.COUNT ? parseInt(r.COUNT, 10) : Infinity;
    const until = r.UNTIL ? (parseDate(r.UNTIL) || {}).date : null;
    const dur = ev.end - ev.start;
    const ex = new Set((ev.exdates || []).map(d => d.getTime()));
    const out = [];
    let produced = 0;
    const push = (s) => {
      produced++;
      if (ex.has(s.getTime())) return;
      if (s <= winEnd && new Date(s.getTime() + dur) >= winStart) {
        out.push(Object.assign({}, ev, { start: s, end: new Date(s.getTime() + dur), recurring: true }));
      }
    };
    if (freq === 'WEEKLY' && r.BYDAY) {
      const days = r.BYDAY.split(',').map(c => DAY_CODES.indexOf(c.replace(/^[+-]?\d+/, ''))).filter(i => i >= 0).sort();
      // Start of the week containing DTSTART (Sunday-based; WKST ignored)
      let weekStart = new Date(ev.start.getTime());
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      for (let guard = 0; guard < 2000 && produced < count && out.length < limit; guard++) {
        for (const dow of days) {
          const s = new Date(weekStart.getTime());
          s.setDate(s.getDate() + dow);
          if (s < ev.start) continue;
          if (until && s > until) return out;
          if (s > winEnd) return out;
          if (produced >= count) return out;
          push(s);
        }
        weekStart = addInterval(weekStart, 'WEEKLY', interval);
      }
      return out;
    }
    let s = new Date(ev.start.getTime());
    for (let guard = 0; guard < 5000 && produced < count && out.length < limit; guard++) {
      if (until && s > until) break;
      if (s > winEnd) break;
      push(s);
      s = addInterval(s, freq, interval);
    }
    return out;
  }

  function parseICS(text, sourceId) {
    const lines = unfold(text).split('\n');
    const events = [];
    let cur = null;
    let calName = null;
    let depth = 0; // skip nested VALARM etc.
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line) continue;
      if (line === 'BEGIN:VEVENT') { cur = { exdates: [] }; depth = 0; continue; }
      if (line === 'END:VEVENT') {
        if (cur && cur.start) {
          if (!cur.end) {
            cur.end = cur.duration ? new Date(cur.start.getTime() + cur.duration)
              : cur.allDay ? new Date(cur.start.getTime() + 86400000) : new Date(cur.start.getTime());
          }
          cur.source = sourceId || null;
          delete cur.duration;
          if (!cur.cancelled) events.push(cur);
        }
        cur = null; continue;
      }
      if (cur && line.startsWith('BEGIN:')) { depth++; continue; }
      if (cur && line.startsWith('END:')) { depth--; continue; }
      const p = parseLine(line);
      if (!p) continue;
      if (!cur) {
        if (p.name === 'X-WR-CALNAME') calName = unescapeText(p.value);
        continue;
      }
      if (depth > 0) continue;
      switch (p.name) {
        case 'UID': cur.uid = p.value; break;
        case 'SUMMARY': cur.title = unescapeText(p.value); break;
        case 'LOCATION': cur.location = unescapeText(p.value); break;
        case 'DESCRIPTION': cur.description = unescapeText(p.value).slice(0, 500); break;
        case 'STATUS': if (p.value.toUpperCase() === 'CANCELLED') cur.cancelled = true; break;
        case 'DTSTART': { const d = parseDate(p.value, p.params); if (d) { cur.start = d.date; cur.allDay = d.allDay; } break; }
        case 'DTEND': { const d = parseDate(p.value, p.params); if (d) cur.end = d.date; break; }
        case 'DURATION': cur.duration = parseDuration(p.value); break;
        case 'RRULE': cur.rrule = parseRRule(p.value); break;
        case 'EXDATE':
          p.value.split(',').forEach(v => { const d = parseDate(v, p.params); if (d) cur.exdates.push(d.date); });
          break;
      }
    }
    return { name: calName, events };
  }

  const api = { parseICS, expand, parseDate, parseDuration };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ICS = api;
})(typeof window !== 'undefined' ? window : globalThis);
