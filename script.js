/* ==========================================================
   DISCRETE — script.js
   1. scale the 1440px frame to the window
   2. eased (smooth) scrolling
   3. page fade transitions + scroll reveal
   4. landing: infinite image strip, hover background, index/about panels
   5. detail pages: Braille / Morse / Dot matrix interactions
   ========================================================== */
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

  /* ==========================================================
     4. LANDING
     ========================================================== */
  if (isLanding) {
    // one cycle of the strip, positions taken from Figma (Group 1)
    const ITEMS = [
      { key: "braille",   href: "braille.html",   top: 0,      h: 90.54 },
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
          a.innerHTML = `<img src="images/${it.key}.png" alt="${it.key}">`;
          track.appendChild(a);
        });
      }
    };
    build();
    addEventListener("resize", build);

    // eased infinite scroll of the strip (+ a very slow drift)
    let target = 0, pos = 0, hovering = false;
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

    // index / about panels
    document.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const panel = document.getElementById(btn.dataset.toggle);
        const open = panel.classList.toggle("open");
        btn.setAttribute("aria-expanded", open);
      });
    });
    addEventListener("keydown", e => {
      if (e.key === "Escape") document.querySelectorAll(".panel.open").forEach(p => p.classList.remove("open"));
    });
  }

  /* ==========================================================
     5. DETAIL PAGE INTERACTIONS
     ========================================================== */

  /* Braille: A / B / C changes the raised dots (1-2-3 left column, 4-5-6 right) */
  const cell = document.querySelector(".braille-cell");
  if (cell) {
    const BRAILLE = { A: [1], B: [1, 2], C: [1, 4] };
    const dots = [...cell.children];
    const pills = document.querySelectorAll(".braille-pills .pill");
    const set = ch => {
      dots.forEach((d, i) => d.classList.toggle("up", BRAILLE[ch].includes(i + 1)));
      pills.forEach(p => p.classList.toggle("on", p.dataset.ch === ch));
    };
    pills.forEach(p => p.addEventListener("click", () => set(p.dataset.ch)));
    set("A");
  }

  /* Dot matrix: 5 × 7 character, printed column by column like a printhead */
  const matrix = document.querySelector(".matrix");
  if (matrix) {
    const GLYPHS = {
      A: ["..#..", ".#.#.", "#...#", "#####", "#...#", "#...#", "#...#"],
      B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
      C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
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
})();
