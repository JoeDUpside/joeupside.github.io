import SwiftUI

struct TodayView: View {
    @Environment(Store.self) private var store

    var body: some View {
        let s = store.makeSummary()
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 20) {
                        RingsView(values: [s.stocked, s.planned, Double(s.freeEvenings) / 7]).frame(width: 110)
                        VStack(alignment: .leading, spacing: 6) {
                            legend(.ringMove, "Stocked", "\(Int(s.stocked * 100))%")
                            legend(.ringExercise, "\(s.planYear) planned", "\(Int(s.planned * 100))%")
                            legend(.ringStand, "Free evenings", "\(s.freeEvenings)/7")
                        }
                    }.padding(.vertical, 6)
                }
                Section("Something to look forward to") {
                    if let t = s.nextAdventureTitle, let d = s.nextAdventureDate {
                        countdown(d, t)
                    } else {
                        Text("Nothing planned. Kevin's Rule says put something on the calendar.").foregroundStyle(.secondary)
                    }
                    if s.kevinGaps > 0 {
                        Label("\(s.kevinGaps) stretch(es) in \(s.planYear) longer than \(store.data.settings.kevinDays) days with no adventure", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange).font(.footnote)
                    }
                }
                if let t = s.nextMilestoneTitle, let d = s.nextMilestoneDate {
                    Section("Next milestone") { countdown(d, t) }
                }
                Section("Next 48 hours") {
                    if !store.calendar.authorized {
                        Text("Allow calendar access in Settings to see family events.").foregroundStyle(.secondary)
                    } else if s.events.isEmpty {
                        Text("Nothing scheduled.").foregroundStyle(.secondary)
                    }
                    ForEach(s.events, id: \.self) { e in EventRow(title: e.title, start: e.start, end: e.end, allDay: e.allDay, colorHex: e.colorHex, subtitle: e.who) }
                }
                Section("Shopping autopilot") {
                    if s.buys.isEmpty { Text("Nothing to buy right now.").foregroundStyle(.secondary) }
                    ForEach(s.buys, id: \.self) { b in
                        HStack {
                            VStack(alignment: .leading) { Text(b.name).bold(); Text(b.detail).font(.footnote).foregroundStyle(.secondary) }
                            Spacer()
                            ActionPill(action: PantryAction(rawValue: b.action) ?? .ok)
                        }
                    }
                }
            }
            .navigationTitle("Today")
        }
    }

    private func legend(_ c: Color, _ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) { Circle().fill(c).frame(width: 9, height: 9); Text(label); Text(value).font(.title3.bold()).monospacedDigit() }
    }
    private func countdown(_ d: Date, _ t: String) -> some View {
        let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: .now), to: d).day ?? 0
        return VStack(alignment: .leading) {
            Text("\(days) days").font(.largeTitle.bold()).monospacedDigit()
            Text(t)
            Text(d, format: .dateTime.weekday(.wide).month().day()).font(.footnote).foregroundStyle(.secondary)
        }
    }
}

struct EventRow: View {
    var title: String, start: Date, end: Date, allDay: Bool, colorHex: String, subtitle: String
    var conflict = false
    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .trailing) {
                if allDay { Text("All day") } else { Text(start, style: .time); Text(end, style: .time).foregroundStyle(.secondary) }
            }.font(.caption).monospacedDigit().frame(width: 64, alignment: .trailing)
            RoundedRectangle(cornerRadius: 2).fill(Color(hex: colorHex)).frame(width: 4)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).bold().lineLimit(2)
                if !subtitle.isEmpty { Text(subtitle).font(.footnote).foregroundStyle(.secondary) }
                if conflict { Text("Overlaps another event — who drives?").font(.caption.bold()).foregroundStyle(.orange) }
            }
        }
    }
}

struct ActionPill: View {
    var action: PantryAction
    var body: some View {
        let (label, color): (String, Color) = switch action {
            case .need: ("Buy now", .red)
            case .stockUp: ("Stock up", .green)
            case .wait: ("Wait", .orange)
            case .ok: ("OK", .secondary)
        }
        Text(label).font(.caption.bold()).padding(.horizontal, 9).padding(.vertical, 3)
            .background(action == .ok ? Color.secondary.opacity(0.15) : color, in: Capsule())
            .foregroundStyle(action == .ok ? Color.secondary : Color.white)
    }
}
