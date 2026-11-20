import Foundation
import Observation
import WidgetKit
import WatchConnectivity

/// App state. Persists to a JSON file in the App Group so the widget can read the summary.
/// Phase 3: swap the file for a CloudKit shared zone so both parents' phones see the same pantry.
@MainActor
@Observable
final class Store {
    var data = HearthData()
    /// EKCalendar.calendarIdentifier → member ids ("whose calendar is this?"). Device-local on purpose:
    /// calendar identifiers differ between devices.
    var calendarMembers: [String: [String]] = [:] { didSet { UserDefaults.standard.set(calendarMembers, forKey: "calendarMembers") } }
    var lastError: String?

    let calendar = CalendarService()
    private let watch = WatchLink()

    init() {
        load()
        calendarMembers = (UserDefaults.standard.dictionary(forKey: "calendarMembers") as? [String: [String]]) ?? [:]
        data.pantry = data.pantry.map { Logic.burnDown($0) }
        if data.members.isEmpty { data = Self.starter() }
        save()
    }

    // MARK: persistence
    func load() {
        guard let d = try? Data(contentsOf: SharedContainer.dataURL) else { return }
        do { data = try JSONDecoder().decode(HearthData.self, from: d) } catch { lastError = "Could not read saved data: \(error.localizedDescription)" }
    }

    func save() {
        do {
            try JSONEncoder().encode(data).write(to: SharedContainer.dataURL, options: .atomic)
            publishSummary()
        } catch { lastError = "Save failed: \(error.localizedDescription)" }
    }

    /// Import the web app's "Export backup" JSON. Web-only keys (feeds, hidden) are ignored.
    func importBackup(_ raw: Data) throws {
        data = try JSONDecoder().decode(HearthData.self, from: raw)
        save()
    }

    func exportBackup() throws -> Data { try JSONEncoder.hearth.encode(data) }

    // MARK: derived
    var planYear: Int {
        let now = Date.now, cal = Calendar.current
        return cal.component(.year, from: now) + (cal.component(.month, from: now) >= 11 ? 1 : 0)
    }
    func statuses(now: Date = .now) -> [PantryRow] {
        data.pantry.map { PantryRow(item: $0, status: Logic.pantryStatus($0, now: now)) }
    }
    func members(for calendarId: String) -> [Member] {
        let ids = calendarMembers[calendarId] ?? []
        return data.members.filter { ids.contains($0.id) }
    }
    func member(_ id: String) -> Member? { data.members.first { $0.id == id } }

    // MARK: mutations
    func logPrice(itemId: String, retailer: String, price: Double, packQty: Double, packsBought: Int?) {
        guard let i = data.pantry.firstIndex(where: { $0.id == itemId }) else { return }
        data.pantry[i].prices.append(PricePoint(date: DayFormat.string(.now), retailer: retailer, price: price, packQty: packQty))
        if let packs = packsBought {
            data.pantry[i].onHand += Double(packs) * packQty
            data.pantry[i].lastUpdated = ISO.string(.now)
        }
        save()
    }
    func setCount(itemId: String, onHand: Double) {
        guard let i = data.pantry.firstIndex(where: { $0.id == itemId }) else { return }
        data.pantry[i].onHand = onHand; data.pantry[i].lastUpdated = ISO.string(.now); save()
    }
    func upsert(_ e: PlanEntry) {
        if let i = data.bigcal.firstIndex(where: { $0.id == e.id }) { data.bigcal[i] = e } else { data.bigcal.append(e) }
        save()
    }
    func deletePlan(_ id: String) { data.bigcal.removeAll { $0.id == id }; save() }
    func upsert(_ item: PantryItem) {
        if let i = data.pantry.firstIndex(where: { $0.id == item.id }) { data.pantry[i] = item } else { data.pantry.append(item) }
        save()
    }

    // MARK: summary for widget + watch
    func makeSummary(now: Date = .now) -> Summary {
        let st = statuses(now: now)
        let stocked = st.isEmpty ? 1 : Double(st.filter { $0.status.action != .need }.count) / Double(st.count)
        let score = Logic.yearScore(data.bigcal, year: planYear, maxGapDays: data.settings.kevinDays)
        let cal = Calendar.current
        let today = cal.startOfDay(for: now)
        let week = calendar.events(from: today, to: today.addingTimeInterval(7 * Logic.day))
        var free = 0
        for d in 0..<7 {
            let ds = today.addingTimeInterval(Double(d) * Logic.day)
            guard let eve = cal.date(bySettingHour: 17, minute: 0, second: 0, of: ds),
                  let night = cal.date(bySettingHour: 21, minute: 0, second: 0, of: ds) else { continue }
            if !week.contains(where: { !$0.allDay && $0.start < night && $0.end > eve }) { free += 1 }
        }
        let soon = calendar.events(from: now, to: now.addingTimeInterval(2 * Logic.day)).filter { !$0.allDay }.prefix(8).map { e in
            let who = members(for: e.calendarId)
            return Summary.Event(title: e.title, start: e.start, end: e.end, allDay: e.allDay,
                                 colorHex: who.count == 1 ? who[0].color : e.colorHex, who: who.map(\.name).joined(separator: ", "))
        }
        let adv = Logic.nextUp(data.bigcal, now: now, types: [.mini, .misogi, .vacation])
        let ms = Logic.nextUp(data.bigcal, now: now, types: [.anniversary, .birthday])
        let buys = st.filter { $0.status.action == .need || $0.status.action == .stockUp }
            .sorted { $0.status.daysLeft < $1.status.daysLeft }
            .map { Summary.Buy(name: $0.item.name, action: $0.status.action.rawValue, detail: $0.status.reason) }
        return Summary(generated: now, stocked: stocked, planned: score.plannedFraction, freeEvenings: free, planYear: planYear,
                       nextAdventureTitle: adv?.entry.title, nextAdventureDate: adv?.on,
                       nextMilestoneTitle: ms?.entry.title, nextMilestoneDate: ms?.on,
                       kevinGaps: score.gaps.count, events: Array(soon), buys: buys)
    }

    func publishSummary() {
        let s = makeSummary()
        if let d = try? JSONEncoder.hearth.encode(s) {
            try? d.write(to: SharedContainer.summaryURL, options: .atomic)
            watch.send(d)
        }
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func starter() -> HearthData {
        var d = HearthData()
        d.members = [Member(id: "p1", name: "Me", color: "#0a84ff", role: "parent"),
                     Member(id: "p2", name: "Heather", color: "#ff2d55", role: "parent"),
                     Member(id: "k1", name: "Kid 1", color: "#34c759", role: "kid"),
                     Member(id: "k2", name: "Kid 2", color: "#ff9500", role: "kid")]
        return d
    }
}

struct PantryRow: Identifiable { let item: PantryItem; let status: PantryStatus; var id: String { item.id } }

/// Phone side of WatchConnectivity. `updateApplicationContext` keeps only the latest value,
/// which is exactly right for a summary.
final class WatchLink: NSObject, WCSessionDelegate {
    override init() {
        super.init()
        if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() }
    }
    func send(_ summaryJSON: Data) {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated, WCSession.default.isPaired else { return }
        try? WCSession.default.updateApplicationContext(["summary": summaryJSON])
    }
    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
}
