
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- 1. scale ---------- */
  const setScale = () => document.documentElement.style.setProperty("--s", innerWidth / 1440);
  setScale();
  addEventListener("resize", setScale);

  /* ---------- 3. page fade ---------- */
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
  addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("is-leaving"); });
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = a.getAttribute("href");
    if (!url.endsWith(".html")) return;
    e.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(() => (location.href = url), reduce ? 0 : 420);
  });

  const isLanding = document.body.classList.contains("landing");

  /* ---------- 2. eased scrolling (detail pages) ---------- */
  if (!isLanding && !reduce) {
    let target = scrollY, current = scrollY, running = false, selfScroll = false;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    const tick = () => {
      current = lerp(current, target, 0.085);
      if (Math.abs(target - current) < 0.4) current = target;
      selfScroll = true;
      scrollTo(0, current);
      if (current !== target) requestAnimationFrame(tick);
      else running = false;
    };
    addEventListener("wheel", e => {
      if (e.ctrlKey || e.target.closest(".morse-out")) return;   // keep pinch-zoom & inner scroll
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
      target = Math.max(0, Math.min(max(), target + e.deltaY * unit));
      if (!running) { running = true; requestAnimationFrame(tick); }
    }, { passive: false });
    // keyboard, scrollbar, anchors: follow the native position
    addEventListener("scroll", () => {
      if (selfScroll) { selfScroll = false; return; }
      if (!running) target = current = scrollY;
    });
  }

  /* scroll reveal */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));


  /* index / about panels (landing + detail pages) */
  document.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.dataset.toggle);
      const open = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  });
  // close again when the mouse leaves the box
  document.querySelectorAll(".panel").forEach(panel => {
    panel.addEventListener("mouseleave", () => {
      panel.classList.remove("open");
      panel.querySelector("[data-toggle]").setAttribute("aria-expanded", false);
    });
  });
  addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".panel.open").forEach(p => p.classList.remove("open"));
  });

  /* ==========================================================
     4. LANDING
     ========================================================== */
  if (isLanding) {
    // one cycle of the strip, positions taken from Figma (Group 1)
    const ITEMS = [
      { key: "braille",   href: "braille.html",   top: 0,      h: 90.54, img: "braille-1" },
      { key: "morse",     href: "morse.html",     top: 104.66, h: 103.48 },
      { key: "dotmatrix", href: "printer.html", top: 222.33, h: 82.9 },
      { key: "punched",   href: "punched.html",   top: 319.9,  h: 136 },
      { key: "qr",        href: "qr.html",        top: 470.09, h: 90.36, cls: "crop-qr" },
    ];
    const PERIOD = 574.75;
    const START = 116;                     // first image's top in the frame

    const strip = document.getElementById("strip");
    const track = document.getElementById("stripTrack");
    const bgImgs = [...document.querySelectorAll(".bg-stage img")];

    // enough copies to always cover the screen
    const scale = () => innerWidth / 1440;
    const copies = () => Math.ceil(innerHeight / scale() / PERIOD) + 2;
    const build = () => {
      track.innerHTML = "";
      for (let c = 0; c < copies(); c++) {
        ITEMS.forEach(it => {
          const a = document.createElement("a");
          a.href = it.href;
          a.dataset.key = it.key;
          if (it.cls) a.className = it.cls;
          a.style.top = (c * PERIOD + it.top) + "px";
          a.style.height = it.h + "px";
          a.innerHTML = `<img src="images/${it.img || it.key}.png" alt="${it.key}">`;
          track.appendChild(a);
        });
      }
    };
    build();
    addEventListener("resize", build);

    // eased infinite scroll of the strip (+ a very slow drift)
    let target = 0, pos = 0, hovering = false;
    try { const saved = parseFloat(sessionStorage.getItem("stripPos")); if (!isNaN(saved)) target = pos = saved; } catch (_) {}
    addEventListener("pagehide", () => { try { sessionStorage.setItem("stripPos", target); } catch (_) {} });
    addEventListener("wheel", e => {
      if (e.ctrlKey) return;
      e.preventDefault();
      target += (e.deltaMode === 1 ? 40 : 1) * e.deltaY;
    }, { passive: false });
    let touchY = null;
    addEventListener("touchstart", e => (touchY = e.touches[0].clientY), { passive: true });
    addEventListener("touchmove", e => {
      if (touchY === null) return;
      const y = e.touches[0].clientY;
      target += (touchY - y) * 1.6;
      touchY = y;
    }, { passive: true });
    addEventListener("keydown", e => {
      if (e.key === "ArrowDown") target += 120;
      if (e.key === "ArrowUp") target -= 120;
    });

    const loop = () => {
      if (!hovering && !reduce) target += 0.25;
      pos = lerp(pos, target, 0.075);
      const y = START - (((pos % PERIOD) + PERIOD) % PERIOD) - PERIOD;
      track.style.transform = `translate3d(0, ${y}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // hover → background image
    const show = key => bgImgs.forEach(img => img.classList.toggle("on", img.dataset.key === key));
    strip.addEventListener("mouseover", e => {
      const a = e.target.closest("a");
      if (!a) return;
      hovering = true;
      strip.classList.add("has-hover");
      show(a.dataset.key);
    });
    strip.addEventListener("mouseleave", () => {
      hovering = false;
      strip.classList.remove("has-hover");
      show(null);
    });
    document.querySelectorAll(".index-list a").forEach(a => {
      a.addEventListener("mouseenter", () => show(a.dataset.key));
      a.addEventListener("mouseleave", () => show(null));
    });

  }

  /* ==========================================================
     5. DETAIL PAGE INTERACTIONS
     ========================================================== */

  /* Braille: A / B / C changes the raised dots (1-2-3 left column, 4-5-6 right) */
  const cell = document.querySelector(".braille-cell");
  if (cell) {
    const BRAILLE = { A: [1], B: [1, 2], C: [1, 4], D: [1, 4, 5], E: [1, 5], F: [1, 2, 4], G: [1, 2, 4, 5], H: [1, 2, 5], I: [2, 4], J: [2, 4, 5], K: [1, 3], L: [1, 2, 3], M: [1, 3, 4], N: [1, 3, 4, 5], O: [1, 3, 5], P: [1, 2, 3, 4], Q: [1, 2, 3, 4, 5], R: [1, 2, 3, 5], S: [2, 3, 4], T: [2, 3, 4, 5], U: [1, 3, 6], V: [1, 2, 3, 6], W: [2, 4, 5, 6], X: [1, 3, 4, 6], Y: [1, 3, 4, 5, 6], Z: [1, 3, 5, 6] };
    const dots = [...cell.children];
    const pills = document.querySelectorAll(".braille-pills .pill");
    const set = ch => {
      dots.forEach((d, i) => d.classList.toggle("up", BRAILLE[ch].includes(i + 1)));
      pills.forEach(p => p.classList.toggle("on", p.dataset.ch === ch));
    };
    pills.forEach(p => p.addEventListener("click", () => set(p.dataset.ch)));
    addEventListener("keydown", e => { const k = e.key.toUpperCase(); if (!e.metaKey && !e.ctrlKey && BRAILLE[k] && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) set(k); });
    set("A");
  }

  /* Dot matrix: 5 × 7 character, printed column by column like a printhead */
  const matrix = document.querySelector(".matrix");
  if (matrix) {
    const GLYPHS = {
      A: ["..#..", ".#.#.", "#...#", "#####", "#...#", "#...#", "#...#"],
      B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
      C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
      D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
      E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
      F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
      G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
      H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
      I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
      J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
      K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
      L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
      M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
      N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
      O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
      P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
      Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
      R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
      S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
      T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
      U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
      V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
      W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
      X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
      Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
      Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    };
    for (let i = 0; i < 35; i++) matrix.appendChild(document.createElement("i"));
    const cells = [...matrix.children];
    const pills = document.querySelectorAll(".matrix-pills .pill");
    let timers = [];
    const print = ch => {
      timers.forEach(clearTimeout); timers = [];
      pills.forEach(p => p.classList.toggle("on", p.dataset.ch === ch));
      cells.forEach(c => c.classList.remove("ink"));
      for (let col = 0; col < 5; col++) {
        timers.push(setTimeout(() => {
          for (let row = 0; row < 7; row++) {
            const c = cells[row * 5 + col];
            if (GLYPHS[ch][row][col] === "#") {
              c.classList.add("ink", "hit");
              setTimeout(() => c.classList.remove("hit"), 160);
            }
          }
        }, reduce ? 0 : 120 + col * 140));
      }
    };
    pills.forEach(p => p.addEventListener("click", () => print(p.dataset.ch)));
    addEventListener("keydown", e => { const k = e.key.toUpperCase(); if (!e.metaKey && !e.ctrlKey && GLYPHS[k] && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) print(k); });
    // print the first letter when the grid scrolls into view
    new IntersectionObserver((en, obs) => {
      if (en[0].isIntersecting) { print("A"); obs.disconnect(); }
    }, { threshold: 0.4 }).observe(matrix);
  }

  /* Morse: type letters → dots and dashes */
  const morseIn = document.getElementById("morseIn");
  if (morseIn) {
    const M = {
      A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
      K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
      U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
      0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
      ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "'": ".----.", "/": "-..-.", "&": ".-...",
      ":": "---...", "=": "-...-", "+": ".-.-.", "-": "-....-", "@": ".--.-.",
    };
    const out = document.getElementById("morseOut");
    let prev = "";
    const render = () => {
      const text = morseIn.value.toUpperCase();
      if (!text.trim()) { out.innerHTML = `<span class="hint">Type a letter or a word</span>`; prev = ""; return; }
      const html = [...text].map((ch, i) => {
        if (ch === " ") return `<span class="gap"></span>`;
        const code = M[ch];
        if (!code) return "";
        const fresh = i >= prev.length || prev[i] !== ch;   // animate only new letters
        const sig = [...code].map((s, k) =>
          `<b class="${s === "." ? "dot" : "dash"}" style="${fresh ? `animation-delay:${k * 70}ms` : "animation:none"}"></b>`).join("");
        return `<span class="ch"><span class="sig">${sig}</span><small>${ch} ${code.replace(/\./g, "·").replace(/-/g, "–")}</small></span>`;
      }).join("");
      out.innerHTML = html;
      prev = text;
    };
    morseIn.addEventListener("input", render);
    render();
  }

  /* ==========================================================
     QR CODE: structural analysis
     A real, scannable version-1 QR code (reads "DISCRETE"),
     built here so every module knows which part it belongs to.
     ========================================================== */
  const qrBox = document.querySelector(".qr-box");
  if (qrBox) {
    const N = 21, TEXT = "DISCRETE";
    // Galois field GF(256) for Reed–Solomon
    const EXP = [], LOG = [];
    for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
    const divisor = deg => {
      const r = new Array(deg).fill(0); r[deg - 1] = 1;
      for (let i = 0, root = 1; i < deg; i++) {
        for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
        root = mul(root, 2);
      }
      return r;
    };
    const remainder = (data, div) => {
      const res = new Array(div.length).fill(0);
      data.forEach(b => {
        const f = b ^ res.shift(); res.push(0);
        div.forEach((c, i) => (res[i] ^= mul(c, f)));
      });
      return res;
    };
    // data codewords: byte mode, 19 data + 7 error-correction codewords (level L)
    const bits = [];
    const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    push(4, 4); push(TEXT.length, 8); [...TEXT].forEach(c => push(c.charCodeAt(0), 8));
    push(0, Math.min(4, 152 - bits.length));
    while (bits.length % 8) bits.push(0);
    for (let p = 0xec; bits.length < 152; p ^= 0xec ^ 0x11) push(p, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    const words = data.concat(remainder(data, divisor(7)));

    const dark = [...Array(N)].map(() => Array(N).fill(0));
    const fn = [...Array(N)].map(() => Array(N).fill(false));
    const kind = [...Array(N)].map(() => Array(N).fill("other"));
    const setF = (x, y, d, k) => { dark[y][x] = d ? 1 : 0; fn[y][x] = true; kind[y][x] = k; };
    for (let i = 0; i < N; i++) { setF(6, i, i % 2 === 0, "timing"); setF(i, 6, i % 2 === 0, "timing"); }
    [[3, 3], [N - 4, 3], [3, N - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < N && y >= 0 && y < N) setF(x, y, d !== 2 && d !== 4, d <= 3 ? "finder" : "other");
      }
    });
    // format information (level L, mask 0)
    let rem = 8;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    const fmt = ((8 << 10) | rem) ^ 0x5412, fb = i => (fmt >> i) & 1;
    for (let i = 0; i <= 5; i++) setF(8, i, fb(i), "other");
    setF(8, 7, fb(6), "other"); setF(8, 8, fb(7), "other"); setF(7, 8, fb(8), "other");
    for (let i = 9; i < 15; i++) setF(14 - i, 8, fb(i), "other");
    for (let i = 0; i < 8; i++) setF(N - 1 - i, 8, fb(i), "other");
    for (let i = 8; i < 15; i++) setF(8, N - 15 + i, fb(i), "other");
    setF(8, N - 8, 1, "other");
    // codewords in a zigzag, two columns at a time from the bottom right
    let bit = 0;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < N; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? N - 1 - v : v;
        if (!fn[y][x] && bit < words.length * 8) {
          dark[y][x] = (words[bit >> 3] >> (7 - (bit & 7))) & 1;
          kind[y][x] = (bit >> 3) < 19 ? "data" : "ec";
          bit++;
        }
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!fn[y][x] && (x + y) % 2 === 0) dark[y][x] ^= 1;

    const grid = qrBox.querySelector(".qr-grid");
    const cells = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = document.createElement("i");
      i.dataset.k = kind[y][x];
      if (dark[y][x]) i.classList.add("dark");
      grid.appendChild(i); cells.push(i);
    }
    const INFO = {
      finder: ["Finder Patterns", "Three large squares sit in the corners. A scanner looks for them first: they tell it where the code is, how big it is, and which way it is turned."],
      timing: ["Timing Patterns", "Two lines of alternating dark and light modules run between the finder patterns. Like a ruler, they tell the scanner how wide each module is."],
      data: ["Data Modules", "The message itself. The eight letters D-I-S-C-R-E-T-E are stored as bytes and laid down in a zigzag, two columns at a time, starting from the bottom right."],
      ec: ["Error Correction", "Reed–Solomon codewords calculated from the data. They let a scanner rebuild the message even when part of the code is scratched, folded, or covered."],
    };
    const pills = qrBox.querySelectorAll(".qr-pills .pill");
    const title = qrBox.querySelector(".qr-desc h5"), text = qrBox.querySelector(".qr-desc p");
    const select = k => {
      grid.classList.add("has-sel");
      cells.forEach(c => c.classList.toggle("sel", c.dataset.k === k));
      pills.forEach(p => p.classList.toggle("on", p.dataset.k === k));
      const count = cells.filter(c => c.dataset.k === k).length;
      title.textContent = `${INFO[k][0]} · ${count} modules`;
      text.textContent = INFO[k][1];
    };
    pills.forEach(p => p.addEventListener("click", () => select(p.dataset.k)));
    grid.addEventListener("click", e => { const k = e.target.dataset && e.target.dataset.k; if (INFO[k]) select(k); });
    select("finder");
  }

  /* ==========================================================
     PUNCHED CARD: click a position to punch / fill a hole
     Each column reads as a 6-bit number (1 = A … 26 = Z)
     ========================================================== */
  const cardBox = document.querySelector(".card-box");
  if (cardBox) {
    const COLS = 10, ROWS = 6;
    const holes = [...Array(ROWS)].map(() => Array(COLS).fill(false));
    // start with the card spelling DISCRETE
    [..."DISCRETE"].forEach((ch, c) => {
      const v = ch.charCodeAt(0) - 64;
      for (let r = 0; r < ROWS; r++) holes[r][c] = !!((v >> (ROWS - 1 - r)) & 1);
    });
    const grid = cardBox.querySelector(".card-grid");
    const read = cardBox.querySelector(".card-read");
    const count = cardBox.querySelector(".card-count");
    const slots = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const b = document.createElement("button");
      b.className = "slot";
      b.dataset.n = 2 ** (ROWS - 1 - r);
      b.setAttribute("aria-label", `row ${r + 1}, column ${c + 1}`);
      b.addEventListener("click", () => { holes[r][c] = !holes[r][c]; draw(); });
      grid.appendChild(b); slots.push(b);
    }
    for (let c = 0; c < COLS; c++) read.appendChild(document.createElement("span"));
    const draw = () => {
      let n = 0;
      slots.forEach((s, i) => {
        const on = holes[Math.floor(i / COLS)][i % COLS];
        s.classList.toggle("hole", on); s.setAttribute("aria-pressed", on); n += on;
      });
      [...read.children].forEach((span, c) => {
        let v = 0;
        for (let r = 0; r < ROWS; r++) if (holes[r][c]) v += 2 ** (ROWS - 1 - r);
        span.textContent = v === 0 ? "·" : v <= 26 ? String.fromCharCode(64 + v) : v;
      });
      count.textContent = `${n} / ${ROWS * COLS}`;
    };
    cardBox.querySelector(".card-clear").addEventListener("click", () => { holes.forEach(row => row.fill(false)); draw(); });
    draw();
  }

  /* minimal detail page: numbered rows open / close on click */
  document.querySelectorAll("button.row-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const open = btn.parentElement.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  });

  /* detail pages: small strip of all five systems + hover previews on the main image */
  const PAGES = {
    "braille.html": ["images/braille-1.png", "Braille"],
    "morse.html": ["images/morse-hero.png", "Morse Code"],
    "printer.html": ["images/dotmatrix-hero.png", "Dot Matrix Printer"],
    "punched.html": ["images/punched-hero.png", "Punched Card"],
    "qr.html": ["images/qr-hero.png", "QR Code"],
  };
  const here = location.pathname.split("/").pop();
  const hero = document.querySelector(".hero");
  if (document.body.classList.contains("minimal")) {
    const layer = document.createElement("div");
    layer.className = "mini-layer";
    const nav = document.createElement("nav");
    nav.className = "mini-strip";
    nav.setAttribute("aria-label", "Systems");
    Object.entries(PAGES).forEach(([href, [src, name]]) => {
      const a = document.createElement("a");
      a.href = href; a.title = name;
      if (href === here) { a.className = "current"; a.setAttribute("aria-current", "page"); }
      a.innerHTML = `<img src="${src}" alt="${name}"${href === "qr.html" ? ' class="qr-pos"' : ""}>`;
      nav.appendChild(a);
    });
    layer.appendChild(nav);
    document.body.appendChild(layer);
  }
  if (hero) {
    const pv = document.createElement("img");
    pv.className = "hero-preview"; pv.alt = "";
    hero.appendChild(pv);
    document.querySelectorAll(".mini-strip a").forEach(a => {
      const href = a.getAttribute("href");
      if (!PAGES[href] || href === here) return;
      a.addEventListener("mouseenter", () => {
        pv.src = PAGES[href][0];
        pv.classList.toggle("qr-pos", href === "qr.html");
        hero.classList.add("previewing");
      });
      a.addEventListener("mouseleave", () => hero.classList.remove("previewing"));
    });
  }

  /* left stage: switch between the interaction and the object photo */
  const stage = document.querySelector(".stage");
  if (stage) {
    const tabs = stage.querySelectorAll(".stage-tabs .pill");
    tabs.forEach(t => t.addEventListener("click", () => {
      stage.dataset.view = t.dataset.view;
      tabs.forEach(x => x.classList.toggle("on", x === t));
    }));
  }
})();
