import Foundation

// Data model. Field names match the web app's JSON backup (Settings → Export backup),
// so a web backup can be imported straight into the native app.

struct Member: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var color: String          // "#rrggbb"
    var role: String           // "parent" | "kid"
    var email: String?
}

struct PricePoint: Codable, Hashable {
    var date: String           // "yyyy-MM-dd"
    var retailer: String
    var price: Double
    var packQty: Double?

    var unitPrice: Double { price / max(packQty ?? 1, 0.0001) }
    var day: Date? { DayFormat.parse(date) }
}

struct PantryItem: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var unit: String
    var onHand: Double
    var usePerWeek: Double
    var leadDays: Double
    var safetyDays: Double
    var maxStock: Double?
    var shelfStable: Bool?
    var retailer: String?
    var lastUpdated: String?   // ISO-8601
    var prices: [PricePoint]
}

enum PlanType: String, Codable, CaseIterable, Identifiable {
    case misogi, mini, habit, anniversary, birthday, vacation, blocked, other
    var id: String { rawValue }
    var label: String {
        switch self {
        case .misogi: "Misogi"
        case .mini: "Mini-adventure (Kevin's Rule)"
        case .habit: "Quarterly habit"
        case .anniversary: "Anniversary"
        case .birthday: "Birthday"
        case .vacation: "Vacation / trip"
        case .blocked: "Blocked / protected"
        case .other: "Other"
        }
    }
}

struct PlanEntry: Codable, Identifiable, Hashable {
    var id: String
    var date: String           // "yyyy-MM-dd"
    var endDate: String?
    var type: PlanType
    var title: String
    var annual: Bool?
}

struct ManualEvent: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var start: String          // ISO-8601
    var end: String
    var memberIds: [String]?
    var location: String?
}

struct Settings: Codable, Hashable {
    var kevinDays: Int = 56
    var theme: String = "auto"
    var corsProxy: String = ""
}

/// Root document. Unknown web-only keys (feeds, hidden) are ignored on decode.
struct HearthData: Codable {
    var version: Int = 1
    var members: [Member] = []
    var events: [ManualEvent] = []
    var bigcal: [PlanEntry] = []
    var pantry: [PantryItem] = []
    var settings: Settings = Settings()
}

enum DayFormat {
    private static let f: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    static func parse(_ s: String) -> Date? { f.date(from: String(s.prefix(10))) }
    static func string(_ d: Date) -> String { f.string(from: d) }
}

enum ISO {
    private static let withFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f
    }()
    private static let plain = ISO8601DateFormatter()
    static func parse(_ s: String?) -> Date? {
        guard let s else { return nil }
        return withFrac.date(from: s) ?? plain.date(from: s)
    }
    static func string(_ d: Date) -> String { withFrac.string(from: d) }
}
