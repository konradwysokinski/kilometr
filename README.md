# Kilometr

A local-first tracker for the kilometres on your running shoes and bikes, fed by Strava.

Kilometr does one thing: it shows **how worn each item of gear is and what it has cost per kilometre**. It is not a training analytics tool. Your data stays on your computer: no backend and no accounts.

> Screenshots coming soon.

## Status

Early work in progress.

- [x] Design tokens (light and dark), app shell, sidebar
- [x] Start screen
- [x] Overview: period switcher, KPIs, gear in rotation, kilometres by week, bike parts
- [x] Sample data and derived numbers (wear, rotation, cost per km, part counters), with tests
- [x] English and Polish (EN | PL switch in the sidebar and on Start)
- [x] Import a Strava export (.zip), saved locally in IndexedDB
- [ ] Connect Strava with your own API app (OAuth)
- [x] Shoe detail: wear, pace estimate, KPIs, terrain, kilometres per month, recent runs
- [x] Retire pair (or keep it for walks) and bring it back; saved locally
- [x] Notifications: a toast after import for runs without shoes, then a list
- [ ] Shoes, Bikes, Activities and Retired screens; line chart toggle; Edit gear
- [ ] Bike detail and service log, Edit gear, Retired, Settings

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and choose **Explore with sample data**.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build |
| `npm test` | Unit tests for the domain logic |

## How it works

- **Rotation** means gear used in the last 60 days. Each item in rotation gets one of 7 hues, and that hue follows it everywhere. Everything else is shown in granite.
- **Wear** is the item's km divided by its limit. From 85% it's marked "Nearly done", and past 100% it's "Over limit".
- **Cost per km** is the price you enter divided by the item's km.
- **Bike parts** aren't available from Strava, so you enter them in Kilometr. Each part counts the km from rides on that bike since its install date.

## Structure

```
src/
  app/          store, routing, layout
  i18n/         English and Polish copy, number and date formats
  import/       Strava export: zip reader, CSV parser, mapping to gear and activities
  components/   UI building blocks (Avatar, WearBar, GearCard, WeeklyChart, …)
  screens/      Start, Overview, Shoe detail
  domain/       types and pure calculations (gear stats, overview numbers)
  data/         sample dataset
  lib/          date and colour helpers
  styles/       design tokens and base styles
design/         reference mockups and tokens
```

## Licence

[MIT](LICENSE)
