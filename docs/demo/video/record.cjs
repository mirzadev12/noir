// Records the NOIR demo: drives the production build through the narration's
// scenes, holding each line for as long as its spoken take lasts, and keeps
// every screen frame (JPEG, with its wall-clock time) plus the moment each line
// began. assemble.py turns the frames, the takes and the marks into the film.
//
//   npm install --no-save playwright-core     (Google Chrome must be installed)
//   NOIR_BASE=http://localhost:3036 node record.cjs
//
// The site must be running (DEMO_MODE=true) on a desk staged with stage-desk.mjs, and tts.py must
// have run first: the holds come from work/timeline.json. Restage the desk before every take; the
// take itself files three wallets and drafts a request to Binance.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const BASE = process.env.NOIR_BASE || "http://localhost:3036";
const WORK = process.env.NOIR_DEMO_WORK || path.join(__dirname, "work");
const TAKE = path.join(WORK, "take");
const T = JSON.parse(fs.readFileSync(path.join(WORK, "timeline.json"), "utf8"));
const L = {};
for (const s of T.scenes) L[s.id] = s.lines.map((l) => ({ idx: l.idx, dur: l.dur }));
const GAP = 0.38; // the breath after a line
const WALLETS = ["TVebSaNSdNHirwz46UPEzMgGy6pSQQu2aR", "TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ", "TQGFsqQcGMSozKhjmEU9C4eA4gfbn5gQDn"];
const CASE = "FIR 212/2026";
const TRACED = "/wallet/TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj?chain=tron";

