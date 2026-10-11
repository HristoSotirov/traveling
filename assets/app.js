(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  // Activity kinds: the `k` value of a stop -> chip label. Each kind has its own colour.
  // New kinds can be added whenever a stop fits none of these (for example a theatre, a beach, a stadium).
  // To add one: add it here, add `--<kind>` and `--<kind>-bg` colours to all three theme blocks in
  // assets/style.css plus a `.k-<kind>` rule, list it in README.md, and bump the ?v= / CACHE versions.
  var KIND = {
    walk: "Walk", eat: "Eat", view: "View", market: "Market",
    landmark: "Landmark", museum: "Museum", palace: "Palace", church: "Church",
    park: "Park", spa: "Spa", bar: "Bar", zoo: "Zoo"
  };
  function kcol(k) { return KIND[k] ? "var(--" + k + ")" : "var(--stone)"; }   // unknown kinds fall back to grey
  var app = document.getElementById("app");
  // The installed app (home-screen / standalone) is always dark; in a browser tab the site follows the system theme.
  if ((window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone) {
    document.documentElement.setAttribute("data-theme", "dark");
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", "#0e1620");
  }

  // ---------- helpers ----------
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function sv(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function link(href, label, cls) { var a = el("a", cls || "map", label); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }
  function fallback(text) {   // copy without the Clipboard API (older browsers, plain http)
    var t = el("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} t.remove(); return ok;
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
    // Top-left button that copies the site link (without a city), ready to send to someone.
    var top = el("div", "top"), sh = el("button", "back", "Copy link"); sh.type = "button";
    sh.addEventListener("click", function () {
      var url = location.origin + location.pathname;
      function done(ok) { sh.textContent = ok ? "Link copied ✓" : url; setTimeout(function () { sh.textContent = "Copy link"; }, ok ? 2000 : 6000); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(fallback(url)); });
      else done(fallback(url));
    });
    top.appendChild(sh); app.appendChild(top);
    var h = el("header"); h.appendChild(el("h1", null, "Where to next"));
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
    svg.appendChild(sv("polyline", { points: pts.map(function (p) { return X(p[1]).toFixed(1) + "," + Y(p[0]).toFixed(1); }).join(" "), fill: "none", stroke: "var(--ink)", "stroke-opacity": ".45", "stroke-width": 2, "stroke-dasharray": "5 4", "stroke-linejoin": "round" }));
    D.stops.forEach(function (p) { (p.opts || []).forEach(function (o) { svg.appendChild(sv("circle", { cx: X(o.ll[1]).toFixed(1), cy: Y(o.ll[0]).toFixed(1), r: 3.5, fill: "var(--lantern)", stroke: "var(--card)", "stroke-width": 1.5 })); }); });
    pts.forEach(function (p, i) {
      var g = sv("g", {});
      g.appendChild(sv("circle", { cx: X(p[1]).toFixed(1), cy: Y(p[0]).toFixed(1), r: 11, fill: kcol(D.stops[i].k), stroke: "var(--card)", "stroke-width": 2 }));
      var t = sv("text", { x: X(p[1]).toFixed(1), y: (Y(p[0]) + 4).toFixed(1), "text-anchor": "middle", "font-size": 12, "font-weight": 500, "font-family": "JetBrains Mono, monospace", fill: "var(--card)" });
      t.textContent = String(i + 1); g.appendChild(t); svg.appendChild(g);
    });
    var bar = 200; if (bar * sc > 120) bar = 100; if (bar * sc < 30) bar = 500; var bw = bar * sc;
    svg.appendChild(sv("line", { x1: 12, y1: H - 14, x2: 12 + bw, y2: H - 14, stroke: "var(--ink)", "stroke-width": 2 }));
    var bt = sv("text", { x: 12, y: H - 20, "font-size": 11, "font-family": "JetBrains Mono, monospace", fill: "var(--muted)" }); bt.textContent = bar + " m"; svg.appendChild(bt);
    var nt = sv("text", { x: W - 14, y: 20, "text-anchor": "end", "font-size": 11, "font-family": "JetBrains Mono, monospace", fill: "var(--muted)" }); nt.textContent = "N ↑"; svg.appendChild(nt);
    return svg;
  }
  function dirUrl(D) {
    var c = D.stops.map(function (p) { var x = center(p); return x[0].toFixed(5) + "," + x[1].toFixed(5); });
    var u = "https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=" + c[0] + "&destination=" + c[c.length - 1];
    if (c.length > 2) u += "&waypoints=" + c.slice(1, -1).join("%7C");
    return u;
  }

  // ---------- city page ----------
  function city(C) {
    var y = window.scrollY;
    app.replaceChildren();
    document.title = C.title || C.name;
    var top = el("div", "top"), bk = el("a", "back", "← Cities"); bk.href = "#/cities"; top.appendChild(bk); app.appendChild(top);
    var h = el("header"); h.appendChild(el("h1", null, C.title || C.name));
    if (C.lead) h.appendChild(el("p", "lead", C.lead));
    app.appendChild(h);
    if (!C.days || !C.days.length) { app.appendChild(el("p", "empty", "There is no itinerary here yet. Coming soon.")); return; }
    if (C.facts && C.facts.length) {
      var f = el("div", "facts");
      C.facts.forEach(function (x) { var r = el("div"); r.appendChild(el("b", null, x[0])); r.appendChild(el("span", null, x[1])); f.appendChild(r); });
      app.appendChild(f);
    }
    var nav = el("nav", "days"); nav.style.setProperty("--n", C.days.length); nav.setAttribute("aria-label", "Days");
    C.days.forEach(function (D) { var a = el("a", null, D.n); a.href = "#" + D.id; a.addEventListener("click", function (e) { e.preventDefault(); document.getElementById(D.id).scrollIntoView(); }); nav.appendChild(a); });
    app.appendChild(nav);
    var T0 = C.hours[0], T1 = C.hours[1];
    function pct(x) { return Math.max(0, Math.min(100, (x - T0) / (T1 - T0) * 100)); }
    function photoUrl(q) { return "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q.split(" " + C.en)[0] + " " + C.local); }
    var root = el("div"); root.style.cssText = "display:flex;flex-direction:column;gap:32px";
    C.days.forEach(function (D) {
      var s = el("section", "day"); s.id = D.id;
      s.appendChild(el("div", "eyebrow", D.n)); s.appendChild(el("h2", null, D.title)); s.appendChild(el("p", "theme", D.theme));
      var mb = el("div", "mapbox"); mb.appendChild(drawMap(C, D));
      var mf = el("div", "mapfoot"); mf.appendChild(el("small", null, "Numbers are the stops below. Orange dots are places to eat."));
      mf.appendChild(link(dirUrl(D), "Open route", "dir")); mb.appendChild(mf); s.appendChild(mb);
      var tr = el("div", "track"); tr.setAttribute("role", "img"); tr.setAttribute("aria-label", "Stop times against daylight");
      var sb = el("div", "sunbar"); sb.style.left = pct(C.sun[0]) + "%"; sb.style.width = (pct(C.sun[1]) - pct(C.sun[0])) + "%"; tr.appendChild(sb);
      D.stops.forEach(function (p) { var t = el("div", "tick"); t.style.left = pct(hh(p.t)) + "%"; t.style.background = kcol(p.k); tr.appendChild(t); });
      s.appendChild(tr);
      var lb = el("div", "tracklabel"); for (var t = T0; t <= T1; t += 4) lb.appendChild(el("span", null, (t < 10 ? "0" : "") + t + ":00")); s.appendChild(lb);
      var list = el("div", "stops");
      D.stops.forEach(function (p, i) {
        var r = el("div", "stop"), lt = el("div", "lt"), n = el("div", "num", String(i + 1));
        n.style.background = kcol(p.k); lt.appendChild(n); lt.appendChild(el("div", "time", p.t)); r.appendChild(lt);
        var b = el("div"); b.appendChild(el("span", "chip k-" + (KIND[p.k] ? p.k : "walk"), KIND[p.k] || p.k)); b.appendChild(el("h3", null, p.name)); b.appendChild(el("p", null, p.d));
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
        r.appendChild(b); list.appendChild(r);
      });
      s.appendChild(list); root.appendChild(s);
    });
    app.appendChild(root);
    if (C.note) app.appendChild(el("p", "note", C.note));
    window.scrollTo(0, y);
  }

  // ---------- routing ----------
  var cur = null;
  function route() {
    var h = location.hash;
    var id = h.replace(/^#\/?/, "");
    document.title = "Travel";
    if (id === "") {                       // opened without a choice: last city, otherwise home
      var last = store("lastCity");
      if (last) { location.replace("#/" + last); return; }
      home(); return;
    }
    if (id === "cities") { home(); return; }   // the back link always shows all cities
    if (!/^[a-z0-9-]+$/.test(id)) { home(); return; }
    cur = id;
    app.replaceChildren(el("p", "note", "Loading…"));
    load("data/" + id + ".json", "city:" + id, function (C) {
      if (cur !== id) return;
      store("lastCity", id);
      city(C);
    }, function () {
      if (store("lastCity") === id) store("lastCity", null);
      home("This city did not load. Pick another or try again.");
    });
  }
  window.addEventListener("hashchange", route);
  route();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
})();
