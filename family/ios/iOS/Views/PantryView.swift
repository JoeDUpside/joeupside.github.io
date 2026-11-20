import SwiftUI
import Charts

struct PantryView: View {
    @Environment(Store.self) private var store
    @State private var logging: LogRequest?
    @State private var editing: PantryItem?
    @State private var counting: PantryItem?

    struct LogRequest: Identifiable { let item: PantryItem; let bought: Bool; var id: String { item.id + "\(bought)" } }

    private static let order: [PantryAction: Int] = [.need: 0, .stockUp: 1, .wait: 2, .ok: 3]

    var body: some View {
        let rows = store.statuses().sorted { (Self.order[$0.status.action]!, $0.status.daysLeft) < (Self.order[$1.status.action]!, $1.status.daysLeft) }
        let buy = rows.filter { $0.status.action == .need || $0.status.action == .stockUp }
        NavigationStack {
            List {
                Section {
                    HStack {
                        stat("To buy", "\(buy.count)")
                        stat("Est. cost", buy.compactMap(\.status.estCost).reduce(0, +).formatted(.currency(code: "USD")))
                        stat("vs. median", buy.map(\.status.savings).reduce(0, +).formatted(.currency(code: "USD")), .green)
                    }
                    if !buy.isEmpty {
                        ShareLink(item: shoppingList(buy)) { Label("Share list (Reminders, Messages…)", systemImage: "square.and.arrow.up") }
                    }
                }
                ForEach(rows) { row in
                    Section { card(row.item, row.status) }
                }
                Section {
                    Text("Log real prices from receipts and apps. Deal calls wait for 4+ price points. Checkout stays manual: no public consumer cart API exists for these stores.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Pantry")
            .toolbar {
                Button { editing = PantryItem(id: UUID().uuidString, name: "", unit: "unit", onHand: 0, usePerWeek: 1, leadDays: 2, safetyDays: 5, maxStock: 20, shelfStable: true, retailer: "Amazon", lastUpdated: ISO.string(.now), prices: []) } label: { Image(systemName: "plus") }
            }
            .sheet(item: $logging) { r in PriceSheet(item: r.item, bought: r.bought) }
            .sheet(item: $editing) { i in ItemEditor(item: i) }
            .sheet(item: $counting) { i in CountSheet(item: i) }
        }
    }

    private func stat(_ label: String, _ value: String, _ color: Color = .primary) -> some View {
        VStack(alignment: .leading) { Text(label).font(.caption).foregroundStyle(.secondary); Text(value).font(.headline).foregroundStyle(color).monospacedDigit() }
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private func card(_ i: PantryItem, _ s: PantryStatus) -> some View {
        HStack { Text(i.name).font(.headline); Spacer(); ActionPill(action: s.action) }
        let daysText = s.daysLeft.isFinite ? "~\(Int(s.daysLeft.rounded())) days" : "no usage set"
        Text("\(i.onHand.formatted(.number.precision(.fractionLength(0...1)))) \(i.unit)(s) · \(daysText)" + (s.runOut.map { " · out " + $0.formatted(.dateTime.month().day()) } ?? ""))
            .font(.footnote).foregroundStyle(.secondary)
        Gauge(value: s.daysLeft.isFinite ? min(1, s.daysLeft / max(30, s.reorderDays * 3)) : 1) { EmptyView() }
            .gaugeStyle(.accessoryLinearCapacity)
            .tint(s.action == .need ? .red : .green)
        Text(s.reason).font(.footnote)
        if i.prices.count >= 2 {
            Chart(i.prices.compactMap { p in p.day.map { PricePlot(date: $0, unit: p.unitPrice, store: p.retailer) } }) { p in
                LineMark(x: .value("Date", p.date), y: .value("Unit price", p.unit))
                PointMark(x: .value("Date", p.date), y: .value("Unit price", p.unit)).foregroundStyle(by: .value("Store", p.store))
            }
            .frame(height: 90)
        }
        HStack {
            Text("Best now: " + (s.best.map { "\($0.retailer) $\(String(format: "%.3f", $0.unit))" } ?? "no fresh price")).font(.caption)
            Spacer()
            if let m = s.median { Text("median $\(String(format: "%.3f", m))").font(.caption).foregroundStyle(.secondary) }
        }
        HStack {
            Button("Log price") { logging = LogRequest(item: i, bought: false) }
            Button("Bought") { logging = LogRequest(item: i, bought: true) }
            Button("Count") { counting = i }
            Spacer()
            Button("Edit") { editing = i }
        }.buttonStyle(.bordered).font(.callout)
    }

    private func shoppingList(_ rows: [PantryRow]) -> String {
        "Shopping list\n" + rows.filter { $0.status.packs > 0 }.map { r in
            "• \(r.status.packs)× \(r.item.name) — " + (r.status.best.map { "\($0.retailer) $\(String(format: "%.2f", $0.entry.price))" } ?? (r.item.retailer ?? ""))
        }.joined(separator: "\n")
    }
}

struct PricePlot: Identifiable { let date: Date; let unit: Double; let store: String; let id = UUID() }

let retailers = ["Amazon", "Walmart", "Pet Supplies Plus", "Target", "Costco", "Other"]

struct PriceSheet: View {
    @Environment(Store.self) private var store
    @Environment(\.dismiss) private var dismiss
    let item: PantryItem
    let bought: Bool
    @State private var retailer = "Amazon"
    @State private var price: Double?
    @State private var packQty: Double = 1
    @State private var packs = 1

    var body: some View {
        NavigationStack {
            Form {
                Picker("Store", selection: $retailer) { ForEach(retailers, id: \.self) { Text($0) } }
                TextField("Price ($)", value: $price, format: .number).keyboardType(.decimalPad)
                TextField("\(item.unit)s per pack", value: $packQty, format: .number).keyboardType(.decimalPad)
                if bought { Stepper("Packs bought: \(packs)", value: $packs, in: 1...50) }
            }
            .navigationTitle(bought ? "Bought \(item.name)" : "Log price")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let price { store.logPrice(itemId: item.id, retailer: retailer, price: price, packQty: max(packQty, 0.0001), packsBought: bought ? packs : nil) }
                        dismiss()
                    }.disabled(price == nil)
                }
            }
            .onAppear {
                if let last = item.prices.last { retailer = last.retailer; price = last.price; packQty = last.packQty ?? 1 }
                else { retailer = item.retailer ?? "Amazon" }
            }
        }
    }
}

