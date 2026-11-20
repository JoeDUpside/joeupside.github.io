# Hearth Family OS: Blueprint

Status: v0.1 working prototype (web app you can install on iPhone). Written 2026-11-20.
Household: 2 parents (Me, Heather) and 2 kids. Everyone has an Apple Watch. The kids get email addresses later.

---

## 1. What exists today (v0.1, `family/`)

| Area | Works now | Limitation |
|---|---|---|
| **Today** | Watch-style rings: Stocked %, next year's plan %, free evenings this week. Countdown to the next adventure and the next anniversary or birthday. Next 48 hours. Shopping actions. | Not a native widget. |
| **Calendar** | Merges any number of `.ics`/webcal feeds (Google, Outlook, iCloud, TeamSnap, GameChanger, school) with manual events. Color per family member, member and feed filters, agenda and month views, flags overlapping events ("who drives?"). Pantry reorder dates and Big Year items show up here too. | Read-only feeds. Browsers block most calendar servers (CORS), so use **Paste** or **Import .ics**, or run a self-hosted proxy. Times with a TZID are read in the device's own time zone. |
| **Big Year** | Whole year on one screen, 12 columns by 31 rows. Scorecard for 1 misogi, 6 mini-adventures and 4 quarterly habits. Flags any stretch with no adventure that breaks Kevin's Rule (default 56 days, adjustable). Anniversaries and birthdays repeat every year and show which one it is (#15 and so on). **Export .ics** with 7-day alerts. | Single shared plan; there is no per-person year yet. |
| **Pantry** | Days of supply, run-out date, reorder date (delivery lead time plus a safety buffer). Price history per store and unit price. Decision rule: **Buy now / Stock up / Wait / OK**. Shopping run grouped by store, with savings measured against the median price. Share sheet sends the list to Messages, Reminders or Notes. | Prices are **logged by hand**. Checkout is manual. |
| **Data** | Everything stays in this browser's localStorage. JSON backup and restore. Works offline. | No sync between devices yet, so each phone keeps its own copy. That is the main gap for phase 2. |

How to use it: once this branch is merged and Pages deploys, open `https://<your-pages-domain>/family/` in Safari, then Share → **Add to Home Screen**.
⚠ The repo is **public** and the custom domain is your business site. The code contains no personal data, and family names and feed links are typed in on the device. Even so, you may prefer to host the app in a private repo or its own subdomain. Section 6 covers this.

### Pantry decision rule (deliberately simple and explainable)
- **NEED**: days of supply ≤ delivery lead time + safety buffer. Buy enough for 30 days, capped at max storage.
- **STOCK UP**: the best current price (seen in the last 21 days) is in the **cheapest 20%** of logged history, there is shelf space, the item is shelf-stable, **and** at least 4 prices are logged.
- **WAIT**: the price is more than 10% above the median and there are more than 14 extra days of supply.
- On-hand counts go down automatically each day at the usage rate. **Count** corrects drift.

Why the minimum of 4 price points matters: with only 1 or 2 points, "cheapest 20%" means almost nothing. Retailers also inflate a "was" price so the sale looks better. Your own logged history protects you from that. A store's strikethrough price does not.

---

## 2. Research findings (verify before relying on them)

### Jesse Itzler's "Big A** Calendar" system
Sources are podcasts and secondary write-ups. **I do not have a verified primary Itzler text for these details.**
- **Big calendar**: one wall-sized view of the year. Adventures and priorities are scheduled first, and everything else fits around them. A paraphrase that circulates widely: "if it's not on the calendar, it's not a priority." **I cannot confirm that exact quote.**
- **Misogi**: one hard challenge a year that defines the year, often described as having roughly 50% odds of failure. The concept is credited to Marcus Elliott (P3) and popularised by Itzler. *Verify the attribution.*
- **Kevin's Rule**: one mini-adventure about every 8 weeks (around 6 a year), named after a friend called Kevin who taught Itzler the idea. One secondary source says quarterly instead. The app defaults to 56 days and lets you change it.
- **"1-6-4"**: 1 misogi, 6 mini-adventures, 4 new habits (one per quarter). This label appears in secondary sources. **It is not confirmed as Itzler's own term.**

