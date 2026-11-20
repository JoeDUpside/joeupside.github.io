import SwiftUI

extension Color {
    /// "#rrggbb" → Color. Falls back to gray for anything malformed.
    init(hex: String) {
        let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard s.count == 6, let v = UInt32(s, radix: 16) else { self = .gray; return }
        self = Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
    static let ringMove = Color(hex: "#fa114f")
    static let ringExercise = Color(hex: "#92e82a")
    static let ringStand = Color(hex: "#1eeaef")
}

/// Activity-style concentric rings, shared by app, widget and watch.
struct RingsView: View {
    var values: [Double]                 // outer → inner, 0…1
    var colors: [Color] = [.ringMove, .ringExercise, .ringStand]
    var lineWidth: CGFloat = 10

    var body: some View {
        ZStack {
            ForEach(values.indices, id: \.self) { i in
                let inset = CGFloat(i) * (lineWidth + 3)
                ZStack {
                    Circle().stroke(colors[i].opacity(0.22), lineWidth: lineWidth)
                    Circle().trim(from: 0, to: max(0.001, min(1, values[i])))
                        .stroke(colors[i], style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                .padding(inset + lineWidth / 2)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityElement()
        .accessibilityLabel("Stocked \(Int(values[0] * 100)) percent, planned \(Int(values[1] * 100)) percent, free evenings \(Int((values[2] * 7).rounded())) of 7")
    }
}
