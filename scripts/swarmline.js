/*
 * Swarmline: watch a swarm build any website, live, in your browser.
 *
 * One click and the page becomes a blank canvas in its own colours. A swarm of
 * pointers then builds it back in reading order, like designers in a design tool:
 * click and drag each box out (which then fills in for real), click and type every
 * line of text letter by letter, and drag out image frames the picture scans into. Everything that appears is the real
 * page, in place, so fonts, video, animations and links are exactly the site's.
 * When the last screen is built the page is fully live again.
 *
 * Injected by background.js; injecting again while it runs exits.
 */
(() => {
  "use strict";

  const KEY = "__swarmline";
  if (window[KEY]) {
    window[KEY].toggle();
    return;
  }

  // ----------------------------------------------------------------- constants

  const SHOWN = "data-swarmline-v"; // elements the swarm has put back on the page
  const ACTIVE = "data-swarmline"; // on <html> while the page is being built
  const GHOST = "data-swarmline-ghost"; // the look-alike carried during a duplicate (never scanned)
  const SANS = 'Saira, Inter, ui-sans-serif, system-ui, sans-serif';
  const MAX_UNITS = 3000;
  const CHAR_BUDGET = 9000; // exact letter positions per scan; past that they're estimated
  // toolbar placement for this tab only: kept in memory, never stored
  const prefs = { hudHidden: false, hudPos: null };
  const MEASURE = "#F43F5E"; // spacing measurements while a copy is dragged
  const INK = "#111111"; // ink black — box strokes, guides, ruler lines
  const BRAND = "#eb1d25"; // site red — badge labels, corner handles
  const rand = (a, b) => a + Math.random() * (b - a);
  const CURSOR_COLORS = ["#eb1d25", "#111111", "#28c840", "#FF5A6E", "#FFB020", "#A46BFF", "#FF7AC8", "#2FE0F0", "#FF8A3D", "#6C7CFF", "#FF4F9A", "#00C2A8"];
  const CREW = ["Aria", "Blake", "Cleo", "Dash", "Ezra", "Faye", "Gale", "Hugo", "Iris", "Jade", "Kai", "Luna", "Milo", "Nia", "Otto", "Pia", "Quinn", "Remy", "Sage", "Theo", "Uma", "Vale", "Wren", "Xavi", "Yara", "Zane", "Arlo", "Bea", "Cyrus", "Dara", "Eden", "Finn"];
  const PALETTE = ["#eb1d25", "#111111", "#28c840", "#FF5A6E", "#FFB020", "#A46BFF", "#FF7AC8", "#2FE0F0"];

  const SKIP = new Set([
    "script", "style", "noscript", "template", "head", "meta", "link", "title", "base", "br", "wbr",
    "option", "optgroup", "datalist", "source", "track", "param", "area", "map", "swarmline-layer",
  ]);
  const MEDIA = new Set(["img", "svg", "video", "canvas", "picture", "iframe", "embed", "object"]);
  const LIVE_MEDIA = new Set(["video", "canvas", "iframe", "embed", "object"]); // shown without animation (see Stage.live)
  // class or attribute names that scroll-animation libraries put on what they reveal
  const REVEAL = /\b(wow|aos|data-aos|reveal|fade|animate|animated|sal|data-sal|scroll|data-scroll|motion|appear|inview|in-view|lazy|sr-)/i;
  const CONTROL = new Set(["input", "textarea", "select"]);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const inkOn = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l > 0.62 ? "#14151C" : "#FFFFFF";
  };
  // is `el`, or something it sits inside, in the set?
  const within = (el, set) => {
    if (!set || !set.size) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) if (set.has(e)) return true;
    return false;
  };
  const TAU = Math.PI * 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeSine = (t) => (1 - Math.cos(Math.PI * t)) / 2;

  const reduced = () => {
    try {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  function parseColor(c) {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length >= 4 ? p[3] : 1 };
  }
  const alphaOf = (c) => {
    if (!c || c === "transparent") return 0;
    const p = parseColor(c);
    return p ? p.a : 1;
  };
  const luminance = (c) => {
    const p = parseColor(c);
    return p ? (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255 : 1;
  };

  // ---------------------------------------------------------------- environment

  // Most pages scroll the window; app shells scroll one big inner element.
  function findScroller() {
    const se = document.scrollingElement || document.documentElement;
    if (se.scrollHeight > innerHeight + 4) return null;
    let best = null;
    let area = 0;
    const all = document.body ? document.body.getElementsByTagName("*") : [];
    for (let i = 0; i < all.length && i < 20000; i++) {
      const el = all[i];
      if (el.scrollHeight <= el.clientHeight + 40 || el.clientHeight < innerHeight * 0.4) continue;
      if (!/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > area && r.width > innerWidth * 0.35) {
        best = el;
        area = r.width * r.height;
      }
    }
    return best;
  }

  class Env {
    constructor() {
      this.el = findScroller();
    }
    get top() {
      return this.el ? this.el.scrollTop : window.scrollY;
    }
    get height() {
      if (this.el) return this.el.scrollHeight;
      return Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    }
    view() {
      if (!this.el) return { x: 0, y: 0, w: document.documentElement.clientWidth || innerWidth, h: innerHeight };
      const r = this.el.getBoundingClientRect();
      return { x: r.left + this.el.clientLeft, y: r.top + this.el.clientTop, w: this.el.clientWidth, h: this.el.clientHeight };
    }
    maxTop() {
      return Math.max(0, this.height - this.view().h);
    }
    scrollTo(y) {
      const o = { top: y, behavior: "instant" };
      if (this.el) this.el.scrollTo(o);
      else window.scrollTo(o);
    }
    owns(el) {
      return !this.el || this.el.contains(el);
    }
  }

  // ------------------------------------------------------------- the page itself

  // While building, every element on the page is hidden except the ones the swarm has
  // put back. Layout never changes (visibility keeps boxes in place), the page keeps
  // running underneath, and the "blank canvas" is simply the site's own background.
  class Stage {
    constructor() {
      this.marked = [];
      this.fading = new WeakSet(); // fading in by our hand: its opacity is ours, not the page's
      this.clips = new Map();
      this.style = document.createElement("style");
      this.style.setAttribute("data-swarmline", "");
      this.style.textContent =
        `html[${ACTIVE}] body *:not([${SHOWN}]):not(swarmline-layer):not(#motion-toggle){visibility:hidden !important}` +
        `html[${ACTIVE}] [${SHOWN}]{visibility:visible !important}`;
    }
    hide() {
      const head = document.head || document.documentElement;
      head.appendChild(this.style);
      // transitions off while we read the page: with `transition: all` on an element,
      // lifting our hiding rule starts a visibility transition whose first instant still
      // reads "hidden", so the element would look hidden to us when it isn't
      this.calm = document.createElement("style");
      this.calm.setAttribute("data-swarmline", "");
      this.calm.textContent = "*,*::before,*::after{transition:none !important}";
      head.appendChild(this.calm);
      this.calm.disabled = true;
      document.documentElement.setAttribute(ACTIVE, "");
    }
    // read the page as it really is (our hiding rule off for a moment, never painted)
    peek(fn) {
      const was = this.style.disabled;
      const calm = this.needCalm && this.calm && this.calm.isConnected ? this.calm : null; // only on pages that need it
      if (calm) calm.disabled = false;
      this.style.disabled = true;
      try {
        return fn();
      } finally {
        this.style.disabled = was;
        if (calm) {
          void document.documentElement.offsetWidth; // settle back on the hidden state first
          calm.disabled = true;
        }
      }
    }
    show(el) {
      if (!el || el.hasAttribute(SHOWN)) return false;
      el.setAttribute(SHOWN, "");
      this.marked.push(el);
      return true;
    }
    shown(el) {
      return !!el && el.hasAttribute(SHOWN);
    }
    // is this a video, canvas or embed, or does it hold one? Animating such an element's
    // opacity or clip while the page scrolls can lock up Chrome's renderer, so it's shown
    // without animation. (The set of their ancestors is rebuilt at most once a second.)
    live(el) {
      const now = performance.now();
      if (!this.liveSet || now - this.liveAt > 1000) {
        this.liveAt = now;
        this.liveSet = new Set();
        for (const m of document.querySelectorAll("video,canvas,iframe,embed,object")) {
          if (m.closest(`[${GHOST}]`)) continue;
          for (let e = m; e && e !== document.body; e = e.parentElement) {
            if (this.liveSet.has(e)) break;
            this.liveSet.add(e);
          }
        }
      }
      return this.liveSet.has(el) || LIVE_MEDIA.has(el.localName);
    }
    fadeIn(el, ms, from = 0) {
      if (!this.show(el)) return;
      if (this.live(el)) return;
      try {
        // the end value is left implicit (the element's own opacity): no style read per fade
        const a = el.animate([{ opacity: from }, {}], { duration: ms, easing: "cubic-bezier(.2,.7,.2,1)" });
        this.fading.add(el);
        a.onfinish = a.oncancel = () => this.fading.delete(el);
      } catch (_) {}
    }
    // text typed in place: clip the element to the letters written so far
    clip(el, path) {
      if (!this.clips.has(el)) this.clips.set(el, [el.style.getPropertyValue("clip-path"), el.style.getPropertyPriority("clip-path")]);
      el.style.setProperty("clip-path", path, "important");
    }
    unclip(el) {
      const c = this.clips.get(el);
      if (!c) return;
      this.clips.delete(el);
      if (c[0]) el.style.setProperty("clip-path", c[0], c[1]);
      else el.style.removeProperty("clip-path");
    }
    restore() {
      for (const el of [...this.clips.keys()]) this.unclip(el);
      document.documentElement.removeAttribute(ACTIVE);
      for (const el of this.marked) el.removeAttribute(SHOWN);
      this.marked = [];
      this.style.remove();
      if (this.calm) this.calm.remove();
    }
  }

  // --------------------------------------------------------------------- scanner

  function radiiOf(s, w, h) {
    const m = Math.min(w, h) / 2;
    return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map((v) => {
      const n = parseFloat(v) || 0;
      return clamp(/%$/.test(v) ? (n / 100) * Math.min(w, h) : n, 0, m);
    });
  }

  const sameColor = (a, b) => !!a && !!b && a.replace(/\s/g, "") === b.replace(/\s/g, "");

  function paintsBox(s, under) {
    const bg = s.backgroundColor;
    if (alphaOf(bg) > 0.03 && !sameColor(bg, under)) return true;
    if (s.backgroundImage && s.backgroundImage !== "none") return true;
    if (s.boxShadow && s.boxShadow !== "none") return true;
    if (s.backdropFilter && s.backdropFilter !== "none") return true;
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      if (parseFloat(s["border" + side + "Width"]) > 0 && s["border" + side + "Style"] !== "none" && alphaOf(s["border" + side + "Color"]) > 0.05) return true;
    }
    return false;
  }

  const isInlineLevel = (d) => d.startsWith("inline") || d === "contents";

  class Scanner {
    constructor(env, host, stage) {
      this.env = env;
      this.host = host;
      this.stage = stage;
      this.seen = new WeakSet();
      this.deferred = new Map(); // hidden by the page for now (scroll-reveal): element -> { at, dirty }
      // reveal libraries (WOW, AOS...) show an element by changing its style or class: watch
      // just that, so the page is only re-read when something may have appeared
      this.mo = typeof MutationObserver === "function" ? new MutationObserver((list) => {
        for (const m of list) {
          const d = this.deferred.get(m.target);
          if (d) d.dirty = true;
        }
      }) : null;
      this.boxOf = new WeakMap();
      this.flowRoots = new WeakSet();
      this.count = 0;
    }

    // An element's own running text: line boxes, letter edges and the inline elements
    // that carry it (links, spans, split-text letters), all relative to its box.
    text(el, r, cs, budget) {
      const nodes = [];
      const flow = [];
      const inFlow = (n) => {
        for (let p = n.parentElement; p && p !== el; p = p.parentElement) if (!isInlineLevel(cs(p).display)) return false;
        return true;
      };
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) if (/\S/.test(n.data) && inFlow(n)) nodes.push(n);
      for (const d of el.querySelectorAll("*")) {
        const s = cs(d);
        if (MEDIA.has(d.localName) && d.localName !== "svg") continue;
        if (isInlineLevel(s.display) && s.display !== "contents" && inFlow(d) && s.visibility === "visible") {
          flow.push(d);
          if (d.localName === "svg") for (const k of d.querySelectorAll("*")) flow.push(k);
        }
      }
      const rects = [];
      const chars = [];
      const rg = document.createRange();
      for (const n of nodes) {
        rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) if (q.width > 0.5 && q.height > 0.5) rects.push(q);
        if (budget.left > 0) {
          const s = n.data;
          for (let i = 0; i < s.length; i++) {
            if (/\s/.test(s[i]) && (i === 0 || /\s/.test(s[i - 1]))) continue;
            rg.setStart(n, i);
            rg.setEnd(n, i + 1);
            const q = rg.getBoundingClientRect();
            if (q.width > 0 || q.height > 0) chars.push(q);
          }
          budget.left -= s.length;
        }
      }
      rects.sort((a, b) => a.top - b.top || a.left - b.left);
      const lines = [];
      for (const q of rects) {
        const last = lines[lines.length - 1];
        const mid = q.top + q.height / 2;
        if (last && mid > last.t && mid < last.b) {
          last.l = Math.min(last.l, q.left);
          last.r = Math.max(last.r, q.right);
          last.t = Math.min(last.t, q.top);
          last.b = Math.max(last.b, q.bottom);
        } else lines.push({ l: q.left, r: q.right, t: q.top, b: q.bottom, edges: [] });
      }
      if (!lines.length) return null;
      if (chars.length) {
        for (const q of chars) {
          const mid = q.top + q.height / 2;
          const L = lines.find((l) => mid >= l.t - 1 && mid <= l.b + 1);
          if (L) L.edges.push(q.right);
        }
      }
      const fs = parseFloat(cs(el).fontSize) || 16;
      const out = lines.map((L) => {
        let e = L.edges.sort((a, b) => a - b);
        if (!e.length) {
          // estimate letters for text past the exact-measurement budget
          const n = Math.max(1, Math.round((L.r - L.l) / (fs * 0.52)));
          e = Array.from({ length: n }, (_, i) => L.l + ((L.r - L.l) * (i + 1)) / n);
        }
        return { x: L.l - r.left, y: L.t - r.top, w: L.r - L.l, h: L.b - L.t, edges: e.map((x) => x - r.left) };
      });
      return { lines: out, flow, total: out.reduce((n, L) => n + L.edges.length, 0) };
    }

    // Walk the DOM and register what's new inside a band of the page (content px).
    scan(band) {
      return this.stage.peek(() => this.walk(band));
    }

    walk(band) {
      const env = this.env;
      const v = env.view();
      const top = env.top;
      const toContent = (y) => y - v.y + top;
      const out = [];
      const cache = new Map();
      const cs = (el) => {
        let s = cache.get(el);
        if (!s) {
          s = getComputedStyle(el);
          cache.set(el, s);
        }
        return s;
      };
      const html = document.documentElement;
      const body = document.body;
      const budget = { left: CHAR_BUDGET };

      const make = (el, kind, r, s, parent, fixed, extra) => {
        const u = {
          id: this.count++, el, kind, parent, fixed,
          state: 0, phase: 0, p: 0, typed: 0, color: PALETTE[this.count % PALETTE.length],
          y: fixed ? -1e9 : toContent(r.top), w: r.width, h: r.height, top0: r.top, left0: r.left,
          rad: radiiOf(s, r.width, r.height), lead: null,
          ...extra,
        };
        out.push(u);
        return u;
      };

      // under: the solid colour painted behind this element, or null over images/gradients
      const visit = (el, parent, fixed, under, inFlow, hid) => {
        if (this.count >= MAX_UNITS) return;
        const tag = el.localName;
        if (SKIP.has(tag) || el === this.host || el.hasAttribute(GHOST)) return;
        const s = cs(el);
        const d = s.display;
        if (d === "none") return;
        if (d === "contents") {
          for (const k of el.children) visit(k, parent, fixed, under, inFlow, hid);
          return;
        }
        const faint = parseFloat(s.opacity) < 0.04 && !this.stage.fading.has(el);
        if (faint && fixed) return;
        const isFixed = fixed || s.position === "fixed" || s.position === "sticky" || !env.owns(el);
        const r = el.getBoundingClientRect();
        let inBand = true;
        if (!isFixed) {
          const y0 = toContent(r.top);
          const y1 = toContent(r.bottom);
          inBand = y1 > band.top && y0 < band.bottom;
        }
        // hidden by the page itself, in the page's flow: most often content that animates in
        // as it's scrolled to. Remember it; it is read again once it shows.
        const hiddenHere = s.visibility !== "visible" && !hid;
        // a visibility transition here means our reads need transitions paused (see Stage.hide)
        if (hiddenHere && !this.stage.needCalm && /all|visibility/.test(s.transitionProperty) && /[1-9]/.test(s.transitionDuration)) this.stage.needCalm = true;
        // (menus, tooltips, dialogs and tiny bits are hidden on purpose: not waited for)
        if ((faint || hiddenHere) && !isFixed && inBand && r.width >= 40 && r.height >= 16 && !this.seen.has(el) && !this.deferred.has(el) &&
          !el.closest(`nav,header,dialog,[popover],[role="menu"],[role="tooltip"],[role="dialog"],[aria-hidden="true"]`)) {
          // worth waiting for only if it looks like a scroll-reveal target (a library marker, or an
          // inline opacity:0 / visibility:hidden set by script); anything else is just re-checked
          const sty = el.getAttribute("style") || "";
          const sig = (el.getAttribute("class") || "") + " " + [...el.attributes].map((x) => x.name).join(" ");
          const likely = REVEAL.test(sig) || /opacity:\s*0(\.0*)?\s*(;|$)|visibility:\s*hidden/i.test(sty);
          this.deferred.set(el, { at: null, dirty: false, likely });
          if (this.mo) this.mo.observe(el, { attributes: true, attributeFilter: ["style", "class"] });
        }
        if (faint) return;
        const show = s.visibility === "visible" && r.width >= 2 && r.height >= 2 && inBand;
        const isMedia = MEDIA.has(tag);
        const isControl = CONTROL.has(tag);
        let boxUnit = this.boxOf.get(el) || null;
        let madeText = false;
        const flowPiece = inFlow && isInlineLevel(d);
        if (show && !this.seen.has(el) && !flowPiece) {
          this.seen.add(el);
          if (isMedia) {
            make(el, "media", r, s, parent, isFixed);
            return;
          }
          if (isControl) {
            if ((el.getAttribute("type") || "").toLowerCase() !== "hidden") make(el, "control", r, s, parent, isFixed);
            return;
          }
          const inline = d === "inline";
          if (!inline && paintsBox(s, under)) {
            boxUnit = make(el, "box", r, s, parent, isFixed);
            this.boxOf.set(el, boxUnit);
          }
          if (!inline) {
            let hasText = false;
            for (const n of el.childNodes) {
              if (n.nodeType === 3 ? /\S/.test(n.data) : n.nodeType === 1 && isInlineLevel(cs(n).display) && !MEDIA.has(n.localName) && /\S/.test(n.textContent)) {
                hasText = true;
                break;
              }
            }
            if (hasText) {
              const t = this.text(el, r, cs, budget);
              if (t) {
                // how to type it: clip the element to the letters so far, unless the
                // element paints its own box (a button) - then reveal by colour
                const mode = boxUnit && boxUnit.el === el ? "fade" : "clip";
                // block children (a heading inside a wrapper that also has a line of its
                // own text) stay outside the typing clip: they appear on their own schedule
                const keep = [];
                if (mode === "clip") {
                  for (const c of el.children) {
                    if (SKIP.has(c.localName)) continue;
                    const d2 = cs(c).display;
                    if (d2 === "none" || isInlineLevel(d2)) continue;
                    const q = c.getBoundingClientRect();
                    if (q.width >= 1 && q.height >= 1) keep.push({ x: q.left - r.left - 2, y: q.top - r.top - 2, w: q.width + 4, h: q.height + 4 });
                  }
                }
                make(el, "text", r, s, boxUnit || parent, isFixed, {
                  lines: t.lines, flow: t.flow, total: t.total, mode, keep, fs: parseFloat(s.fontSize) || 16,
                  ink: s.color, caretColor: s.color,
                });
                madeText = true;
                this.flowRoots.add(el);
              }
            } else if (!el.firstElementChild && r.width <= 96 && r.height <= 96 && !/\S/.test(el.textContent)) {
              for (const w of ["::before", "::after"]) {
                const ps = getComputedStyle(el, w);
                if (ps.display !== "none" && /^"(.+)"$/.test(ps.content || "")) {
                  make(el, "glyph", r, s, boxUnit || parent, isFixed);
                  break;
                }
              }
            }
          }
        } else if (isMedia || isControl) return;
        if (isMedia || isControl) return;
        const bg = s.backgroundColor;
        let kidUnder = under;
        if (s.backgroundImage && s.backgroundImage !== "none") kidUnder = null;
        else if (alphaOf(bg) > 0.99) kidUnder = bg;
        else if (alphaOf(bg) > 0.03) kidUnder = null;
        const kidParent = boxUnit || parent;
        const kidFlow = madeText || flowPiece || this.flowRoots.has(el);
        const kidHid = hid || s.visibility !== "visible";
        for (const k of el.children) visit(k, kidParent, isFixed, kidUnder, kidFlow, kidHid);
        if (el.shadowRoot) for (const k of el.shadowRoot.children) visit(k, kidParent, isFixed, kidUnder, kidFlow, kidHid);
      };

      let pageBg = "rgb(255, 255, 255)";
      for (const e of [body, html]) {
        if (e && alphaOf(cs(e).backgroundColor) > 0.5) {
          pageBg = cs(e).backgroundColor;
          break;
        }
      }
      if (body) for (const k of body.children) visit(k, null, false, pageBg, false, false);
      return out;
    }

    // Everything still hidden on screen (decoration, wrappers, anything that isn't a
    // unit of its own), top to bottom, for the end-of-screen sweep.
    // `keep` holds the elements of pieces still to be built: they (and what's inside them)
    // stay hidden, so the sweep never gives away a piece the swarm hasn't drawn yet.
    leftovers(vTop, vBottom, keep) {
      return this.stage.peek(() => {
        const out = [];
        const all = document.body ? document.body.getElementsByTagName("*") : [];
        // faded out by the page itself (scroll-reveal, a header that appears later): not
        // decoration, just not there yet; the swarm builds it once it shows
        const faint = new Map();
        const isFaint = (el) => {
          if (!el || el === document.body) return false;
          let f = faint.get(el);
          if (f === undefined) {
            f = (parseFloat(getComputedStyle(el).opacity) < 0.04 && !this.stage.fading.has(el)) || isFaint(el.parentElement);
            faint.set(el, f);
          }
          return f;
        };
        for (let i = 0; i < all.length && out.length < 4000; i++) {
          const el = all[i];
          if (el === this.host || SKIP.has(el.localName) || this.stage.shown(el) || el.closest(`[${GHOST}]`)) continue;
          if (keep && keep.size && within(el, keep)) continue;
          const r = el.getBoundingClientRect();
          // no box (display:none, an image still loading): nothing to sweep in yet
          if (r.width < 1 || r.height < 1) continue;
          if (r.bottom < vTop || r.top > vBottom) continue;
          // hidden by the page itself (a closed menu, a dialog): showing it would force it
          // open, since a shown element is made visible over the page's own styles
          if (getComputedStyle(el).visibility !== "visible" || isFaint(el)) continue;
          out.push({ el, y: r.top });
        }
        return out.sort((a, b) => a.y - b.y);
      });
    }
  }

  // ---------------------------------------------------------------------- styles

  const STYLE = `
:host{all:initial}
*{box-sizing:border-box}
canvas{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;cursor:default}
canvas.off{pointer-events:none}
.hud{display:none !important}
.hud.on{display:none !important}
.hud .mark{width:26px;height:26px;flex:none;display:block}
.hud .bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.06);overflow:hidden}
.hud .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#FF5A6E,#A46BFF 55%,#3D9BFF);transition:width .35s ease}
.hud button.snd{display:flex;align-items:center;gap:6px;padding:7px 9px}
.hud button.snd.off{color:#7D8496}
.hud button.snd.tap{background:#2F6BFF;animation:hudpulse 1.6s ease-in-out infinite}
@keyframes hudpulse{50%{box-shadow:0 0 0 4px rgba(47,107,255,.3)}}
.meta{display:flex;flex-direction:column;gap:4px;padding:0 8px 0 4px;min-width:108px}
.meta .t{font-weight:650;color:#fff;display:flex;align-items:center;gap:6px}
.meta .t i{width:7px;height:7px;border-radius:50%;background:#19D3A2;flex:none;animation:livepulse 1.8s ease-out infinite}
@keyframes livepulse{0%{box-shadow:0 0 0 0 rgba(25,211,162,.55)}100%{box-shadow:0 0 0 6px rgba(25,211,162,0)}}
.crew{display:none}
.crew .site{position:absolute;left:0;top:1px;width:22px;height:22px;border-radius:50%;background:#F1F2F5;display:grid;place-items:center;overflow:hidden;box-shadow:0 0 0 2px #181A24;color:#14151C;font:750 11px/1 ${SANS};text-transform:uppercase}
.crew .site img{width:14px;height:14px;object-fit:contain;filter:grayscale(1) contrast(1.15)}
.crew .av{--x:0px;--s:.4;position:absolute;left:0;top:1px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 11px/1 ${SANS};box-shadow:0 0 0 2px #181A24;opacity:0;transform:translateX(var(--x)) scale(var(--s));transition:transform .5s cubic-bezier(.3,1.3,.4,1),opacity .3s ease}
.crew .av.in{--s:1;opacity:1}
.crew .more{--x:0px;position:absolute;left:0;top:1px;height:22px;min-width:22px;padding:0 6px;border-radius:11px;display:grid;place-items:center;background:#2A2D3B;color:#C9CED9;font:650 10px/1 ${SANS};font-variant-numeric:tabular-nums;box-shadow:0 0 0 2px #181A24;transform:translateX(var(--x));transition:transform .5s cubic-bezier(.3,1.3,.4,1),opacity .3s ease}
.crew .more[hidden]{display:grid;opacity:0}
@media (prefers-reduced-motion:reduce){.crew .av,.crew .more{transition:opacity .2s}.meta .t i{animation:none}}
.meta .s{color:#9CA3B4;font:500 11px/1 ${SANS};font-variant-numeric:tabular-nums}
.hud button{all:unset;cursor:pointer;padding:8px 11px;border-radius:10px;color:#F4F5F8;background:rgba(255,255,255,.07);font:550 12px/1 ${SANS};transition:background .15s,color .15s}
.hud button:hover{background:rgba(255,255,255,.14)}
.hud button:focus-visible{outline:2px solid #2F6BFF;outline-offset:1px}
.hud button.on{background:#2F6BFF;color:#fff}
.hud button.on:hover{background:#4A7FFF}
.hud button.pri{background:linear-gradient(90deg,#FF5A6E,#A46BFF 55%,#3D9BFF);color:#fff;font-weight:650}
.hud button[hidden]{display:none}
.hud .x{padding:8px 10px;color:#9CA3B4;background:transparent}
.hud{}
.hud.dragging{cursor:grabbing;transition:opacity .45s ease}
.hud.placed{bottom:auto;transform:translate(0,14px)}
.hud.placed.on{transform:none}
.hud.on.gone{opacity:0;pointer-events:none;transform:translate(-50%,14px)}
.hud.placed.on.gone{transform:translate(0,14px)}
.hud .ico{display:inline-flex;align-items:center;justify-content:center;padding:6px 8px}
.hud .ico svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,10px);padding:9px 14px;border-radius:12px;background:rgba(16,17,22,.86);color:#F4F5F8;font:500 12px/1.2 ${SANS};box-shadow:0 14px 36px rgba(0,0,0,.28);opacity:0;pointer-events:none;transition:opacity .35s ease,transform .35s ease;white-space:nowrap}
.toast.on{opacity:1;transform:translate(-50%,0)}
.toast kbd{font:650 11px/1 ${SANS};padding:3px 6px;border-radius:6px;background:rgba(255,255,255,.14);margin:0 2px}
`;

  // A soft mallet instrument in D. Every finished piece of the page plays one note of
  // the D minor pentatonic on a gentle 8th-note grid, so a busy swarm comes out as a
  // calm generative melody: big sections low, small things high, pitch rising left to
  // right, panned to where the cursor is. Typing is light laptop-key taps, clicks are
  // trackpad taps. All synthesized; no audio files.
  const PENTA = [0, 3, 5, 7, 10]; // D F G A C
  const E2 = 38; // D2: the root (name kept for the engine's call sites)
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let soundPref = true;
  const SPK_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6v4h2.5l3.5 3V3L5 6z" fill="currentColor"/>';

  class Sound {
    constructor() {
      this.on = soundPref;
      this.ctx = null;
      this.bpm = 92;
      this.slots = new Map();
      this.lastKey = new Map();
      this.keyTimes = [];
      this.pressTimes = [];
      this.ends = []; // when each sounding piano voice dies out
      this.fakeNow = null; // offline renders drive the clock explicitly
    }

    init(offline) {
      if (this.ctx) return true;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = offline || new Ctx({ latencyHint: "interactive" });
      } catch (_) {
        return false;
      }
      const ctx = this.ctx;
      const out = ctx.createGain();
      out.gain.value = this.on ? 1 : 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 14;
      comp.ratio.value = 5;
      comp.attack.value = 0.003;
      comp.release.value = 0.3;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(out);
      out.connect(ctx.destination);
      const verb = ctx.createConvolver();
      verb.buffer = this.impulse(2.1, 3.2);
      const wet = ctx.createGain();
      wet.gain.value = 0.36;
      verb.connect(wet);
      wet.connect(master);
      this.out = out;
      this.master = master;
      this.verb = verb;
      this.noiseBuf = this.noise(1.5);
      this.t0 = this.now();
      return true;
    }

    now() {
      return this.fakeNow != null ? this.fakeNow : this.ctx.currentTime;
    }

    // Generated room: decaying stereo noise, darkened as it rings out.
    impulse(secs, decay) {
      const sr = this.ctx.sampleRate;
      const n = Math.floor(sr * secs);
      const b = this.ctx.createBuffer(2, n, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const k = i / n;
          const a = 0.55 - 0.4 * k; // lowpass closes over time: warm tail
          lp += a * (Math.random() * 2 - 1 - lp);
          d[i] = lp * Math.pow(1 - k, decay) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
        }
      }
      return b;
    }

    noise(secs) {
      const sr = this.ctx.sampleRate;
      const b = this.ctx.createBuffer(1, Math.floor(sr * secs), sr);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }

    setOn(on) {
      this.on = soundPref = on;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setTargetAtTime(on ? 1 : 0, t, 0.05);
      if (on) this.resume();
    }

    resume() {
      if (this.ctx && this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume().catch(() => {});
    }

    get blocked() {
      return !!this.ctx && this.ctx.state !== "running" && this.fakeNow == null;
    }

    log(fn, args) {
      if (Array.isArray(window.__swarmSfxLog)) window.__swarmSfxLog.push({ t: performance.now() / 1000, fn, args });
    }

    ready() {
      return this.ctx && this.on && (this.fakeNow != null || this.ctx.state === "running");
    }

    // next 16th-note on the grid (or 8th for slow, low events)
    grid(div = 4) {
      const step = 60 / this.bpm / div;
      const now = this.now() + 0.015;
      const k = Math.ceil((now - this.t0) / step);
      return { when: this.t0 + k * step, slot: `${div}:${k}` };
    }

    pan(x, vw) {
      return clamp((x / Math.max(1, vw)) * 1.6 - 0.8, -0.8, 0.8);
    }

    bus(when, pan, send) {
      const g = this.ctx.createGain();
      const p = this.ctx.createStereoPanner();
      p.pan.setValueAtTime(pan, when);
      g.connect(p);
      p.connect(this.master);
      if (send) {
        const s = this.ctx.createGain();
        s.gain.value = send;
        p.connect(s);
        s.connect(this.verb);
      }
      return g;
    }

    // Soft mallet (marimba-like): a warm fundamental, the bar's bright 4th and 10th
    // partials dying fast, and a felt "tock" on the attack.
    piano(midi, when, vel, pan, ring = 2.4) {
      const now = this.now();
      this.ends = this.ends.filter((e) => e > now);
      if (this.ends.length >= 24) return;
      const ctx = this.ctx;
      const f = mtof(midi);
      const v = this.bus(when, pan, 0.55);
      v.gain.value = 0.34 * vel;
      const len = Math.min(2.2, ring * 0.55);
      const parts = [
        [1, 1, 1],
        [4, 0.22, 0.16],
        [10, 0.06, 0.05],
        [2, 0.1, 0.4],
      ];
      let last = null;
      for (const [r, a, d] of parts) {
        if (f * r > 14000) continue;
        const o = ctx.createOscillator();
        o.type = r === 1 ? "triangle" : "sine";
        o.frequency.value = f * r * (1 + (Math.random() - 0.5) * 0.003);
        const g = ctx.createGain();
        const dec = Math.max(0.05, len * d);
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(a, when + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0006, when + dec);
        o.connect(g);
        g.connect(v);
        o.start(when);
        o.stop(when + dec + 0.05);
        last = o;
      }
      this.hammer(when, v, f * 0.5, 0.7);
      this.ends.push(when + len);
      if (last) last.onended = () => v.disconnect();
    }

    hammer(when, dest, f, amt) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = Math.min(5000, f * 2 + 500);
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.25 * amt, when + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0005, when + 0.03);
      src.connect(bp);
      bp.connect(g);
      g.connect(dest);
      src.start(when, Math.random());
      src.stop(when + 0.05);
    }

    // short filtered-noise ticks: typing and clicks
    tick(when, pan, freq, q, vel, len) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      const g = this.bus(when, pan, 0.06);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vel, when + 0.0008);
      g.gain.exponentialRampToValueAtTime(0.0004, when + len);
      src.connect(bp);
      bp.connect(g);
      src.start(when, Math.random() * 1.2);
      src.stop(when + len + 0.02);
      src.onended = () => g.disconnect();
    }

    // ---- events (screen coords in; all plain numbers so a log can be replayed)

    // one mechanical key: a sharp click on top of a short "thock" (deeper for space)
    clack(when, pan, space, vel = 1) {
      this.tick(when, pan, rand(2200, 3000), 3, rand(0.28, 0.36) * vel, rand(0.004, 0.007));
      this.tick(when + rand(0.0005, 0.002), pan, space ? rand(260, 340) : rand(420, 640), 1.2, (space ? 0.32 : rand(0.17, 0.23)) * vel, space ? 0.05 : rand(0.016, 0.026));
    }

    key(x, vw, id, n = 1, space = 0) {
      this.log("key", [x, vw, id, n, space]);
      if (!this.ready()) return;
      const t = this.now();
      if (t - (this.lastKey.get(id) || -1) < 0.024) return;
      this.keyTimes = this.keyTimes.filter((k) => t - k < 1);
      if (this.keyTimes.length > 80) return;
      this.lastKey.set(id, t);
      const pan = this.pan(x, vw);
      // a burst of characters in one frame becomes a quick roll of keys
      let at = t + 0.004;
      for (let k = 0; k < Math.min(n, 3) && this.keyTimes.length <= 80; k++) {
        this.keyTimes.push(t);
        this.clack(at, pan, space && k === 0, rand(0.75, 1));
        at += rand(0.018, 0.032);
      }
    }

    // a mouse button: press click, then a lighter release
    press(x, vw) {
      this.log("press", [x, vw]);
      if (!this.ready()) return;
      const t = this.now();
      this.pressTimes = this.pressTimes.filter((k) => t - k < 1);
      if (this.pressTimes.length > 40) return;
      this.pressTimes.push(t);
      const pan = this.pan(x, vw);
      this.tick(t + 0.003, pan, rand(1500, 1900), 6, 0.7, 0.01);
      this.tick(t + 0.004, pan, rand(320, 420), 1.5, 0.34, 0.032);
    }

    // a finished element: rect, image, text, line, dup, guide, edit, restyle
    place(kind, x, y, w, h, vw, vh, fs) {
      this.log("place", [kind, x, y, w, h, vw, vh, fs]);
      if (!this.ready()) return;
      // only boxes, media, duplicates and guides sing; text and lines stay percussive
      if (kind === "text" || kind === "edit" || kind === "line") return;
      const area = (w * h) / Math.max(1, vw * vh);
      let oct;
      if (kind === "text") oct = fs >= 40 ? 2 : fs >= 22 ? 3 : 4;
      else if (kind === "guide") oct = 5;
      else oct = area > 0.08 ? 1 : area > 0.015 ? 2 : area > 0.002 ? 3 : 4;
      const deg = Math.floor(clamp(x / Math.max(1, vw), 0, 0.999) * 5);
      const midi = E2 + oct * 12 + PENTA[deg];
      const { when, slot } = this.grid(2);
      const seen = this.slots.get(slot) || [];
      if (seen.length >= 1) return;
      seen.push(midi);
      this.slots.set(slot, seen);
      if (this.slots.size > 64) this.slots.delete(this.slots.keys().next().value);
      const off = y < -40 || y > vh + 40 ? 0.45 : 1;
      const pan = this.pan(x, vw);
      const vel = ({ rect: 0.55, image: 0.5, dup: 0.5, guide: 0.3, restyle: 0.34 }[kind] || 0.4) * 0.42;
      const ring = oct <= 1 ? 3.6 : oct >= 4 ? 1.6 : 2.4;
      this.piano(midi, when, vel * off, pan, ring);
      if (kind === "image") this.piano(midi + (PENTA[(deg + 2) % 5] - PENTA[deg] + 12) % 12, when + 0.04, vel * 0.6 * off, pan, ring);
      if (kind === "dup") this.piano(E2 + 12 + (deg % 2 ? 7 : 0), when, 0.15 * off, pan * 0.5, 2.8);
    }

    // headings stepping up in size: a little rising run
    grow(step, x, vw) {
      this.log("grow", [step, x, vw]);
      if (!this.ready()) return;
      const t = this.now() + 0.004;
      this.tick(t, this.pan(x, vw), 2400 + step * 260, 5, 0.12, 0.01);
    }

    snap(x, vw) {
      this.log("snap", [x, vw]);
      if (!this.ready()) return;
      const t = this.now() + 0.004;
      const pan = this.pan(x, vw);
      this.tick(t, pan, 2600, 8, 0.7, 0.022);
      this.tick(t + 0.001, pan, 700, 3, 0.36, 0.042);
    }

    // the page clearing: a quick rising sparkle over a soft open fifth
    intro() {
      this.log("intro", []);
      if (!this.ready()) return;
      const t = this.now() + 0.03;
      [E2 + 24, E2 + 31, E2 + 36, E2 + 39, E2 + 43, E2 + 48].forEach((m, i) => this.piano(m, t + i * 0.07, 0.16 - i * 0.012, -0.5 + i * 0.2, 1.8));
      for (const [m, d] of [[E2 + 12, 0], [E2 + 19, 0.1]]) this.pad(m, t + 0.2 + d, 0.05, 2.2);
    }

    pad(midi, when, vel, len) {
      const ctx = this.ctx;
      const g = this.bus(when, 0, 0.9);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vel, when + len * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0005, when + len);
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = mtof(midi);
        o.detune.value = det;
        o.connect(g);
        o.start(when);
        o.stop(when + len + 0.05);
      }
    }

    // the swarm fans out: E G# B E arpeggio on the grid
    start() {
      this.log("start", []);
      if (!this.ready()) return;
      const { when } = this.grid(4);
      const step = 60 / this.bpm / 4;
      [E2 + 31, E2 + 27, E2 + 24, E2 + 31, E2 + 36].forEach((m, i) => this.piano(m, when + i * step * 1.5, 0.32, -0.5 + i * 0.25, 1.8));
    }

    // the last chord rings: E major add9, strummed
    finale() {
      this.log("finale", []);
      if (!this.ready()) return;
      const { when } = this.grid(2);
      const chord = [E2, E2 + 7, E2 + 12, E2 + 15, E2 + 19, E2 + 22, E2 + 26, E2 + 31, E2 + 36];
      chord.forEach((m, i) => this.piano(m, when + i * 0.055, 0.32 - i * 0.016, -0.6 + (i / chord.length) * 1.2, 4.4));
      this.pad(E2 + 12, when, 0.05, 5);
    }

    // back to the real page: a falling sweep
    release() {
      this.log("release", []);
      if (!this.ready()) return;
      const ctx = this.ctx;
      const t = this.now() + 0.01;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(3600, t + 0.9);
      const g = this.bus(t, 0, 0.5);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
      src.connect(bp);
      bp.connect(g);
      src.start(t);
      src.stop(t + 1.2);
      this.piano(E2 + 24, t + 0.08, 0.26, -0.2, 2);
      this.piano(E2 + 31, t + 0.16, 0.2, 0.2, 2);
    }

    close(after = 0) {
      if (!this.ctx || this.fakeNow != null) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(this.out.gain.value, t);
      this.out.gain.linearRampToValueAtTime(0, t + Math.max(0.05, after));
      setTimeout(() => ctx.close().catch(() => {}), (after + 0.2) * 1000);
    }
  }

  // ------------------------------------------------------------------------- app

  class App {
    constructor() {
      this.env = new Env();
      this.stage = new Stage();
      this.dead = false;
      this.speed = reduced() ? 3 : 0.5;
      this.tour = true; // on by default: glide through the page on its own
      this.units = [];
      this.waiting = [];
      this.active = [];
      this.bands = []; // finished rows of the page, content px
      this.scanned = [];
      this.sweep = null;
      this.reveals = [];
      this.jump = null;
      this.frontier = -Infinity;
      this.done = 0;
      this.time = 0;
      this.intro = 0;
      this.hidden = false;
      this.outro = null;
      this.lastTop = null;
      this.speedPx = 0;
      this.restFor = 0;
      this.dwell = 0;
      this.nibs = [];
      this.dt = 0;
      this.startedAt = performance.now();
      this.pageBg = this.readPageBg();
      this.dark = luminance(this.pageBg) < 0.45;
      this.mount();
      this.scanner = new Scanner(this.env, this.host, this.stage);
      this.makeNibs();
      this.sfx = new Sound();
      this.sfx.init();
      this.bind();
      this.renderSoundBtn();
      this.sfx.intro();
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    readPageBg() {
      for (const e of [document.body, document.documentElement]) {
        if (!e) continue;
        const c = getComputedStyle(e).backgroundColor;
        if (alphaOf(c) > 0.5) return c;
      }
      return "rgb(255, 255, 255)";
    }

    mount() {
      for (const old of document.querySelectorAll("swarmline-layer")) old.remove();
      const host = document.createElement("swarmline-layer");
      host.style.cssText = "all:initial !important;position:fixed !important;inset:0 !important;z-index:2147483647 !important;display:block !important;visibility:visible !important;pointer-events:none !important;contain:strict !important;";
      const root = host.attachShadow({ mode: "closed" }); // page scripts can't reach in
      root.innerHTML = `<style>${STYLE}</style>
<canvas aria-hidden="true"></canvas>
<div class="hud" role="toolbar" aria-label="Swarmline">
  <svg class="mark" viewBox="0 0 128 128" aria-hidden="true"><defs><linearGradient id="swl-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5470"/><stop offset=".52" stop-color="#9B4DFF"/><stop offset="1" stop-color="#2E6BFF"/></linearGradient></defs><rect width="128" height="128" rx="30" fill="url(#swl-g)"/><path d="M86 56 V44 a12 12 0 0 0 -12 -12 H32 a12 12 0 0 0 -12 12 V84 a12 12 0 0 0 12 12 H62" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M35 62 H64" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M82 60 L82 93.6 L90.5 86 L96.1 98.5 L102.6 95.6 L97 83.3 L108.2 83.1 Z" fill="#fff" stroke="#24104F" stroke-width="3" stroke-linejoin="round"/></svg>
  <div class="meta" aria-live="polite"><span class="t"><i aria-hidden="true"></i><b>Live agents</b></span><span class="s">joining…</span></div>
  <div class="crew" aria-hidden="true"><span class="site"></span><span class="more" hidden></span></div>
  <button data-a="tour" class="${this.tour ? "on" : ""}" aria-pressed="${this.tour}" title="Glide down the page as it's built (T)">Auto-tour</button>
  <button data-a="speed" title="Build speed" aria-label="Build speed 1×">1×</button>
  <button data-a="sound" class="snd" title="Sound (M)" aria-label="Sound (M)"></button>
  <button data-a="finish" title="Show the finished page now (F)">Finish</button>
  <button data-a="replay" class="pri" hidden title="Build the page again">Replay</button>
  <button data-a="hide" class="ico" title="Hide the controls for a clean recording (H) · drag the bar to move it" aria-label="Hide controls"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>
  <button data-a="close" class="x" title="Exit (Esc)" aria-label="Exit Swarmline">✕</button>
  <div class="bar" aria-hidden="true"><i></i></div>
</div>
<div class="toast" role="status"></div>`;
      document.documentElement.appendChild(host);
      this.host = host;
      this.root = root;
      this.cv = root.querySelector("canvas");
      this.g = this.cv.getContext("2d");
      this.hud = root.querySelector(".hud");
      this.$ = (s) => root.querySelector(s);
      this.$('[data-a="speed"]').textContent = this.speed + "×";
      this.toast = root.querySelector(".toast");
      this.resize();
      if (prefs.hudPos) this.placeHud(prefs.hudPos.x, prefs.hudPos.y);
      if (prefs.hudHidden) this.hud.classList.add("gone");
    }

    // ---------------------------------------------------------------- toolbar

    // hide or show the controls (H), e.g. for a clean screen recording
    setHud(show, quiet) {
      prefs.hudHidden = !show;
      this.hud.classList.toggle("gone", !show);
      if (!show && !quiet) this.say("Controls hidden · press <kbd>H</kbd> to bring them back");
    }

    say(html, ms = 2200) {
      const t = this.toast;
      t.innerHTML = html;
      t.classList.add("on");
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove("on"), ms);
    }

    // put the bar at a spot on screen (kept inside the window)
    placeHud(x, y) {
      const h = this.hud;
      const w = h.offsetWidth || 560;
      const ht = h.offsetHeight || 44;
      const px = clamp(x, 8, Math.max(8, innerWidth - w - 8));
      const py = clamp(y, 8, Math.max(8, innerHeight - ht - 8));
      h.classList.add("placed");
      h.style.left = px + "px";
      h.style.top = py + "px";
      prefs.hudPos = { x: px, y: py };
    }

    resetHud() {
      const h = this.hud;
      h.classList.remove("placed");
      h.style.left = "";
      h.style.top = "";
      prefs.hudPos = null;
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.dpr = dpr;
      this.W = innerWidth;
      this.H = innerHeight;
      this.cv.width = Math.round(this.W * dpr);
      this.cv.height = Math.round(this.H * dpr);
    }

    bind() {
      const on = (t, ev, fn, o) => {
        t.addEventListener(ev, fn, o);
        (this.unbinds || (this.unbinds = [])).push(() => t.removeEventListener(ev, fn, o));
      };
      on(window, "resize", () => {
        this.resize();
        if (prefs.hudPos) this.placeHud(prefs.hudPos.x, prefs.hudPos.y);
      });
      on(window, "pagehide", () => stop(true));
      on(window, "pointermove", (e) => {
        if (e.pointerType === "touch") return;
        this.mouse = { x: e.clientX, y: e.clientY };
      }, { passive: true, capture: true });
      on(window, "wheel", () => {
        if (this.jump) this.jump = null; // the reader took over
        this.userHold = this.time + 2.5; // the camera waits for them, then glides on
        this.cruise = 0;
      }, { passive: true });
      if (this.env.el) {
        on(this.cv, "wheel", (e) => {
          e.preventDefault();
          this.jump = null;
          this.userHold = this.time + 2.5;
          this.cruise = 0;
          this.env.el.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "instant" });
        }, { passive: false });
      }
      on(window, "keydown", (e) => {
        const tgt = e.composedPath()[0];
        if (tgt && (tgt.isContentEditable || /^(input|textarea|select)$/i.test(tgt.localName || ""))) return;
        if (e.key === "Escape") {
          e.stopPropagation();
          stop();
        } else if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey && !this.outro) this.setTour(!this.tour);
        else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) this.finish();
        else if ((e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey && !e.altKey) this.setHud(prefs.hudHidden);
        else if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.sfx.setOn(!this.sfx.on);
          this.renderSoundBtn();
        }
        this.unlockSound();
      }, true);
      // browsers only let audio start after a click or key press on the page
      on(window, "pointerdown", () => this.unlockSound(), true);
      // drag the bar anywhere (double-click puts it back at the bottom)
      let drag = null;
      on(this.hud, "pointerdown", (e) => {
        if (e.button !== 0 || e.target.closest("button")) return;
        const r = this.hud.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
        this.hud.setPointerCapture(e.pointerId);
        this.hud.classList.add("dragging");
        e.preventDefault();
      });
      on(this.hud, "pointermove", (e) => {
        if (drag && e.pointerId === drag.id) this.placeHud(e.clientX - drag.dx, e.clientY - drag.dy);
      });
      const endDrag = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        this.hud.classList.remove("dragging");
      };
      on(this.hud, "pointerup", endDrag);
      on(this.hud, "pointercancel", endDrag);
      on(this.hud, "dblclick", (e) => {
        if (!e.target.closest("button")) this.resetHud();
      });
      on(this.hud, "click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const a = b.dataset.a;
        if (a === "close") stop();
        else if (a === "hide") this.setHud(false);
        else if (a === "sound") {
          if (this.sfx.on && this.sfx.blocked) this.sfx.resume();
          else this.sfx.setOn(!this.sfx.on);
          setTimeout(() => this.renderSoundBtn(), 60);
        }
        else if (a === "tour") this.setTour(!this.tour);
        else if (a === "finish") this.finish();
        else if (a === "replay") replay();
        else if (a === "speed") {
          this.speed = this.speed >= 2 ? 0.5 : this.speed * 2;
          b.textContent = this.speed + "×";
          b.setAttribute("aria-label", `Build speed ${this.speed}×`);
        }
      });
    }

    unlockSound() {
      if (this.dead || !this.sfx || !this.sfx.blocked) return;
      this.sfx.resume();
      setTimeout(() => this.renderSoundBtn(), 80);
    }

    renderSoundBtn() {
      const b = this.$('[data-a="sound"]');
      if (!b || !this.sfx) return;
      const tap = this.sfx.on && this.sfx.blocked;
      const key = this.sfx.on ? (tap ? "tap" : "on") : "off";
      if (b._k === key) return;
      b._k = key;
      b.classList.toggle("off", key === "off");
      b.classList.toggle("tap", tap);
      const waves = '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8"/>';
      const mute = '<path d="M11 6l4 4M15 6l-4 4"/>';
      b.innerHTML = `${SPK_ICON}${key === "off" ? mute : waves}</svg>${tap ? "<span>Tap for sound</span>" : ""}`;
      b.title = key === "off" ? "Sound off (M)" : "Sound on (M)";
      b.setAttribute("aria-label", tap ? "Tap for sound (M)" : b.title);
    }

    setTour(on) {
      this.tour = on;
      this.dwell = 0;
      if (!on) this.jump = null;
      const b = this.$('[data-a="tour"]');
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }

    // ---------------------------------------------------------------- bands

    covered(a, b) {
      for (const k of this.bands) if (k.top <= a + 1 && k.bottom >= b - 1) return true;
      return false;
    }
    gapIn(a, b) {
      let y = a;
      for (const k of this.bands) {
        if (k.bottom <= y) continue;
        if (k.top > y + 1) return { top: y, bottom: Math.min(b, k.top) };
        y = Math.max(y, k.bottom);
        if (y >= b - 1) return null;
      }
      return y < b - 1 ? { top: y, bottom: b } : null;
    }
    addBand(list, top, bottom) {
      list.push({ top, bottom });
      list.sort((p, q) => p.top - q.top);
      const out = [];
      for (const k of list) {
        const l = out[out.length - 1];
        if (l && k.top <= l.bottom + 1) l.bottom = Math.max(l.bottom, k.bottom);
        else out.push({ ...k });
      }
      return out;
    }
    // the elements of every piece not yet built (waiting, or under way); the set is live:
    // pieces registered later add themselves through register()
    unbuilt() {
      const keep = new Set();
      for (const u of this.waiting) if (u.state === 0 && u.el && u.kind !== "guide") keep.add(u.el);
      for (const u of this.active) if (u.el && u.kind !== "guide") keep.add(u.el);
      return keep;
    }
    scannedCovers(a, b) {
      for (const k of this.scanned) if (k.top <= a + 1 && k.bottom >= b - 1) return true;
      return false;
    }

    // ---------------------------------------------------------------- units

    register(list) {
      const fresh = list.slice();
      for (const u of list) {
        this.units.push(u);
        // already on the page (an earlier sweep put it back): nothing to build
        if (this.stage.shown(u.el)) this.complete(u, true);
        else {
          this.waiting.push(u);
          if (this.sweep && this.sweep.keep && u.el) this.sweep.keep.add(u.el);
        }
      }
      try {
        this.findRepeats(fresh);
      } catch (err) {
        console.error("[swarmline] repeats", err);
      }
      try {
        this.findGuides(fresh);
      } catch (err) {
        console.error("[swarmline] guides", err);
      }
      this.waiting.sort((a, b) => (a.fixed !== b.fixed ? (a.fixed ? -1 : 1) : a.y - b.y || a.id - b.id));
    }

    // ---------------------------------------------------------------- repeats
    // Cards in a grid, rows in a list, items in a menu: build the first one, then
    // duplicate it into the next slot and edit only what differs.
    findRepeats(list) {
      if (!this.groups) {
        this.groups = new Map(); // parent element -> Map(signature -> group)
        this.roleOf = new WeakMap(); // component element -> "master" | job
        this.dupCount = 0;
      }
      const v = this.env.view();
      const top = this.env.top;
      const unitsIn = new Map();
      for (const u of list) {
        if (u.state !== 0 || u.fixed) continue;
        let e = u.el;
        for (let d = 0; e && e !== document.body && d < 9; d++, e = e.parentElement) {
          let a = unitsIn.get(e);
          if (!a) unitsIn.set(e, (a = []));
          a.push(u);
        }
      }
      const depth = (e) => {
        let d = 0;
        for (; e; e = e.parentElement) d++;
        return d;
      };
      const parents = [...new Set([...unitsIn.keys()].map((e) => e.parentElement).filter(Boolean))].sort((a, b) => depth(a) - depth(b));
      const ratio = (a, b) => Math.max(a, b) / Math.max(1, Math.min(a, b));
      const insideCopy = (e) => {
        for (let p = e; p; p = p.parentElement) {
          const r = this.roleOf.get(p);
          if (r && r !== "master") return true;
        }
        return false;
      };
      for (const P of parents) {
        if (P === document.body || P === document.documentElement || insideCopy(P)) continue;
        const buckets = new Map();
        for (const c of P.children) {
          const us = unitsIn.get(c);
          if (!us || !us.length || this.roleOf.has(c)) continue;
          // a lone line of text is typed, not duplicated, unless it's a short item in a row
          // (nav links, tags): headings, sentences and stacked lines are typed letter by letter
          const lone = us.length === 1 && us[0].kind === "text";
          if (lone && (c.textContent.trim().length > 24 || (us[0].fs || 16) >= 22)) continue;
          const r = c.getBoundingClientRect();
          if (r.width < 14 || r.height < 12 || r.height > v.h * 0.8 || r.width > v.w * 0.96) continue;
          if (getComputedStyle(c).translate !== "none") continue;
          const counts = {};
          for (const u of us) counts[u.kind] = (counts[u.kind] || 0) + 1;
          const sig = c.localName + "|" + (c.getAttribute("class") || "") + "|" + Object.keys(counts).sort().map((k) => k + counts[k]).join("");
          if (!buckets.has(sig)) buckets.set(sig, []);
          buckets.get(sig).push({ c, r, us, loose: us.length === 1 && us[0].kind === "text" });
        }
        let known = this.groups.get(P);
        if (!known) this.groups.set(P, (known = new Map()));
        for (const [sig, found] of buckets) {
          found.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
          let g = known.get(sig);
          let rest = found;
          if (!g) {
            if (found.length < 2) continue;
            const m = found[0];
            if (m.loose && !found.slice(1).some((k) => Math.abs(k.r.top - m.r.top) < 6)) continue; // a column of lines: typed
            g = { master: m.c, masterUnits: m.us, mw: m.r.width, mh: m.r.height, mTop: m.r.top, copies: [], loose: m.loose };
            known.set(sig, g);
            this.roleOf.set(m.c, "master");
            rest = found.slice(1);
          }
          for (const k of rest) {
            if (ratio(k.r.height, g.mh) >= 1.8 || (!g.loose && ratio(k.r.width, g.mw) >= 1.6)) continue;
            if (g.loose && Math.abs(k.r.top - g.mTop) > 6) continue;
            if (k.us.some((u) => u.state !== 0)) continue;
            this.makeDup(g, k, v, top);
          }
        }
      }
    }

    // ---------------------------------------------------------------- guides
    // Text that lines up (three or more blocks sharing a left edge, or a row sharing a top)
    // gets a red guide pulled out of the ruler; the biggest of those texts is then typed a
    // little off and dragged onto the guide until it snaps.
    findGuides(list) {
      if (!this.guides) this.guides = [];
      if (this.guides.length >= 16) return;
      const texts = list.filter((u) => u.kind === "text" && u.state === 0 && !u.fixed && !u.inCopy && u.fs >= 13 && u.w > 30);
      const byX = new Map();
      for (const u of texts) {
        const k = Math.round(u.left0);
        if (!byX.has(k)) byX.set(k, []);
        byX.get(k).push(u);
      }
      let best = null;
      for (const [x, l] of byX) if (l.length >= 3 && (!best || l.length > best[1].length)) best = [x, l];
      if (best) {
        const top = Math.min(...best[1].map((m) => m.y));
        const members = best[1].filter((m) => m.y < top + 450).sort((a, b) => b.fs - a.fs).slice(0, 2);
        this.addGuide("x", best[0], members, Math.min(...members.map((m) => m.y)) - 30);
      }
      const byY = new Map();
      for (const u of texts) {
        const k = Math.round(u.y);
        if (!byY.has(k)) byY.set(k, []);
        byY.get(k).push(u);
      }
      let row = null;
      for (const [y, l] of byY) if (l.length >= 3 && (!row || l.length > row[1].length)) row = [y, l];
      if (row && this.guides.length < 16) {
        const m = row[1].find((u) => !u.snap);
        if (m) this.addGuide("y", row[0], [m], row[0] - 30);
      }
    }

    addGuide(axis, pos, members, gy) {
      // axis "x": pos is a screen x; axis "y": pos is a page y
      const g = { axis, pos, cur: pos, op: 0, flash: 0, dragging: false, vis: false, members, doneT: null };
      const job = {
        id: -(2e6 + this.guides.length), kind: "guide", g, el: document.documentElement, parent: null, fixed: false,
        state: 0, phase: 0, p: 0, typed: 0, step: 0, st: 0, y: gy, w: 1, h: 1, left0: 0, top0: 0,
        rad: [0, 0, 0, 0], lead: null, r: rand(-0.15, 0.15),
      };
      g.job = job;
      for (const m of members) m.snap = g;
      this.guides.push(g);
      this.waiting.push(job);
    }

    // a guide: to the ruler, wait for it, then pull the line out to where the text aligns
    stepGuide(u, T, dt) {
      const g = u.g;
      if (u.step === 0) {
        if (this.arrived(u, "from", dt)) u.step = 1;
      } else if (u.step === 1) {
        if (this.rulers.t > 0.95) {
          this.press(u);
          g.vis = true;
          g.dragging = true;
          g.op = 1;
          g.shownAt = this.time;
          u.step = 2;
        }
      } else if (u.step === 2) {
        if (this.arrived(u, "pull", dt)) {
          g.cur = g.pos;
          g.dragging = false;
          if (this.sfx && u.lead) this.sfx.place("guide", u.lead.x, u.lead.y, 1, 1, this.W, this.H, 0);
          u.step = 3;
          u.st = 0;
        }
      } else {
        u.st += T;
        if (u.st >= 0.25) {
          u.state = 2;
          this.release(u);
        }
      }
    }

    // move a text block off (or back onto) its true place
    setShift(u, x, y) {
      u.shx = x;
      u.shy = y;
      if (x || y) this.shiftEl(u.el, x, y);
      else this.unshift(u.el);
    }

    // while a text is dragged onto its guide it snaps once it's within 9px
    dragSnap(u) {
      const n = u.lead;
      const R = this.liveRect(u);
      if (!n || n.unit !== u || !R || !u.rel) return;
      const bx = R.x - (u.shx || 0);
      const by = R.y - (u.shy || 0);
      let h = n.x - (bx + u.rel[0]);
      let v = n.y - (by + u.rel[1]);
      const g = u.snap;
      const hit = (d, was) => {
        if (Math.abs(d) >= 9) return d;
        if (d !== 0 && was !== 0) {
          if (g.flash < 0.5 && this.sfx) this.sfx.snap(n.x, this.W);
          g.flash = 1;
        }
        return 0;
      };
      if (g.axis === "x") h = hit(h, u.shx || 0);
      else v = hit(v, u.shy || 0);
      this.setShift(u, h, v);
    }

    makeDup(g, k, v, top) {
      const job = {
        id: -(++this.dupCount), kind: "dup", el: k.c, group: g, parent: null, fixed: false,
        state: 0, phase: 0, p: 0, typed: 0, step: 0, st: 0, done: false,
        y: k.r.top - v.y + top, w: k.r.width, h: k.r.height, top0: k.r.top, left0: k.r.left,
        rad: [0, 0, 0, 0], lead: null, units: k.us,
      };
      this.roleOf.set(k.c, job);
      // what the copy shares with the original comes along with it; what differs is edited after
      const pathTo = (root, el) => {
        const p = [];
        for (let e = el; e && e !== root; e = e.parentElement) p.unshift([...e.parentElement.children].indexOf(e));
        return p;
      };
      const follow = (root, p) => {
        let e = root;
        for (const i of p) e = e && e.children[i];
        return e || null;
      };
      for (const u of k.us) {
        u.inCopy = job;
        const twin = follow(g.master, pathTo(k.c, u.el));
        let alike = !!twin && twin.localName === u.el.localName;
        if (alike && u.kind === "text") alike = twin.textContent.trim() === u.el.textContent.trim();
        else if (alike && u.kind === "media" && u.el.localName === "img") alike = (twin.currentSrc || twin.src) === (u.el.currentSrc || u.el.src);
        else if (alike && u.kind === "media" && u.el.localName === "svg") alike = twin.innerHTML.length === u.el.innerHTML.length;
        else if (alike && u.kind === "box") {
          const a = getComputedStyle(twin);
          const b = getComputedStyle(u.el);
          alike = sameColor(a.backgroundColor, b.backgroundColor) && sameColor(a.borderTopColor, b.borderTopColor) && a.backgroundImage === b.backgroundImage;
        }
        u.dupSame = alike;
        u.twinPath = pathTo(k.c, u.el);
      }
      g.copies.push(job);
      this.waiting.push(job);
    }

    // the duplicate can start once something to copy from is finished and on screen
    dupSource(job) {
      const g = job.group;
      const ready = [];
      if (g.masterUnits.every((u) => u.state === 2)) ready.push(g.master);
      for (const c of g.copies) if (c.done && c.state === 2 && c.units.every((x) => x.state === 2)) ready.push(c.el);
      if (!ready.length) return undefined; // not yet
      const D = job.el.getBoundingClientRect();
      let best = null;
      let bd = Infinity;
      for (const e of ready) {
        const r = e.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        const d = Math.hypot(r.left - D.left, r.top - D.top);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      return best; // null: nothing visible to copy from
    }

    // Move an element off its place without touching the layout. Elements in normal flow are
    // offset with relative positioning rather than a transform (no extra compositing layer
    // on text that is also clipped while it's typed). Already-positioned elements (sticky,
    // absolute, fixed) keep a translate, so their own left/top keep meaning what they did.
    shiftEl(el, x, y) {
      if (!this.shifted) this.shifted = new Map();
      let rec = this.shifted.get(el);
      if (!rec) {
        const rel = getComputedStyle(el).position === "static";
        const props = rel ? ["position", "left", "top"] : ["translate"];
        rec = { rel, prev: props.map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]), v: "" };
        this.shifted.set(el, rec);
        if (rel) el.style.setProperty("position", "relative", "important");
      }
      const v = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      if (rec.v === v) return; // unchanged: no style write, no relayout
      rec.v = v;
      if (rec.rel) {
        el.style.setProperty("left", x.toFixed(1) + "px", "important");
        el.style.setProperty("top", y.toFixed(1) + "px", "important");
      } else el.style.setProperty("translate", v, "important");
    }

    unshift(el) {
      const rec = this.shifted && this.shifted.get(el);
      if (!rec) return;
      for (const [p, val, pri] of rec.prev) {
        if (val) el.style.setProperty(p, val, pri);
        else el.style.removeProperty(p);
      }
      this.shifted.delete(el);
    }

    unshiftAll() {
      if (this.shifted) for (const el of [...this.shifted.keys()]) this.unshift(el);
      if (this.ghosts) for (const gh of [...this.ghosts]) this.dropGhost(gh);
    }

    // the duplicate, step by step: click the original, hold Alt, drag the copy out, let go
    stepDup(u, T, dt) {
      const n = u.lead;
      if (u.step === 0) {
        if (this.arrived(u, "grab", dt)) {
          this.press(u);
          u.step = 1;
          u.st = 0;
        }
        return;
      }
      u.st += T;
      if (u.step === 1 && u.st >= 0.07) {
        u.step = 15;
        u.st = 0;
        u.hold = rand(0.15, 0.3);
      } else if (u.step === 15 && u.st >= u.hold) {
        u.step = 2; // Alt down: the pointer shows it will copy
        u.st = 0;
      } else if (u.step === 2 && u.st >= 0.12) {
        const S = u.src.getBoundingClientRect();
        if (n) n.press = 1;
        // the copy looks exactly like the original while it's carried; the real element
        // takes its place on release and anything that differs is then typed in
        u.ghost = this.makeGhost(u.src, S);
        if (!u.ghost) for (const x of u.units) if (x.dupSame) this.reveal(x);
        u.step = 3;
        u.st = 0;
      } else if (u.step === 3) {
        if (this.arrived(u, "carry", dt)) {
          const edits = u.units.filter((x) => !x.dupSame && x.kind === "text");
          if (u.ghost && edits.length) this.holdGhost(u, edits);
          else {
            if (u.ghost) this.dropGhost(u.ghost);
            u.ghost = null;
          }
          for (const x of u.units) if (x.dupSame) this.complete(x, true);
          u.done = true; // now the differences can be edited in
          this.sound(u, "dup");
          u.step = 4;
          u.st = 0;
        }
      } else if (u.step === 4 && u.st >= 0.1) {
        u.step = 5;
        u.st = 0;
      } else if (u.step === 5 && u.st >= 0.35) {
        u.state = 2;
        this.release(u);
      }
    }

    // keep only the original's words of the copy on screen (over the real copy, whose own
    // words are still hidden); each is selected and retyped in turn
    holdGhost(u, edits) {
      const gh = u.ghost;
      const D = u.el.getBoundingClientRect();
      this.moveGhost(gh, D.left, D.top);
      gh.el.style.setProperty("box-shadow", "none", "important");
      for (const e of [gh.el, ...gh.el.querySelectorAll("*")]) e.removeAttribute(SHOWN);
      for (const x of edits) {
        let t = gh.el;
        for (const i of x.twinPath || []) t = t && t.children[i];
        if (!t) continue;
        for (const e of [t, ...t.querySelectorAll("*")]) e.setAttribute(SHOWN, "");
        x.ghostTwin = t;
      }
      (this.held || (this.held = new Set())).add(u);
    }

    // the old words go as the new ones are typed
    dropTwin(x) {
      const t = x.ghostTwin;
      if (!t) return;
      for (const e of [t, ...t.querySelectorAll("*")]) e.removeAttribute(SHOWN);
      x.ghostTwin = null;
      const job = x.inCopy;
      if (job && job.ghost && job.units.every((y) => y.dupSame || !y.ghostTwin)) {
        this.dropGhost(job.ghost);
        job.ghost = null;
        if (this.held) this.held.delete(job);
      }
    }

    abortDup(u) {
      if (u.ghost) this.dropGhost(u.ghost);
      u.ghost = null;
      for (const x of u.units) if (x.dupSame) this.complete(x, true);
      u.done = true;
      u.state = 2;
      this.release(u);
    }

    // the copy rides under the pointer (called after the pointers move, so it never lags)
    dragCopy(u) {
      const n = u.lead;
      if (!u.ghost || !n || n.unit !== u) return;
      this.moveGhost(u.ghost, n.x - u.grab[0], n.y - u.grab[1]);
    }

    // a look-alike of an element, as it looks right now, laid over the page
    makeGhost(src, S) {
      try {
        const el = src.cloneNode(true);
        el.setAttribute(GHOST, "");
        el.setAttribute(SHOWN, "");
        el.setAttribute("aria-hidden", "true");
        el.removeAttribute("id");
        for (const k of el.querySelectorAll("[id],[name],[autofocus]")) {
          k.removeAttribute("id");
          k.removeAttribute("name");
          k.removeAttribute("autofocus");
        }
        for (const v of el.querySelectorAll("video,audio")) {
          v.removeAttribute("autoplay");
          v.muted = true;
        }
        const set = (p, val) => el.style.setProperty(p, val, "important");
        set("position", "fixed");
        set("left", "0px");
        set("top", "0px");
        set("margin", "0");
        set("width", S.width + "px");
        set("height", S.height + "px");
        set("box-sizing", "border-box");
        set("translate", "none");
        set("transform", "none");
        set("transition", "none");
        set("animation", "none");
        set("pointer-events", "none");
        set("z-index", "2147483000");
        set("box-shadow", "0 12px 32px rgba(15,23,42,.18)");
        src.parentNode.insertBefore(el, src.nextSibling);
        // a transformed ancestor can move "fixed": measure and correct for it
        const r = el.getBoundingClientRect();
        const gh = { el, ox: -r.left, oy: -r.top };
        this.moveGhost(gh, S.left, S.top);
        (this.ghosts || (this.ghosts = new Set())).add(gh);
        return gh;
      } catch (_) {
        return null;
      }
    }

    moveGhost(gh, x, y) {
      const l = (x + gh.ox).toFixed(1);
      const t = (y + gh.oy).toFixed(1);
      if (gh.l === l && gh.t === t) return; // unchanged: no style write, no relayout
      gh.l = l;
      gh.t = t;
      gh.el.style.setProperty("left", l + "px", "important");
      gh.el.style.setProperty("top", t + "px", "important");
    }

    dropGhost(gh) {
      gh.el.remove();
      if (this.ghosts) this.ghosts.delete(gh);
    }

    // show a unit's element(s) as they are (a copy carries them along)
    reveal(x) {
      const st = this.stage;
      st.show(x.el);
      if (x.kind === "text") for (const f of x.flow) st.show(f);
      else if (x.kind === "media" || x.kind === "control") for (const k of x.el.querySelectorAll("*")) st.show(k);
    }

    complete(u, silent) {
      if (u.state === 2) return;
      if (u.kind === "guide") {
        this.release(u);
        u.state = 2;
        return;
      }
      if (u.shx || u.shy) this.setShift(u, 0, 0);
      if (u.ghostTwin) this.dropTwin(u);
      if (u.scaleWas) this.unscaleText(u);
      this.release(u);
      u.state = 2;
      u.p = 1;
      this.done++;
      const st = this.stage;
      if (u.kind === "text") {
        st.show(u.el);
        for (const f of u.flow) st.show(f);
        st.unclip(u.el);
      } else if (u.kind === "media" || u.kind === "control") {
        st.show(u.el);
        for (const k of u.el.querySelectorAll("*")) st.show(k);
      } else st.show(u.el);
    }

    liveRect(u) {
      const el = u.el;
      if (!el.isConnected) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }

    inView(u, v, top, pad = 0) {
      if (u.fixed) return true;
      const y = u.y - top + v.y;
      return y + u.h > v.y - pad && y < v.y + v.h + pad;
    }

    // a unit can start once the box it sits in has been drawn
    parentReady(u) {
      const p = u.parent;
      if (!p) return true;
      return p.state === 2 || (p.kind === "box" && p.state === 1 && p.phase >= 1);
    }

    // ---------------------------------------------------------------- frame

    frame(now) {
      if (this.dead) return;
      const dt = clamp((now - this.last) / 1000, 0, 0.05); // the first frame can be stamped before we started
      this.last = now;
      try {
        this.update(dt);
        this.draw();
        if (!this._hudT || now - this._hudT > 180) {
          this._hudT = now;
          this.updateHud();
          this.renderSoundBtn();
        }
      } catch (err) {
        console.error("[swarmline]", err);
        stop(true); // never leave a page hidden
        return;
      }
      if (!this.dead) this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    update(dt) {
      this.time += dt;
      this.dt = dt;
      const env = this.env;
      const v = env.view();
      const top = env.top;
      const sdt = dt * this.speed;
      const st = this.stage;

      const moved = this.lastTop == null ? 0 : Math.abs(top - this.lastTop);
      this.lastTop = top;
      // the tour's own camera movement doesn't count as the reader scrolling
      const own = this.ownMove || 0;
      this.ownMove = 0;
      const inst = this.jump ? 0 : Math.max(0, moved - own - 0.5) / Math.max(dt, 0.001);
      this.speedPx += (inst - this.speedPx) * (1 - Math.exp(-dt / 0.12));
      const resting = !this.jump && this.speedPx < 45;
      this.restFor = resting ? this.restFor + dt : 0;

      // intro: the page fades into a blank canvas of its own colour
      if (this.intro < 1) {
        this.intro = Math.min(1, this.intro + dt / 0.75);
        if (this.intro >= 0.45 && !this.hidden) {
          this.hidden = true;
          st.hide();
        }
        if (this.intro > 0.3) this.hud.classList.add("on");
        if (this.intro < 1) return;
        if (this.sfx) this.sfx.start();
      }

      if (this.outro) {
        this.outro.t = Math.min(1, this.outro.t + dt / 1.1);
        if (this.outro.t >= 1 && !this.outro.off) {
          this.outro.off = true;
          this.cv.classList.add("off");
        }
        return;
      }

      this.stepReveals(dt);
      this.checkDeferred(dt, top, v);
      if (this.jump) {
        const J = this.jump;
        J.t += dt;
        const k = Math.min(1, J.t / J.dur);
        env.scrollTo(Math.round(J.from + (J.to - J.from) * easeSine(k)));
        if (k >= 1) this.jump = null;
      }

      // read the page ahead of the camera: two screens' worth at a time, so content is ready
      // before it rises into view; rescan where the page settles (lazy content appears late)
      const ahead = (this.cruise || 0) > 0 && !this.scannedCovers(top - v.h * 0.05, top + v.h * 1.2);
      // while the camera glides, "settled" means every quarter screen, not every pixel
      const drift = Math.abs((this.scanTop == null ? -1e9 : this.scanTop) - top);
      const settled = this.restFor > 0.12 && ((this.cruise || 0) > 0 ? drift > v.h * 0.25 : drift >= 1 || this.scanH !== env.height);
      if (ahead || settled) {
        this.scanTop = Math.round(top);
        this.scanH = env.height;
        const band = { top: top - v.h * 0.1, bottom: top + v.h * (ahead ? 2.2 : 1.1) };
        this.register(this.scanner.scan(band));
        this.scanned = this.addBand(this.scanned, band.top, band.bottom);
      }
      if (this.scannedCovers(top, top + v.h)) this.frontier = Math.max(this.frontier, top + v.h);

      // start work in reading order, a crew at a time
      // how much is waiting on screen (drives the tempo and how many hands come in)
      let avail = 0;
      for (const w of this.waiting) {
        if (w.state !== 0 || w.fixed) continue;
        const y = w.y - top + v.y;
        if (y > v.y + v.h) break;
        if (y + w.h > v.y) avail++;
      }
      this.avail = avail;
      const slots = Math.min(this.nibs.length, 5 + Math.floor(avail / 4) + Math.floor(this.speedPx / 40));
      let busy = 0;
      for (const u of this.active) if (!(u.kind === "box" && u.phase >= 1)) busy++;
      let started = 0;
      if (resting && this.waiting.length) {
        const keep = [];
        for (const u of this.waiting) {
          if (u.state !== 0) continue;
          if (u.kind !== "dup" && u.kind !== "guide" && st.shown(u.el)) {
            this.complete(u, true);
            continue;
          }
          let go = busy < slots && (u.fixed || u.y <= this.frontier) && this.parentReady(u) && (!u.inCopy || u.inCopy.done);
          if (go && u.snap && u.snap.job.state !== 2 && (u.snapWait = (u.snapWait || 0) + dt) < 1.6) go = false;
          // up to three copies of a group at once, each from the nearest finished one
          if (go && u.kind === "dup" && u.group.copies.filter((c) => c !== u && c.state === 1).length >= 3) go = false;
          if (go && u.kind === "dup") {
            const src = this.dupSource(u);
            // the original can't finish yet (part of it is still off screen) and nothing else
            // is happening: don't wait for it, build this copy by hand
            const stuck = src === undefined && (this.idleT || 0) > 0.6;
            if (src === undefined && !stuck) go = false;
            else if (stuck || src === null || !this.inView(u, v, top, 0)) {
              // nothing on screen to copy from: build this one by hand instead
              u.why = stuck ? "stuck" : src === null ? "no-source" : "off-screen";
              u.done = true;
              u.state = 2;
              for (const x of u.units) x.dupSame = false;
              continue;
            } else u.src = src;
          }
          if (!go) {
            keep.push(u);
            continue;
          }
          if (!this.inView(u, v, top, 40)) {
            this.complete(u, true); // scrolled past without being seen: it simply appears
            continue;
          }
          u.state = 1;
          u.phase = 0;
          u.p = 0;
          u.step = 0;
          u.st = 0;
          u.line = this.isLine(u);
          if (u.line) {
            u.bend = rand(-0.03, 0.03);
            u.off = [rand(14, 30), rand(10, 24)];
          }
          if (u.kind === "text" && u.snap && u.snap.vis) {
            // typed a little off, to be dragged onto its guide afterwards
            if (u.snap.axis === "x") this.setShift(u, rand(28, 64), rand(-8, 8));
            else this.setShift(u, rand(-8, 8), rand(18, 34) * (Math.random() < 0.5 ? -1 : 1));
          }
          if (u.kind !== "text" && u.kind !== "dup" && u.kind !== "guide") {
            u.swap = !!u.inCopy && !!u.inCopy.src && !u.dupSame && !u.line;
            u.jx = rand(-6, 6);
            // now and then the box's edges are pulled out as long guide lines while it's drawn
            u.edges = (u.kind === "box" || u.kind === "media") && !u.inCopy && u.w > 60 && u.h > 30 && Math.random() < 0.4;
          }
          if (u.kind === "text") {
            u.edit = !!u.inCopy && !!u.inCopy.src && !u.dupSame; // only a real copy is edited
            u.jx = rand(-5, 5);
            // big display type is typed at full size, letter by letter; now and then a mid-size
            // heading is typed small and then scaled up into place
            u.grow = !u.edit && u.mode !== "fade" && u.fs >= 28 && u.fs < 48 && u.h < 400 && Math.random() < 0.3;
          }
          if (u.kind === "dup") {
            const S = u.src.getBoundingClientRect();
            u.grab = [Math.min(S.width * 0.45, 70) + rand(-8, 8), Math.min(S.height * 0.45, 30) + rand(-4, 4)];
          }
          this.crew(u);
          this.active.push(u);
          busy++;
          started++;
        }
        this.waiting = keep;
      }
      // truly idle: the page is still, nothing is being built and nothing could start
      this.idleT = this.active.length || started || !resting ? 0 : (this.idleT || 0) + dt;

      // each piece is made by its cursor, step by step, at the swarm's tempo
      const T = dt * this.tempo;
      // rulers slide in while a guide is being pulled (and linger a moment)
      const R0 = this.rulers || (this.rulers = { t: 0, lastNeed: -10 });
      if (this.active.some((x) => x.kind === "guide" && x.state === 1)) R0.lastNeed = this.time;
      const rt = this.time - R0.lastNeed < 0.7 ? 1 : 0;
      R0.t += (rt - R0.t) * Math.min(1, dt * 10);
      if (Math.abs(rt - R0.t) < 0.002) R0.t = rt;
      for (const g of this.guides || []) {
        if (!g.vis) continue;
        if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 1.5);
        if (g.dragging || g.op <= 0) continue;
        const busyM = g.members.some((m) => m.state === 1);
        if (g.members.every((m) => m.state === 2)) g.doneT = g.doneT == null ? this.time : g.doneT;
        if ((g.doneT != null && this.time - g.doneT > 1.2) || (this.time - g.shownAt > 7 && !busyM)) g.op = Math.max(0, g.op - dt * 1.2);
      }
      for (const u of this.active) {
        if (u.state !== 1) continue;
        if (!this.inView(u, v, top, 80)) {
          // scrolled away mid-job: it simply appears
          if ((u.offT = (u.offT || 0) + dt) > 0.6) {
            if (u.kind === "dup") this.abortDup(u);
            else this.complete(u, true);
          }
          continue;
        }
        u.offT = 0;
        // watchdog: an element that collapsed or vanished mid-job (or any job that stalls)
        // never holds up the build: it simply appears and the swarm moves on
        u.age = (u.age || 0) + dt;
        if ((u.noRect || 0) > 0.5 || u.age > 20) {
          if (u.kind === "dup") this.abortDup(u);
          else this.complete(u, true);
          continue;
        }
        if (u.kind === "dup") this.stepDup(u, T, dt);
        else if (u.kind === "guide") this.stepGuide(u, T, dt);
        else if (u.line) this.stepLine(u, T, dt);
        else if (u.kind === "text") this.stepText(u, T, dt);
        else if (u.kind === "glyph") this.stepGlyph(u, T, dt);
        else this.stepShape(u, T, dt);
      }
      if (this.active.some((u) => u.state === 2)) this.active = this.active.filter((u) => u.state !== 2);

      // a finished stretch of the page: everything still hidden there (backgrounds of plain
      // wrappers, decoration) fades in gently, top to bottom
      if (this.sweep) {
        const s = this.sweep;
        s.p = Math.min(1, s.p + sdt / s.dur);
        const edge = s.vTop + (s.vBottom - s.vTop) * easeInOut(s.p) + 60; // in the coordinates it started in
        while (s.i < s.items.length && s.items[s.i].y <= edge) {
          const it = s.items[s.i++];
          if (st.shown(it.el) || within(it.el, s.keep)) continue;
          if (it.el.querySelector(`[${SHOWN}]`)) st.show(it.el); // has built content inside: no fade
          else st.fadeIn(it.el, 300);
        }
        if (s.p >= 1) {
          for (; s.i < s.items.length; s.i++) if (!within(s.items[s.i].el, s.keep)) st.show(s.items[s.i].el);
          this.bands = this.addBand(this.bands, s.top, s.bottom);
          this.sweep = null;
        }
      } else if (resting && this.restFor > 0.08) {
        const vt = top;
        const vb = Math.min(env.height, top + v.h);
        const gap = this.gapIn(vt, vb);
        if (gap && this.scannedCovers(vt, vb)) {
          // everything above the first unfinished piece is done: sweep that part in
          let first = gap.bottom;
          for (const u of this.waiting) {
            if (u.state !== 0 || u.fixed) continue;
            if (u.y >= gap.bottom) break;
            if (u.y + u.h > gap.top && u.y >= vt - 2) first = Math.min(first, u.y);
          }
          for (const u of this.active) {
            if (u.fixed || u.kind === "guide" || (u.kind === "box" && u.phase >= 1)) continue;
            if (u.y + u.h > gap.top && u.y < gap.bottom) first = Math.min(first, u.y);
          }
          const bottom = Math.min(first, gap.bottom);
          if (bottom >= gap.bottom - 1 || bottom - gap.top >= 120) {
            const sTop = gap.top - top + v.y;
            const sBottom = bottom - top + v.y;
            const keep = this.unbuilt();
            const items = this.scanner.leftovers(Math.max(0, sTop - 2), sBottom + 2, keep);
            this.sweep = { top: gap.top, bottom, vTop: sTop, vBottom: sBottom, p: 0, i: 0, items, keep, dur: items.length ? 0.6 : 0.2 };
          }
        }
      }

      // tour: the end, or keep the camera moving
      const viewDone = !this.sweep && !this.gapIn(top, Math.min(env.height, top + v.h));
      const atEnd = top >= env.maxTop() - 1;
      if (viewDone && !this.jump && atEnd && this.covered(0, env.height)) {
        this.cruise = 0;
        this.dwell += dt;
        if (this.dwell > 0.5) this.finish();
        return;
      }
      if (!this.tour || this.jump || this.time < (this.userHold || 0)) {
        this.cruise = 0;
        this.dwell = 0;
        return;
      }
      if (reduced() || atEnd) {
        // reduced motion: screen by screen; at the bottom: back to anything skipped above
        this.cruise = 0;
        if (viewDone && resting) {
          this.dwell += dt * this.speed;
          if (this.dwell > 0.12) {
            this.dwell = 0;
            const gap = atEnd ? this.gapIn(0, env.height) : null;
            const to = gap ? clamp(gap.top, 0, env.maxTop()) : Math.min(env.maxTop(), top + v.h * 0.82);
            if (to !== top) {
              if (reduced()) env.scrollTo(to);
              else this.jump = { from: top, to, t: 0, dur: clamp(0.4 + Math.abs(to - top) / 2600, 0.5, 1.1) / Math.sqrt(this.speed) };
            }
          }
        } else this.dwell = 0;
        return;
      }
      this.dwell = 0;
      this.cruiseStep(dt, top, v, viewDone);
    }

    // The camera glides on continuously: it creeps while there's work on screen (so the page
    // is built as it rises), never leaves unfinished work behind, and hurries on once the
    // screen is done. Its speed is eased, so it never stops and starts with a jolt.
    cruiseStep(dt, top, v, viewDone) {
      const env = this.env;
      // what is still to be built on screen, and how much of it is in the part you're reading
      let pending = 0;
      let upper = 0;
      let first = Infinity;
      const mid = top + v.h * 0.6;
      const count = (u) => {
        pending++;
        if (u.y < mid) upper++;
        first = Math.min(first, u.y);
      };
      for (const u of this.waiting) {
        if (u.state !== 0 || u.fixed) continue;
        if (u.y > top + v.h) break;
        if (u.y + u.h > top) count(u);
      }
      for (const u of this.active) {
        if (u.fixed || u.kind === "guide" || (u.kind === "box" && u.phase >= 1)) continue;
        if (u.y + u.h > top && u.y < top + v.h) count(u);
      }
      const sp = Math.sqrt(this.speed);
      let want;
      if (!pending && viewDone) want = 1150 * sp; // the whole screen is finished: on to the next, quickly
      else if (!upper) want = 620 * sp; // the section you're reading is done: hurry the next one up
      else want = clamp(150 - upper * 6, 34, 150) * sp; // building here: creep, so it's built as it rises
      // something here is still animating in: slow down, but only for a moment per screen
      if (this.deferHold) {
        if (this.holdAt == null || Math.abs(top - this.holdAt) > v.h * 0.6) {
          this.holdAt = top;
          this.holdUsed = 0;
        }
        if (this.holdUsed < 1.2) {
          this.holdUsed += dt;
          want = Math.min(want, 90 * sp);
        }
      }
      const c = this.cruise || 0;
      this.cruise = c + (want - c) * (1 - Math.exp(-dt * (want > c ? 1.4 : 3.2)));
      // never leave unfinished work behind: a hard limit that shrinks as the first unfinished
      // piece nears the top, so the camera brakes in time (smoothly: the limit falls off gradually)
      if (first < Infinity) this.cruise = Math.min(this.cruise, Math.max(0, (first - top - v.h * 0.2) * 2.2));
      if (this.cruise < 1.5 && want < 1.5) this.cruise = 0;
      // a float camera, so slow speeds don't stall on whole pixels
      if (this.camY == null || Math.abs(this.camY - top) > 3) this.camY = top;
      if (!this.cruise) return;
      const max = env.maxTop();
      const next = Math.min(max, this.camY + this.cruise * dt);
      if (next <= this.camY) return;
      // the camera keeps its fraction, the page scrolls in whole pixels: fractional scroll
      // offsets every frame can wedge the compositor on heavy pages (WebGL, video)
      this.camY = next;
      const y = Math.round(next);
      if (y === Math.round(top)) return;
      this.ownMove = Math.abs(y - top);
      env.scrollTo(y);
    }

    // ---- how each kind of piece is made (steps run at the swarm's tempo)

    sound(u, kind) {
      const R = this.liveRect(u);
      if (this.sfx && R) this.sfx.place(kind, R.x + R.w / 2, R.y + R.h / 2, R.w, R.h, this.W, this.H, u.fs || 16);
    }

    // boxes, image frames and form fields: crosshair to the corner, press, drag, let go, fill
    stepShape(u, T, dt) {
      const st = this.stage;
      if (u.step === 0) {
        if (this.arrived(u, "to", dt)) {
          this.press(u);
          u.st = 0;
          if (u.swap) {
            u.step = 3;
            u.hold = rand(0.1, 0.18);
          } else u.step = 2;
        }
      } else if (u.step === 2) {
        if (this.arrived(u, "drag", dt)) {
          const R = this.liveRect(u);
          const n = u.lead;
          if (R && n && n.unit === u && u.endRel && (u.endRel[0] < R.w - 0.5 || u.endRel[1] < R.h - 0.5)) {
            // a box bigger than the screen: the rest of it stretches out after the drag
            u.dw0 = clamp(n.x - R.x, 0, R.w);
            u.dh0 = clamp(n.y - R.y, 0, R.h);
            u.step = 25;
            u.ext = 0;
          } else {
            u.step = 3;
            u.hold = rand(0.18, 0.3);
          }
          u.st = 0;
        }
      } else if (u.step === 25) {
        u.ext = Math.min(1, (u.ext || 0) + T / 0.5);
        if (u.ext >= 1) {
          u.step = 3;
          u.st = 0;
          u.hold = rand(0.18, 0.3);
        }
      } else if (u.step === 3) {
        u.st += T;
        if (u.st >= u.hold) {
          u.phase = 1;
          if (u.kind === "box") st.fadeIn(u.el, 260);
          else {
            st.show(u.el);
            for (const k of u.el.querySelectorAll("*")) st.show(k);
            this.scanIn(u);
          }
          this.sound(u, u.swap ? "restyle" : u.kind === "box" ? "rect" : "image");
          u.step = 4;
          u.st = 0;
        }
      } else {
        u.st += T;
        if (u.st >= (u.kind === "box" ? 0.35 : 0.5)) this.complete(u);
      }
    }

    // text: click (or drag a text box), then type beside a parked I-beam; big headings grow
    stepText(u, T, dt) {
      const st = this.stage;
      const n = u.lead;
      if (u.step === 0) {
        if (!this.arrived(u, "to", dt)) return;
        this.press(u);
        u.st = 0;
        if (u.edit) u.step = 10;
        else {
          const R = this.liveRect(u);
          const tb = R && this.textBox(u, R);
          u.step = !tb || (tb.w < 140 && tb.h < tb.lh * 1.6) ? 1 : 2;
        }
        return;
      }
      if (u.step === 10) {
        // editing a copy: a double-click selects the words
        u.st += T;
        if (u.st >= 0.08) {
          this.press(u);
          u.step = 11;
          u.st = 0;
          u.hold = rand(0.2, 0.35);
        }
        return;
      }
      if (u.step === 11 || u.step === 1) {
        u.st += T;
        if (u.st >= (u.step === 1 ? 0.07 : u.hold)) this.beginTyping(u);
        return;
      }
      if (u.step === 2) {
        if (this.arrived(u, "ghost", dt)) this.beginTyping(u);
        return;
      }
      if (u.step === 3) {
        // an uneven human rhythm, quicker on long passages; on its own clock (not the swarm's
        // tempo), and big type slow enough to watch every letter arrive
        const N = u.total;
        const fsz = u.fs || 16;
        const size = fsz >= 34 ? 3.2 : fsz >= 24 ? 2.2 : fsz >= 18 ? 1.4 : 1;
        const k = clamp(70 / Math.max(1, N), 0.06, 1) * size;
        u.budget = (u.budget || 0) + dt * this.speed * 1.9;
        let i = Math.floor(u.typed);
        const i0 = i;
        while (i < N && u.budget > 0) {
          let d = rand(0.012, 0.04);
          if (Math.random() < 0.16) d += rand(0, 0.03);
          if (u.lineEnds.has(i + 1)) d += 0.1;
          if (Math.random() < 0.025) d += rand(0.08, 0.2);
          u.budget -= d * k;
          i++;
        }
        u.typed = i;
        if (i > i0 && this.sfx && n) this.sfx.key(n.x, this.W, n.id, i - i0, 0);
        if (u.mode !== "fade" && i !== i0) st.clip(u.el, this.typedPath(u, i)); // only when a letter was added
        if (i >= N) {
          u.step = 4;
          u.st = 0;
        }
        return;
      }
      if (u.step === 4) {
        u.st += T;
        if (u.st >= 0.12) {
          this.sound(u, u.edit ? "edit" : "text");
          u.step = u.grow ? 5 : 6;
          u.st = 0;
          u.gi = 0;
        }
        return;
      }
      if (u.step === 5) {
        u.st += T;
        if (u.st >= 0.06) {
          u.st = 0;
          this.scaleText(u, u.gsteps[u.gi] / u.fs);
          u.gi++;
          if (this.sfx && n) this.sfx.grow(u.gi, n.x, this.W);
          if (u.gi >= u.gsteps.length) {
            u.step = 6;
            u.st = -0.15;
          }
        }
        return;
      }
      if (u.step === 6) {
        u.st += T;
        if (u.st >= (u.edit ? 0.3 : 0.2)) {
          if (u.snap && u.snap.vis && (u.shx || u.shy)) {
            u.step = 20;
            u.st = 0;
          } else this.complete(u);
        }
        return;
      }
      // onto the guide: grab, nudge until it snaps, settle
      if (u.step === 20) {
        if (this.arrived(u, "grab", dt)) {
          this.press(u);
          u.step = 21;
        }
        return;
      }
      if (u.step === 21) {
        if (this.arrived(u, "nudge", dt)) {
          u.step = 22;
          u.st = 0;
        }
        return;
      }
      if (u.step === 22) {
        u.st += T;
        if (u.st >= 0.1) u.step = 23;
        return;
      }
      if (u.step === 23) {
        if (this.arrived(u, "settle", dt)) {
          this.setShift(u, 0, 0);
          u.step = 24;
          u.st = 0;
        }
        return;
      }
      u.st += T;
      if (u.st >= 0.25) this.complete(u);
    }

    beginTyping(u) {
      const st = this.stage;
      const n = u.lead;
      this.dropTwin(u);
      u.phase = 1;
      u.step = 3;
      u.budget = 0;
      if (u.grow) {
        u.gsteps = [24, 32, 40, 48, 56, 64, 72, 88, 104].filter((x) => x < u.fs && x > 18).concat([u.fs]);
        this.scaleText(u, Math.min(1, 18 / u.fs));
      }
      st.show(u.el);
      for (const f of u.flow) st.show(f);
      if (u.mode === "fade") this.colorIn(u);
      else st.clip(u.el, this.typedPath(u, 0));
      u.lineEnds = new Set();
      let c = 0;
      for (const L of u.lines) {
        c += L.edges.length;
        u.lineEnds.add(c);
      }
      const R = this.liveRect(u);
      if (R && n && n.unit === u) {
        const tb = this.textBox(u, R);
        u.park = u.edit ? [n.x - tb.x, n.y - tb.y] : [n.x - tb.x + rand(-30, 10), n.y - tb.y + rand(10, 30)];
      } else u.park = [0, 0];
    }

    scaleText(u, s) {
      const el = u.el;
      if (!u.scaleWas) u.scaleWas = [el.style.getPropertyValue("scale"), el.style.getPropertyPriority("scale"), el.style.getPropertyValue("transform-origin"), el.style.getPropertyPriority("transform-origin")];
      if (s >= 0.999) {
        this.unscaleText(u);
        return;
      }
      u.curScale = s;
      el.style.setProperty("transform-origin", "0 0", "important");
      el.style.setProperty("scale", String(s), "important");
    }

    unscaleText(u) {
      const w = u.scaleWas;
      u.curScale = 1;
      if (!w) return;
      const el = u.el;
      if (w[0]) el.style.setProperty("scale", w[0], w[1]);
      else el.style.removeProperty("scale");
      if (w[2]) el.style.setProperty("transform-origin", w[2], w[3]);
      else el.style.removeProperty("transform-origin");
      u.scaleWas = null;
    }

    // icons: a click, and it's there
    stepGlyph(u, T, dt) {
      if (u.step === 0) {
        if (this.arrived(u, "to", dt)) {
          this.press(u);
          u.step = 1;
          u.st = 0;
        }
      } else if (u.step === 1) {
        u.st += T;
        if (u.st >= 0.07) {
          u.phase = 1;
          this.stage.fadeIn(u.el, 200);
          u.step = 2;
          u.st = 0;
        }
      } else {
        u.st += T;
        if (u.st >= 0.2) this.complete(u);
      }
    }

    // dividers and rules: the pen tool, one click at each end
    stepLine(u, T, dt) {
      if (u.step === 0) {
        if (this.arrived(u, "to", dt)) {
          this.press(u);
          u.placed = 1;
          u.step = 1;
          u.st = 0;
        }
      } else if (u.step === 1) {
        u.st += T;
        if (u.st >= 0.07) u.step = 2;
      } else if (u.step === 2) {
        if (this.arrived(u, "to-end", dt)) {
          this.press(u);
          u.placed = 2;
          u.step = 3;
          u.st = 0;
          u.hold = 0.07 + rand(0.04, 0.12);
        }
      } else if (u.step === 3) {
        u.st += T;
        if (u.st >= u.hold) u.step = 4;
      } else if (u.step === 4) {
        if (this.arrived(u, "away", dt)) {
          u.step = 5;
          u.st = 0;
        }
      } else {
        u.st += T;
        if (u.st >= 0.3) {
          u.phase = 1;
          this.stage.fadeIn(u.el, 200);
          this.sound(u, "line");
          this.complete(u);
        }
      }
    }

    // the clip that shows a text element's first n letters (element-local px)
    typedPath(u, n) {
      let d = "";
      let left = n;
      for (let i = 0; i < u.lines.length; i++) {
        const L = u.lines[i];
        if (left <= 0) break;
        const k = Math.min(left, L.edges.length);
        left -= k;
        const x0 = Math.min(L.x, 0) - 4;
        const right = k >= L.edges.length ? L.x + L.w + 6 : L.edges[k - 1] + 0.5;
        const y0 = L.y - 3;
        let h = L.h + 6;
        // tight line-height: stop halfway into the next line, so its letters don't peek through
        const N = u.lines[i + 1];
        if (N && N.y < L.y + L.h && N.x < L.x + L.w && N.x + N.w > L.x) h = Math.min(h, (L.y + L.h + N.y) / 2 - y0);
        d += `M${(x0).toFixed(1)} ${y0.toFixed(1)}H${right.toFixed(1)}V${(y0 + h).toFixed(1)}H${x0.toFixed(1)}Z`;
      }
      for (const k of u.keep || []) d += `M${k.x.toFixed(1)} ${k.y.toFixed(1)}H${(k.x + k.w).toFixed(1)}V${(k.y + k.h).toFixed(1)}H${k.x.toFixed(1)}Z`;
      return d ? `path('${d}')` : "path('M0 0Z')";
    }

    // where the caret sits after n letters (element-local px)
    caretAt(u, n) {
      let left = Math.floor(n);
      for (const L of u.lines) {
        if (left <= L.edges.length) return { x: left ? L.edges[left - 1] : L.x, y: L.y, h: L.h };
        left -= L.edges.length;
      }
      const L = u.lines[u.lines.length - 1];
      return { x: L.x + L.w, y: L.y, h: L.h };
    }

    colorIn(u) {
      try {
        const c = getComputedStyle(u.el).color;
        u.el.animate([{ color: "transparent", WebkitTextFillColor: "transparent" }, { color: c, WebkitTextFillColor: c }], { duration: 500 / this.speed, easing: "ease-out" });
      } catch (_) {}
    }

    scanIn(u) {
      try {
        // live media (video, canvas, embeds) simply appears: animating its clip or opacity
        // can lock up Chrome's renderer (a WebGL canvas, a playing video under a scroll)
        if (this.stage.live(u.el)) return;
        // the wipe is stepped from our own frame loop, not a clip-path animation: Chrome runs
        // those on the compositor, and one under a page scrolling every frame can wedge it
        const side = u.kind === "control";
        this.reveals.push({ el: u.el, side, t: 0, dur: (u.kind === "media" ? 620 : 360) / 1000 / this.speed });
        this.stage.clip(u.el, side ? "inset(0 100% 0 0)" : "inset(0 0 100% 0)");
        if (!side) u.el.animate([{ opacity: 0.6 }, {}], { duration: 620 / this.speed, easing: "ease-out" });
      } catch (_) {}
    }
    checkDeferred(dt, top, v) {
      const D = this.scanner.deferred;
      if (!D.size) {
        this.deferHold = false;
        return;
      }
      this.deferT = (this.deferT || 0) - dt;
      if (this.deferT > 0) return;
      this.deferT = 0.25;
      let hold = false;
      let dirty = false;
      const here = [];
      let n = 0;
      for (const [el, d] of D) {
        if (++n > 600) break;
        if (!el.isConnected) {
          D.delete(el);
          continue;
        }
        const r = el.getBoundingClientRect();
        if (r.bottom <= v.y || r.top >= v.y + v.h * 0.9) continue;
        if (d.at == null) d.at = this.time;
        here.push([el, d, r]);
        if (d.dirty) dirty = true;
      }
      const found = [];
      if (here.length && (dirty || this.time - (this.deferPeekAt || 0) > 1.5)) {
        this.deferPeekAt = this.time;
        this.stage.peek(() => {
          for (const [el, d, r] of here) {
            d.dirty = false;
            const c = getComputedStyle(el);
            if (c.visibility === "visible" && parseFloat(c.opacity) >= 0.04 && r.width >= 2 && r.height >= 2) {
              const y0 = r.top - v.y + top;
              found.push({ top: y0 - 4, bottom: y0 + r.height + 4 });
              D.delete(el);
            }
          }
        });
      }
      for (const [el, d] of here) {
        if (!D.has(el)) continue;
        if (this.time - d.at < 2.2) hold = hold || d.likely;
        else D.delete(el); // still hidden after a good look: not meant to show yet
      }
      this.deferHold = hold;
      for (const band of found) this.register(this.scanner.scan(band));
    }

    stepReveals(dt) {
      if (!this.reveals.length) return;
      let n = 0;
      for (const r of this.reveals) {
        r.t += dt;
        const k = Math.min(1, r.t / r.dur);
        if (k >= 1 || !r.el.isConnected) {
          this.stage.unclip(r.el);
          continue;
        }
        const left = ((1 - easeInOut(k)) * 100).toFixed(2) + "%";
        this.stage.clip(r.el, r.side ? `inset(0 ${left} 0 0)` : `inset(0 0 ${left} 0)`);
        this.reveals[n++] = r;
      }
      this.reveals.length = n;
    }

    finish() {
      if (this.outro || this.dead) return;
      this.jump = null;
      this.outro = { t: 0, at: performance.now() };
      this.cv.classList.add("off"); // the page is live: clicks go straight through
      this.unshiftAll();
      if (this.sfx) this.sfx.finale();
      this.secs = (this.outro.at - this.startedAt) / 1000;
      // the rest of the page comes back at once, gently
      const leftover = [];
      for (const u of this.units) if (u.state !== 2) this.complete(u, true);
      this.stage.peek(() => {
        for (const el of document.body ? document.body.getElementsByTagName("*") : []) if (!this.stage.shown(el) && el !== this.host) leftover.push(el);
      });
      this.stage.restore();
      for (const el of leftover.slice(0, 600)) {
        try {
          const r = el.getBoundingClientRect();
          if (r.bottom > 0 && r.top < innerHeight && !el.firstElementChild && !LIVE_MEDIA.has(el.localName)) el.animate([{ opacity: 0 }, {}], { duration: 450 });
        } catch (_) {}
      }
      this.$('[data-a="tour"]').hidden = true;
      this.$('[data-a="speed"]').hidden = true;
      this.$('[data-a="finish"]').hidden = true;
      this.$('[data-a="replay"]').hidden = false;
      this.updateHud(true);
    }

    // ---------------------------------------------------------------- the swarm
    // How the cursors move and how each piece is made follow the feel of Swarm Rebuild
    // (Dhvanil Patel, after Joel Califa's Swarm), used with permission: quick hand-like
    // moves with a slight sideways bend, a tempo that rises with the backlog, crosshair
    // drags, typing beside a parked I-beam, pen-tool lines, Alt-drag copies, spare cursors
    // that wander and slip off-screen, and a boids orbit around your pointer at the end.

    makeNibs() {
      const n = reduced() ? 8 : 32;
      const first = reduced() ? 8 : 18;
      for (let i = 0; i < n; i++) {
        const fast = Math.random() < 0.25;
        this.nibs.push({
          id: i, color: CURSOR_COLORS[i % CURSOR_COLORS.length], name: CREW[i % CREW.length],
          x: i < first ? this.W / 2 + rand(-60, 60) : -80, y: i < first ? this.H / 2 + rand(-40, 40) : this.H / 2,
          vx: 0, vy: 0, angle: 0, press: 0, shape: "arrow", unit: null, mv: null, wander: null,
          idleFor: 0, leaving: false, away: i >= first, vis: 0, born: 0.3 + i * 0.012,
          speed: fast ? rand(1000, 1500) : rand(300, 750),
          force: fast ? rand(3500, 6000) : rand(700, 1800),
          spin: fast ? rand(2.2, 3.4) : rand(0.8, 1.8),
          curl: rand(-1, 1), orbit: rand(70, 170),
        });
      }
      this.tv = { x: 0, y: 0 };
      this.spawnT = 0;
      this.tempo = 2.1;
      this.avail = 0;
    }

    present() {
      return this.nibs.filter((n) => !n.away);
    }

    // bring a cursor in from the nearest side of the screen
    spawn(n, nearX) {
      const left = nearX != null ? nearX < this.W / 2 : Math.random() < 0.5;
      n.away = false;
      n.leaving = false;
      n.x = left ? -40 : this.W + 40;
      n.y = this.H * rand(0.2, 0.8);
      n.vx = 0;
      n.vy = 0;
      n.mv = null;
      n.wander = null;
      n.idleFor = 0;
      n.vis = 1;
    }

    crew(u) {
      const r = u.el.getBoundingClientRect();
      let pool = this.nibs.filter((n) => !n.away && !n.unit);
      if (!pool.length) {
        const out = this.nibs.find((n) => n.away);
        if (out) {
          this.spawn(out, r.left);
          pool = [out];
        }
      }
      if (!pool.length) return;
      const d = (n) => Math.hypot(n.x - r.left, n.y - r.top) + (n.leaving ? 400 : 0);
      pool.sort((a, b) => d(a) - d(b));
      const n = pool[0];
      n.unit = u;
      n.mv = null;
      n.wander = null;
      n.leaving = false;
      n.idleFor = 0;
      u.lead = n;
      u.color = n.color;
    }

    release(u) {
      if (!u.lead) return;
      for (const n of this.nibs) {
        if (n.unit !== u) continue;
        n.unit = null;
        n.mv = null;
        n.wander = null;
        n.idleFor = 0;
        n.shape = "arrow";
      }
      u.lead = null;
    }

    // ---- moves: the curve of a hand moving a pointer

    go(n, key, p, o = {}) {
      if (n.mv && n.mv.key === key) return;
      const d = Math.hypot(p[0] - n.x, p[1] - n.y);
      n.mv = {
        key, x0: n.x, y0: n.y, t: 0, done: d < 0.5, drag: !!o.drag,
        dur: clamp(0.12 + Math.sqrt(d) * 0.021, 0.14, 0.9) / (o.speed || 1),
        bend: (o.bend != null ? o.bend : (Math.random() < 0.5 ? -1 : 1) * rand(0.04, 0.14)) * Math.min(d, 600),
      };
    }

    advance(n, p, dt) {
      const m = n.mv;
      if (!m) return;
      if (m.done) {
        n.x = p[0];
        n.y = p[1];
        return;
      }
      m.t += dt * this.tempo;
      const k = Math.min(1, m.t / m.dur);
      const e = m.drag || k < 0.15 ? easeInOut(k) : easeOut(k);
      const dx = p[0] - m.x0;
      const dy = p[1] - m.y0;
      const L = Math.hypot(dx, dy) || 1;
      const off = Math.sin(Math.PI * e) * m.bend;
      n.x = m.x0 + dx * e + (-dy / L) * off;
      n.y = m.y0 + dy * e + (dx / L) * off;
      if (k >= 1) {
        m.done = true;
        n.x = p[0];
        n.y = p[1];
      }
    }

    // has the unit's cursor finished the given leg? (no cursor: a short pause stands in)
    arrived(u, key, dt) {
      const n = u.lead;
      if (!n || n.unit !== u) return (u.noLead = (u.noLead || 0) + dt) > 0.2;
      return !!(n.mv && n.mv.key === key && n.mv.done);
    }

    // a click: the pointer dips
    press(u) {
      const n = u.lead;
      if (!n) return;
      n.press = 1;
      if (this.sfx) this.sfx.press(n.x, this.W);
    }

    // where a huge box's drag ends so the cursor doesn't leave the screen
    dragEnd(R) {
      const right = this.W;
      const bot = this.H;
      const x = R.x + R.w > right - 16 ? Math.max(R.x + Math.min(R.w, 40), right - 30) : R.x + R.w;
      const y = R.y + R.h > bot - 16 ? Math.max(R.y + Math.min(R.h, 40), bot - 40) : R.y + R.h;
      return [Math.min(x, R.x + R.w), Math.min(y, R.y + R.h)];
    }

    // the text block's box on screen (follows a growing heading's scale)
    textBox(u, R) {
      const s = u.curScale || 1;
      const L0 = u.lines[0];
      const L1 = u.lines[u.lines.length - 1];
      const lx = Math.min(...u.lines.map((L) => L.x));
      const rx = Math.max(...u.lines.map((L) => L.x + L.w));
      return { x: R.x + lx * s, y: R.y + L0.y * s, w: (rx - lx) * s, h: (L1.y + L1.h - L0.y) * s, lh: L0.h * s };
    }

    isLine(u) {
      return u.kind === "box" && ((u.h <= 4 && u.w >= 24) || (u.w <= 4 && u.h >= 24));
    }

    // the leg a unit's cursor is on: where it's headed, how, and which tool it shows
    legOf(n, u, R) {
      const W = this.W;
      const H = this.H;
      const cl = (x, y) => [clamp(x, 4, W - 4), clamp(y, 4, H - 4)];
      if (u.kind === "dup") {
        const S = u.src.getBoundingClientRect();
        if (u.step <= 2) return { key: "grab", p: cl(S.left + u.grab[0], S.top + u.grab[1]), shape: u.step === 2 ? "dup" : "arrow" };
        const D = u.el.getBoundingClientRect();
        return { key: "carry", p: [D.left + u.grab[0], D.top + u.grab[1]], shape: u.step === 3 ? "dup" : "arrow", o: { speed: 0.6, drag: true } };
      }
      if (u.line) {
        const horiz = u.w >= u.h;
        const a = horiz ? cl(R.x, R.y + R.h / 2) : cl(R.x + R.w / 2, R.y);
        const b = horiz ? cl(R.x + R.w, R.y + R.h / 2) : cl(R.x + R.w / 2, R.y + R.h);
        if (u.step <= 1) return { key: "to", p: a, shape: "pen-add" };
        if (u.step <= 3) return { key: "to-end", p: b, shape: "pen", o: { bend: u.bend } };
        return { key: "away", p: [b[0] + u.off[0], b[1] + u.off[1]], shape: u.step === 4 ? "pen" : "arrow", o: { speed: 1.4 } };
      }
      if ((u.kind === "box" || u.kind === "media" || u.kind === "control") && u.swap) {
        const p = cl(R.x + Math.min(R.w * 0.5, 60) + u.jx, R.y + Math.min(R.h * 0.5, 30));
        return { key: "to", p, shape: "arrow" };
      }
      if (u.kind === "box" || u.kind === "media" || u.kind === "control") {
        if (u.step === 0) return { key: "to", p: cl(R.x, R.y), shape: "cross" };
        if (!u.endRel) {
          const e = this.dragEnd(R);
          u.endRel = [e[0] - R.x, e[1] - R.y];
        }
        return { key: "drag", p: [R.x + u.endRel[0], R.y + u.endRel[1]], shape: u.step === 2 ? "cross" : "arrow", o: { speed: 0.75, drag: true, bend: 0 } };
      }
      if (u.kind === "guide") {
        const top = this.env.top;
        const vy = this.env.view().y;
        const from = u.g.axis === "x" ? [10, H * (0.45 + u.r)] : [W * 0.3 + u.r * 200, 10];
        const tool = u.g.axis === "x" ? "ew" : "ns";
        if (u.step <= 1) return { key: "from", p: from, shape: u.step === 1 ? tool : "arrow" };
        const to = u.g.axis === "x" ? [u.g.pos, from[1] + 40] : [from[0] + 30, u.g.pos - top + vy];
        return { key: "pull", p: to, shape: u.step === 2 ? tool : "arrow", o: { speed: 0.55, drag: true } };
      }
      if (u.kind === "text" && u.step >= 20) {
        const tb = this.textBox(u, R);
        if (!u.rel) u.rel = [tb.x - R.x + Math.min(tb.w * 0.4, 60) + rand(-6, 6), tb.y - R.y + Math.min(tb.h * 0.5, 22)];
        const bx = R.x - (u.shx || 0);
        const by = R.y - (u.shy || 0);
        const p = [bx + u.rel[0], by + u.rel[1]];
        if (u.step === 20) return { key: "grab", p: [R.x + u.rel[0], R.y + u.rel[1]], shape: "arrow" };
        if (u.step === 21) {
          if (!u.over) u.over = u.snap.axis === "x" ? [-rand(2, 5), rand(-6, 6)] : [rand(-6, 6), -rand(2, 5)];
          return { key: "nudge", p: [p[0] + u.over[0], p[1] + u.over[1]], shape: "arrow", o: { speed: 0.6, drag: true } };
        }
        if (u.step === 22) return { key: "nudge", p: [n.x, n.y], shape: "arrow" };
        return { key: "settle", p, shape: "arrow", o: { speed: 2 } };
      }
      if (u.kind === "text") {
        const tb = this.textBox(u, R);
        if (u.step === 0) {
          if (u.edit) return { key: "to", p: cl(tb.x + Math.min(tb.w * 0.5, 50) + u.jx, tb.y + Math.min(tb.lh, tb.h) * 0.55), shape: "arrow" };
          return { key: "to", p: cl(tb.x, tb.y), shape: "cross" };
        }
        if (u.step === 2) return { key: "ghost", p: [tb.x + tb.w, tb.y + Math.min(tb.h, tb.lh)], shape: "cross", o: { speed: 0.9, drag: true, bend: 0 } };
        if (u.step >= 3 && u.park) return { key: "park", p: [tb.x + u.park[0], tb.y + u.park[1]], shape: u.step === 3 ? "ibeam" : "arrow", o: { speed: 1.5 } };
        return { key: "to", p: [n.x, n.y], shape: u.edit ? "arrow" : "cross" };
      }
      // icons
      return { key: "to", p: cl(R.x + R.w / 2, R.y + R.h / 2), shape: "arrow" };
    }

    // ---- the spare cursors: a boids orbit (before the build, and around your pointer after)

    follow(dt, list, target, scale = 1) {
      const m = this.mouse;
      const o = target;
      const time = this.time;
      if (m && this.lastM && dt > 0) {
        const k = Math.min(1, dt * 18);
        this.tv.x += ((m.x - this.lastM.x) / dt - this.tv.x) * k;
        this.tv.y += ((m.y - this.lastM.y) / dt - this.tv.y) * k;
      }
      this.lastM = m ? { x: m.x, y: m.y } : null;
      const R = 135 * scale * (1 + 0.18 * Math.sin(time * 0.55));
      const swirl = Math.tanh(Math.cos(time * 0.11) * 3);
      const want = [];
      for (const c of list) {
        const vx = c.x - o.x;
        const vy = c.y - o.y;
        const d = Math.hypot(vx, vy) || 0.01;
        const nx = vx / d;
        const ny = vy / d;
        const ang = Math.atan2(vy, vx);
        const off = (c.orbit - 120) * 0.55 * scale;
        const rr = R * (1 + 0.3 * Math.sin(3 * ang + time * 0.7)) + off;
        const tang = 300 * (0.7 + c.spin * 0.2) * swirl;
        const rad = clamp((rr - d) * 4, -2600, 1400);
        const far = Math.min(1, Math.max(0, (d - rr) / 600));
        want.push([-ny * tang + nx * rad - ny * c.curl * 400 * far, nx * tang + ny * rad + nx * c.curl * 400 * far]);
      }
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        let ax = 0;
        let ay = 0;
        let wsum = 0;
        for (let j = 0; j < list.length; j++) {
          if (j === i) continue;
          const q = list[j];
          const d = Math.hypot(q.x - c.x, q.y - c.y);
          if (d > 90) continue;
          const w = 1 - d / 90;
          ax += q.vx * w;
          ay += q.vy * w;
          wsum += w;
        }
        let [fx, fy] = want[i];
        if (wsum > 0) {
          fx = fx * 0.7 + (ax / wsum) * 0.3;
          fy = fy * 0.7 + (ay / wsum) * 0.3;
        }
        const dist = Math.max(0, Math.hypot(c.x - o.x, c.y - o.y) - 180 * scale);
        const maxV = c.speed * (1.3 + Math.min(3.2, dist / 90));
        const L = Math.hypot(fx, fy);
        if (L > maxV) {
          fx *= maxV / L;
          fy *= maxV / L;
        }
        let gx = (fx - c.vx) * 6;
        let gy = (fy - c.vy) * 6;
        const maxF = c.force * (1.4 + Math.min(5, dist / 50));
        const G = Math.hypot(gx, gy);
        if (G > maxF) {
          gx *= maxF / G;
          gy *= maxF / G;
        }
        c.vx += gx * dt;
        c.vy += gy * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
      // your own pointer pushes them aside
      const R0 = 48;
      if (m)
        for (const c of list) {
          const vx = c.x - m.x;
          const vy = c.y - m.y;
          const d = Math.hypot(vx, vy) || 0.01;
          if (d >= R0) continue;
          const nx = vx / d;
          const ny = vy / d;
          c.x = m.x + nx * R0;
          c.y = m.y + ny * R0;
          const rel = (c.vx - this.tv.x) * nx + (c.vy - this.tv.y) * ny;
          if (rel < 0) {
            c.vx -= nx * rel * 1.6;
            c.vy -= ny * rel * 1.6;
          }
          c.vx += nx * 260;
          c.vy += ny * 260;
        }
      // in flight a pointer leans into its heading
      for (const c of list) {
        if (Math.hypot(c.vx, c.vy) < 30) continue;
        const d = ((((Math.atan2(c.vy, c.vx) * 180) / Math.PI + 128 - c.angle + 540) % 360) + 360) % 360 - 180;
        c.angle += d * Math.min(1, dt * 8);
      }
    }

    flockTarget() {
      if (this.mouse) return { x: this.mouse.x, y: this.mouse.y };
      const t = this.time;
      return { x: this.W * (0.5 + 0.28 * Math.sin(t * 0.37)), y: this.H * (0.5 + 0.25 * Math.sin(t * 0.53 + 1)) };
    }

    stepSwarm(rects) {
      const dt = this.dt;
      const W = this.W;
      const H = this.H;
      for (const n of this.nibs) n.vis = this.time < n.born ? 0 : Math.min(1, n.vis + dt / 0.3);
      const here = this.present();
      // the swarm works faster when there's a lot to do or the reader is moving
      this.tempo = clamp(1.4 + this.speedPx / 900 + (this.avail / Math.max(1, here.length)) * 0.35, 1.4, 3) * this.speed;

      // before the build and after it: everyone orbits (after: around your pointer)
      if (this.intro < 1 || this.outro) {
        if (this.outro) {
          this.spawnT -= dt;
          const out = this.nibs.find((n) => n.away);
          if (out && this.spawnT <= 0 && !reduced()) {
            this.spawn(out);
            this.spawnT = 0.04;
          }
        }
        const list = this.present();
        for (const n of list) {
          n.mv = null;
          n.shape = "arrow";
          n.press = Math.max(0, n.press - dt * 6);
        }
        this.follow(dt, list, this.outro ? this.flockTarget() : { x: W / 2, y: H / 2 }, this.outro ? 1 : 0.7);
        return;
      }

      // bring in more hands when work piles up
      this.spawnT -= dt;
      const busy = here.filter((n) => n.unit).length;
      const want = clamp(7 + Math.floor(this.speedPx / 40) + Math.floor(this.avail / 3), 7, this.nibs.length);
      if (here.length < want && this.avail > here.length - busy && this.spawnT <= 0) {
        const out = this.nibs.find((n) => n.away);
        if (out) {
          this.spawn(out);
          this.spawnT = 0.035;
        }
      }

      for (const n of this.nibs) {
        if (n.away) continue;
        const ox = n.x;
        const oy = n.y;
        n.press = Math.max(0, n.press - dt * 6);
        if (n.angle !== 0) n.angle = Math.abs(n.angle) < 0.5 ? 0 : n.angle * (1 - Math.min(1, dt * 10));
        const R = n.unit && rects.get(n.unit);
        if (R) {
          const L = this.legOf(n, n.unit, R);
          this.go(n, L.key, L.p, L.o);
          this.advance(n, L.p, dt);
          n.shape = L.shape;
          n.idleFor = 0;
        } else {
          // nothing to do: wander a little, and slip away if there are plenty of hands
          n.shape = "arrow";
          n.idleFor += dt;
          if (!n.leaving && !n.unit && n.idleFor > 2.5 && this.present().length > 8) {
            n.leaving = true;
            n.mv = null;
          }
          if (n.leaving) {
            const p = [n.x > W / 2 ? W + 60 : -60, n.y];
            if (!n.mv || n.mv.key !== "leave") {
              n.mv = null;
              this.go(n, "leave", p, { speed: 0.8 });
              n.leaveTo = p;
            }
            this.advance(n, n.leaveTo, dt);
            if (n.mv.done) {
              n.away = true;
              n.leaving = false;
              n.mv = null;
            }
          } else {
            const w = n.wander;
            if (!w || (n.mv && n.mv.done && w.wait <= 0) || !n.mv) {
              const p = [rand(W * 0.17, W * 0.83), rand(H * 0.2, H * 0.8)];
              n.wander = { p, wait: rand(0.4, 1.4), key: "w" + Math.random() };
              this.go(n, n.wander.key, p, { speed: 0.35 });
            } else if (n.mv && n.mv.done) w.wait -= dt;
            this.advance(n, n.wander.p, dt);
          }
        }
        n.vx = (n.x - ox) / Math.max(dt, 1e-3);
        n.vy = (n.y - oy) / Math.max(dt, 1e-3);
      }
    }

    // ---- cursors: Swarmline's own set, tip (hotspot) on the point it works
    drawSwarm(g, alpha) {
      const fade = this.outro && reduced() ? 1 - easeInOut(this.outro.t) : 1;
      for (const n of this.nibs) {
        if (n.away) continue;
        const a = alpha * n.vis * fade;
        if (a < 0.02) continue;
        this.drawCursor(g, n, a);
      }
      g.globalAlpha = 1;
    }

    drawCursor(g, n, a) {
      const P = this.cursorPaths || (this.cursorPaths = {
        arrow: new Path2D("M4.5 3.2 L4.5 21 L9.1 16.9 L12.3 23.9 L15.9 22.3 L12.8 15.4 L19.2 15.3 Z"),
        hi: new Path2D("M6.3 7.4 L6.3 14.6"),
        pencil: new Path2D("M3.2 3.2 L9 4.9 L20.6 16.5 L16.5 20.6 L4.9 9 Z"),
        tip: new Path2D("M3.2 3.2 L6.6 4.2 L4.2 6.6 Z"),
        band: new Path2D("M17.6 13.5 L13.5 17.6"),
        cross: new Path2D("M12 2.5 V8.5 M12 15.5 V21.5 M2.5 12 H8.5 M15.5 12 H21.5"),
        ibeam: new Path2D("M8.5 4.2 H15.5 M12 4.2 V19.8 M8.5 19.8 H15.5"),
        plus: new Path2D("M21.5 18.9 V24.1 M18.9 21.5 H24.1"),
        ew: new Path2D("M6.5 8.5 L3 12 L6.5 15.5 M17.5 8.5 L21 12 L17.5 15.5 M3.5 12 H20.5"),
      });
      const HOTS = { arrow: [12, 12], dup: [12, 12], pen: [3.2, 3.2], "pen-add": [3.2, 3.2], cross: [12, 12], ibeam: [12, 12], ew: [12, 12], ns: [12, 12] };
      const sh = HOTS[n.shape] ? n.shape : "arrow";
      const [hx, hy] = HOTS[sh];
      const s = 1.08 * (1 - n.press * 0.12);
      const c = n.color;
      g.save();
      g.globalAlpha = a;
      g.translate(n.x, n.y);
      g.rotate((n.angle * Math.PI) / 180);
      g.scale(s, s);
      g.translate(-hx, -hy);
      g.lineJoin = "round";
      g.lineCap = "round";
      g.shadowColor = "rgba(15,23,42,0.32)";
      g.shadowBlur = 2.5;
      g.shadowOffsetY = 2;
      const badge = () => {
        g.beginPath();
        g.arc(21.5, 21.5, 5.2, 0, TAU);
        g.fillStyle = c;
        g.fill();
        g.strokeStyle = "#fff";
        g.lineWidth = 1.5;
        g.stroke();
        g.lineWidth = 1.6;
        g.stroke(P.plus);
      };
      if (sh === "arrow" || sh === "dup") {
        const dot = new Path2D(); dot.arc(12, 12, 6, 0, TAU);
        g.fillStyle = c; g.fill(dot);
        g.shadowColor = "transparent";
        g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.5; g.stroke(dot);
        if (sh === "dup") badge();
      } else if (sh === "pen" || sh === "pen-add") {
        g.fillStyle = c;
        g.fill(P.pencil);
        g.shadowColor = "transparent";
        g.strokeStyle = "#fff";
        g.lineWidth = 1.6;
        g.stroke(P.pencil);
        g.fillStyle = "#fff";
        g.fill(P.tip);
        g.lineWidth = 1.3;
        g.stroke(P.band);
        if (sh === "pen-add") badge();
      } else if (sh === "cross") {
        g.strokeStyle = "#fff";
        g.lineWidth = 4;
        g.stroke(P.cross);
        g.shadowColor = "transparent";
        g.strokeStyle = c;
        g.lineWidth = 1.8;
        g.stroke(P.cross);
        g.beginPath();
        g.arc(12, 12, 1.9, 0, TAU);
        g.fillStyle = c;
        g.fill();
        g.strokeStyle = "#fff";
        g.lineWidth = 1.2;
        g.stroke();
      } else if (sh === "ew" || sh === "ns") {
        if (sh === "ns") {
          g.translate(12, 12);
          g.rotate(Math.PI / 2);
          g.translate(-12, -12);
        }
        g.strokeStyle = "#fff";
        g.lineWidth = 4.2;
        g.stroke(P.ew);
        g.shadowColor = "transparent";
        g.strokeStyle = c;
        g.lineWidth = 2;
        g.stroke(P.ew);
      } else {
        g.strokeStyle = "#fff";
        g.lineWidth = 4;
        g.stroke(P.ibeam);
        g.shadowColor = "transparent";
        g.strokeStyle = c;
        g.lineWidth = 1.9;
        g.stroke(P.ibeam);
      }
      g.restore();
    }

    // ---------------------------------------------------------------- drawing

    draw() {
      const g = this.g;
      const { W, H, dpr } = this;
      const v = this.env.view();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.clearRect(0, 0, W, H);
      if (this.outro && this.outro.off) {
        if (reduced()) return;
        this.stepSwarm(new Map());
        this.drawSwarm(g, 1);
        return;
      }

      // intro: a wash of the page's own colour covers it while it's cleared
      if (this.intro < 1) {
        const k = this.intro < 0.45 ? easeOut(this.intro / 0.45) : 1 - easeInOut((this.intro - 0.45) / 0.55);
        g.globalAlpha = k;
        g.fillStyle = this.pageBg;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }

      const rects = new Map();
      const top = this.env.top;
      for (const u of this.active) {
        if (!this.inView(u, v, top, 60)) continue;
        const R = this.liveRect(u);
        if (R) {
          rects.set(u, R);
          u.noRect = 0;
        } else u.noRect = (u.noRect || 0) + this.dt; // collapsed or gone: noted, the watchdog decides
      }
      this.stepSwarm(rects); // pointers first, so a shape being dragged sits exactly under its pointer
      if (this.held) {
        for (const j of this.held) {
          if (!j.ghost) continue;
          const D = j.el.getBoundingClientRect();
          this.moveGhost(j.ghost, D.left, D.top);
        }
      }
      for (const u of this.active) {
        if (u.state !== 1) continue;
        if (u.kind === "dup" && u.step === 3) this.dragCopy(u);
        else if (u.kind === "guide" && u.step === 2 && u.lead) u.g.cur = u.g.axis === "x" ? u.lead.x : u.lead.y + top - v.y;
        else if (u.kind === "text" && u.step >= 21 && u.step <= 23) this.dragSnap(u);
      }
      this.selRects = [];
      for (const u of this.active) {
        const R = rects.get(u);
        if (R) this.mark(g, u, R);
      }
      this.drawGuides(g, v, top);
      this.drawRulers(g, v, top);
      const sheetA = this.intro < 1 ? clamp((this.intro - 0.3) / 0.5, 0, 1) : 1;
      this.drawSwarm(g, sheetA);
    }

    roundPath(g, x, y, w, h, r) {
      g.beginPath();
      if (g.roundRect && r && r.some((k) => k > 0.5)) g.roundRect(x, y, w, h, r);
      else g.rect(x, y, w, h);
    }

    // red alignment guides, glowing for a moment when something snaps to them
    drawGuides(g, v, top) {
      for (const gd of this.guides || []) {
        if (!gd.vis || gd.op <= 0) continue;
        g.save();
        g.globalAlpha = gd.op;
        g.strokeStyle = MEASURE;
        g.lineWidth = 1 + gd.flash;
        if (gd.flash > 0) {
          g.shadowColor = MEASURE;
          g.shadowBlur = 2 + gd.flash * 3;
        }
        g.beginPath();
        if (gd.axis === "x") {
          const x = Math.round(gd.cur) + 0.5;
          g.moveTo(x, 0);
          g.lineTo(x, this.H);
        } else {
          const y = Math.round(gd.cur - top + v.y) + 0.5;
          g.moveTo(0, y);
          g.lineTo(this.W, y);
        }
        g.stroke();
        g.restore();
      }
    }

    // rulers: page coordinates along the top and left, the selection's span in blue,
    // a guide's position in red; they slide in while a guide is pulled out
    drawRulers(g, v, top) {
      const t = this.rulers ? this.rulers.t : 0;
      if (t <= 0.001) return;
      const W = this.W;
      const H = this.H;
      const RS = 20;
      const off = (t - 1) * RS;
      g.save();
      g.font = `500 9px ${SANS}`;
      g.textBaseline = "alphabetic";
      // top
      g.save();
      g.translate(0, off);
      g.fillStyle = "#171923";
      g.fillRect(0, 0, W, RS);
      g.fillStyle = "#2D3140";
      g.fillRect(0, RS - 1, W, 1);
      for (const r of this.selRects) {
        g.fillStyle = rgba(INK, 0.16);
        g.fillRect(r.x, 0, r.w, RS - 1);
      }
      g.strokeStyle = "#4A5064";
      g.lineWidth = 1;
      g.beginPath();
      for (let c = 0; c < W; c += 50) {
        const x = Math.round(c) + 0.5;
        g.moveTo(x, c % 100 === 0 ? 13 : 16);
        g.lineTo(x, RS);
      }
      g.stroke();
      g.fillStyle = "#8C93A6";
      for (let c = 100; c < W; c += 100) g.fillText(String(c), c + 3, 11);
      for (const r of this.selRects) {
        g.fillStyle = "#6E9BFF";
        g.fillText(String(Math.round(r.x)), r.x + 3, 11);
      }
      for (const gd of this.guides || []) {
        if (!gd.dragging || gd.axis !== "x") continue;
        g.fillStyle = MEASURE;
        g.fillRect(Math.round(gd.cur), 0, 1, RS);
        g.fillText(String(Math.round(gd.cur)), gd.cur + 4, 11);
      }
      g.restore();
      // left
      g.save();
      g.translate(off, 0);
      g.fillStyle = "#171923";
      g.fillRect(0, 0, RS, H);
      g.fillStyle = "#2D3140";
      g.fillRect(RS - 1, 0, 1, H);
      for (const r of this.selRects) {
        g.fillStyle = rgba(INK, 0.16);
        g.fillRect(0, r.y, RS - 1, r.h);
      }
      const page = (y) => y - top + v.y; // page y -> screen y
      const y0 = Math.floor((top - v.y) / 50) * 50;
      g.strokeStyle = "#4A5064";
      g.beginPath();
      for (let c = y0; page(c) < H; c += 50) {
        const y = Math.round(page(c)) + 0.5;
        g.moveTo(c % 100 === 0 ? 13 : 16, y);
        g.lineTo(RS, y);
      }
      g.stroke();
      g.fillStyle = "#8C93A6";
      for (let c = Math.ceil(y0 / 100) * 100; page(c) < H; c += 100) {
        const y = page(c);
        if (y < RS + 4) continue;
        g.save();
        g.translate(11, y - 3);
        g.rotate(-Math.PI / 2);
        g.fillText(String(c), 0, 0);
        g.restore();
      }
      for (const gd of this.guides || []) {
        if (!gd.dragging || gd.axis !== "y") continue;
        g.fillStyle = MEASURE;
        g.fillRect(0, Math.round(page(gd.cur)), RS, 1);
      }
      g.restore();
      // corner
      g.globalAlpha = t;
      g.fillStyle = "#171923";
      g.fillRect(0, 0, RS, RS);
      g.restore();
    }

    // a selection: a crisp 1px box, square corner handles and the size under it
    sel(g, x, y, w, h, col, handles, badge) {
      // while the rulers are out, dotted lines run from the selection to each ruler
      const rt = this.rulers ? this.rulers.t : 0;
      if (handles && col === INK) (this.selRects || (this.selRects = [])).push({ x, y, w, h });
      if (handles && rt > 0.05 && w > 0 && h > 0) {
        g.save();
        g.globalAlpha = rt;
        g.strokeStyle = INK;
        g.lineWidth = 1;
        g.setLineDash([2, 2]);
        g.beginPath();
        const my = Math.round(y + h / 2) + 0.5;
        const mx = Math.round(x + w / 2) + 0.5;
        if (x > 20) {
          g.moveTo(20, my);
          g.lineTo(x, my);
        }
        if (y > 20) {
          g.moveTo(mx, 20);
          g.lineTo(mx, y);
        }
        g.stroke();
        g.restore();
      }
      g.save();
      g.strokeStyle = col;
      g.lineWidth = 1;
      g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(0, Math.round(w)), Math.max(0, Math.round(h)));
      if (handles) {
        g.fillStyle = BRAND;
        for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
          g.fillRect(Math.round(hx - 3.5), Math.round(hy - 3.5), 7, 7);
          g.strokeRect(Math.round(hx - 3.5) + 0.5, Math.round(hy - 3.5) + 0.5, 6, 6);
        }
      }
      g.restore();
      if (badge && w > 0) this.badge(g, `${Math.round(w)} × ${Math.round(h)}`, x + w / 2, y + h + 8, BRAND);
    }

    badge(g, text, cx, ty, col) {
      g.save();
      g.font = `600 11px ${SANS}`;
      const tw = g.measureText(text).width;
      const bw = tw + 8;
      const bx = Math.round(clamp(cx - bw / 2, 2, this.W - bw - 2));
      const by = Math.round(ty > this.H - 70 ? ty - 40 : ty);
      g.fillStyle = col;
      this.roundPath(g, bx, by, bw, 16, [2, 2, 2, 2]);
      g.fill();
      g.fillStyle = "#fff";
      g.textBaseline = "middle";
      g.fillText(text, bx + 4, by + 8.5);
      g.restore();
    }

    // what a designer sees while each piece is made
    mark(g, u, R) {
      const { x, y, w, h } = R;
      if (u.kind === "guide") return;
      if (u.kind === "dup") {
        if (!u.src || !u.step) return;
        const S = u.src.getBoundingClientRect();
        const q = (u.step === 3 && u.ghost ? u.ghost.el : u.el).getBoundingClientRect(); // fresh: the copy moved this frame
        const C = { x: q.left, y: q.top, w: q.width, h: q.height };
        if (u.step <= 2) this.sel(g, S.left, S.top, S.width, S.height, INK, true, true);
        else if (u.step === 3) {
          this.sel(g, S.left, S.top, S.width, S.height, MEASURE, false, false);
          this.sel(g, C.x, C.y, C.w, C.h, MEASURE, false, false);
          this.measure(g, { x: S.left, y: S.top, w: S.width, h: S.height }, C);
        } else if (u.step >= 5) this.sel(g, C.x, C.y, C.w, C.h, INK, true, true);
        return;
      }
      if (u.line) {
        const n = u.lead;
        const horiz = u.w >= u.h;
        const a = horiz ? [x, y + h / 2] : [x + w / 2, y];
        const b = horiz ? [x + w, y + h / 2] : [x + w / 2, y + h];
        if (!u.placed) return;
        const pts = u.placed >= 2 ? [a, b] : [a];
        const tail = u.placed === 1 && n && n.unit === u ? [n.x, n.y] : null;
        g.save();
        g.strokeStyle = INK;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(a[0], a[1]);
        if (tail) g.lineTo(tail[0], tail[1]);
        else if (pts[1]) g.lineTo(pts[1][0], pts[1][1]);
        g.stroke();
        for (const p of pts) {
          g.beginPath();
          g.arc(p[0], p[1], 3.6, 0, TAU);
          g.fillStyle = "#fff";
          g.fill();
          g.stroke();
        }
        g.restore();
        return;
      }
      if ((u.kind === "box" || u.kind === "media" || u.kind === "control") && u.swap) {
        if (u.step >= 3) this.sel(g, x, y, w, h, INK, true, true);
        return;
      }
      if (u.kind === "box" || u.kind === "media" || u.kind === "control") {
        if (!u.step) return;
        let dw = w;
        let dh = h;
        if (u.step === 2) {
          const n = u.lead;
          if (n && n.unit === u) {
            dw = clamp(n.x - x, 0, w);
            dh = clamp(n.y - y, 0, h);
          } else {
            dw = 0;
            dh = 0;
          }
        } else if (u.step === 25) {
          const e = easeOut(clamp(u.ext || 0, 0, 1));
          dw = u.dw0 + (w - u.dw0) * e;
          dh = u.dh0 + (h - u.dh0) * e;
        }
        if (u.phase === 0) {
          // the shape being drawn, before the real one fills in
          g.save();
          // a big background frame stays see-through, so what is already built on top still shows
          if (u.kind === "media" && u.step >= 3) this.placeholder(g, x, y, w, h, w * h > this.W * this.H * 0.12 ? 0.4 : 0.94);
          else {
            g.fillStyle = this.dark ? "rgba(255,255,255,0.08)" : "rgba(20,24,40,0.06)";
            g.fillRect(x, y, dw, dh);
          }
          g.restore();
        }
        if (u.edges && u.phase === 0 && dw > 2 && dh > 2) this.edgeGuides(g, x, y, dw, dh);
        this.sel(g, x, y, dw, dh, INK, true, true);
        return;
      }
      if (u.kind === "text") {
        if (!u.step) return;
        const tb = this.textBox(u, R);
        if (u.step === 11) {
          g.save();
          g.fillStyle = rgba(INK, 0.28);
          g.fillRect(tb.x - 1, tb.y, tb.w + 2, tb.h);
          g.restore();
          this.sel(g, tb.x - 2, tb.y - 2, tb.w + 4, tb.h + 4, INK, false, false);
          return;
        }
        if (u.step === 2) {
          const n = u.lead;
          const gw = n && n.unit === u ? Math.max(0, n.x - tb.x) : 0;
          const gh = n && n.unit === u ? Math.max(0, n.y - tb.y) : 0;
          this.sel(g, tb.x, tb.y, gw, gh, INK, true, true);
          return;
        }
        if (u.step === 3) {
          // typing: a frame round the text and the caret
          this.sel(g, tb.x - 2, tb.y - 2, tb.w + 4, tb.h + 4, INK, false, false);
          if (u.phase === 1) {
            const s = u.curScale || 1;
            const c = this.caretAt(u, u.typed);
            g.fillStyle = INK;
            g.fillRect(Math.round(x + c.x * s + 1), y + c.y * s + 1, Math.max(1.5, Math.min(2.5, (u.fs * s) / 18)), c.h * s - 2);
          }
          return;
        }
        if (u.step >= 4) this.sel(g, tb.x - 2, tb.y - 2, tb.w + 4, tb.h + 4, INK, true, u.step < 20);
        return;
      }
      if (u.kind === "glyph" && u.step >= 1) this.sel(g, x - 2, y - 2, w + 4, h + 4, INK, true, false);
    }

    // the gap between two shapes, the way a design tool shows it while you drag
    measure(g, a, b) {
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      let p0;
      let p1;
      if (oy > 0) {
        const yy = Math.max(a.y, b.y) + oy / 2;
        const [l, r] = a.x < b.x ? [a, b] : [b, a];
        if (r.x - (l.x + l.w) <= 0) return;
        p0 = [l.x + l.w, yy];
        p1 = [r.x, yy];
      } else if (ox > 0) {
        const xx = Math.max(a.x, b.x) + ox / 2;
        const [t, d] = a.y < b.y ? [a, b] : [b, a];
        if (d.y - (t.y + t.h) <= 0) return;
        p0 = [xx, t.y + t.h];
        p1 = [xx, d.y];
      } else return;
      const gap = Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
      g.save();
      g.strokeStyle = MEASURE;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.stroke();
      g.restore();
      const horiz = p0[1] === p1[1];
      this.badge(g, String(gap), horiz ? (p0[0] + p1[0]) / 2 : p0[0] + 18, horiz ? p0[1] + 8 : (p0[1] + p1[1]) / 2 - 9, MEASURE);
    }

    // the edges of a box being drawn, run out across the screen as thin guide lines
    edgeGuides(g, x, y, w, h) {
      g.save();
      g.lineWidth = 1;
      g.strokeStyle = rgba(INK, 0.34);
      g.beginPath();
      for (const gx of [x, x + w]) {
        g.moveTo(Math.round(gx) + 0.5, 0);
        g.lineTo(Math.round(gx) + 0.5, this.H);
      }
      g.stroke();
      g.strokeStyle = rgba(INK, 0.2);
      g.beginPath();
      for (const gy of [y, y + h]) {
        g.moveTo(0, Math.round(gy) + 0.5);
        g.lineTo(this.W, Math.round(gy) + 0.5);
      }
      g.stroke();
      g.restore();
    }

    // an image placeholder: a light frame with a small picture icon in the middle
    placeholder(g, x, y, w, h, a) {
      g.save();
      g.globalAlpha = a;
      g.fillStyle = this.dark ? "#F4F4F1" : "#EEF0F4";
      g.fillRect(x, y, w, h);
      if (w > 40 && h > 32) {
        const s = clamp(Math.min(w, h) * 0.14, 12, 22);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = s * 0.14;
        g.strokeStyle = "#A3A8B6";
        g.fillStyle = "#A3A8B6";
        g.lineWidth = Math.max(1.2, s / 12);
        g.lineJoin = "round";
        this.roundPath(g, cx - s / 2, cy - s * 0.4, s, s * 0.8, [r, r, r, r]);
        g.stroke();
        g.beginPath(); // the hills
        g.moveTo(cx - s * 0.38, cy + s * 0.28);
        g.lineTo(cx - s * 0.1, cy - s * 0.04);
        g.lineTo(cx + s * 0.1, cy + s * 0.14);
        g.lineTo(cx + s * 0.22, cy + s * 0.04);
        g.lineTo(cx + s * 0.38, cy + s * 0.28);
        g.stroke();
        g.beginPath(); // the sun
        g.arc(cx + s * 0.18, cy - s * 0.17, s * 0.07, 0, TAU);
        g.fill();
      }
      g.restore();
    }

    // ---------------------------------------------------------------- HUD

    updateHud(force) {
      const env = this.env;
      const H = Math.max(1, env.height);
      let shown = 0;
      for (const b of this.bands) shown += Math.min(H, b.bottom) - Math.max(0, b.top);
      const frac = this.outro ? 1 : clamp(shown / H, 0, 1);
      this.$(".bar i").style.width = (frac * 100).toFixed(1) + "%";
      const t = this.$(".meta .t b");
      const s = this.$(".meta .s");
      // the agents are the cursors on screen: more come in for a busy section, idle ones leave
      const here = this.present();
      this.renderSite();
      this.renderCrew(here);
      const n = here.length;
      if (this.outro) {
        t.textContent = `Built in ${this.secs.toFixed(1)} s`;
        s.textContent = "live again";
        return;
      }
      if (!force && this.intro < 1) return;
      t.textContent = "Live agents";
      s.textContent = `${n} agent${n === 1 ? "" : "s"} working`;
    }

    // avatars of the agents on screen: their initial in their cursor's colour, five at most
    // (no two with the same letter), now and then trading places; the rest are "+N"
    renderCrew(here) {
      const box = this.$(".crew");
      if (!box) return;
      const ids = new Set(here.map((n) => n.id));
      const order = (this.crewOrder || []).filter((id) => ids.has(id));
      for (const n of here) {
        if (!order.includes(n.id)) order.splice(Math.floor(Math.random() * (Math.min(order.length, 4) + 1)), 0, n.id);
      }
      if (order.length > 1 && this.time - (this.crewSwapT || 0) > 1.3) {
        this.crewSwapT = this.time;
        const i = Math.floor(Math.random() * Math.min(5, order.length));
        let j = Math.floor(Math.random() * order.length);
        if (j === i) j = (i + 1) % order.length;
        [order[i], order[j]] = [order[j], order[i]];
      }
      this.crewOrder = order;
      const shown = [];
      const letters = new Set();
      for (const id of order) {
        const n = this.nibs[id];
        const L = n.name[0];
        if (letters.has(L)) continue;
        letters.add(L);
        shown.push(n);
        if (shown.length === 5) break;
      }
      if (!this.avs) this.avs = new Map();
      for (const n of this.nibs) {
        let a = this.avs.get(n.id);
        const i = shown.indexOf(n);
        if (i < 0) {
          if (a) a.classList.remove("in");
          continue;
        }
        if (!a) {
          a = document.createElement("span");
          a.className = "av";
          a.textContent = n.name[0];
          a.style.background = n.color;
          a.style.color = inkOn(n.color);
          box.appendChild(a);
          this.avs.set(n.id, a);
          a.style.setProperty("--x", 28 + i * 17 + "px");
          void a.offsetWidth; // start small at its place, then pop in
        }
        a.style.setProperty("--x", 28 + i * 17 + "px");
        a.style.zIndex = String(10 - i);
        a.classList.add("in");
      }
      const more = box.querySelector(".more");
      const extra = here.length - shown.length;
      more.hidden = extra <= 0;
      if (extra > 0) more.textContent = "+" + extra;
      more.style.setProperty("--x", 28 + shown.length * 17 + 4 + "px");
    }

    // the site being built, as a round black-and-white badge: its favicon, or its initial
    renderSite() {
      const box = this.$(".crew .site");
      if (!box || box.firstChild) return;
      const host = (location.hostname || "").replace(/^www\./, "");
      const letter = () => {
        box.textContent = (host || document.title || "·").trim()[0] || "·";
      };
      box.title = host;
      let href = "";
      try {
        const links = [...document.querySelectorAll('link[rel~="icon" i], link[rel="apple-touch-icon" i]')];
        const size = (l) => parseInt((l.getAttribute("sizes") || "0").split("x")[0], 10) || (/\.svg(\?|$)/i.test(l.href) ? 64 : 16);
        links.sort((a, b) => Math.abs(size(a) - 32) - Math.abs(size(b) - 32));
        href = links.length ? links[0].href : /^https?:$/.test(location.protocol) ? location.origin + "/favicon.ico" : "";
      } catch (_) {}
      if (!href) return letter();
      const img = document.createElement("img");
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        img.remove();
        letter();
      };
      img.src = href;
      box.appendChild(img);
    }

    destroy(quick) {
      if (this.dead) return;
      this.dead = true;
      cancelAnimationFrame(this.raf);
      for (const u of this.unbinds || []) u();
      this.unshiftAll();
      for (const u of this.units) if (u.scaleWas) this.unscaleText(u);
      if (this.sfx) {
        if (!quick) this.sfx.release();
        this.sfx.close(quick ? 0.1 : 0.8);
      }
      if (this.scanner && this.scanner.mo) this.scanner.mo.disconnect();
      this.stage.restore(); // the page is always fully back
      const host = this.host;
      host.style.setProperty("transition", `opacity ${quick ? 0.15 : 0.3}s ease`, "important");
      host.style.setProperty("opacity", "0", "important");
      setTimeout(() => host.remove(), quick ? 170 : 330);
    }
  }

  // --------------------------------------------------------------------- control

  let app = null;

  function start() {
    if (app || !document.body) return;
    try {
      app = new App();
    } catch (err) {
      console.error("[swarmline]", err);
      if (app) app.destroy(true);
      app = null;
    }
  }

  function stop(quick) {
    if (!app) return;
    const a = app;
    app = null;
    a.destroy(quick);
  }

  function replay() {
    if (app) {
      const env = app.env;
      app.destroy(true);
      app = null;
      env.scrollTo(0);
    }
    setTimeout(start, 200);
  }

  window[KEY] = {
    toggle() {
      if (app) stop();
      else start();
    },
    start,
    stop,
    get app() {
      return app;
    },
  };
  // auto-start disabled — controlled via window["__swarmline"].toggle()
})();