const INIT = `(() => {
  const Z = 1.25;
  const ease = "cubic-bezier(.2,0,0,1)";
  const css = [
    "html{zoom:" + Z + ";scrollbar-width:none!important}",
    "::-webkit-scrollbar{display:none!important}",
    "#__ov{position:fixed;inset:0;zoom:" + (1 / Z) + ";pointer-events:none;z-index:2147483647}",
    "#__ring{position:absolute;left:0;top:0;width:0;height:0;border:2px solid #60a5fa;border-radius:14px;opacity:0;box-shadow:0 0 0 200vmax rgba(4,6,10,0),0 0 26px 2px rgba(59,130,246,.5);transition:left .5s " + ease + ",top .5s " + ease + ",width .5s " + ease + ",height .5s " + ease + ",opacity .3s ease,box-shadow .45s ease}",
    "#__ring.on{opacity:1}",
    "#__ring.dim{box-shadow:0 0 0 200vmax rgba(4,6,10,.56),0 0 26px 2px rgba(59,130,246,.5)}",
    "#__cur{position:absolute;left:0;top:0;width:30px;height:30px;opacity:0;transform:translate(1500px,820px);transition:transform .65s " + ease + ",opacity .25s ease;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}",
    "#__cur.on{opacity:1}",
    "#__rip{position:absolute;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:2px solid #f4f5f7;opacity:0}",
    "#__rip.go{animation:__rip .55s ease-out}",
    "@keyframes __rip{0%{opacity:.9;transform:scale(.25)}100%{opacity:0;transform:scale(1.5)}}",
    "#__card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;background:radial-gradient(90% 70% at 50% 110%,rgba(37,99,235,.42),rgba(30,58,138,.18) 45%,rgba(7,8,11,0) 75%),#07080b;color:#f4f5f7;font-family:var(--font-sans),'IBM Plex Sans',system-ui,sans-serif;opacity:0;transition:opacity .8s ease}",
    "#__card.on{opacity:1}",
    "#__card .wm{display:flex;align-items:center;gap:10px;font-weight:700;font-size:112px;letter-spacing:-.02em;line-height:1}",
    "#__card .wm b{background:#3b82f6;color:#07080b;border-radius:22px;padding:6px 18px 12px;font-weight:700}",
    "#__card .wm i{color:#3b82f6;font-style:normal}",
    "#__card .tag{font-size:46px;font-weight:600;letter-spacing:-.015em}",
    "#__card .url{font-family:var(--font-mono),'JetBrains Mono',monospace;font-size:30px;color:#60a5fa}",
    "#__card .sub{font-size:24px;color:#a1a8b3}",
  ].join("\\n");
  const addStyle = () => {
    if (document.getElementById("__st") || !(document.head || document.documentElement)) return;
    const s = document.createElement("style");
    s.id = "__st";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.head) addStyle();
  else new MutationObserver((_, o) => { if (document.head) { o.disconnect(); addStyle(); } }).observe(document, { childList: true, subtree: true });

  const ensure = () => {
    addStyle();
    let ov = document.getElementById("__ov");
    if (!ov && document.body) {
      ov = document.createElement("div");
      ov.id = "__ov";
      ov.setAttribute("aria-hidden", "true");
      ov.innerHTML = '<div id="__ring"></div><div id="__rip"></div>' +
        '<svg id="__cur" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.4 20.8 L11.5 14.3 L17.6 14.3 Z" fill="#f4f5f7" stroke="#07080b" stroke-width="1.3" stroke-linejoin="round"/></svg>' +
        '<div id="__card"><div class="wm"><b>NO</b><i>IR</i></div><div class="tag">Every unknown wallet has a destination.</div><div class="url">noir-lmot.onrender.com</div><div class="sub">Wallet to VASP, in both directions. One request per exchange.</div></div>';
      document.body.appendChild(ov);
    }
    return !!ov;
  };

  const main = () => document.querySelector("main") || document.body;
  const startsWith = (tag, text) => [...main().querySelectorAll(tag)].find((e) => e.getClientRects().length > 0 && (e.textContent || "").replace(/\\s+/g, " ").trim().startsWith(text));
  const find = (spec) => {
    if (!spec) return null;
    if (spec.sel) return document.querySelector(spec.sel);
    if (spec.h2) return startsWith("h2", spec.h2) || null;
    if (spec.section) { const h = startsWith("h2", spec.section); return h ? h.closest("section") || h.parentElement : null; }
    if (spec.node) {
      const gs = [...document.querySelectorAll("figure svg g.route-arrive")].filter((g) => g.querySelector(":scope > rect"));
      const g = gs.find((x) => ((x.querySelector("text") || {}).textContent || "").trim().startsWith(spec.node));
      return g ? g.querySelector("rect") : null;
    }
    if (typeof spec.counted === "number") return document.querySelectorAll("#counted-title ~ dl > div")[spec.counted] || null;
    if (spec.text) return startsWith(spec.tag || "*", spec.text) || null;
    if (spec.sign) return main().querySelector(".glow");
    if (typeof spec.table === "number") return main().querySelectorAll("table")[spec.table] || null;
    if (spec.href) return main().querySelector('a[href="' + spec.href + '"]');
    if (spec.nav) return [...document.querySelectorAll("a")].find((a) => !main().contains(a) && a.getAttribute("href") === spec.nav) || null;
    return null;
  };
  const rectOf = (spec, pad) => {
    const el = find(spec);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const p = pad == null ? 10 : pad;
    return { x: r.left - p, y: r.top - p, w: r.width + 2 * p, h: r.height + 2 * p };
  };
  const ring = (spec, o) => {
    ensure();
    const r = rectOf(spec, o && o.pad);
    const el = document.getElementById("__ring");
    if (!r || !el) return false;
    const top = Math.max(6, r.y), bottom = Math.min(window.innerHeight - 6, r.y + r.h);
    const left = Math.max(6, r.x), right = Math.min(window.innerWidth - 6, r.x + r.w);
    if (!el.classList.contains("on")) { el.style.transition = "none"; el.style.left = left + "px"; el.style.top = top + "px"; el.style.width = (right - left) + "px"; el.style.height = (bottom - top) + "px"; void el.offsetWidth; el.style.transition = ""; }
    el.style.left = left + "px"; el.style.top = top + "px"; el.style.width = (right - left) + "px"; el.style.height = (bottom - top) + "px";
    el.classList.add("on");
    el.classList.toggle("dim", !!(o && o.dim));
    return true;
  };
  const unring = () => { const el = document.getElementById("__ring"); if (el) el.classList.remove("on", "dim"); };
  let cx = 1500, cy = 820;
  const cursor = (spec, o) => {
    ensure();
    const el = find(spec);
    const c = document.getElementById("__cur");
    if (!el || !c) return false;
    const r = el.getBoundingClientRect();
    cx = r.left + r.width * ((o && o.fx) || 0.5);
    cy = r.top + r.height * ((o && o.fy) || 0.5);
    c.classList.add("on");
    c.style.transform = "translate(" + (cx - 4) + "px," + (cy - 2) + "px)";
    return true;
  };
  const ripple = () => { const r = document.getElementById("__rip"); if (!r) return; r.style.left = cx + "px"; r.style.top = cy + "px"; r.classList.remove("go"); void r.offsetWidth; r.classList.add("go"); };
  const hideCursor = () => { const c = document.getElementById("__cur"); if (c) c.classList.remove("on"); };
  const card = (on) => { ensure(); const c = document.getElementById("__card"); if (c) c.classList.toggle("on", !!on); };
  const glide = (spec, o) => new Promise((done) => {
    const el = find(spec);
    const ms = (o && o.ms) || 1300;
    let target = 0;
    if (el) {
      const r = el.getBoundingClientRect();
      target = o && o.center ? r.top + window.scrollY - (window.innerHeight - r.height) / 2 : r.top + window.scrollY - ((o && o.offset) || 110);
    } else if (o && typeof o.y === "number") target = o.y;
    else if (spec) return done(false);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = Math.max(0, Math.min(target, max));
    const from = window.scrollY, t0 = performance.now();
    if (Math.abs(target - from) < 2) return done(true);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      window.scrollTo(0, from + (target - from) * e);
      if (k < 1) requestAnimationFrame(step); else done(true);
    };
    requestAnimationFrame(step);
  });
  window.__demo = { ensure, find, rectOf, ring, unring, cursor, ripple, hideCursor, card, glide };
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

(async () => {
  fs.rmSync(TAKE, { recursive: true, force: true });
  fs.mkdirSync(TAKE, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "no-preference", colorScheme: "dark" });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  const frames = [];
  let lastKept = 0;
  cdp.on("Page.screencastFrame", (f) => {
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    const t = f.metadata.timestamp;
    if (t - lastKept < 0.030) return;
    lastKept = t;
    const name = String(frames.length + 1).padStart(6, "0") + ".jpg";
    fs.writeFileSync(path.join(TAKE, name), Buffer.from(f.data, "base64"));
    frames.push({ name, t });
  });

  const marks = [];
  const notes = [];
  const D = {
    ensure: () => page.evaluate(() => window.__demo.ensure()),
    ring: (spec, o) => page.evaluate(([s, opt]) => window.__demo.ring(s, opt), [spec, o || {}]),
    unring: () => page.evaluate(() => window.__demo.unring()),
    glide: (spec, o) => page.evaluate(([s, opt]) => window.__demo.glide(s, opt), [spec, o || {}]),
    cursor: (spec, o) => page.evaluate(([s, opt]) => window.__demo.cursor(s, opt), [spec, o || {}]),
    ripple: () => page.evaluate(() => window.__demo.ripple()),
    hideCursor: () => page.evaluate(() => window.__demo.hideCursor()),
    card: (on) => page.evaluate((v) => window.__demo.card(v), on),
  };
  const settle = async (h1) => {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    if (h1) await page.waitForFunction((t) => { const h = document.querySelector("main h1, h1"); return h && h.textContent.includes(t); }, h1, { timeout: 20000 }).catch(() => notes.push("h1 not seen: " + h1));
    await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
    await D.ensure().catch(() => {});
  };
  // One spoken line: mark when it starts, run its cues at their moments, hold until it has been said.
  const say = async (line, cues = []) => {
    const t0 = Date.now();
    marks.push({ idx: line.idx, t: t0 / 1000 });
    for (const c of [...cues].sort((a, b) => a.at - b.at)) {
      await sleep(t0 + c.at * line.dur * 1000 - Date.now());
      try { const r = await c.run(); if (r === false) notes.push(`line ${line.idx}: cue at ${c.at} found nothing`); } catch (e) { notes.push(`line ${line.idx}: cue at ${c.at} failed: ${String(e).slice(0, 140)}`); }
    }
    await sleep(t0 + (line.dur + GAP) * 1000 - Date.now());
  };
  const click = async (spec, locator, o) => {
    await D.cursor(spec, o);
    await sleep(720);
    await D.ripple();
    await sleep(140);
    await locator.click({ timeout: 8000 });
  };

  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

  // ------------------------------------------------------------ the hall
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await settle("Every unknown wallet");
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const videoStart = Date.now() / 1000;
  await sleep(900);
  log("hook");
  await say(L.hook[0]);
  await say(L.hook[1], [{ at: 0.42, run: () => D.glide({ sel: "figure" }, { center: true, ms: 1900 }) }]);

  log("trace");
  await say(L.trace[0], [{ at: 0.3, run: () => D.ring({ sel: "figure svg" }, { pad: 16 }) }]);
  await say(L.trace[1], [
    { at: 0.0, run: () => D.ring({ node: "MEXC" }, { dim: true }) },
    { at: 0.47, run: () => D.ring({ node: "Binance" }, { dim: true }) },
  ]);
  await say(L.trace[2], [
    { at: 0.0, run: () => D.ring({ node: "The wallet" }, { dim: true }) },
    { at: 0.6, run: () => D.ring({ node: "MEXC" }, { dim: true }) },
  ]);
  await say(L.trace[3], [
    { at: 0.0, run: () => D.ring({ node: "Hop" }, { dim: true }) },
    { at: 0.52, run: () => D.ring({ node: "Binance" }, { dim: true }) },
  ]);
  await say(L.trace[4], [{ at: 0.05, run: () => D.ring({ node: "ISIL" }, { dim: true }) }]);

  log("counted");
  await say(L.counted[0], [
    { at: 0.0, run: () => D.unring() },
    { at: 0.06, run: () => D.glide({ sel: "#counted-title ~ dl" }, { offset: 330, ms: 1500 }) },
  ]);
  await say(L.counted[1], [
    { at: 0.04, run: () => D.ring({ counted: 0 }, { pad: 0 }) },
    { at: 0.6, run: () => D.ring({ counted: 3 }, { pad: 0 }) },
  ]);

  log("intake");
  await say(L.intake[0], [
    { at: 0.0, run: () => D.unring() },
    { at: 0.02, run: () => D.glide({ sel: "#file" }, { offset: 150, ms: 1500 }) },
    { at: 0.42, run: async () => { await D.cursor({ sel: "#hero-text" }, { fx: 0.3, fy: 0.3 }); } },
    { at: 0.58, run: () => page.locator("#hero-text").fill(WALLETS[0]) },
    { at: 0.74, run: () => page.locator("#hero-text").fill(WALLETS.slice(0, 2).join("\n")) },
    { at: 0.9, run: () => page.locator("#hero-text").fill(WALLETS.join("\n")) },
  ]);
  await say(L.intake[1], [
    { at: 0.0, run: async () => { await D.cursor({ sel: "#hero-case" }, { fx: 0.2 }); await sleep(450); await page.locator("#hero-case").pressSequentially(CASE, { delay: 42 }); } },
    { at: 0.62, run: () => D.cursor({ text: "File to the desk", tag: "button" }) },
  ]);
  await D.ripple();
  await sleep(140);
  await page.getByRole("button", { name: "File to the desk" }).first().click();
  await page.waitForURL("**/desk", { timeout: 20000 }).catch(() => notes.push("no redirect to /desk"));
  await settle("Desk");
  await D.hideCursor().catch(() => {});

  // ------------------------------------------------------------ the desk
  log("desk");
  await sleep(350);
  await say(L.desk[0]);
  await say(L.desk[1], [
    { at: 0.0, run: () => D.ring({ sign: true }, { pad: 8 }) },
    { at: 0.5, run: async () => { await D.unring(); await D.glide({ h2: "Follow up" }, { offset: 150, ms: 1100 }); return D.ring({ section: "Follow up" }, { pad: 14 }); } },
  ]);
  await say(L.desk[2], [
    { at: 0.0, run: async () => { await D.unring(); await D.glide({ h2: "OFAC flags" }, { offset: 150, ms: 1100 }); return D.ring({ section: "OFAC flags" }, { pad: 14 }); } },
  ]);
  await say(L.desk[3], [
    { at: 0.0, run: async () => { await D.unring(); await D.glide({ h2: "Where the wallets go" }, { offset: 130, ms: 1200 }); return D.ring({ section: "Where the wallets go" }, { pad: 14 }); } },
    { at: 0.93, run: () => D.unring() },
  ]);
  await click({ sel: 'main table a[href="/vasp/Binance"]' }, page.locator('main table a[href="/vasp/Binance"]').first());
  await page.waitForURL("**/vasp/Binance", { timeout: 20000 }).catch(() => notes.push("no navigation to the VASP"));
  await settle("Binance");
  await D.hideCursor().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));

  // ------------------------------------------------------------ one VASP
  log("vasp");
  await sleep(350);
  await say(L.vasp[0], [{ at: 0.45, run: () => D.glide({ sel: "#reach" }, { offset: 420, ms: 1500 }) }]);
  await say(L.vasp[1], [
    { at: 0.0, run: async () => { await D.glide({ sel: "#reach" }, { offset: 130, ms: 1000 }); return D.ring({ sel: "#reach" }, { pad: 14 }); } },
  ]);
  await say(L.vasp[2], [
    { at: 0.0, run: async () => { await D.unring(); await D.glide({ sel: "#outbound" }, { offset: 130, ms: 1100 }); return D.ring({ sel: "#outbound table" }, { pad: 10 }); } },
  ]);

  log("request");
  await say(L.request[0], [
    { at: 0.0, run: async () => { await D.unring(); await D.glide({ sel: "#ask" }, { offset: 130, ms: 1200 }); return D.ring({ sel: "#ask-form fieldset" }, { pad: 12 }); } },
    { at: 0.8, run: async () => { await D.unring(); return D.cursor({ sel: "#ask-form button[type=submit]" }); } },
  ]);
  await D.ripple();
  await sleep(140);
  await page.locator("#ask-form button[type=submit]").click();
  await page.waitForURL("**/vasp/Binance/request", { timeout: 20000 }).catch(() => notes.push("no navigation to the letter"));
  await settle(null);
  await page.waitForSelector(".letter-sheet", { timeout: 15000 }).catch(() => notes.push("letter sheet not seen"));
  await D.hideCursor().catch(() => {});
  await sleep(450);
  await say(L.request[1], [
    { at: 0.3, run: async () => { await D.glide({ text: "The legal basis for this request is", tag: ".letter-sheet *" }, { center: true, ms: 1300 }); return D.ring({ text: "The legal basis for this request is", tag: ".letter-sheet *" }, { pad: 12 }); } },
  ]);
  await D.unring();

  // ------------------------------------------------------------ the register
  log("register");
  await click({ nav: "/requests" }, page.locator('a[href="/requests"]').first());
  await page.waitForURL("**/requests", { timeout: 20000 }).catch(() => notes.push("no navigation to the register"));
  await settle("Requests");
  await D.hideCursor().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(350);
  await say(L.register[0], [
    { at: 0.3, run: async () => { await D.glide({ table: 0 }, { offset: 200, ms: 1200 }); return D.ring({ table: 0 }, { pad: 12 }); } },
    { at: 0.95, run: () => D.unring() },
  ]);

  // ------------------------------------------------------------ one wallet
  log("wallet");
  await page.goto(BASE + TRACED, { waitUntil: "domcontentloaded" });
  await settle("Wallet");
  await page.evaluate(() => { const f = document.querySelector("figure"); if (f) { const r = f.getBoundingClientRect(); window.scrollTo(0, r.top + window.scrollY - (window.innerHeight - r.height) / 2); } });
  await sleep(500);
  await say(L.wallet[0], [
    { at: 0.36, run: () => D.glide({ sel: "#route" }, { offset: 130, ms: 1100 }) },
    { at: 0.58, run: () => D.glide({ sel: "#typologies" }, { offset: 130, ms: 1100 }) },
    { at: 0.8, run: () => D.glide({ sel: "#provenance" }, { offset: 130, ms: 1100 }) },
  ]);
  await say(L.wallet[1], [{ at: 0.0, run: () => D.ring({ sel: "#provenance" }, { pad: 14 }) }]);
  await D.unring();

  // ------------------------------------------------------------ the method
  log("method");
  await click({ nav: "/method" }, page.locator('a[href="/method"]').first());
  await page.waitForURL("**/method", { timeout: 20000 }).catch(() => notes.push("no navigation to the method"));
  await settle("Method");
  await D.hideCursor().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(350);
  await say(L.method[0], [{ at: 0.3, run: () => D.glide({ h2: "What NOIR covers" }, { offset: 130, ms: 1400 }) }]);
  await say(L.method[1], [{ at: 0.0, run: () => D.glide({ h2: "What NOIR does not say" }, { offset: 130, ms: 1500 }) }]);

  // ------------------------------------------------------------ the hall again
  log("close");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await settle("Every unknown wallet");
  await sleep(700);
  await say(L.close[0]);
  await D.card(true);
  await sleep(4200);
  const videoEnd = Date.now() / 1000;

  await cdp.send("Page.stopScreencast").catch(() => {});
  await browser.close();
  fs.writeFileSync(path.join(WORK, "take.json"), JSON.stringify({ videoStart, videoEnd, marks, frames, notes }, null, 1));
  log(`done: ${frames.length} frames, ${(videoEnd - videoStart).toFixed(1)}s, ${marks.length} lines`);
  if (notes.length) log("notes:\n  " + notes.join("\n  "));
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
