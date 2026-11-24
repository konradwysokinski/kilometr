# Kilometr — CLAUDE.md

Open-source, local-first tracker for the kilometres on your running shoes and bikes, fed by Strava. Working name: **Kilometr**. Built by Konrad (Design Team Lead, product designer) as a portfolio piece showing vibe coding: the code should be clean, the UI calm and polished.

It does one thing well: **how worn each item of gear is and what it has cost per kilometre**. Not training analytics.

Design references:
- Design system (live): https://claude.ai/artifact/HL9v1hrsjR1dcFVA6tmVtP
- Screens canvas (live): https://claude.ai/artifact/4q5dnBD2qH8fR2hNSYQrao
- Local copies: `design/screens/*.dc.html` (5 MVP screens, sample data) and `design/tokens.json`. These are design mockups in a custom HTML format, use them as the visual reference (layout, spacing, copy, states), not as code to copy.
- Inspiration: Focus (github.com/szmichalczyk/focus-app), a calm, native-feeling desktop UI.

---

## 1. Product decisions

- **Local-first.** Data stays on the user's computer. No backend, no accounts.
- **Two ways in:**
  1. **Import a Strava export (.zip)**: no setup, read locally, no live updates (import again to refresh).
  2. **Connect Strava via the user's own API app**: Strava only lets an app show data to its owner, so every install uses its own Client ID and secret (OAuth in a browser window). Gives live sync, and write access is needed to set gear on activities.
- **Platform:** decided: a local web app on localhost (Vite + React + TypeScript). It may be wrapped with Tauri later if a Mac app is wanted.
- **Rotation** = gear used in the last 60 days.
- **Sidebar:** separate Shoes and Bikes sections, items in rotation, most recently used first, **max 5 per section**, the rest behind "Show all (n)". Retired items never appear there.
- **Gear colours:** 7 hues for gear in rotation plus granite for everything else (see 4.2).
- **Avatars:** circles with initials (HS5, NP41, SES4, SG). An optional user photo replaces the initials.
- **Retiring a pair:** a modal with a life summary of the pair and a "Keep it for walks" option (it keeps counting km but leaves the rotation and the sidebar).
- **Bike parts / service** (chain, brake pads, tyres) are **not available from the Strava API**. They are entered in Kilometr: part, install date, limit in km. Km are counted from rides on that bike since that date. "Log service" resets the counter.
- **Units:** km, metres, PLN. Settings will later allow units and currency.
- **Languages:** English and Polish. First visit follows the browser's first supported language; the choice is remembered. Switch: EN | PL in the sidebar footer under "Dark mode", and in the Start screen footer. It moves to Settings when that screen exists.

## 2. Data from Strava

API (own app, OAuth):
- `GET /athlete` → `shoes[]`, `bikes[]` (id, name, brand/model, total distance, `primary`, retired flag).
- `GET /athlete/activities` → per activity: `gear_id`, `distance`, `total_elevation_gain`, `sport_type` (`Run`, `TrailRun`, `Ride`, `GravelRide`, …), `start_date`, `name`.
- `PUT /activities/{id}` with `gear_id` → assign shoes (needs `activity:write` scope).
- No bike components in the API.

Export .zip:
- `activities.csv`: columns incl. "Activity Gear", "Distance", "Elevation Gain", "Activity Type", "Activity Date", "Activity Name".
- `shoes.csv` / `bikes.csv`: Shoe|Bike Name, Brand, Model. Name is the Strava display name (a nickname if set) and is what "Activity Gear" contains.
- "Distance" appears twice in activities.csv: km first, metres later. Dates look like "Nov 23, 2026, 7:12:45 AM" (UTC).
- The export has no gear IDs and no retired flag: gear is keyed by kind + name (`src/import/stravaExport.ts`). Not yet checked against a real export; Konrad can provide his.

Derived per gear item:
- total km, number of activities, longest activity, **elevation gain sum** (sum of `total_elevation_gain` over activities with that `gear_id`), average gain per activity.
- **terrain split**: `TrailRun` = trail, `Run` = road (km and %).
- km per week / month, last used date → rotation.
- cost per km = price / km (price entered by the user).
- wear % = km / limit; km left; rough "weeks left" from recent pace on that pair.
- **Runs without shoes**: running activities with no `gear_id`, with a suggested pair (by type and recent use).

