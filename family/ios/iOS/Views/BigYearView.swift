import SwiftUI

/// Whole year on one screen: 12 columns × 31 rows, plus misogi / Kevin's Rule scorecard.
struct BigYearView: View {
    @Environment(Store.self) private var store
    @State private var year: Int = Calendar.current.component(.year, from: .now) + (Calendar.current.component(.month, from: .now) >= 11 ? 1 : 0)
    @State private var editing: PlanEntry?

    var body: some View {
        let occ = Logic.occurrences(store.data.bigcal, year: year)
        let score = Logic.yearScore(store.data.bigcal, year: year, maxGapDays: store.data.settings.kevinDays)
        let byDay = Self.index(occ)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150))], spacing: 10) {
                        kpi("Misogi", score.misogi, 1)
                        kpi("Mini-adventures", score.minis, 6)
                        kpi("Quarterly habits", score.habits, 4)
                        VStack(alignment: .leading) {
                            Text("Kevin's Rule gaps").font(.caption).foregroundStyle(.secondary)
                            Text("\(score.gaps.count)").font(.title.bold()).foregroundStyle(score.gaps.isEmpty ? .green : .red)
                            ForEach(score.gaps.prefix(3), id: \.self) { g in
                                Text("\(g.from.formatted(.dateTime.month().day())) → \(g.to.formatted(.dateTime.month().day())) (\(g.days)d)").font(.caption2).foregroundStyle(.secondary)
                            }
                        }.frame(maxWidth: .infinity, alignment: .leading).padding().background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                    }
                    grid(byDay)
                    Text("Tap a day to plan it. Big rocks first: misogi, adventures, anniversaries, protected time.").font(.footnote).foregroundStyle(.secondary)
                    ForEach(occ) { o in
                        Button { editing = o.entry } label: {
                            HStack {
                                RoundedRectangle(cornerRadius: 2).fill(Self.color(o.entry.type)).frame(width: 4, height: 36)
                                Text(o.on.formatted(.dateTime.month().day())).font(.caption).monospacedDigit().frame(width: 52, alignment: .leading)
                                VStack(alignment: .leading) {
                                    Text(o.entry.title + (o.nth.map { " · #\($0)" } ?? "")).bold()
                                    Text(o.entry.type.label).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                            }
                        }.buttonStyle(.plain)
                    }
                }.padding()
            }
            .navigationTitle(String(year))
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button { year -= 1 } label: { Image(systemName: "chevron.left") }
                    Button { year += 1 } label: { Image(systemName: "chevron.right") }
                    Button { editing = PlanEntry(id: UUID().uuidString, date: "\(year)-01-01", type: .mini, title: "") } label: { Image(systemName: "plus") }
                }
            }
            .sheet(item: $editing) { e in PlanEditor(entry: e) }
        }
    }

    private func grid(_ byDay: [String: [Logic.Occurrence]]) -> some View {
        let cal = Calendar.current
        let months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
        return Grid(horizontalSpacing: 2, verticalSpacing: 2) {
            GridRow {
                Text("").frame(width: 18)
                ForEach(0..<12, id: \.self) { m in Text(months[m]).font(.caption2.bold()).frame(maxWidth: .infinity) }
            }
            ForEach(1...31, id: \.self) { d in
                GridRow {
                    Text("\(d)").font(.system(size: 9)).foregroundStyle(.secondary).frame(width: 18, alignment: .trailing)
                    ForEach(1...12, id: \.self) { m in
                        if let date = cal.date(from: DateComponents(year: year, month: m, day: d)), cal.component(.month, from: date) == m {
                            let key = DayFormat.string(date)
                            let top = byDay[key]?.first
                            RoundedRectangle(cornerRadius: 3)
                                .fill(top.map { Self.color($0.entry.type) } ?? Color.secondary.opacity(cal.isDateInWeekend(date) ? 0.22 : 0.1))
                                .frame(height: 14)
                                .overlay(cal.isDateInToday(date) ? RoundedRectangle(cornerRadius: 3).stroke(.red, lineWidth: 1.5) : nil)
                                .onTapGesture {
                                    editing = top?.entry ?? PlanEntry(id: UUID().uuidString, date: key, type: .mini, title: "")
                                }
                                .accessibilityLabel(date.formatted(date: .complete, time: .omitted) + (top.map { ", " + $0.entry.title } ?? ""))
                        } else {
                            Color.clear.frame(height: 14)
                        }
                    }
                }
            }
        }
    }

    private func kpi(_ label: String, _ v: Int, _ target: Int) -> some View {
        VStack(alignment: .leading) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            (Text("\(v)").font(.title.bold()).foregroundColor(v >= target ? .green : .orange) + Text("/\(target)").font(.caption).foregroundColor(.secondary))
        }.frame(maxWidth: .infinity, alignment: .leading).padding().background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
    }

    static func index(_ occ: [Logic.Occurrence]) -> [String: [Logic.Occurrence]] {
        var out: [String: [Logic.Occurrence]] = [:]
        let cal = Calendar.current
        for o in occ {
            var d = o.on
            while d <= o.end {
                out[DayFormat.string(d), default: []].append(o)
                guard let n = cal.date(byAdding: .day, value: 1, to: d) else { break }
                d = n
            }
        }
        return out
    }

    static func color(_ t: PlanType) -> Color {
        switch t {
        case .misogi: .red
        case .mini: .green
        case .habit: .yellow
        case .anniversary: .pink
        case .birthday: .purple
        case .vacation: .teal
        case .blocked: .gray
        case .other: .blue
        }
    }
}

struct PlanEditor: View {
    @Environment(Store.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State var entry: PlanEntry
    @State private var start = Date.now
    @State private var hasEnd = false
    @State private var end = Date.now

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $entry.title)
                Picker("Type", selection: $entry.type) { ForEach(PlanType.allCases) { Text($0.label).tag($0) } }
                DatePicker("Date", selection: $start, displayedComponents: .date)
                Toggle("Multi-day", isOn: $hasEnd)
                if hasEnd { DatePicker("Ends", selection: $end, in: start..., displayedComponents: .date) }
                Toggle("Repeats every year", isOn: Binding(get: { entry.annual ?? false }, set: { entry.annual = $0 }))
                if store.data.bigcal.contains(where: { $0.id == entry.id }) {
                    Button("Delete", role: .destructive) { store.deletePlan(entry.id); dismiss() }
                }
            }
            .navigationTitle(entry.title.isEmpty ? "Plan something" : entry.title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        entry.date = DayFormat.string(start)
                        entry.endDate = hasEnd ? DayFormat.string(end) : nil
                        if entry.type == .anniversary || entry.type == .birthday, entry.annual == nil { entry.annual = true }
                        store.upsert(entry); dismiss()
                    }.disabled(entry.title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                start = DayFormat.parse(entry.date) ?? .now
                if let e = entry.endDate.flatMap(DayFormat.parse) { hasEnd = true; end = e } else { end = start }
            }
        }
    }
}
