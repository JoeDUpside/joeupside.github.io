import EventKit
import Foundation
import Observation

/// Reads every calendar already on the iPhone through EventKit. Subscribe to the Google, Outlook,
/// TeamSnap and GameChanger links once in Settings → Calendar → Accounts → Add Subscribed Calendar
/// (or via iCloud on the web) and they all arrive here with one permission prompt.
@MainActor
@Observable
final class CalendarService {
    let store = EKEventStore()
    private(set) var authorized = false

    func requestAccess() async -> Bool {
        do {
            // iOS 17+ API. Requires NSCalendarsFullAccessUsageDescription in Info.plist.
            authorized = try await store.requestFullAccessToEvents()
        } catch {
            authorized = false
        }
        return authorized
    }

    func calendars() -> [EKCalendar] { store.calendars(for: .event) }

    struct Item: Identifiable, Hashable {
        let id: String
        let title: String
        let start: Date
        let end: Date
        let allDay: Bool
        let location: String?
        let calendarId: String
        let calendarTitle: String
        let colorHex: String
    }

    /// Events in [from, to], optionally restricted to the given calendar identifiers.
    func events(from: Date, to: Date, calendarIds: Set<String>? = nil) -> [Item] {
        guard authorized else { return [] }
        let cals = calendarIds.map { ids in calendars().filter { ids.contains($0.calendarIdentifier) } }
        let pred = store.predicateForEvents(withStart: from, end: to, calendars: cals)
        return store.events(matching: pred).map { e in
            Item(id: (e.eventIdentifier ?? UUID().uuidString) + "\(e.startDate.timeIntervalSince1970)",
                 title: e.title ?? "(no title)", start: e.startDate, end: e.endDate, allDay: e.isAllDay,
                 location: e.location, calendarId: e.calendar.calendarIdentifier, calendarTitle: e.calendar.title,
                 colorHex: Self.hex(e.calendar.cgColor))
        }.sorted { $0.start < $1.start }
    }

    private static func hex(_ c: CGColor?) -> String {
        guard let c, let comps = c.converted(to: CGColorSpace(name: CGColorSpace.sRGB)!, intent: .defaultIntent, options: nil)?.components,
              comps.count >= 3 else { return "#8e8e93" }
        return String(format: "#%02x%02x%02x", Int(comps[0] * 255), Int(comps[1] * 255), Int(comps[2] * 255))
    }

    /// Timed events that overlap: a parent may need to be in two places.
    static func overlaps(_ items: [Item]) -> Set<String> {
        let timed = items.filter { !$0.allDay }
        var out = Set<String>()
        for i in timed.indices { for j in timed.indices where j > i {
            if timed[i].start < timed[j].end && timed[j].start < timed[i].end { out.insert(timed[i].id); out.insert(timed[j].id) }
        } }
        return out
    }
}
