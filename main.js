(() => {
  "use strict";

  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const media = document.querySelector("[data-hero-media]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------- Фото как cover, но с фокусом на шефе ----------
     В макете (узел 45:208) фото 3:2 растянуто до 1446×964 и сдвинуто на (1, -13)
     внутри кадра 1440×859. Повторяем это на любом экране: масштабируем
     и держим точку FOCUS (грудь шефа) в нужном месте кадра. */
  const SRC = { w: 2496, h: 1664 };
  const FOCUS = { u: 734 / 1446, v: 533 / 964 };

  function placeMedia() {
    if (!hero || !media) return;
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const mobile = w < 768;

    // десктоп: тот же зум, что в макете; телефон: шеф крупнее и по центру
    const scale = mobile
      ? Math.max(w / SRC.w, h / SRC.h) * 1.04
      : Math.max((1.004 * w) / SRC.w, (1.122 * h) / SRC.h);
    const W = SRC.w * scale;
    const H = SRC.h * scale;

    const fx = mobile ? 0.5 : w < 1024 ? 0.5 : 735 / 1440;
    const fy = mobile ? 0.6 : 520 / 859;

    let left = fx * w - FOCUS.u * W;
    let top = fy * h - FOCUS.v * H;
    left = Math.min(0, Math.max(w - W, left));
    top = Math.min(0, Math.max(h - H, top));

    media.style.inset = "0 auto auto 0";
    media.style.width = `${W}px`;
    media.style.height = `${H}px`;
    media.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    media.classList.add("is-placed");
    media.dispatchEvent(new CustomEvent("media:resize", { detail: { width: W, height: H } }));
  }

  placeMedia();
  if ("ResizeObserver" in window && hero) {
    new ResizeObserver(placeMedia).observe(hero);
  } else {
    window.addEventListener("resize", placeMedia, { passive: true });
  }

  /* ---------- Хореография появления ----------
     Слова заголовка заворачиваем в маски, всем элементам раздаём задержки.
     Стартуем, когда готовы шрифты, фото и первый кадр пара — всё появляется вместе. */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((word, i) => {
      const mask = document.createElement("span");
      mask.className = "w";
      const inner = document.createElement("span");
      inner.className = "w__in";
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return [...el.querySelectorAll(".w__in")];
  }

  const setDelay = (el, s) => el && el.style.setProperty("--d", `${s.toFixed(2)}s`);

  const words = [...document.querySelectorAll(".hero__title-row")].flatMap(splitWords);
  words.forEach((w, i) => setDelay(w, 0.38 + i * 0.09));

  setDelay(document.querySelector(".logo"), 0.12);
  setDelay(document.querySelector(".burger"), 0.3);
  document.querySelectorAll(".nav__list li").forEach((li, i) => setDelay(li, 0.22 + i * 0.05));
  document.querySelectorAll(".header__contacts > *, .socials li").forEach((el, i) => setDelay(el, 0.5 + i * 0.06));

  const notes = [
    [".note--left", 0.95],
    [".note--right", 1.12],
  ];
  notes.forEach(([sel, t]) => {
    const note = document.querySelector(sel);
    if (!note) return;
    setDelay(note, t - 0.1); // стеклянная подложка
    setDelay(note.querySelector(".note__mark"), t);
    setDelay(note.querySelector(".note__text"), t + 0.1);
    setDelay(note.querySelector(".note__curve"), t + 0.3);
  });

  setDelay(document.querySelector(".facts"), 1.28);
  document.querySelectorAll(".fact").forEach((el, i) => setDelay(el, 1.36 + i * 0.08));
  document.querySelectorAll(".actions .btn").forEach((el, i) => setDelay(el, 1.44 + i * 0.09));

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const img = media && media.querySelector("img");
  const imageReady = img
    ? (img.decode ? img.decode() : new Promise((r) => (img.complete ? r() : img.addEventListener("load", r, { once: true })))).catch(() => {})
    : Promise.resolve();
  const steamReady = new Promise((r) => {
    if (!media) return r();
    media.addEventListener("steam:ready", r, { once: true });
    media.addEventListener("steam:none", r, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  // ждём всё вместе, но не дольше 2.5 с — на медленной сети страница не должна висеть пустой
  Promise.race([Promise.all([imageReady, steamReady, fontsReady]), wait(2500)]).then(() => {
    void root.offsetWidth;
    root.classList.add("is-loaded");
  });

  /* ---------- Лёгкая интерактивность (только мышь) ----------
     Параллакс: фото уходит вглубь, тексты чуть ближе к зрителю.
     Магнитные кнопки: тянутся к курсору на несколько пикселей. */
  const interactive = () => finePointer.matches && !reduceMotion.matches;

  if (hero) {
    let tx = 0, ty = 0, cx = 0, cy = 0, rafId = 0;

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      hero.style.setProperty("--mx", cx.toFixed(4));
      hero.style.setProperty("--my", cy.toFixed(4));
      rafId = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!rafId) rafId = requestAnimationFrame(tick); };

    hero.addEventListener("pointermove", (e) => {
      if (!interactive() || e.pointerType !== "mouse") return;
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  }

  document.querySelectorAll("[data-magnet]").forEach((btn) => {
    const strength = Number(btn.dataset.magnet) || 6;
    btn.addEventListener("pointermove", (e) => {
      if (!interactive() || e.pointerType !== "mouse") return;
      const r = btn.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      btn.style.translate = `${(x * strength).toFixed(2)}px ${(y * strength * 0.6).toFixed(2)}px`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.translate = ""; });
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
      void drawer.offsetWidth; // фиксируем стартовое состояние, чтобы сработал переход
      drawer.classList.add("is-open");
      const first = drawer.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    } else {
      drawer.classList.remove("is-open");
      closeTimer = setTimeout(() => { drawer.hidden = true; }, 450);
    }
  }

  burger.addEventListener("click", () => {
    setOpen(burger.getAttribute("aria-expanded") !== "true");
  });

  drawer.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      burger.focus();
    }
  });

  // если экран расширили до десктопа с открытым меню — закрываем
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();
