import WidgetKit
import SwiftUI

/// Home Screen + Lock Screen widget. Reads the summary the app writes into the App Group.
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, summary: .placeholder) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, summary: SharedContainer.readSummary() ?? .placeholder))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let s = SharedContainer.readSummary() ?? .placeholder
        // Refresh at each upcoming event start so "next up" stays current; the app also reloads on change.
        var dates = [Date.now] + s.events.map(\.start).filter { $0 > .now }
        dates = Array(dates.prefix(6))
        let entries = dates.map { Entry(date: $0, summary: s) }
        completion(Timeline(entries: entries, policy: .after(.now.addingTimeInterval(3 * 3600))))
    }
}

struct Entry: TimelineEntry { let date: Date; let summary: Summary }

struct HearthWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: Entry

    var body: some View {
        let s = entry.summary
        let next = s.events.first { $0.end > entry.date }
        switch family {
        case .accessoryCircular:
            RingsView(values: [s.stocked, s.planned, Double(s.freeEvenings) / 7], lineWidth: 4)
        case .accessoryRectangular:
            VStack(alignment: .leading) {
                if let next {
                    Text(next.title).font(.headline).lineLimit(1)
                    Text(next.start, style: .time) + Text(next.who.isEmpty ? "" : " · " + next.who)
                } else if let t = s.nextAdventureTitle, let d = s.nextAdventureDate {
                    Text(t).font(.headline).lineLimit(1)
                    Text(d, style: .relative)
                } else { Text("Nothing scheduled") }
            }
        default:
            HStack(spacing: 12) {
                RingsView(values: [s.stocked, s.planned, Double(s.freeEvenings) / 7], lineWidth: 7).frame(width: 64)
                VStack(alignment: .leading, spacing: 3) {
                    if let next {
                        Text(next.title).font(.subheadline.bold()).lineLimit(2)
                        Text(next.start, style: .time).font(.caption).foregroundStyle(.secondary)
                    }
                    if let b = s.buys.first { Label(b.name, systemImage: "cart").font(.caption).foregroundStyle(b.action == "NEED" ? .red : .green) }
                    if let t = s.nextAdventureTitle, let d = s.nextAdventureDate {
                        Text("\(Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: entry.date), to: d).day ?? 0)d → \(t)").font(.caption2).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }
}

@main
struct HearthWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HearthWidget", provider: Provider()) { entry in
            HearthWidgetView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Hearth")
        .description("Family rings, next event, what to buy.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}
