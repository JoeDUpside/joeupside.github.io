import SwiftUI
import EventKit

/// Two-week agenda across every calendar on the device, colored by family member.
struct AgendaView: View {
    @Environment(Store.self) private var store
    @State private var start = Calendar.current.startOfDay(for: .now)
    @State private var hiddenMembers: Set<String> = []

    var body: some View {
        let cal = Calendar.current
        let items = store.calendar.events(from: start, to: start.addingTimeInterval(14 * Logic.day)).filter(visible)
        let conflicts = CalendarService.overlaps(items)
        let days = (0..<14).compactMap { cal.date(byAdding: .day, value: $0, to: start) }
        NavigationStack {
            List {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(store.data.members) { m in
                                Button { toggle(m.id) } label: {
                                    Label(m.name, systemImage: "circle.fill").foregroundStyle(Color(hex: m.color))
                                }
                                .buttonStyle(.bordered).opacity(hiddenMembers.contains(m.id) ? 0.4 : 1)
                            }
                        }
                    }
                }
                if !store.calendar.authorized {
                    Text("Calendar access is off. Turn it on in iOS Settings → Privacy → Calendars → Hearth.").foregroundStyle(.secondary)
                }
                ForEach(days, id: \.self) { d in
                    let next = d.addingTimeInterval(Logic.day)
                    let dayItems = items.filter { $0.start < next && $0.end > d }
                    if !dayItems.isEmpty {
                        Section(d.formatted(.dateTime.weekday(.wide).month().day())) {
                            ForEach(dayItems) { e in
                                let who = store.members(for: e.calendarId)
                                EventRow(title: e.title, start: e.start, end: e.end, allDay: e.allDay,
                                         colorHex: who.count == 1 ? who[0].color : e.colorHex,
                                         subtitle: ([who.map(\.name).joined(separator: ", "), e.location ?? "", e.calendarTitle]).filter { !$0.isEmpty }.joined(separator: " · "),
                                         conflict: conflicts.contains(e.id))
                            }
                        }
                    }
                }
            }
            .navigationTitle("Calendar")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button { start = start.addingTimeInterval(-14 * Logic.day) } label: { Image(systemName: "chevron.left") }
                    Button("Today") { start = Calendar.current.startOfDay(for: .now) }
                    Button { start = start.addingTimeInterval(14 * Logic.day) } label: { Image(systemName: "chevron.right") }
                }
            }
        }
    }

    private func toggle(_ id: String) { if hiddenMembers.contains(id) { hiddenMembers.remove(id) } else { hiddenMembers.insert(id) } }
    private func visible(_ e: CalendarService.Item) -> Bool {
        let ids = store.calendarMembers[e.calendarId] ?? []
        return ids.isEmpty || ids.contains { !hiddenMembers.contains($0) }
    }
}