User-entered (stored locally): price, km limit, nickname, photo, colour override, retired / keep-for-walks state, bike parts and service log.

## 3. Screens

MVP (designed, see `design/screens/`):
1. **Start** (`Onboarding.dc.html`): two cards, "Import a Strava export" (drop zone) and "Connect Strava" (3 steps, Client ID and secret fields, Connect button). Footer: open source · MIT.
2. **Overview** (`Main.dc.html`): title "142 km *run in November*", month switcher plus period dropdown, filter pills (All gear / Shoes / Bikes), 4 KPI cards (Running, Riding, Cost per km, Next to retire), no banner for runs without shoes (Konrad found it too loud; see Notifications below), grid of gear cards in rotation, "Kilometres by week" stacked bars by shoe, bike card with part counters and "Log service".
3. **Shoe detail** (`Shoe.dc.html`): back link, avatar (with photo button), name, nickname/terrain/since, Edit and Retire pair; wear block (big 736 / 800 km, status chip, bar, km left plus weeks estimate, Change limit); 4 KPI cards (Activities, Elevation gain, Cost per km, Terrain); terrain bar; "Kilometres per month" bars; Recent runs list.
4. **Runs without shoes** (`Unassigned.dc.html`) (built as the top section of /activities, above the list of all activities by month; until Connect Strava exists, picks are saved locally in `Dataset.assignments` and survive a re-import) (lower priority: with default shoes set in Strava such runs are rare; on Overview they show as a quiet note beside "Shoes in rotation", not a banner): "7 runs *without shoes*", "Assign all suggested", one row per run with shoe pills (radio group), sticky bar with progress and "Save to Strava".
5. **Retire pair modal** (`Retire.dc.html`): avatar, "Retire Hoka Speedgoat 5?", wear bar, 6 life stats, explanation, "Keep it for walks" checkbox, Cancel / Retire pair.

