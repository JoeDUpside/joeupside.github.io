import SwiftUI

@main
struct HearthApp: App {
    @State private var store = Store()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            TabView {
                TodayView().tabItem { Label("Today", systemImage: "circle.circle") }
                AgendaView().tabItem { Label("Calendar", systemImage: "calendar") }
                BigYearView().tabItem { Label("Big Year", systemImage: "square.grid.3x3") }
                PantryView().tabItem { Label("Pantry", systemImage: "basket") }
                SettingsView().tabItem { Label("Settings", systemImage: "gearshape") }
            }
            .environment(store)
            .task {
                _ = await store.calendar.requestAccess()
                store.publishSummary()
            }
            .onChange(of: phase) { _, newPhase in
                if newPhase == .active { store.publishSummary() }
            }
        }
    }
}
