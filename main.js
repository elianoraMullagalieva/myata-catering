(() => {
  "use strict";

  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const media = document.querySelector("[data-hero-media]");

  /* ---------- Варианты фото первого экрана ----------
     1 — Повар/Любимка 4к.png, 2 — Повар/любимка 4к2.png (тот же кадр, другая обработка).
     Выбор запоминается и задаётся ссылкой ?photo=2. Размеры — в базе ширины 2048 px. */
  const VARIANTS = {
    "1": { prefix: "hero",  h: 1344 },
    "2": { prefix: "hero2", h: 1348.5 },
  };
  const srcsetOf = (p) => `assets/${p}-1200.webp 1200w, assets/${p}.webp 1600w, assets/${p}-2048.webp 2048w, assets/${p}-2880.webp 2880w`;
  const store = {
    get() { try { return localStorage.getItem("myata-photo"); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem("myata-photo", v); } catch (e) { /* приватный режим */ } },
  };
  const fromUrl = new URLSearchParams(location.search).get("photo");
  let photo = VARIANTS[fromUrl] ? fromUrl : VARIANTS[store.get()] ? store.get() : "1";

  function setPhotoSources(key) {
    const v = VARIANTS[key];
    const source = media && media.querySelector("source");
    const img = media && media.querySelector("img");
    if (source) source.srcset = srcsetOf(v.prefix);
    if (img) img.src = `assets/${v.prefix}.jpg`;
  }

  if (media) {
    media.dataset.photo = photo;
    if (photo !== "1") setPhotoSources(photo);
  }

  /* ---------- Фото как cover, но с фокусом на шефе ----------
     Фото масштабируем как в макете (узел 45:208): чуть шире кадра и на 12% выше него,
     и держим точку FOCUS (грудь шефа, голова по центру) в нужном месте кадра на любом экране. */
  const SRC = { w: 2048, h: VARIANTS[photo].h };
  const FOCUS = { u: 1043 / 2048, v: 720 / 1344 };

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
    // на телефоне заголовок и кнопки внизу — поднимаем шефа выше, чтобы лицо было открыто
    const fy = mobile ? 0.47 : 520 / 859;

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

  /* ---------- Еле заметный переключатель фото ----------
     Фото и пар гаснут, меняются и проявляются снова — без перезагрузки страницы. */
  const switcher = document.querySelector("[data-photo-switch]");
  if (switcher && media) {
    const buttons = [...switcher.querySelectorAll("[data-photo]")];
    const mark = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.photo === photo)));
    mark();
    let busy = false;
    switcher.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-photo]");
      if (!btn || busy || btn.dataset.photo === photo) return;
      busy = true;
      photo = btn.dataset.photo;
      store.set(photo);
      mark();
      media.classList.add("is-swapping");
      await wait(350);
      setPhotoSources(photo);
      SRC.h = VARIANTS[photo].h;
      media.dataset.photo = photo;
      const img = media.querySelector("img");
      const imgReady = img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); });
      // ждём новое фото и его пар, но не дольше 1,5 с — смена не должна зависать
      await Promise.race([
        Promise.all([
          imgReady,
          window.MYATA_STEAM ? window.MYATA_STEAM.setVariant(photo).catch(() => {}) : Promise.resolve(),
        ]),
        wait(1500),
      ]);
      placeMedia();
      media.classList.remove("is-swapping");
      busy = false;
    });
  }

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
  window.matchMedia("(min-width: 1100px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();