Next (not designed yet):
6. Retired / Hall of Fame
7. Bike detail with service counters (chain, tyres, pads) and service log
8. Edit gear: price, limit, photo, nickname, colour
9. Share card (export an image)
10. Settings: units, currency, default limits, sync, theme
11. Dark theme (tokens below are ready; the sidebar already has a "Dark mode" switch)
12. Notifications (done, simple): after an import or sync, new runs without shoes produce one notice. It shows once as a toast (Sonner, headless `toast.custom`, top right just below the bell, 10 s) and then lives in a notifications panel that slides in from the right (about 420px, full width on phones, no scrim), opened from a bell button in the top-right corner of the content panel on every screen (warn dot when unread; the bell becomes the panel's X; Esc or a click outside closes it; opening marks notices read; toasts pause while it is open). Later notices: gear at 85% of its limit, bike parts due.
13. Mobile navigation: on phones the sidebar currently stacks above the content and fills the whole first screen. Replace with a compact top bar + hamburger (sidebar as a drawer). Konrad asked for this "for later".

### Build queue (agreed with Konrad, in this order)

1. Shoes screen (all pairs, incl. out of rotation)
2. Bikes screen
3. Activities screen and Retired screen
4. "Kilometres by week" chart: a small toggle between stacked bars and a line chart
5. Later: mobile hamburger (see 13 above)

---

## 4. Design system

### 4.1 Character

Calm, quiet desktop utility. A tinted sidebar, one white content panel floating on a soft grey gradient, big tabular numbers with one line of context under each, and a colour per gear item that follows it everywhere. The calm comes from restraint: light weights, generous whitespace, soft borders, pill shapes, colour as soft tints. Gradients only inside small elements (bar fills, avatar tints) plus the faint vertical grey behind the app.

### 4.2 Colour tokens (CSS variables)

```css
:root {
  /* ground */
  --canvas: #F2F3F5;            /* app ground */
  --canvas-gradient: linear-gradient(180deg, #F1F2F4 0%, #E8EAED 100%); /* behind sidebar + panel */
  --surface: #FFFFFF;           /* content panel, cards, popovers */
  --surface-sunken: #F6F7F9;    /* drop zones, stat blocks, inputs track */
  --line: #E3E5E9;              /* KPI card borders, buttons, inputs, list dividers */
  --line-soft: #EDEEF1;         /* gear/chart card borders, row dividers */
  --track: #EFF0F3;             /* unfilled part of a bar */
  --grid: #F1F2F4;              /* chart gridlines */

  /* text */
  --ink: #17191C;
  --ink-muted: #5B616B;         /* passes 4.5:1 on surface and canvas */

  /* brand: moss, the one brand hue */
  --accent: #2F6B4F;            /* primary buttons, links, toggle on, focus */
  --accent-hover: #1F4D38;
  --accent-soft: #E3EEE7;       /* or rgba(47,107,79,.10) for pills/step numbers */
  --on-accent: #FFFFFF;

  /* states */
  --warn: #A8590B;              /* gear at 85%+ of limit: bar fill, status dot */
  --warn-ink: #8A4A09;          /* warn text */
  --warn-soft: rgba(168, 89, 11, 0.12); /* status chip / banner bg (banner .08) */
  --danger: #B23A2A;            /* past the limit, destructive */

  /* gear colours: only for gear in rotation */
  --gear-1: #16A05A;  --gear-1-ink: #0B6B3A;   /* forest */
  --gear-2: #2563EB;  --gear-2-ink: #1A44A8;   /* cobalt */
  --gear-3: #F2602C;  --gear-3-ink: #A73A12;   /* tangerine */
  --gear-4: #E5A500;  --gear-4-ink: #845F00;   /* sun */
  --gear-5: #8B5CF6;  --gear-5-ink: #5B2FC9;   /* violet (bike in mockups) */
  --gear-6: #0EA5B7;                           /* teal */
  --gear-7: #E0457B;                           /* magenta */
  --gear-other: #8A9099;                       /* granite: out of rotation, retired, "Other" */
}

[data-theme="dark"] {
  --canvas: #141618;
  --surface: #1C1F22;
  --surface-sunken: #17191C;
  --line: #2C3035;
  --line-soft: #262A2E;
  --track: #2A2E33;
  --ink: #ECEEF1;
  --ink-muted: #A2A8B1;
  --accent: #7FC29E;
  --accent-soft: #23362B;
  --on-accent: #10231A;
  --warn: #E8A55A;
  --warn-soft: #3A2B1A;
  --danger: #F08A78;
  --gear-1: #4ED08A;
  --gear-2: #6B9BFF;
  --gear-3: #FF8A5C;
  --gear-4: #FFC633;
  --gear-5: #B196FF;
  --gear-6: #4FD3E0;
  --gear-7: #FF7AA5;
  --gear-other: #6E747D;
  /* derive canvas-gradient, *-ink shades and grid for dark when building the theme */
}
```

Gear colour rules:
- An item takes the first free hue when it enters rotation and keeps it while in rotation; the user can change it. Implemented by saving the hue in the item's settings once assigned (`colour`), so nothing reshuffles when another item leaves.
- Out of rotation, retired, unassigned and "Other" in charts → `--gear-other`.
- More than 7 in rotation: charts colour the 7 with the most km in the period, the rest grouped as "Other".
- Colour is never the only identifier: every coloured mark sits next to a name or avatar. Never use a gear colour for anything else.
- Tints: avatar background `linear-gradient(135deg, <gear>38, <gear>1A)` (22% → 10% alpha), initials in `--gear-n-ink`. Selected pill: border `1.5px solid <gear>`, background `<gear>1F` (12%).

### 4.3 Typography

Fonts: **Inter** (400/500/600) for all UI, **Instrument Serif** only for the wordmark "Kilometr".

```css
:root {
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-serif: "Instrument Serif", Georgia, serif;
}
body { font-family: var(--font-sans); font-variant-numeric: tabular-nums; color: var(--ink); }
```

| Style | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| wordmark | 30/34 (40/44 on Start) | 400 serif | 0 | "Kilometr" in sidebar |
| kpi-xl | 40/46 | 400 | -0.02em | wear number on Shoe detail |
| kpi | 34/40 (Overview), 30/36 (Shoe) | 400 | -0.02em | KPI card values |
| title | 30/36 | 500 | -0.02em | page titles; second part in 400 `--ink-muted` ("142 km *run in November*") |
| card-number | 22/28 | 400 | -0.02em | km on gear cards, modal |
| heading | 18/24 | 500 | 0 | section/card titles |
| heading-sm | 16/22 | 500 | 0 | gear names, bike name |
| nav | 15/38 row | 400, active 500 | 0 | main nav |
| body | 14/20 | 400 | 0 | text, buttons, KPI labels and sublines |
| caption | 13/18 | 400 | 0 | meta, sidebar section labels, km in nav |
| small | 12/16 | 400–500 | 0 | chart labels, chips |

Weights: 400 for big numbers and body, 500 for titles, headings, active states and buttons. 600 only for avatar initials. Nothing heavier.

### 4.4 Spacing, radii, shadows

4px grid.

```css
:root {
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;

  --radius-nav: 10px;    /* nav rows */
  --radius-control: 12px;/* buttons, inputs, selects */
  --radius-tile: 14px;   /* KPI cards, banners, drop zone, stat blocks */
  --radius-card: 18px;   /* content panel, gear/chart cards, modal */
  --radius-pill: 999px;  /* avatars, filter pills, chips, bars, toggle */
  --radius-bar-seg: 6px; /* chart bars */

  --shadow-panel: 0 0 0 1px rgba(16,24,40,.04), 0 1px 2px rgba(16,24,40,.04), 0 8px 28px rgba(16,24,40,.06);
  --shadow-float: 0 0 0 1px rgba(16,24,40,.06), 0 8px 28px rgba(16,24,40,.08);  /* sticky bars */
  --shadow-modal: 0 0 0 1px rgba(16,24,40,.04), 0 2px 4px rgba(16,24,40,.06), 0 24px 56px rgba(16,24,40,.22);
  --scrim: rgba(23, 25, 28, 0.36);
}
```

Layout: sidebar ~250px (padding 24/14/18, gap 26 between groups). Content panel `margin: 10px`, `padding: 40px 44px`, `--radius-card`, `--shadow-panel`, no border, gap 30 between sections. Cards inside have a 1px border, no shadow. Fluid layout: grids with `auto-fit/auto-fill minmax()`, wraps at narrow widths.

### 4.5 Components

- **Sidebar nav row:** 38px, padding 0 12, radius 10, icon 17px + label 15px. Active: `rgba(23,25,28,.07)` background, weight 500, icon `--ink`. Activities row shows a 7px `--warn` dot when runs lack shoes.
- **Sidebar gear row:** 34px, colour square 9×9 radius 3, name (ellipsis), km right in 13px `--ink-muted`. Section label 13px `--ink-muted`. "Show all 18" as a text button.
- **Sidebar footer:** "Dark mode" row with a switch (34×20 track, 16px knob, on = `--accent`), sync status (7px moss dot with a 3px soft ring, "Synced 12 min ago"), Settings.
- **Button:** height 40 (44 for main CTA), padding 0 16, radius 12, 14px. Primary: `--accent` bg, white, 500. Secondary: white bg, 1px `--line`.
- **Filter pill:** height 36, radius pill, 1px `--line`; selected 1.5px `--ink` border, 500; count in `--ink-muted`.
- **Select / period dropdown:** height 40, radius 12, 1px `--line`, label + double chevron icon (up/down, 12×14, stroke 1.4).
- **Month switcher:** segmented box 40px, radius 12, ‹ month ›.
- **KPI card:** padding 20/22, 1px `--line` border, radius 14, gap 10: label 14 `--ink-muted` → value (kpi) → 1px `--line-soft` rule → subline 14 `--ink-muted`. Grid `minmax(200px,1fr)`, gap 12. Every number has one subline that explains it.
- **Wear bar:** 8px pill on `--track`; fill `linear-gradient(90deg, <colour>99, <colour>)`. Always the gear's own colour, the same as its avatar and sidebar square (Konrad's call: colour = identity, not state). Wear state lives in the status chip and the words ("Nearly done", "Over limit"), not in the bar.
- **Status chip:** pill, 12–13px 500, line-height 22–26. Neutral `#F2F3F5` / `--ink-muted`, warn `--warn-soft` / `--warn-ink`.
- **Gear avatar:** circle, 44px on cards, 76px in the detail header, 56px in the modal. Up to 4 chars: brand initial + model initials + model number (Hoka Speedgoat 5 → HS5, Nike Pegasus 41 → NP41, Saucony Endorphin Speed 4 → SES4, Salomon Genesis → SG). 14px initials (12px for 4 chars), 600. Camera badge (20–28px white circle, ring) when there's no photo / to change it.
- **Gear card:** padding 20, 1px `--line-soft`, radius 18, gap 18. Avatar + name (2 lines reserved) + caption (nickname · terrain); km "736 / 800 km" + chip; wear bar; "64 km left" + "0.81 PLN per km" (or "Add price" link in accent).
- **Chart card:** padding 24, 1px `--line-soft`, radius 18. Bars radius 6, stacked segments with 3px gap, gridlines `--grid`, baseline `--line`, labels 12px `--ink-muted`, legend with 9px squares. Always an `aria-label` describing the chart.
- **Banner (warn):** padding 14/18, radius 14, `rgba(168,89,11,.08)`, 8px dot, text 14, link in `--warn-ink` 500. Keep for things that need action now; rare, low-stakes issues get a quiet inline note (6px warn dot, 13px muted text, action in `--warn-ink`).
- **Shoe pill (radio):** height 36, radius pill, colour square + name; selected 1.5px gear border + 12% gear tint + 500; suggested 1px dashed gear border + "suggested" hint.
- **Sticky action bar:** radius 18, white, `--shadow-float`, status + progress bar (moss) + primary CTA.
- **Modal:** width 500, padding 28, radius 18, `--shadow-modal`, scrim `--scrim`; gap 22.
- **Option row (checkbox):** padding 14/16, 1px `--line-soft`, radius 14, title 500 + caption.
- **Drop zone:** 1.5px dashed `#D5D8DE`, radius 14, `--surface-sunken`, 44px white circle with upload icon.
- **Icons:** thin stroke 1.3–1.5px, round caps/joins, 16–18px, `--ink-muted` (active `--ink`/accent). No filled icons, no emoji.

