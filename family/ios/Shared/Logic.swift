import Foundation

// Swift port of family/logic.js. Keep the two in step: same rules, same tests (Tests/LogicTests.swift
// mirrors family/test/run.js).

enum PantryAction: String { case need = "NEED", stockUp = "STOCK_UP", wait = "WAIT", ok = "OK" }

struct BestPrice { let retailer: String; let unit: Double; let entry: PricePoint }

struct PantryStatus {
    let daysLeft: Double
    let reorderDays: Double
    let runOut: Date?
    let reorderBy: Date?
    let p20: Double?
    let median: Double?
    let best: BestPrice?
    let action: PantryAction
    let reason: String
    let buyUnits: Double
    let packs: Int
    let estCost: Double?
    let savings: Double
    let historyCount: Int
}

enum Logic {
    static let day: TimeInterval = 86_400

    static func percentile(_ sorted: [Double], _ p: Double) -> Double? {
        guard !sorted.isEmpty else { return nil }
        let idx = Double(sorted.count - 1) * p
        let lo = Int(idx.rounded(.down)), hi = Int(idx.rounded(.up))
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - Double(lo))
    }

    /// Latest price per retailer seen within `freshDays`; cheapest unit price wins.
    static func bestCurrent(_ item: PantryItem, now: Date, freshDays: Double = 21) -> BestPrice? {
        var latest: [String: PricePoint] = [:]
        for p in item.prices {
            guard let d = p.day, now.timeIntervalSince(d) <= freshDays * day else { continue }
            if let cur = latest[p.retailer], let cd = cur.day, cd >= d { continue }
            latest[p.retailer] = p
        }
        return latest.map { BestPrice(retailer: $0.key, unit: $0.value.unitPrice, entry: $0.value) }
            .min { $0.unit < $1.unit }
    }

    /// NEED → STOCK_UP → WAIT → OK, identical thresholds to the web app.
    static func pantryStatus(_ item: PantryItem, now: Date = .now, targetDays: Double = 30, minHistory: Int = 4) -> PantryStatus {
        let perDay = item.usePerWeek / 7
        let onHand = item.onHand
        let daysLeft = perDay > 0 ? onHand / perDay : .infinity
        let reorderDays = item.leadDays + item.safetyDays
        let runOut = daysLeft.isFinite ? now.addingTimeInterval(daysLeft * day) : nil
        let reorderBy = daysLeft.isFinite ? now.addingTimeInterval(max(0, daysLeft - reorderDays) * day) : nil

        let units = item.prices.map(\.unitPrice).filter(\.isFinite).sorted()
        let p20 = percentile(units, 0.2), median = percentile(units, 0.5)
        let best = bestCurrent(item, now: now)
        let maxStock = item.maxStock ?? .infinity
        let enoughHistory = units.count >= minHistory

        var action = PantryAction.ok, reason = "Stocked and price is ordinary.", buyUnits = 0.0

        if daysLeft <= reorderDays {
            action = .need
            buyUnits = max(0, min(maxStock, perDay * targetDays + perDay * reorderDays) - onHand)
            reason = "Runs out in ~\(Int(max(0, daysLeft).rounded()))d; lead time + buffer is \(Int(reorderDays))d."
        } else if let b = best, let p20, enoughHistory, item.shelfStable != false, b.unit <= p20, onHand < maxStock {
            action = .stockUp
            buyUnits = max(0, maxStock - onHand)
            reason = "\(b.retailer) at $\(String(format: "%.3f", b.unit))/unit is in the cheapest 20% of \(units.count) logged prices."
        } else if let b = best, let median, enoughHistory, b.unit > median * 1.1, daysLeft > reorderDays + 14 {
            action = .wait
            reason = "Current best is \(Int(((b.unit / median - 1) * 100).rounded()))% above the median; \(Int(daysLeft.rounded()))d of supply."
        } else if !enoughHistory {
            reason = "Only \(units.count) price point(s) logged; need \(minHistory)+ before deal calls are trusted."
        }

        let packQty = best?.entry.packQty ?? 1
        let packs = buyUnits > 0 ? Int((buyUnits / packQty).rounded(.up)) : 0
        let estCost = best.map { Double(packs) * $0.entry.price }
        var savings = 0.0
        if let b = best, let median, packs > 0 { savings = max(0, (median - b.unit) * Double(packs) * packQty) }

        return PantryStatus(daysLeft: daysLeft, reorderDays: reorderDays, runOut: runOut, reorderBy: reorderBy,
                            p20: p20, median: median, best: best, action: action, reason: reason,
                            buyUnits: buyUnits, packs: packs, estCost: estCost, savings: savings, historyCount: units.count)
    }

    /// Decrement on-hand by usage since `lastUpdated`.
    static func burnDown(_ item: PantryItem, now: Date = .now) -> PantryItem {
        var out = item
        let last = ISO.parse(item.lastUpdated) ?? now
        let days = max(0, now.timeIntervalSince(last) / day)
        out.onHand = ((max(0, item.onHand - item.usePerWeek / 7 * days)) * 100).rounded() / 100
        out.lastUpdated = ISO.string(now)
        return out
    }

    // MARK: Big Year

    struct Occurrence: Identifiable, Hashable {
        let entry: PlanEntry
        let on: Date
        let end: Date
        let nth: Int?
        var id: String { entry.id + DayFormat.string(on) }
    }

    static func occurrences(_ entries: [PlanEntry], year: Int, calendar cal: Calendar = .current) -> [Occurrence] {
        var out: [Occurrence] = []
        for e in entries {
            guard let d = DayFormat.parse(e.date) else { continue }
            if e.annual == true {
                var c = cal.dateComponents([.month, .day], from: d); c.year = year
                guard let occ = cal.date(from: c) else { continue }
                let n = year - cal.component(.year, from: d)
                out.append(Occurrence(entry: e, on: occ, end: occ, nth: n > 0 ? n : nil))
            } else {
                let end = e.endDate.flatMap(DayFormat.parse) ?? d
                if cal.component(.year, from: d) == year || cal.component(.year, from: end) == year {
                    out.append(Occurrence(entry: e, on: d, end: end, nth: nil))
                }
            }
        }
        return out.sorted { $0.on < $1.on }
    }

    struct Gap: Hashable { let from: Date; let to: Date; let days: Int }

    /// Kevin's Rule: no stretch longer than `maxGapDays` without a mini-adventure or the misogi.
    static func kevinsRuleGaps(_ entries: [PlanEntry], year: Int, maxGapDays: Int = 56, calendar cal: Calendar = .current) -> [Gap] {
        guard let start = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let end = cal.date(from: DateComponents(year: year, month: 12, day: 31)) else { return [] }
        let adv = occurrences(entries, year: year, calendar: cal).filter { $0.entry.type == .mini || $0.entry.type == .misogi }.map(\.on)
        let pts = [start] + adv + [end]
        var gaps: [Gap] = []
        for i in 1..<pts.count {
            let days = cal.dateComponents([.day], from: pts[i - 1], to: pts[i]).day ?? 0
            if days > maxGapDays { gaps.append(Gap(from: pts[i - 1], to: pts[i], days: days)) }
        }
        return gaps
    }

    struct YearScore { let misogi: Int; let minis: Int; let habits: Int; let gaps: [Gap]
        /// 1 misogi + 6 minis + 4 habits = 11 "slots"
        var plannedFraction: Double { Double(min(misogi, 1) + min(minis, 6) + min(habits, 4)) / 11 }
    }

    static func yearScore(_ entries: [PlanEntry], year: Int, maxGapDays: Int = 56) -> YearScore {
        let occ = occurrences(entries, year: year)
        return YearScore(misogi: occ.filter { $0.entry.type == .misogi }.count,
                         minis: occ.filter { $0.entry.type == .mini }.count,
                         habits: occ.filter { $0.entry.type == .habit }.count,
                         gaps: kevinsRuleGaps(entries, year: year, maxGapDays: maxGapDays))
    }

    static func nextUp(_ entries: [PlanEntry], now: Date = .now, types: Set<PlanType>) -> Occurrence? {
        let cal = Calendar.current
        let y = cal.component(.year, from: now)
        let today = cal.startOfDay(for: now)
        return (occurrences(entries, year: y) + occurrences(entries, year: y + 1))
            .filter { types.contains($0.entry.type) && $0.on >= today }
            .sorted { $0.on < $1.on }.first
    }
}
