# Traveling

A small static website with day-by-day city itineraries. Each city has a three-day plan with a numbered route map, an "Open route" walking link, and three food options at every meal stop. The site is plain HTML, CSS and JavaScript: no framework, no build step, no backend.

Live site (after you enable Pages): `https://<your-github-username>.github.io/traveling/`

## What it does

- **Home page** lists every city. It loads only one small file, `data/cities.json`.
- **City page** loads only that city's file, `data/<city>.json`, when you open it.
- **Remembers your city.** The last city you opened is stored in the browser. Opening the site again goes straight to it, so you never download or render the other cities.
- **Back to all cities.** The "← Cities" button always shows the full list.
- **Cache cleared?** If browser data is cleared, the home page is shown again.
- **Fast on repeat visits.** A city renders instantly from the stored copy, then refreshes in the background. A service worker also keeps the app available offline once it has been opened.
- **Empty cities are fine.** A city with no days shows "Coming soon" instead of an error.

## How loading works

1. `index.html` loads `assets/style.css` and `assets/app.js`.
2. `app.js` reads the URL hash:
   - empty hash: open the remembered city if there is one, otherwise show the home page
   - `#/cities`: show the home page (used by the back button)
   - `#/<id>`: show that city (for example `#/prague`)
3. For a city, the app first shows the copy stored in `localStorage` (key `city:<id>`), then fetches `data/<id>.json` with `no-cache`. If the file changed, the stored copy and the page are updated.
4. The remembered city is stored under the key `lastCity`. It is saved only after a city has loaded successfully, and removed if that city fails to load.
5. `sw.js` caches the shell and data files for offline use (stale-while-revalidate).

## Project layout

```
index.html              app shell
assets/style.css        styles (dark theme only)
assets/app.js           routing, rendering, map drawing
assets/flags/           country flags for the home page
assets/icons/           app icon and favicon (SVG sources and PNGs)
manifest.webmanifest    makes the site installable as an app
sw.js                   offline cache
data/cities.json        list shown on the home page
data/prague.json        full itinerary for Prague
data/budapest.json      full itinerary for Budapest
data/krakow.json        full itinerary for Kraków (six days, New Year)
.github/workflows/      GitHub Pages deployment
CLAUDE.md               guide for Claude Code sessions in this repo
```

## City data format

`data/<id>.json` has these fields:

| Field | Meaning |
|---|---|
| `id`, `name`, `title`, `lead` | identity and page heading text |
| `en`, `local` | English and local name, used to build photo-search links |
| `lat` | city latitude, used to draw the map without distortion |
| `hours` | `[start, end]` hours shown on the daylight bar |
| `sun` | `[sunrise, sunset]` as decimal hours, for the daylight bar |
| `facts` | list of `[label, text]` shown in the "Good to know" box, which is collapsed by default |
| `currency` | `{code, rate, sample}`: ISO code, fallback rate in local units per 1 euro, and the sample amount the converter starts with. Leave it out for euro countries. The live rate comes from api.frankfurter.dev (ECB) |
| `river` | optional `[lon, lat]` points drawn as a river on the map |
| `stay` | optional `{name, url, ll}`: where the group sleeps. Shown under the lead with the listing link and directions, and as a "Stay" button at the start of the day bar that opens directions to it |
| `note` | footnote shown at the bottom |
| `days` | list of days (below) |

Each day has `id`, `n` (label), `title`, `theme` and `stops`. Each stop has `t` (time, `HH:MM`), `k` (the activity kind, see below), `name`, `d` (description), and either:

- `ll: [lat, lon]` plus `q` (search text) and optionally `id` (Google place id), or
- `opts`: three options, each with `n` (name), `s` (short description), `ll`, `q`, `id`.

An outdoor stop can have `b`, a plan B if it rains: `{name, d, ll, q}`. It is shown under the stop in a "Plan B if it rains" box.

The day `n` label is shown in the day bar. With more than four days, or with a `stay`, the bar becomes a sideways slider.

### Activity kinds

| `k` | Label | Use for |
|---|---|---|
| `walk` | Walk | a street, square, bridge or neighbourhood on foot |
| `eat` | Eat | a meal or coffee stop, always with three `opts` |
| `view` | View | a viewpoint or sunset spot |
| `market` | Market | a market hall or Christmas market |
| `landmark` | Landmark | a famous building, monument or memorial |
| `museum` | Museum | a museum or gallery |
| `palace` | Palace | a castle or palace |
| `church` | Church | a church, cathedral or basilica |
| `park` | Park | a park, garden or ice rink |
| `spa` | Spa | a thermal bath or spa |
| `bar` | Bar | a bar, pub, jazz club or ruin bar; an after-dinner stop has three `opts` like a meal |
| `zoo` | Zoo | a zoo or aquarium |
| `home` | Stay | the apartment or hotel: start and end of a day |
| `transit` | Transit | an airport, tram ride or taxi; the leg after it is ridden and not counted in the walking distance |
| `party` | Party | a New Year's Eve or other one-night event, with three `opts` to choose from |

New kinds can be added whenever a stop fits none of these. Add the kind to `KIND` in `assets/app.js`, add `--<kind>` and `--<kind>-bg` colours to the `:root` block in `assets/style.css` plus a `.k-<kind>` rule, add a row to this table, and bump the `?v=` and `CACHE` versions.

## App icon and install

The site can be installed as an app ("Add to Home Screen" on iPhone, "Install app" in Chrome and on Android). `manifest.webmanifest` describes it. The icons are in `assets/icons/`: `icon.svg` is the source, `icon-maskable.svg` keeps the drawing inside the safe zone for round Android icons, and `favicon.svg` is a simpler pin for browser tabs. The PNG files are rendered from those SVGs; re-render them if you change the drawing. The site has one theme: dark, in the browser and in the installed app.

The home page has a one-tap install button (arrow icon, top right) next to Copy link. In Chrome, Edge, Samsung Internet and Opera it opens the browser's own install dialog; on iPhone and iPad it opens the share sheet with "Add to Home Screen". Where a page cannot start an install (Firefox, Safari on Mac) the button is hidden and the browser menu is the way to install. On Android the button can work when the browser menu wrongly says the app is already installed, which happens when another app from the same domain (hristosotirov.github.io) is installed. On Xiaomi, Redmi and POCO phones Chrome needs the "Home screen shortcuts" permission.

## Adding a city

1. Add an entry to `data/cities.json`: `id`, `name`, `country`, `flag` (two-letter country code with a matching `assets/flags/<code>.svg`), `tags` (a few short words for the trip, for example `Winter`, `3 days`) and `ready`.
2. Copy `data/budapest.json` to `data/<id>.json` and fill in the fields above.
3. Commit and push to `main`. The site deploys automatically.

No other file needs to change.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

The service worker only registers on HTTPS, so it stays off locally.

## Deploy to GitHub Pages

1. Create a public repository named `traveling` and push this code to `main`.
2. In the repository open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`.

GitHub Pages is free for public repositories. Public repositories also get free GitHub Actions minutes on standard runners.

## Limits to know about

- **Maps are schematic.** They are drawn from coordinates, not from a map service, and the river is an approximation. For real street routes use the "Open route" button, which opens Google Maps with walking directions.
- **Photos.** The "Photos →" links open an image search. Photos are not embedded.
- **Opening hours, prices and dates** come from public sources and can change. Check before you go.
- **Data comes from Google Places** for names, addresses, coordinates and place ids only.