### 4.6 Content rules

- Plain, short, sentence case: "736 of 800 km", "64 km left", "0.81 PLN per km".
- Polish: same tone, real plural forms (1 bieg, 3 biegi, 7 biegów), decimal comma and "zł" ("0,81 zł za km"), „low-high” quotes around nicknames, locative months ("w listopadzie").
- Gear named like Strava (brand + model), the user's nickname under it in quotes.
- No motivational fluff, no emoji.

### 4.7 Accessibility

Real `<button>`, `<a>`, `<input>` + `<label>`; switch as `role="switch"`; shoe choice as `radiogroup`; `aria-label` on icon-only buttons and charts; text contrast ≥ 4.5:1 (`--ink-muted` passes on surface and canvas); touch targets ≥ 36–44px; visible focus ring in `--accent`.

---

## 5. Working with Konrad

- Communicates in Polish and English; UI copy exists in both (`src/i18n/en.ts`, `src/i18n/pl.ts`). Every new string goes into both files; TypeScript fails the build if Polish is missing one.
- Plan first: summarise what you're going to do before doing it.
- Warn when a session is getting long and suggest a handoff.
- Keep the repo presentable: README with screenshots, MIT licence, clear structure; it's a portfolio piece.
- Sample data in mockups: Hoka Speedgoat 5 ("Mud ones", trail, 736/800 km, 599 PLN), Nike Pegasus 41 (412/700, 549 PLN), Saucony Endorphin Speed 4 ("Race day", 188/600, 799 PLN), Salomon Genesis (64/800, no price), bike Canyon Grail CF SL (3 214 km; chain 1 840/3 000, brake pads 120 km left).
