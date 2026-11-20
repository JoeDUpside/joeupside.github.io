// node family/test/run.js
const assert = require('assert');
const ICS = require('../ics.js');
const L = require('../logic.js');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

const sample = [
  'BEGIN:VCALENDAR', 'X-WR-CALNAME:U10 Tigers',
  'BEGIN:VEVENT', 'UID:a', 'SUMMARY:Game vs Hawks\\, Field 2', 'DTSTART:20261121T150000Z', 'DTEND:20261121T163000Z',
  'BEGIN:VALARM', 'SUMMARY:ignore me', 'END:VALARM', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:b', 'SUMMARY:Practice', 'DTSTART;TZID=America/New_York:20261103T173000', 'DURATION:PT1H30M',
  'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=6', 'EXDATE;TZID=America/New_York:20261105T173000', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:c', 'SUMMARY:Thanksgiving', 'DTSTART;VALUE=DATE:20261126', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:d', 'SUMMARY:Cancelled', 'STATUS:CANCELLED', 'DTSTART:20261122T150000Z', 'END:VEVENT',
  'END:VCALENDAR'].join('\r\n');

t('parses feed, escapes, skips VALARM + cancelled', () => {
  const r = ICS.parseICS(sample, 's1');
  assert.strictEqual(r.name, 'U10 Tigers');
  assert.strictEqual(r.events.length, 3);
  assert.strictEqual(r.events[0].title, 'Game vs Hawks, Field 2');
  assert.strictEqual(r.events[2].allDay, true);
  assert.strictEqual(r.events[2].end - r.events[2].start, 86400000);
});

t('expands weekly BYDAY with COUNT and EXDATE', () => {
  const ev = ICS.parseICS(sample).events[1];
  const occ = ICS.expand(ev, new Date(2026, 9, 1), new Date(2026, 11, 31));
  // 6 occurrences Tu/Th from Nov 3, minus Nov 5 exdate = 5
  assert.strictEqual(occ.length, 5);
  assert.strictEqual(occ[0].start.getDate(), 3);
  assert.strictEqual(occ[1].start.getDate(), 10);
  assert.strictEqual(occ[0].end - occ[0].start, 90 * 60000);
});

const now = new Date('2026-11-20T12:00:00Z').getTime();
const d = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString().slice(0, 10);
const tp = {
  name: 'Toilet paper', unit: 'roll', onHand: 30, usePerWeek: 7, leadDays: 3, safetyDays: 5, maxStock: 72, shelfStable: true,
  prices: [
    { date: d(200), retailer: 'Amazon', price: 30, packQty: 24 },
    { date: d(150), retailer: 'Walmart', price: 28, packQty: 24 },
    { date: d(100), retailer: 'Amazon', price: 29, packQty: 24 },
    { date: d(60), retailer: 'Walmart', price: 31, packQty: 24 },
    { date: d(2), retailer: 'Amazon', price: 22, packQty: 24 },
  ],
};

t('stock-up when price in bottom 20% and room on shelf', () => {
  const s = L.pantryStatus(tp, now);
  assert.strictEqual(s.action, 'STOCK_UP');
  assert.strictEqual(s.best.retailer, 'Amazon');
  assert.strictEqual(s.packs, 2); // (72-30)/24 -> 2 packs
  assert.ok(s.savings > 0);
});

t('need overrides price when supply below reorder point', () => {
  const s = L.pantryStatus(Object.assign({}, tp, { onHand: 5 }), now);
  assert.strictEqual(s.action, 'NEED');
  assert.ok(s.buyUnits > 0);
});

t('wait when expensive and well stocked', () => {
  const pricey = Object.assign({}, tp, { onHand: 60, prices: tp.prices.slice(0, 4).concat([{ date: d(1), retailer: 'Walmart', price: 36, packQty: 24 }]) });
  assert.strictEqual(L.pantryStatus(pricey, now).action, 'WAIT');
});

t('no deal calls with thin history', () => {
  const thin = Object.assign({}, tp, { prices: tp.prices.slice(-2) });
  assert.strictEqual(L.pantryStatus(thin, now).action, 'OK');
});

t('perishables never trigger stock-up', () => {
  assert.notStrictEqual(L.pantryStatus(Object.assign({}, tp, { shelfStable: false }), now).action, 'STOCK_UP');
});

t('burnDown subtracts elapsed usage', () => {
  const b = L.burnDown(Object.assign({}, tp, { lastUpdated: new Date(now - 7 * 86400000).toISOString() }), now);
  assert.strictEqual(b.onHand, 23);
});

t("Kevin's Rule gap detection + annual recurrence", () => {
  const entries = [
    { date: '2027-02-10', type: 'mini', title: 'Ice fishing' },
    { date: '2027-04-01', type: 'mini', title: 'Camping' },
    { date: '2027-08-15', type: 'misogi', title: 'Rim to rim' },
    { date: '2010-06-12', type: 'anniversary', title: 'Wedding', annual: true },
  ];
  const gaps = L.kevinsRuleGaps(entries, 2027);
  assert.deepStrictEqual(gaps.map(g => g.days), [136, 138]); // Apr 1 -> Aug 15, Aug 15 -> Dec 31
  const ann = L.occurrencesInYear(entries, 2027).find(e => e.type === 'anniversary');
  assert.strictEqual(ann.nth, 17);
  assert.strictEqual(L.yearScore(entries, 2027).misogi, 1);
});

console.log(`\n${n} tests passed`);
