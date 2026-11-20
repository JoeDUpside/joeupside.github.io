import XCTest
@testable import Hearth

/// Mirrors family/test/run.js so the web and native rules can't drift apart.
final class LogicTests: XCTestCase {
    let now = ISO8601DateFormatter().date(from: "2026-11-20T12:00:00Z")!
    func d(_ daysAgo: Double) -> String { DayFormat.string(now.addingTimeInterval(-daysAgo * 86_400)) }

    var tp: PantryItem {
        PantryItem(id: "tp", name: "Toilet paper", unit: "roll", onHand: 30, usePerWeek: 7, leadDays: 3, safetyDays: 5, maxStock: 72,
                   shelfStable: true, retailer: "Amazon", lastUpdated: nil, prices: [
                    PricePoint(date: d(200), retailer: "Amazon", price: 30, packQty: 24),
                    PricePoint(date: d(150), retailer: "Walmart", price: 28, packQty: 24),
                    PricePoint(date: d(100), retailer: "Amazon", price: 29, packQty: 24),
                    PricePoint(date: d(60), retailer: "Walmart", price: 31, packQty: 24),
                    PricePoint(date: d(2), retailer: "Amazon", price: 22, packQty: 24),
                   ])
    }

    func testStockUpWhenCheapAndRoom() {
        let s = Logic.pantryStatus(tp, now: now)
        XCTAssertEqual(s.action, .stockUp)
        XCTAssertEqual(s.best?.retailer, "Amazon")
        XCTAssertEqual(s.packs, 2)
        XCTAssertGreaterThan(s.savings, 0)
    }

    func testNeedOverridesPrice() {
        var i = tp; i.onHand = 5
        let s = Logic.pantryStatus(i, now: now)
        XCTAssertEqual(s.action, .need)
        XCTAssertGreaterThan(s.buyUnits, 0)
    }

    func testWaitWhenExpensiveAndStocked() {
        var i = tp; i.onHand = 60
        i.prices = Array(tp.prices.prefix(4)) + [PricePoint(date: d(1), retailer: "Walmart", price: 36, packQty: 24)]
        XCTAssertEqual(Logic.pantryStatus(i, now: now).action, .wait)
    }

    func testThinHistoryNoDealCalls() {
        var i = tp; i.prices = Array(tp.prices.suffix(2))
        XCTAssertEqual(Logic.pantryStatus(i, now: now).action, .ok)
    }

    func testPerishablesNeverStockUp() {
        var i = tp; i.shelfStable = false
        XCTAssertNotEqual(Logic.pantryStatus(i, now: now).action, .stockUp)
    }

    func testBurnDown() {
        var i = tp; i.lastUpdated = ISO.string(now.addingTimeInterval(-7 * 86_400))
        XCTAssertEqual(Logic.burnDown(i, now: now).onHand, 23, accuracy: 0.001)
    }

    func testKevinsRuleAndAnnual() {
        let e = [PlanEntry(id: "1", date: "2027-02-10", type: .mini, title: "Ice fishing"),
                 PlanEntry(id: "2", date: "2027-04-01", type: .mini, title: "Camping"),
                 PlanEntry(id: "3", date: "2027-08-15", type: .misogi, title: "Rim to rim"),
                 PlanEntry(id: "4", date: "2010-06-12", type: .anniversary, title: "Wedding", annual: true)]
        XCTAssertEqual(Logic.kevinsRuleGaps(e, year: 2027).map(\.days), [136, 138])
        XCTAssertEqual(Logic.occurrences(e, year: 2027).first { $0.entry.type == .anniversary }?.nth, 17)
        XCTAssertEqual(Logic.yearScore(e, year: 2027).misogi, 1)
    }

    func testDecodesWebBackupShape() throws {
        let json = """
        {"version":1,"demo":true,"members":[{"id":"p1","name":"Me","color":"#0a84ff","role":"parent"}],
         "feeds":[{"id":"x","name":"Tigers","url":"","kind":"teamsnap","color":"#5e5ce6","memberIds":[]}],"hidden":{},
         "settings":{"corsProxy":"","kevinDays":56,"theme":"auto"},
         "events":[{"id":"e","title":"Practice","start":"2026-11-21T22:30:00.000Z","end":"2026-11-22T00:00:00.000Z","memberIds":["p1"],"location":"Field 3"}],
         "bigcal":[{"id":"b","date":"2012-06-09","type":"anniversary","title":"Wedding","annual":true}],
         "pantry":[{"id":"i","name":"TP","unit":"roll","onHand":22,"usePerWeek":9,"leadDays":2,"safetyDays":5,"maxStock":72,"shelfStable":true,"retailer":"Amazon","lastUpdated":"2026-11-20T18:00:00.000Z","prices":[{"date":"2026-11-17","retailer":"Amazon","price":23.99,"packQty":24}]}]}
        """
        let data = try JSONDecoder().decode(HearthData.self, from: Data(json.utf8))
        XCTAssertEqual(data.members.first?.name, "Me")
        XCTAssertEqual(data.pantry.first?.prices.count, 1)
        XCTAssertEqual(data.bigcal.first?.type, .anniversary)
        XCTAssertNotNil(ISO.parse(data.events.first?.start))
    }
}
