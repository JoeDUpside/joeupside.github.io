import SwiftUI
import WatchConnectivity
import Observation

/// watchOS app for a Watch PAIRED to a parent's iPhone. It receives the summary from the phone over
/// WatchConnectivity. Kids' Watches on Family Setup have no paired iPhone, so this app can't get data
/// that way; for them, rely on shared calendars in Apple Calendar (see README).
@main
struct HearthWatchApp: App {
    @State private var model = WatchModel()
    var body: some Scene {
        WindowGroup { WatchHome().environment(model) }
    }
}

@MainActor
@Observable
final class WatchModel: NSObject, WCSessionDelegate {
    var summary: Summary?

    override init() {
        super.init()
        summary = Self.cached()
        if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() }
    }

    private static var cacheURL: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("summary.json") }
    private static func cached() -> Summary? { (try? Data(contentsOf: cacheURL)).flatMap { try? JSONDecoder.hearth.decode(Summary.self, from: $0) } }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        let ctx = session.receivedApplicationContext
        Task { @MainActor in self.apply(ctx) }
    }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
        Task { @MainActor in self.apply(ctx) }
    }
    private func apply(_ ctx: [String: Any]) {
        guard let d = ctx["summary"] as? Data, let s = try? JSONDecoder.hearth.decode(Summary.self, from: d) else { return }
        summary = s
        try? d.write(to: Self.cacheURL, options: .atomic)
    }
}

struct WatchHome: View {
    @Environment(WatchModel.self) private var model
    var body: some View {
        NavigationStack {
            if let s = model.summary {
                List {
                    RingsView(values: [s.stocked, s.planned, Double(s.freeEvenings) / 7], lineWidth: 9)
                        .frame(height: 90).listRowBackground(Color.clear)
                    Section("Next") {
                        if s.events.isEmpty { Text("Nothing in 48h").foregroundStyle(.secondary) }
                        ForEach(s.events, id: \.self) { e in
                            HStack {
                                RoundedRectangle(cornerRadius: 2).fill(Color(hex: e.colorHex)).frame(width: 3)
                                VStack(alignment: .leading) {
                                    Text(e.title).font(.headline).lineLimit(2)
                                    Text(e.start, style: .time).font(.caption).foregroundStyle(.secondary)
                                    if !e.who.isEmpty { Text(e.who).font(.caption2).foregroundStyle(.secondary) }
                                }
                            }
                        }
                    }
                    if let t = s.nextAdventureTitle, let d = s.nextAdventureDate {
                        Section("Look forward to") { VStack(alignment: .leading) { Text(t).font(.headline); Text(d, style: .relative).font(.caption) } }
                    }
                    if !s.buys.isEmpty {
                        Section("Buy") { ForEach(s.buys, id: \.self) { b in Label(b.name, systemImage: b.action == "NEED" ? "exclamationmark.circle" : "tag").foregroundStyle(b.action == "NEED" ? .red : .green) } }
                    }
                }
                .navigationTitle("Hearth")
            } else {
                Text("Open Hearth on your iPhone once to sync.").multilineTextAlignment(.center).padding()
            }
        }
    }
}
