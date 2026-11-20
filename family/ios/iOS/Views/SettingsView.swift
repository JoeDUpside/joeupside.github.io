import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(Store.self) private var store
    @State private var importing = false
    @State private var message: String?

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                Section("Family") {
                    ForEach($store.data.members) { $m in
                        HStack {
                            ColorPicker("", selection: Binding(get: { Color(hex: m.color) }, set: { m.color = $0.hexString }), supportsOpacity: false).labelsHidden()
                            TextField("Name", text: $m.name)
                            Picker("", selection: $m.role) { Text("Parent").tag("parent"); Text("Kid").tag("kid") }.labelsHidden()
                        }
                    }
                    Button("Add member") { store.data.members.append(Member(id: UUID().uuidString, name: "New", color: "#5e5ce6", role: "kid")) }
                }
                Section {
                    if store.calendar.authorized {
                        ForEach(store.calendar.calendars(), id: \.calendarIdentifier) { c in
                            NavigationLink {
                                CalendarOwnerPicker(calendarId: c.calendarIdentifier, title: c.title)
                            } label: {
                                HStack {
                                    Circle().fill(Color(cgColor: c.cgColor)).frame(width: 10, height: 10)
                                    VStack(alignment: .leading) {
                                        Text(c.title)
                                        Text(store.members(for: c.calendarIdentifier).map(\.name).joined(separator: ", ").ifEmpty("Whole family"))
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    } else {
                        Button("Allow calendar access") { Task { _ = await store.calendar.requestAccess(); store.publishSummary() } }
                    }
                } header: { Text("Calendars on this iPhone") } footer: {
                    Text("Add Google, Outlook, TeamSnap and GameChanger here first: iOS Settings → Apps → Calendar → Calendar Accounts → Add Account → Other → Add Subscribed Calendar, and paste each private .ics link. Then say whose calendar each one is.")
                }
                Section("Planning") {
                    Stepper("Kevin's Rule max gap: \(store.data.settings.kevinDays) days", value: $store.data.settings.kevinDays, in: 14...180, step: 7)
                }
                Section("Data") {
                    Button("Import web-app backup (.json)") { importing = true }
                    if let d = try? store.exportBackup() {
                        ShareLink(item: String(decoding: d, as: UTF8.self), preview: SharePreview("Hearth backup")) { Text("Export backup") }
                    }
                    if let message { Text(message).font(.footnote).foregroundStyle(.secondary) }
                }
            }
            .navigationTitle("Settings")
            .onChange(of: store.data.members) { _, _ in store.save() }
            .onChange(of: store.data.settings) { _, _ in store.save() }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                do {
                    let url = try result.get()
                    let ok = url.startAccessingSecurityScopedResource()
                    defer { if ok { url.stopAccessingSecurityScopedResource() } }
                    try store.importBackup(Data(contentsOf: url))
                    message = "Imported \(store.data.pantry.count) pantry items and \(store.data.bigcal.count) plans."
                } catch { message = "Import failed: \(error.localizedDescription)" }
            }
        }
    }
}

struct CalendarOwnerPicker: View {
    @Environment(Store.self) private var store
    let calendarId: String
    let title: String
    var body: some View {
        List(store.data.members) { m in
            let on = (store.calendarMembers[calendarId] ?? []).contains(m.id)
            Button {
                var ids = store.calendarMembers[calendarId] ?? []
                if on { ids.removeAll { $0 == m.id } } else { ids.append(m.id) }
                store.calendarMembers[calendarId] = ids
                store.publishSummary()
            } label: {
                HStack { Circle().fill(Color(hex: m.color)).frame(width: 12, height: 12); Text(m.name); Spacer(); if on { Image(systemName: "checkmark") } }
            }.foregroundStyle(.primary)
        }
        .navigationTitle(title)
    }
}

extension String { func ifEmpty(_ s: String) -> String { isEmpty ? s : self } }

extension Color {
    var hexString: String {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02x%02x%02x", Int(max(0, min(1, r)) * 255), Int(max(0, min(1, g)) * 255), Int(max(0, min(1, b)) * 255))
    }
}
