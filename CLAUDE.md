# CLAUDE.md

Guide for Claude Code sessions (including cloud sessions) working in this repository.

## What this is

A static multi-city travel itinerary site. Plain HTML, CSS and JavaScript, no build step, no dependencies. Everything on the site is in English. The site is published with GitHub Pages from `main`.

Read `README.md` first. It explains the loading behaviour, the file layout and the city data format.

## Rules

- **Keep it static.** No frameworks, bundlers or backend. Open `index.html` through a local web server and it must work.
- **English only.** All user-facing text (UI, city data, notes, comments) is in English.
- **One city per file.** The home page may load only `data/cities.json`. A city file is fetched only when that city is opened. Do not merge cities into one file.
- **Keep the remember-last-city behaviour.** Opening the site with no hash goes to the last opened city (`localStorage` key `lastCity`). `#/cities` always shows all cities. If storage is empty, show the home page.
- **Build DOM with `textContent`**, not `innerHTML`, for anything that comes from data files.
- **Dark theme only.** There is no light mode, in the browser or in the installed app. All colours are CSS variables in the `:root` block of `assets/style.css`.
- **Keep the site installable** on every system: `manifest.webmanifest`, the icons in `assets/icons/`, the service worker, and the Apple and Windows tags in `index.html`. Keep the one-tap install button on the home page (it shows only where it can install directly); do not add written install instructions to the page.
- **Activity kinds can grow.** If a stop fits none of the existing kinds, add a new one rather than forcing it into a wrong kind. Follow the steps under "Activity kinds" in `README.md` (there is the same note above `KIND` in `assets/app.js`).
- **One page per day.** A city opens on a list of its days (`#/<city>`); each day has its own page (`#/<city>/<day>`) with a back button to the days. Keep this for every city.
- **Rides between stops.** When a stop is far from the next one (for example the hotel is out of the centre), give it a `go` with the tram line or taxi, where to get off and how long it takes (see "City data format" in `README.md`).
- **Mobile first.** The layout is a single column, max 600px, with a 16px side gutter.
- When you change `assets/app.js` or `assets/style.css`, bump the `?v=` number in `index.html` and in the `SHELL` list in `sw.js`, and bump `CACHE` in `sw.js`, so returning visitors get the new files.

## Adding a city

Follow "Adding a city" in `README.md`. Facts to research per city: sunrise and sunset for the travel month, typical weather, local holidays, currency, market or event dates. Each meal stop and each after-dinner `bar` stop needs three nearby options. Use real places and give coordinates (`ll`). Never invent places, addresses or opening hours; if something cannot be verified, say so in the stop description or leave it out.

Each day should have 7 to 10 stops with times that fit the daylight, a mix of activity kinds (`walk`, `eat`, `view`, `market`, `landmark`, `museum`, `palace`, `church`, `park`, `spa`, `bar`, `zoo`, `home`, `transit`, `party`, `shop`; see "Activity kinds" in `README.md`), and `ll` coordinates close enough that the day is walkable.

## Check your work

Before finishing any change:

1. `node --check assets/app.js`
2. Parse every JSON file in `data/` (for example `node -e "JSON.parse(require('fs').readFileSync('data/prague.json'))"`).
3. Serve locally with `python3 -m http.server 8000` and check, on a phone-width viewport:
   - the home page lists all cities
   - opening a city lists its days, and opening a day shows its map and stops on its own page
   - on a day page, "← <city>", the day bar and the previous/next buttons work
   - reloading the site opens the same city (and the same day, on a day page)
   - "← Cities" returns to the list
   - clearing site data shows the home page again
   - an empty city shows "Coming soon" without errors
4. Check there are no console errors.

## Deployment

Push to `main`. `.github/workflows/pages.yml` publishes the repository root to GitHub Pages. Do not add a build step to the workflow.

## Kickoff prompt for a new cloud session

Paste this when you start a session on this repository:

> Read CLAUDE.md and README.md. Add Budapest as a 3-day itinerary in `data/budapest.json`, following the same format as `data/prague.json`. Use the dates and daylight for December. Give three food options at every meal stop, with real places and coordinates. Update the entry in `data/cities.json` to `ready: true`. Run the checks from CLAUDE.md, then commit and push to a branch and open a pull request.
