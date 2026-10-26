(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  // Activity kinds: the `k` value of a stop -> chip label. Each kind has its own colour.
  // New kinds can be added whenever a stop fits none of these (for example a theatre, a beach, a stadium).
  // To add one: add it here, add `--<kind>` and `--<kind>-bg` colours to the :root block in
  // assets/style.css plus a `.k-<kind>` rule, list it in README.md, and bump the ?v= / CACHE versions.
  var KIND = {
    walk: "Walk", eat: "Eat", view: "View", market: "Market",
    landmark: "Landmark", museum: "Museum", palace: "Palace", church: "Church",
    park: "Park", spa: "Spa", bar: "Bar", zoo: "Zoo",
    home: "Stay", transit: "Transit", party: "Party", shop: "Shop"
  };
  function kcol(k) { return KIND[k] ? "var(--" + k + ")" : "var(--stone)"; }   // unknown kinds fall back to grey
  var app = document.getElementById("app");

  // ---------- helpers ----------
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function sv(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  // Google links (photos and maps) all open in one named tab, so tapping many of them does not pile up new tabs
  // (Safari on iPhone opens a new tab for every target="_blank"). A named tab needs window.opener to be found
  // again, so these links have no rel="noopener"; that is only for Google. Other links open a new tab.
  function tabFor(href) {
    return /^https:\/\/(www\.google\.com\/(search\?|maps)|maps\.google\.com\/)/.test(href) ? "google" : null;
  }
  function link(href, label, cls) {
    var a = el("a", cls || "map", label), t = tabFor(href); a.href = href;
    if (t) a.target = t; else { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function fallback(text) {   // copy without the Clipboard API (older browsers, plain http)
    var t = el("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} t.remove(); return ok;
  }
  function iconSvg(d) {
    var svg = sv("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
    var path = sv("path", { d: d }); svg.appendChild(path); return svg;
  }

  // ---------- install as an app ----------
  // The install button shows only where it can install in one tap:
  // - Chrome, Edge, Samsung Internet, Opera (Android, Windows, macOS, Linux, ChromeOS) fire beforeinstallprompt,
  //   and the button opens the browser's own install dialog;
  // - on iPhone and iPad it opens the share sheet, which has "Add to Home Screen".
  // Elsewhere (Firefox, Safari on Mac) there is no way to install from the page, so the button stays hidden.
  var installEvt = null;
  function isApp() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  function isIOS() { var ua = navigator.userAgent; return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); }
  function canInstall() { return !isApp() && (installEvt || (isIOS() && navigator.share)); }
  function refreshInstall() {
    var box = document.querySelector(".hbtns"); if (!box) return;
    var b = box.querySelector(".install");
    if (canInstall() && !b) box.insertBefore(installButton(), box.firstChild);
    if (!canInstall() && b) b.remove();
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvt = e; refreshInstall(); });
  window.addEventListener("appinstalled", function () { installEvt = null; refreshInstall(); });
  function installButton() {
    var b = el("button", "icon-btn install"); b.type = "button"; b.title = "Install the app"; b.setAttribute("aria-label", "Install the app");
    b.appendChild(iconSvg("M12 4v11M7 10l5 5 5-5M5 20h14"));
    b.addEventListener("click", function () {
      if (installEvt) {
        var e = installEvt; installEvt = null;
        e.prompt(); e.userChoice.then(refreshInstall, refreshInstall);
      } else if (isIOS() && navigator.share) {
        navigator.share({ title: "Traveling", url: location.origin + location.pathname }).catch(function () {});
      }
    });
    return b;
  }

  // Icon button (top right of the home page) that copies the site link, without a city, ready to send.
  var ICON_LINK = "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7";
  var ICON_OK = "M5 12.5l4.5 4.5L19 7.5";
  function copyButton() {
    var b = el("button", "icon-btn"); b.type = "button"; b.title = "Copy link"; b.setAttribute("aria-label", "Copy link");
    var svg = iconSvg(ICON_LINK), path = svg.firstChild; b.appendChild(svg);
    b.addEventListener("click", function () {
      var url = location.origin + location.pathname;
      function done(ok) {
        if (!ok) { window.prompt("Copy this link:", url); return; }
        path.setAttribute("d", ICON_OK); b.setAttribute("aria-label", "Link copied"); b.classList.add("ok");
        setTimeout(function () { path.setAttribute("d", ICON_LINK); b.setAttribute("aria-label", "Copy link"); b.classList.remove("ok"); }, 2000);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(fallback(url)); });
      else done(fallback(url));
    });
    return b;
  }
  function hh(t) { var p = t.split(":"); return +p[0] + (+p[1]) / 60; }
  function mapUrl(q, id) { var u = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); if (id) u += "&query_place_id=" + id; return u; }
  function center(p) { if (p.opts) { var la = 0, lo = 0; p.opts.forEach(function (o) { la += o.ll[0]; lo += o.ll[1]; }); return [la / p.opts.length, lo / p.opts.length]; } return p.ll; }

  // Data is fetched only when needed: the city list is small, each city is its own file.
  // The last seen copy lives in localStorage and renders instantly, then is refreshed in the background.
  function load(path, cacheKey, cb, fail) {
    var cached = store(cacheKey), shown = false;
    if (cached) { try { cb(JSON.parse(cached), true); shown = true; } catch (e) { store(cacheKey, null); } }
    fetch(path, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) { if (txt !== cached) { store(cacheKey, txt); cb(JSON.parse(txt), false); } })
      .catch(function () { if (!shown) fail(); });
  }

  // ---------- home page ----------
  function home(note) {
    app.replaceChildren();
    var h = el("header"), row = el("div", "hrow");
    var btns = el("div", "hbtns"); if (canInstall()) btns.appendChild(installButton()); btns.appendChild(copyButton());
    row.appendChild(el("h1", null, "Where to next")); row.appendChild(btns); h.appendChild(row);
    h.appendChild(el("p", "lead", note || "Pick a city. Next time the app opens straight into it."));
    app.appendChild(h);
    var box = el("div"); box.appendChild(el("p", "note", "Loading…")); app.appendChild(box);
    load("data/cities.json", "cities", function (list) {
      var ul = el("ul", "cities");
      list.forEach(function (c) {
        var li = el("li"), a = el("a", "city" + (c.ready ? "" : " soon"));
        a.href = "#/" + c.id;
        var hd = el("div", "head");
        if (c.flag && /^[a-z]{2}$/.test(c.flag)) { var f = el("img", "flag"); f.src = "assets/flags/" + c.flag + ".svg"; f.alt = ""; hd.appendChild(f); }
        var nm = el("div"); nm.appendChild(el("strong", null, c.name)); nm.appendChild(el("span", null, c.country)); hd.appendChild(nm);
        a.appendChild(hd);
        var tg = el("div", "tags");
        (c.ready ? c.tags || [] : ["Coming soon"]).forEach(function (t) { tg.appendChild(el("span", "tag", t)); });
        a.appendChild(tg);
        li.appendChild(a); ul.appendChild(li);
      });
      box.replaceChildren(ul);
    }, function () { box.replaceChildren(el("p", "empty", "Could not load the cities. Check your connection and try again.")); });
  }

  // ---------- map for one day ----------
  // The leg after a stop is ridden when the stop is a `transit` stop or its `go` is not on foot.
  function ridden(p) { return p.k === "transit" || !!(p.go && p.go.m !== "walk"); }
  function drawMap(C, D) {
    var pts = D.stops.map(center), all = pts.slice();
    D.stops.forEach(function (p) { (p.opts || []).forEach(function (o) { all.push(o.ll); }); });
    var la = all.map(function (a) { return a[0]; }), lo = all.map(function (a) { return a[1]; });
    var laMin = Math.min.apply(0, la), laMax = Math.max.apply(0, la), loMin = Math.min.apply(0, lo), loMax = Math.max.apply(0, lo);
    var mx = 111320 * Math.cos(C.lat * Math.PI / 180), my = 110574, W = 360, H = 250, M = 30;
    var dx = Math.max((loMax - loMin) * mx, 300), dy = Math.max((laMax - laMin) * my, 300);
    var sc = Math.min((W - 2 * M) / dx, (H - 2 * M) / dy);
    var ox = (W - (loMax - loMin) * mx * sc) / 2, oy = (H - (laMax - laMin) * my * sc) / 2;
    function X(l) { return ox + (l - loMin) * mx * sc; }
    function Y(l) { return oy + (laMax - l) * my * sc; }
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Schematic map of the day's route with numbered stops" });
    svg.appendChild(sv("rect", { width: W, height: H, fill: "var(--stone-bg)" }));
    if (C.river && C.river.length > 1) svg.appendChild(sv("polyline", { points: C.river.map(function (r) { return X(r[0]).toFixed(1) + "," + Y(r[1]).toFixed(1); }).join(" "), fill: "none", stroke: "var(--water)", "stroke-width": 16, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    // Walked legs are a dashed line; ridden legs (tram, taxi, plane) a faint dotted one.
    for (var j = 1; j < pts.length; j++) {
      var rd = ridden(D.stops[j - 1]);
      svg.appendChild(sv("line", { x1: X(pts[j - 1][1]).toFixed(1), y1: Y(pts[j - 1][0]).toFixed(1), x2: X(pts[j][1]).toFixed(1), y2: Y(pts[j][0]).toFixed(1), stroke: "var(--ink)", "stroke-opacity": rd ? ".3" : ".45", "stroke-width": 2, "stroke-dasharray": rd ? "1 6" : "5 4", "stroke-linecap": "round" }));
    }
    D.stops.forEach(function (p) { (p.opts || []).forEach(function (o) { svg.appendChild(sv("circle", { cx: X(o.ll[1]).toFixed(1), cy: Y(o.ll[0]).toFixed(1), r: 3.5, fill: "var(--lantern)", stroke: "var(--card)", "stroke-width": 1.5 })); }); });
    pts.forEach(function (p, i) {
      var g = sv("g", {});
      g.appendChild(sv("circle", { cx: X(p[1]).toFixed(1), cy: Y(p[0]).toFixed(1), r: 11, fill: kcol(D.stops[i].k), stroke: "var(--card)", "stroke-width": 2 }));
      var t = sv("text", { x: X(p[1]).toFixed(1), y: (Y(p[0]) + 4).toFixed(1), "text-anchor": "middle", "font-size": 12, "font-weight": 500, "font-family": "JetBrains Mono, monospace", fill: "var(--card)" });
      t.textContent = String(i + 1); g.appendChild(t); svg.appendChild(g);
    });
    // Distances of the day, shown bottom left instead of a scale bar: on foot (with steps) and by tram, bus or taxi.
    // The straight lines between stops are shorter than real streets, so both are multiplied by 1.3 (a typical
    // street factor); a step is 0.75 m. A ridden leg (see ridden()) counts as transport; flights are left out.
    var meters = 0, rode = 0;
    for (var k = 1; k < pts.length; k++) {
      var prev = D.stops[k - 1], ddx = (pts[k][1] - pts[k - 1][1]) * mx, ddy = (pts[k][0] - pts[k - 1][0]) * my, m = Math.sqrt(ddx * ddx + ddy * ddy);
      if (!ridden(prev)) meters += m; else if (!(prev.go && prev.go.m === "plane")) rode += m;
    }
    meters *= 1.3; rode *= 1.3;
    var steps = String(Math.round(meters / 0.75 / 100) * 100).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var lines = ["Walk ≈ " + (meters / 1000).toFixed(1) + " km · ≈ " + steps + " steps"];
    if (rode >= 100) lines.push("Ride ≈ " + (rode / 1000).toFixed(1) + " km by tram or taxi");
    var lw = Math.max.apply(0, lines.map(function (l) { return l.length; }));
    svg.appendChild(sv("rect", { x: 6, y: H - 15 - 16 * lines.length, width: Math.round(lw * 6.9 + 12), height: 6 + 16 * lines.length, rx: 6, fill: "var(--card)", "fill-opacity": ".85" }));
    lines.forEach(function (l, i) {
      var bt = sv("text", { x: 12, y: H - 16 - 16 * (lines.length - 1 - i), "font-size": 11, "font-family": "JetBrains Mono, monospace", fill: i ? "var(--muted)" : "var(--ink)" }); bt.textContent = l; svg.appendChild(bt);
    });
    var nt = sv("text", { x: W - 14, y: 20, "text-anchor": "end", "font-size": 11, "font-family": "JetBrains Mono, monospace", fill: "var(--muted)" }); nt.textContent = "N ↑"; svg.appendChild(nt);
    return svg;
  }
  var ICON_HOME = "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10";
  function stayUrl(S) { return "https://www.google.com/maps/dir/?api=1&destination=" + (S.q ? encodeURIComponent(S.q) : S.ll[0] + "," + S.ll[1]); }
  function dirUrl(D) {
    var c = D.stops.map(function (p) { var x = center(p); return x[0].toFixed(5) + "," + x[1].toFixed(5); });
    var u = "https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=" + c[0] + "&destination=" + c[c.length - 1];
    if (c.length > 2) u += "&waypoints=" + c.slice(1, -1).join("%7C");
    return u;
  }

  // ---------- currency converter ----------
  // One thin row under the facts when the city's currency is not the euro. It converts to euro by default; the swap
  // button flips it. The rate is the ECB reference rate from api.frankfurter.dev, kept in localStorage for 6 hours.
  // `currency.rate` in the city file (local units per 1 euro) is only the fallback when no rate has loaded yet.
  var SWAP = "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4";
  function fmt(n, dec) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n); }
  function fxRow(C) {
    var cur = C.currency; if (!cur || !cur.code || cur.code === "EUR" || !(cur.rate > 0)) return null;
    var key = "fx:" + cur.code, rate = cur.rate, live = false, toEur = true, amt = cur.sample || 100, EURO_AMT = 10;
    try { var c = JSON.parse(store(key)); if (c && c.r > 0) { rate = c.r; live = true; } } catch (e) {}
    var row = el("div", "fx");
    var inp = el("input"); inp.type = "text"; inp.inputMode = "decimal"; inp.value = String(amt);
    var unit = el("span", "unit"), sw = el("button", "icon-btn"), out = el("output"), note = el("small");
    sw.type = "button"; sw.title = "Swap direction"; sw.setAttribute("aria-label", "Swap direction"); sw.appendChild(iconSvg(SWAP));
    out.setAttribute("aria-live", "polite");
    [inp, unit, sw, out, note].forEach(function (n) { row.appendChild(n); });
    function draw() {
      var v = parseFloat(String(inp.value).replace(",", ".")), ok = isFinite(v);
      inp.setAttribute("aria-label", "Amount in " + (toEur ? cur.code : "euro"));
      unit.textContent = toEur ? cur.code : "€";
      if (!ok) out.textContent = "–";
      else if (toEur) { var e = v / rate; out.textContent = "€ " + fmt(e, e < 100 ? 2 : 0); }
      else out.textContent = fmt(v * rate, rate < 10 ? 2 : 0) + " " + cur.code;
      note.textContent = "1 € = " + fmt(rate, rate < 10 ? 2 : rate < 100 ? 1 : 0) + " " + cur.code;
      note.title = live ? "ECB reference rate" : "Approximate rate; the live rate could not be loaded";
      if (!live) note.textContent = "≈ " + note.textContent;
    }
    inp.addEventListener("input", draw);
    inp.addEventListener("focus", function () { inp.select(); });
    sw.addEventListener("click", function () { toEur = !toEur; inp.value = String(toEur ? (cur.sample || 100) : EURO_AMT); draw(); });
    draw();
    var stale = true; try { var c2 = JSON.parse(store(key)); stale = !(c2 && Date.now() - c2.t < 6 * 3600 * 1000); } catch (e) {}
    if (stale && window.fetch) {
      fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=" + encodeURIComponent(cur.code))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { var r = j && j.rates && j.rates[cur.code]; if (r > 0) { rate = r; live = true; store(key, JSON.stringify({ r: r, t: Date.now() })); draw(); } })
        .catch(function () {});
    }
    return row;
  }

  // ---------- city page ----------
  // Two views of a city: the overview (#/<city>) lists the days, and each day has its own page (#/<city>/<day>).
  var shown = null;   // the view on screen, so a background refresh of the same view keeps the scroll position
  function city(C, dayId) {
    var D = null; (C.days || []).forEach(function (x) { if (x.id === dayId) D = x; });
    var view = C.id + "/" + (D ? D.id : ""), y = view === shown ? window.scrollY : 0;
    shown = view;
    app.replaceChildren();
    document.title = D ? D.n + " · " + (C.title || C.name) : C.title || C.name;
    var stayLabel = (C.stay && C.stay.label) || KIND.home;   // e.g. "Airbnb" or "Hotel" instead of "Stay"
    var top = el("div", "top"), bk = el("a", "back", D ? "← " + C.name : "← Cities"); bk.href = D ? "#/" + C.id : "#/cities"; top.appendChild(bk); app.appendChild(top);
    if (D) day(C, D, stayLabel); else overview(C, stayLabel);
    if (C.note) app.appendChild(el("p", "note", C.note));
    window.scrollTo(0, y);
  }

  function overview(C, stayLabel) {
    var h = el("header"); h.appendChild(el("h1", null, C.title || C.name));
    if (C.lead) h.appendChild(el("p", "lead", C.lead));
    if (C.stay) {
      // Where the group sleeps: the listing and directions to it. Every day's route starts there.
      var st = el("p", "stay"); st.appendChild(el("b", null, stayLabel));
      st.appendChild(el("span", null, C.stay.name));
      var sl = el("span", "links");
      if (C.stay.url) sl.appendChild(link(C.stay.url, "Listing →"));
      sl.appendChild(link(stayUrl(C.stay), "Directions →"));
      st.appendChild(sl); h.appendChild(st);
    }
    app.appendChild(h);
    if (!C.days || !C.days.length) { app.appendChild(el("p", "empty", "There is no itinerary here yet. Coming soon.")); return; }
    if (C.facts && C.facts.length) {
      // Collapsed by default, so the page opens straight on the days.
      var f = el("details", "facts"); f.appendChild(el("summary", null, "Good to know"));
      var rows = el("div", "rows");
      C.facts.forEach(function (x) { var r = el("div"); r.appendChild(el("b", null, x[0])); r.appendChild(el("span", null, x[1])); rows.appendChild(r); });
      f.appendChild(rows); app.appendChild(f);
    }
    var fx = fxRow(C); if (fx) app.appendChild(fx);
    // One card per day; each opens the day's own page.
    var ul = el("ul", "daylist");
    C.days.forEach(function (D) {
      var li = el("li"), a = el("a", "daycard"); a.href = "#/" + C.id + "/" + D.id;
      var hd = el("div", "dhead"); hd.appendChild(el("span", "eyebrow", D.n)); hd.appendChild(el("span", "count", D.stops.length + " stops")); a.appendChild(hd);
      a.appendChild(el("strong", null, D.title));
      if (D.theme) a.appendChild(el("span", "theme", D.theme));
      var dots = el("span", "dots"); dots.setAttribute("aria-hidden", "true");
      D.stops.forEach(function (p) { var d = el("i"); d.style.background = kcol(p.k); dots.appendChild(d); });
      a.appendChild(dots);
      li.appendChild(a); ul.appendChild(li);
    });
    app.appendChild(ul);
  }

  var MODE = { tram: "Tram", bus: "Bus", taxi: "Taxi", train: "Train", walk: "Walk", plane: "Plane", ride: "Ride" };   // ride: any of several, the note says which
  function day(C, D, stayLabel) {
    var i0 = C.days.indexOf(D);
    // Day bar: the stay, then every day; the current day is marked.
    var nav = el("nav", "days"); nav.setAttribute("aria-label", "Days");
    if (C.days.length > 4 || C.stay) nav.classList.add("scroll");   // many days: a sideways slider
    else nav.style.setProperty("--n", C.days.length);
    if (C.stay) { var hm = link(stayUrl(C.stay), stayLabel, "home"); hm.title = "Directions to " + stayLabel.toLowerCase(); hm.insertBefore(iconSvg(ICON_HOME), hm.firstChild); nav.appendChild(hm); }
    var curA = null;
    C.days.forEach(function (x) { var a = el("a", null, x.n); a.href = "#/" + C.id + "/" + x.id; if (x === D) { a.setAttribute("aria-current", "page"); curA = a; } nav.appendChild(a); });
    app.appendChild(nav);
    var T0 = C.hours[0], T1 = C.hours[1];
    function pct(x) { return Math.max(0, Math.min(100, (x - T0) / (T1 - T0) * 100)); }
    function hx(t) { var x = hh(t); return x < T0 ? x + 24 : x; }   // after midnight (02:00) goes to the end of the bar
    function photoUrl(q) { return "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q.split(" " + C.en)[0] + " " + C.local); }
    var s = el("section", "day"); s.id = D.id;
    s.appendChild(el("div", "eyebrow", D.n)); s.appendChild(el("h1", null, D.title)); s.appendChild(el("p", "theme", D.theme));
    var mb = el("div", "mapbox"); mb.appendChild(drawMap(C, D));
    var mf = el("div", "mapfoot"); mf.appendChild(el("small", null, "Numbers are the stops below. Orange dots are places to eat or drink. Dotted lines are rides. Walk and ride distances are estimates."));
    mf.appendChild(link(dirUrl(D), "Open route", "dir")); mb.appendChild(mf); s.appendChild(mb);
    var tr = el("div", "track"); tr.setAttribute("role", "img"); tr.setAttribute("aria-label", "Stop times against daylight");
    var sb = el("div", "sunbar"); sb.style.left = pct(C.sun[0]) + "%"; sb.style.width = (pct(C.sun[1]) - pct(C.sun[0])) + "%"; tr.appendChild(sb);
    D.stops.forEach(function (p) { var t = el("div", "tick"); t.style.left = pct(hx(p.t)) + "%"; t.style.background = kcol(p.k); tr.appendChild(t); });
    s.appendChild(tr);
    var lb = el("div", "tracklabel"); for (var t = T0; t <= T1; t += 4) lb.appendChild(el("span", null, (t < 10 ? "0" : "") + t + ":00")); s.appendChild(lb);
    var list = el("div", "stops");
    D.stops.forEach(function (p, i) {
      var r = el("div", "stop"), lt = el("div", "lt"), n = el("div", "num", String(i + 1));
      n.style.background = kcol(p.k); lt.appendChild(n); lt.appendChild(el("div", "time", p.t)); r.appendChild(lt);
      var b = el("div"); b.appendChild(el("span", "chip k-" + (KIND[p.k] ? p.k : "walk"), p.k === "home" ? stayLabel : KIND[p.k] || p.k)); b.appendChild(el("h3", null, p.name)); if (p.d) b.appendChild(el("p", null, p.d));
      if (p.opts) {
        var u = el("ul", "opts");
        p.opts.forEach(function (o) {
          var li = el("li"); li.appendChild(el("b", null, o.n)); li.appendChild(el("span", null, o.s));
          var ln = el("div", "links"); ln.appendChild(link(mapUrl(o.q, o.id), "Map →")); ln.appendChild(link(photoUrl(o.q), "Photos →")); li.appendChild(ln); u.appendChild(li);
        });
        b.appendChild(u);
      } else {
        var ln2 = el("div", "links"); ln2.style.marginTop = "6px";
        ln2.appendChild(link(mapUrl(p.q, p.id), "Map →")); ln2.appendChild(link(photoUrl(p.q), "Photos →")); b.appendChild(ln2);
      }
      if (p.b) {   // indoor alternative for an outdoor stop, if it rains
        var pb = el("div", "planb"); pb.appendChild(el("small", null, "Plan B if it rains"));
        pb.appendChild(el("b", null, p.b.name)); if (p.b.d) pb.appendChild(el("span", null, p.b.d));
        if (p.b.q) { var ln3 = el("div", "links"); ln3.appendChild(link(mapUrl(p.b.q, p.b.id), "Map →")); ln3.appendChild(link(photoUrl(p.b.q), "Photos →")); pb.appendChild(ln3); }
        b.appendChild(pb);
      }
      r.appendChild(b); list.appendChild(r);
      if (p.go && i < D.stops.length - 1) {   // how to get to the next stop: line, time, where to get off
        var g = el("div", "go"), gl = el("div", "lt"); gl.appendChild(el("span", "mode", MODE[p.go.m] || p.go.m)); g.appendChild(gl);
        var gb = el("div"), gh = el("p", "how"); gh.appendChild(el("b", null, p.go.by)); if (p.go.time) gh.appendChild(el("span", null, " · " + p.go.time)); gb.appendChild(gh);
        if (p.go.d) gb.appendChild(el("p", null, p.go.d));
        g.appendChild(gb); list.appendChild(g);
      }
    });
    s.appendChild(list); app.appendChild(s);
    // Previous and next day, and back to the overview.
    var pg = el("nav", "pager"); pg.setAttribute("aria-label", "Other days");
    var pv = C.days[i0 - 1], nx = C.days[i0 + 1];
    var pa = el("a", "prev", pv ? "← " + pv.n : "← All days"); pa.href = "#/" + C.id + (pv ? "/" + pv.id : ""); pg.appendChild(pa);
    var na = el("a", "next", nx ? nx.n + " →" : "All days →"); na.href = "#/" + C.id + (nx ? "/" + nx.id : ""); pg.appendChild(na);
    app.appendChild(pg);
    if (curA) requestAnimationFrame(function () { nav.scrollLeft = Math.max(0, curA.offsetLeft - nav.offsetLeft - 8); });
  }

  // ---------- routing ----------
  // #/cities: home; #/<city>: the city's days; #/<city>/<day>: one day. No hash: the last city, otherwise home.
  var cur = null;
  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/"), id = parts[0], dayId = parts[1] || "";
    document.title = "Traveling";
    if (id === "") {                       // opened without a choice: last city, otherwise home
      var last = store("lastCity");
      if (last) { location.replace("#/" + last); return; }
      shown = null; home(); return;
    }
    if (id === "cities" || !/^[a-z0-9-]+$/.test(id) || !/^[a-z0-9-]*$/.test(dayId)) { shown = null; home(); window.scrollTo(0, 0); return; }   // the back link always shows all cities
    var key = id + "/" + dayId; cur = key;
    if (!shown || shown.split("/")[0] !== id) app.replaceChildren(el("p", "note", "Loading…"));
    load("data/" + id + ".json", "city:" + id, function (C) {
      if (cur !== key) return;
      store("lastCity", id);
      C.id = C.id || id;
      city(C, dayId);
    }, function () {
      if (store("lastCity") === id) store("lastCity", null);
      shown = null; home("This city did not load. Pick another or try again.");
    });
  }
  window.addEventListener("hashchange", route);
  route();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
})();
