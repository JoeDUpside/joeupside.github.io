// Pure planning logic (no DOM) so it can be unit-tested in Node.
//  1. Pantry: days of supply, reorder point, price-history signal (buy / stock up / wait).
//  2. Big Calendar: misogi + Kevin's Rule cadence checks, recurring anniversaries.
(function (root) {
  'use strict';
  const DAY = 86400000;

  function percentile(sorted, p) {
    if (!sorted.length) return null;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function unitPrice(entry) {
    const q = Number(entry.packQty) || 1;
    return Number(entry.price) / q;
  }

  // Latest observed price per retailer within `freshDays`; cheapest unit price wins.
  function bestCurrent(item, now, freshDays) {
    const fresh = (freshDays || 21) * DAY;
    const latest = {};
    for (const e of item.prices || []) {
      const t = new Date(e.date).getTime();
      if (now - t > fresh) continue;
      if (!latest[e.retailer] || new Date(latest[e.retailer].date) < new Date(e.date)) latest[e.retailer] = e;
    }
    let best = null;
    for (const r in latest) {
      const u = unitPrice(latest[r]);
      if (!best || u < best.unit) best = { retailer: r, unit: u, entry: latest[r] };
    }
    return best;
  }

  // Core pantry decision. Returns a plain object describing state + recommendation.
  // Rules (deliberately simple and explainable):
  //   NEED     : days of supply <= lead time + safety buffer  -> buy enough for `targetDays`
  //   STOCK UP : best current unit price <= 20th percentile of history AND below max stock
  //              AND item is shelf-stable  -> fill to max stock
  //   WAIT     : current price > 110% of median and plenty of supply (> reorder + 14 days)
  //   OK       : otherwise
  function pantryStatus(item, nowMs, opts) {
    const now = nowMs || Date.now();
    const o = Object.assign({ targetDays: 30, minHistory: 4 }, opts || {});
    const perDay = (Number(item.usePerWeek) || 0) / 7;
    const onHand = Number(item.onHand) || 0;
    const daysLeft = perDay > 0 ? onHand / perDay : Infinity;
    const reorderDays = (Number(item.leadDays) || 0) + (Number(item.safetyDays) || 0);
    const runOut = isFinite(daysLeft) ? new Date(now + daysLeft * DAY) : null;
    const reorderBy = isFinite(daysLeft) ? new Date(now + Math.max(0, daysLeft - reorderDays) * DAY) : null;

    const units = (item.prices || []).map(unitPrice).filter(x => isFinite(x)).sort((a, b) => a - b);
    const p20 = percentile(units, 0.2);
    const median = percentile(units, 0.5);
    const best = bestCurrent(item, now, o.freshDays);
    const maxStock = Number(item.maxStock) || Infinity;
    const enoughHistory = units.length >= o.minHistory;

    let action = 'OK', reason = 'Stocked and price is ordinary.', buyUnits = 0;

    if (daysLeft <= reorderDays) {
      action = 'NEED';
      buyUnits = Math.max(0, Math.min(maxStock, perDay * o.targetDays + perDay * reorderDays) - onHand);
      reason = `Runs out in ~${Math.max(0, Math.round(daysLeft))}d; lead time + buffer is ${reorderDays}d.`;
    } else if (best && enoughHistory && item.shelfStable !== false && best.unit <= p20 && onHand < maxStock) {
      action = 'STOCK_UP';
      buyUnits = Math.max(0, maxStock - onHand);
      reason = `${best.retailer} at $${best.unit.toFixed(3)}/unit is in the cheapest 20% of ${units.length} logged prices.`;
    } else if (best && enoughHistory && median && best.unit > median * 1.1 && daysLeft > reorderDays + 14) {
      action = 'WAIT';
      reason = `Current best is ${Math.round((best.unit / median - 1) * 100)}% above the median; ${Math.round(daysLeft)}d of supply.`;
    } else if (!enoughHistory) {
      reason = `Only ${units.length} price point(s) logged; need ${o.minHistory}+ before deal calls are trusted.`;
    }

    const packQty = best ? (Number(best.entry.packQty) || 1) : 1;
    const packs = buyUnits > 0 ? Math.ceil(buyUnits / packQty) : 0;
    const estCost = best ? packs * Number(best.entry.price) : null;
    const savings = (best && median && packs) ? Math.max(0, (median - best.unit) * packs * packQty) : 0;

    return { daysLeft, reorderDays, runOut, reorderBy, p20, median, best, action, reason, buyUnits, packs, estCost, savings, historyCount: units.length };
  }

  // Inventory burn-down: called on app open to decrement on-hand by elapsed usage.
  function burnDown(item, nowMs) {
    const last = item.lastUpdated ? new Date(item.lastUpdated).getTime() : nowMs;
    const days = Math.max(0, (nowMs - last) / DAY);
    const perDay = (Number(item.usePerWeek) || 0) / 7;
    const onHand = Math.max(0, (Number(item.onHand) || 0) - perDay * days);
    return Object.assign({}, item, { onHand: Math.round(onHand * 100) / 100, lastUpdated: new Date(nowMs).toISOString() });
  }

  // ---------- Big Calendar ----------
  // Annual items (anniversaries/birthdays) recur every year on month/day.
  function occurrencesInYear(entries, year) {
    const out = [];
    for (const e of entries) {
      const d = new Date(e.date + 'T00:00:00');
      if (e.annual) {
        const occ = new Date(year, d.getMonth(), d.getDate());
        const n = year - d.getFullYear();
        out.push(Object.assign({}, e, { on: occ, end: occ, nth: n > 0 ? n : null }));
      } else {
        const end = e.endDate ? new Date(e.endDate + 'T00:00:00') : d;
        if (d.getFullYear() === year || end.getFullYear() === year) out.push(Object.assign({}, e, { on: d, end }));
      }
    }
    return out.sort((a, b) => a.on - b.on);
  }

  // Kevin's Rule: never go more than `maxGapDays` (default 56 = ~8 weeks) without a
  // mini-adventure. Returns the gaps that break the rule across the year.
  function kevinsRuleGaps(entries, year, maxGapDays) {
    const max = maxGapDays || 56;
    const start = new Date(year, 0, 1), end = new Date(year, 11, 31);
    const adv = occurrencesInYear(entries, year).filter(e => e.type === 'mini' || e.type === 'misogi').map(e => e.on);
    const points = [start].concat(adv, [end]);
    const gaps = [];
    for (let i = 1; i < points.length; i++) {
      const days = Math.round((points[i] - points[i - 1]) / DAY);
      if (days > max) gaps.push({ from: points[i - 1], to: points[i], days });
    }
    return gaps;
  }

  function yearScore(entries, year) {
    const occ = occurrencesInYear(entries, year);
    const misogi = occ.filter(e => e.type === 'misogi').length;
    const minis = occ.filter(e => e.type === 'mini').length;
    const habits = occ.filter(e => e.type === 'habit').length;
    return { misogi, minis, habits, gaps: kevinsRuleGaps(entries, year) };
  }

  function nextUp(entries, nowMs, types) {
    const now = new Date(nowMs);
    const y = now.getFullYear();
    const occ = occurrencesInYear(entries, y).concat(occurrencesInYear(entries, y + 1));
    return occ.filter(e => (!types || types.includes(e.type)) && e.on >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))[0] || null;
  }

  const api = { percentile, unitPrice, bestCurrent, pantryStatus, burnDown, occurrencesInYear, kevinsRuleGaps, yearScore, nextUp, DAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
