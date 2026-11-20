import Foundation

/// Small, precomputed snapshot the phone app writes for the Widget (via the App Group container)
/// and sends to the Watch (via WatchConnectivity). Widgets and the Watch never run the full logic.
struct Summary: Codable, Hashable {
    struct Event: Codable, Hashable { var title: String; var start: Date; var end: Date; var allDay: Bool; var colorHex: String; var who: String }
    struct Buy: Codable, Hashable { var name: String; var action: String; var detail: String }

    var generated: Date
    var stocked: Double            // ring 1, 0…1
    var planned: Double            // ring 2, 0…1
    var freeEvenings: Int          // ring 3, out of 7
    var planYear: Int
    var nextAdventureTitle: String?
    var nextAdventureDate: Date?
    var nextMilestoneTitle: String?
    var nextMilestoneDate: Date?
    var kevinGaps: Int
    var events: [Event]            // next 48h, max 8
    var buys: [Buy]

    static let placeholder = Summary(generated: .now, stocked: 0.8, planned: 0.45, freeEvenings: 4, planYear: 2027,
                                     nextAdventureTitle: "Ice fishing", nextAdventureDate: .now.addingTimeInterval(65 * 86_400),
                                     nextMilestoneTitle: "Anniversary", nextMilestoneDate: .now.addingTimeInterval(133 * 86_400),
                                     kevinGaps: 2,
                                     events: [Event(title: "Soccer practice", start: .now.addingTimeInterval(3_600), end: .now.addingTimeInterval(9_000), allDay: false, colorHex: "#34c759", who: "Kid 1")],
                                     buys: [Buy(name: "Toilet paper", action: "STOCK_UP", detail: "Amazon in cheapest 20%")])
}

enum SharedContainer {
    /// Must match the App Group configured in project.yml and in the Apple Developer portal.
    static let appGroup = "group.com.example.hearth"
    static var url: URL {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
            ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    static var dataURL: URL { url.appendingPathComponent("hearth.json") }
    static var summaryURL: URL { url.appendingPathComponent("summary.json") }

    static func readSummary() -> Summary? {
        guard let d = try? Data(contentsOf: summaryURL) else { return nil }
        return try? JSONDecoder.hearth.decode(Summary.self, from: d)
    }
}

extension JSONDecoder { static let hearth: JSONDecoder = { let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601; return d }() }
extension JSONEncoder { static let hearth: JSONEncoder = { let e = JSONEncoder(); e.dateEncodingStrategy = .iso8601; e.outputFormatting = [.prettyPrinted, .sortedKeys]; return e }() }
