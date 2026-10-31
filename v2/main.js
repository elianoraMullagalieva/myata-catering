(() => {
  "use strict";

  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const media = document.querySelector("[data-hero-media]");

  /* ---------- Фото фуршета как в макете «Фаворит» (узел 110:1840) ----------
     В макете фото 3:2 занимает 1467×978 в кадре 1440×859 — чуть шире и на 14% выше экрана,
     верхним краем у верха. Держим центр стола по центру на любом экране. */
  const SRC = { w: 2048, h: 1366 };

  function placeMedia() {
    if (!hero || !media) return;
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const mobile = w < 768;

    // на телефоне фото опущено на 9% высоты: сверху — продолжение тёмного фона снимка,
    // заголовок получает воздух, а еда уходит ниже текста
    const lift = mobile ? h * 0.09 : 0;
    const scale = mobile
      ? Math.max(w / SRC.w, (h - lift) / SRC.h)
      : Math.max((1.019 * w) / SRC.w, (1.139 * h) / SRC.h);
    const W = SRC.w * scale;
    const H = SRC.h * scale;

    // по горизонтали — центр стола (центральная стойка) по центру экрана
    let left = w / 2 - 0.5 * W;
    // по вертикали — как в макете: фото почти от верха, лишнее уходит вниз
    let top = mobile ? h * 0.5 - 0.52 * H : -0.005 * h;
    left = Math.min(0, Math.max(w - W, left));
    top = mobile ? lift : Math.min(0, Math.max(h - H, top));

    media.style.inset = "0 auto auto 0";
    media.style.width = `${W}px`;
    media.style.height = `${H}px`;
    media.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    media.classList.add("is-placed");
  }

  placeMedia();

  // видео проявляется поверх фото, только когда реально пошло; при «меньше движения» остаётся фото
  const video = media && media.querySelector(".v2-video");
  if (video) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.removeAttribute("autoplay");
      video.pause();
    } else {
      const shown = () => video.classList.add("is-playing");
      video.addEventListener("playing", shown, { once: true });
      if (!video.paused && video.readyState > 2) shown();
      const p = video.play && video.play();
      if (p && p.catch) p.catch(() => {});
      // когда первый экран ушёл из вида — видео на паузе, телефон не тратит силы
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([en]) => {
          if (en.isIntersecting) { const q = video.play(); if (q && q.catch) q.catch(() => {}); }
          else video.pause();
        }).observe(hero);
      }
    }
  }
  if ("ResizeObserver" in window && hero) {
    new ResizeObserver(placeMedia).observe(hero);
  } else {
    window.addEventListener("resize", placeMedia, { passive: true });
  }

  /* ---------- Хореография ----------
     Заголовок делим на буквы (внутри слов — без переноса посреди слова), заметки — на слова,
     всем раздаём задержки. Старт — когда готовы фото и шрифты. */
  // общий темп хореографии: 1 — исходный, меньше — быстрее
  const PACE = 0.85;
  const setDelay = (el, s) => el && el.style.setProperty("--d", `${(s * PACE).toFixed(3)}s`);

  function splitChars(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    const chars = [];
    words.forEach((word, wi) => {
      const w = document.createElement("span");
      w.className = "v2-cw";
      for (const ch of word) {
        const c = document.createElement("span");
        c.className = "v2-c";
        c.textContent = ch;
        w.appendChild(c);
        chars.push(c);
      }
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return chars;
  }

  function splitWords(el) {
    // делим только текст, переносы <br> оставляем на месте — строки заметок заданы явно;
    // неразрывные пробелы остаются внутри «слова», чтобы предлоги не отрывались
    const words = [];
    [...el.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/( +)/).forEach((part) => {
        if (!part) return;
        if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        const w = document.createElement("span");
        w.className = "v2-w";
        w.textContent = part;
        frag.appendChild(w);
        words.push(w);
      });
      node.replaceWith(frag);
    });
    return words;
  }

  // шапка
  setDelay(document.querySelector(".logo"), 0.15);
  setDelay(document.querySelector(".burger"), 0.3);
  document.querySelectorAll(".nav__list li").forEach((li, i) => setDelay(li, 0.28 + i * 0.04));
  setDelay(document.querySelector(".header__contacts .phone"), 0.5);
  document.querySelectorAll(".socials li").forEach((li, i) => setDelay(li, 0.56 + i * 0.05));
  setDelay(document.querySelector(".header__contacts .btn"), 0.66);

  // заголовок: строка за строкой, буква за буквой
  const lines = [...document.querySelectorAll("[data-split]")];
  let t = 0.38;
  lines.forEach((line, li) => {
    const chars = splitChars(line);
    chars.forEach((c, i) => setDelay(c, t + i * 0.016));
    t += li === 0 ? 0.22 : 0.24;
  });
  const accent = document.querySelector(".v2-title__accent-in");
  const accentAt = t + 0.15;
  setDelay(accent, accentAt);
  if (accent) accent.style.setProperty("--shine", `${((accentAt + 1.1) * PACE).toFixed(2)}s`);

  // заметки: сначала правая (она выше), затем левая
  [[".v2-note--right", accentAt + 0.25], [".v2-note--left", accentAt + 0.42]].forEach(([sel, at]) => {
    const note = document.querySelector(sel);
    if (!note) return;
    setDelay(note, at - 0.1);
    setDelay(note.querySelector(".v2-note__mark"), at);
    const text = note.querySelector("[data-words]");
    if (text) splitWords(text).forEach((w, i) => setDelay(w, at + 0.12 + i * 0.03));
  });

  // низ: факты, затем кнопки — последними
  const bottomAt = accentAt + 0.55;
  setDelay(document.querySelector(".facts"), bottomAt);
  document.querySelectorAll(".fact").forEach((el, i) => setDelay(el, bottomAt + 0.08 + i * 0.08));
  document.querySelectorAll(".actions .btn").forEach((el, i) => setDelay(el, bottomAt + 0.16 + i * 0.09));

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const img = media && media.querySelector("img");
  const imageReady = img
    ? (img.decode ? img.decode() : new Promise((r) => (img.complete ? r() : img.addEventListener("load", r, { once: true })))).catch(() => {})
    : Promise.resolve();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  // ждём фото и шрифты, но не дольше 1,6 с
  Promise.race([Promise.all([imageReady, fontsReady]), wait(1600)]).then(() => {
    void root.offsetWidth;
    root.classList.add("is-loaded");
  });

  /* ---------- Мобильное меню ---------- */
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");
  if (!burger || !drawer) return;

  let closeTimer = 0;

  function setOpen(open) {
    clearTimeout(closeTimer);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("is-locked", open);

    if (open) {
      drawer.hidden = false;
      void drawer.offsetWidth;
      drawer.classList.add("is-open");
      const first = drawer.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    } else {
      drawer.classList.remove("is-open");
      closeTimer = setTimeout(() => { drawer.hidden = true; }, 450);
    }
  }

  burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
  drawer.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      burger.focus();
    }
  });
  window.matchMedia("(min-width: 1100px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
})();