Sources: [Upworthy, 1-6-4](https://www.upworthy.com/?p=314290) · [Life Domination, Kevin's Rule](https://lifedomination.beehiiv.com/p/kevins-rule) · [Daily Stoic, 3 rules](https://dailystoic.com/these-3-rules-will-make-or-break-your-2026-jesse-itzler/) · [Itzler's Misogi board](https://jesseitzler.com/es/pages/miogi-board). Bias check: these are self-improvement newsletters and podcast recaps that are optimised for engagement. They are useful for the framework but weak on exact numbers and quotes.

### "LifeOS"
At least three different App Store apps use this name, including "LifeOS – Life Companion" (an AI guide with health, finance and family modules) and "LifeOS: Daily Habits & Focus". **I'm not certain which one you mean.** I copied the general pattern: a single dashboard, ring and score metaphors, and modules. I did not copy any specific product. Tell me which app you mean and I'll match its structure more closely.

### Sports apps
- **GameChanger**: has an official calendar subscription link (team gear icon → Schedule Sync). Fans who only follow a team get games only; staff, players and parents also get practices. **I found no public developer API.** [GC help](https://help.gc.com/hc/en-us/articles/115005457626-Integrating-Your-Personal-Calendar)
- **TeamSnap**: has an official subscribe/export link per team or for all teams, with a choice of full schedule or games only. A developer API has existed in the past. **I could not confirm its current public availability.** Don't plan around it. [TeamSnap help](https://helpme.teamsnap.com/article/128-subscribe-to-a-team-schedule)
- **Conclusion**: the subscription feed is the right integration, and it is the one both vendors support. It is read-only, and Google can take up to 24 hours to refresh a subscribed feed. Pulling the feed directly, as this app or a native app would, avoids that delay.

### Calendars (Google and Outlook)
- Fastest and most reliable path: a **private iCal link** from each account. Google's is "Secret address in iCal format". Outlook's is Publish calendar → ICS.
- Path for two-way sync later: Google Calendar API and Microsoft Graph, both OAuth. These need a backend and an app registration. Do this only if you need to *create* events from Hearth.

### Shopping automation: what is actually possible (as of Nov 2026; this changes fast)
| Retailer | Automation reality | Practical path |
|---|---|---|
| **Amazon** | **No public consumer cart or checkout API.** Amazon has reportedly *blocked* third-party shopping agents (TechCrunch, Oct 2026). The Product Advertising API gives product data and prices but needs Associates eligibility, and I'm not certain of its current terms. | **Subscribe & Save** for steady staples. Keepa or CamelCamelCamel for price history (Keepa's API is paid). Hearth tells you *when* to buy; Amazon handles the recurring order. |
| **Walmart** | Launched an **Agent Gateway** (early beta, Oct 2026) where AI agents shop through Sparky. It includes per-agent spending limits and can require approval for every purchase. Walmart also sells inside ChatGPT. | The most promising route to real automation. **Request beta access** and keep the per-purchase approval setting turned on. |
| **Pet Supplies Plus** | **Autoship** program (2021 launch terms: discount on the first order, extra 5% after, skip or cancel any time, free delivery over $35). **Terms may have changed, so verify them.** No API found. | Autoship for dog food, with the interval set from Hearth's usage rate. Use Hearth's "Wait/Stock up" signals to move the schedule earlier or later. |
| **Target / Costco** | No public consumer cart API found. | Price logging plus links. |

Sources: [TechCrunch, Amazon blocks / Walmart welcomes agents](https://techcrunch.com/2026/10/21/while-amazon-blocks-ai-agents-walmart-rolls-out-the-welcome-mat/) · [Retail Dive, Sparky + ChatGPT](https://www.retaildive.com/news/walmart-sparky-chatgpt-instant-checkout/) · [Pet Supplies Plus Autoship launch](https://prnewswire.com/news-releases/tails-wagging-over-launch-of-pet-supplies-plus-autoship-subscription-program-301316332.html)

**Contrarian note:** "auto-buy agents that save money" is mostly a marketing story right now. The money is in three dull mechanics:
1. Subscribe & Save or Autoship base discounts. These are often around 5–15%, but the figure is approximate, so verify it per item.
2. Buying a 2–3 month supply when the price is in the bottom 20% of its history. That is the "Stock up" rule.
3. Never paying a NEED-price premium, because the reorder point fires before you run out.

A fully autonomous agent adds risk of wrong items, substitutions and runaway orders, and saves only a little beyond those three. Keep a human approval step until there is a track record.

---

## 3. Apple ecosystem architecture (phase 2, native)

The key insight: **Apple Calendar is already the hub that joins all the feeds together.** Subscribe once on each person's iCloud account to the Google, Outlook, TeamSnap and GameChanger links and Hearth's Big Year .ics. Every iPhone, Mac and **paired** Apple Watch then shows them through the built-in Calendar app and its complications, with no custom code.

The native app then adds what Calendar can't do:
```
SwiftUI app (iPhone/iPad/Mac) ─┬─ EventKit: read the merged calendars (one permission, all feeds)
                               ├─ CloudKit shared zone: family-wide pantry, Big Year, prices (syncs across devices)
                               ├─ WidgetKit: Home/Lock screen rings + next event + "buy now"
                               ├─ App Intents: Siri "What's on for the kids tonight?", "Log toilet paper $23.99 at Amazon"
                               └─ Notifications: reorder-by date, 7 days before each adventure/anniversary
watchOS app ───────────────────── complications: next event, days-to-adventure, pantry alert
```
- **Kids' Apple Watches**: if they are set up with **Family Setup** (no iPhone of their own), app and Calendar support is more limited than on a paired Watch. **I am not certain which third-party apps and complications Family Setup supports today.** Check Apple's current Family Setup documentation before relying on it. When the kids get email addresses, a child Apple Account under Family Sharing gives each of them a calendar you can share into.
- **Sharing**: Family Sharing + a shared iCloud calendar "Family" for the events everyone needs, and CloudKit sharing for Hearth data.
- Building it needs a Mac with Xcode and an Apple Developer account ($99/yr; verify the current price). This container can't compile iOS code.

## 4. Roadmap and risks: 12 months / 2–3 years / 4–10 years

| Horizon | Build | Risk / opportunity |
|---|---|---|
| **0–12 mo** | Use the web app. Subscribe all feeds in Apple Calendar for the Watches. Log prices for about 6 weeks. Fill in 2027 Big Year now (anniversary, misogi, 6 adventures). Then native app phase 2: EventKit, CloudKit sync, widgets. | *Risk*: data entry fatigue, the classic way family apps die. Keep entry to one tap ("Bought", "Count"). *Opportunity*: the Big Year matters more than the pantry, because planning it **before January** is the step most families skip. |
| **2–3 yr** | Walmart Agent Gateway with approval-required purchases. Receipt or email parsing to log prices automatically. Kids get their own logins and chores. | *Risk*: retailer policies change without notice (Amazon blocks agents, Walmart welcomes them, and either could reverse). Design so a lost integration costs convenience, not function. |
| **4–10 yr** | Kids become drivers and planners. Their own misogi. Their Big Year shapes the family's. Teen and college logistics. | *Risk*: platform lock-in to Apple. Keep `.ics` and JSON export as the escape hatch, which v0.1 already has. |

## 5. Blind spots worth checking
- **Survivorship bias**: the Itzler stories come from someone with unusual wealth and flexibility. Size each misogi to your family's budget and the kids' ages. A misogi a 9-year-old fails at can backfire.
- **Neurodivergent load**: rings and streaks motivate some kids and create anxiety in others. The app shows progress, never a "failed" streak. Keep it that way.
- **Mental load imbalance**: if one parent does all the logging, the system becomes that parent's job. Assign pantry counting to the kids as a chore.
- **Deals that aren't savings**: stocking up ties up cash and shelf space. The max-stock cap exists for that reason.

## 6. Hosting and privacy decision (your call)
1. **Keep it at `/family/` on this public repo** (current). The code is public and the data is private (on the device). Simplest option.
2. **Move it to a private repo + separate Pages site or subdomain.** Keeps it separate from the business brand.
3. **Skip the web and go straight to native.** The web version stays as the prototype.

## 7. Files
`index.html` · `styles.css` · `app.js` (UI) · `logic.js` (pantry + Big Year rules, unit-tested) · `ics.js` (calendar parser) · `sw.js` (offline) · `test/run.js` (run with `node family/test/run.js`)
