# Hearth — native iPhone, widget and Apple Watch (phase 2)

> **Status: not compiled yet.** This code was written in a Linux container where no Swift toolchain was
> available, so it has **never been built**. Expect a few compile fixes on first open in Xcode.
> The parts most likely to need adjustment are flagged below. The rules engine (`Shared/Logic.swift`)
> is a line-by-line port of the tested `family/logic.js`. `Tests/LogicTests.swift` repeats the same
> test cases, so ⌘U shows straight away whether the port matches.

## What it does
| Target | Does |
|---|---|
| **Hearth (iPhone/iPad)** | Today rings, 2-week agenda from **every calendar on the phone** (EventKit), Big Year grid + editor, Pantry with price charts, settings. Imports the web app's JSON backup. |
| **HearthWidget** | Home Screen (small/medium) and Lock Screen (circular rings / next event). |
| **HearthWatch** | Rings, next 48h, next adventure, buy list. Gets its data from the phone via WatchConnectivity. |

### Why calendars come through Apple Calendar, not direct API calls
Add each private link (Google "secret iCal address", Outlook published ICS, TeamSnap Subscribe/Export,
GameChanger Schedule Sync) **once** as a *Subscribed Calendar* on the iPhone. EventKit then gives the app all of
them with one permission prompt. Each one also shows up in the built-in Calendar app and on any **paired**
Watch for free. In Settings → *Calendars on this iPhone*, tag whose calendar each one is so events get that
person's color.

## Build on your Mac
1. Xcode 15 or newer (iOS 17 / watchOS 10 SDKs). Apple Developer account for device installs and App Groups.
2. `brew install xcodegen` → `cd family/ios` → `xcodegen generate` → `open Hearth.xcodeproj`
3. Replace `com.example.hearth` / `group.com.example.hearth` everywhere with your own ID. The App Group must also be
   created in the developer portal (or let Xcode's *Signing & Capabilities* do it).
4. Run the **Hearth** scheme on your iPhone. Press ⌘U to run `LogicTests`.
5. To move your web data across: web app → Settings → *Export backup* → AirDrop/Files → native app → Settings → *Import*.

## Known gaps / likely first-build fixes (I'm not certain of these)
- **Watch target in XcodeGen**: the spec uses a single-target watchOS app (`WKApplication: true`). If XcodeGen
  doesn't embed it into the iPhone app automatically, add it under the iPhone target's *Embed Watch Content*
  build phase in Xcode, or create the Watch target from Xcode's template and drag `Watch/` + the two shared files in.
- **Test host**: if ⌘U complains about `@testable import Hearth`, set the test target's *Host Application* to Hearth.
- **Swift 6 strict concurrency**: the project pins Swift 5 mode on purpose. WatchConnectivity delegates may still
  give concurrency warnings.
- **Kids' Watches on Family Setup** have no paired iPhone, so WatchConnectivity can't reach them. For now they see
  family events through a **shared iCloud calendar**. **Verify with Apple's current docs** which apps and
  complications Family Setup supports.
- **One copy per phone**: each parent's iPhone keeps its own data file. The next step is a **CloudKit shared zone**
  (`CKShare`) so the pantry and Big Year stay in sync between both parents' phones.

## File map
```
Shared/   Models.swift (matches web JSON) · Logic.swift (rules) · Summary.swift (widget/watch snapshot) · Color+Hex.swift (rings)
iOS/      HearthApp.swift · Store.swift (state, App Group file, WatchConnectivity) · CalendarService.swift (EventKit) · Views/*
Widget/   HearthWidget.swift
Watch/    HearthWatchApp.swift
Tests/    LogicTests.swift
```