struct CountSheet: View {
    @Environment(Store.self) private var store
    @Environment(\.dismiss) private var dismiss
    let item: PantryItem
    @State private var value: Double = 0
    var body: some View {
        NavigationStack {
            Form { TextField("\(item.unit)s on hand", value: $value, format: .number).keyboardType(.decimalPad) }
                .navigationTitle("Count \(item.name)")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Update") { store.setCount(itemId: item.id, onHand: value); dismiss() } }
                }
                .onAppear { value = (item.onHand * 10).rounded() / 10 }
        }
    }
}

struct ItemEditor: View {
    @Environment(Store.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State var item: PantryItem
    var body: some View {
        NavigationStack {
            Form {
                TextField("Item", text: $item.name)
                TextField("Count it in (roll, tube, lb, pod…)", text: $item.unit)
                LabeledContent("On hand") { TextField("", value: $item.onHand, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Used per week") { TextField("", value: $item.usePerWeek, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Max to store") { TextField("", value: Binding(get: { item.maxStock ?? 0 }, set: { item.maxStock = $0 > 0 ? $0 : nil }), format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                Stepper("Delivery lead time: \(Int(item.leadDays))d", value: $item.leadDays, in: 0...30)
                Stepper("Safety buffer: \(Int(item.safetyDays))d", value: $item.safetyDays, in: 0...60)
                Picker("Usual store", selection: Binding(get: { item.retailer ?? "Amazon" }, set: { item.retailer = $0 })) { ForEach(retailers, id: \.self) { Text($0) } }
                Toggle("Shelf-stable (OK to stock up on deals)", isOn: Binding(get: { item.shelfStable ?? true }, set: { item.shelfStable = $0 }))
                if store.data.pantry.contains(where: { $0.id == item.id }) {
                    Button("Delete", role: .destructive) { store.data.pantry.removeAll { $0.id == item.id }; store.save(); dismiss() }
                }
            }
            .navigationTitle(item.name.isEmpty ? "New item" : item.name)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { item.lastUpdated = ISO.string(.now); store.upsert(item); dismiss() }
                        .disabled(item.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
