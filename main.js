(() => {
  "use strict";

  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const media = document.querySelector("[data-hero-media]");
  const video = media && media.querySelector("[data-hero-video]");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // версия файлов (?v=…) — ей же подгружаем скрипты пара
  const version = document.currentScript ? new URL(document.currentScript.src).search : "";

  /* ---------- Кадры фона: фото и видео ----------
     Размеры — в базе ширины 2048 px. Коробка .hero__media растягивается как cover, а точка
     фокуса (u, v — грудь шефа, голова по центру) держится в нужном месте экрана.
     ky — во сколько раз кадр выше экрана на десктопе, km — запас на телефоне.

     photo — Повар/любимка 4к2.png (2048×1348,5): как в макете (узел 45:208), чуть шире кадра
       и на 12% выше него.
     video — ролики «Дима итог 2к» и «Дима итог 2» (2560×1440 → 2048×1152, кадр у обоих одинаковый).
       Это та же сцена, что на фото, но срезана сверху (~130 px потолка над шефом), а сам шеф
       в ней выше и чуть мельче. Чтобы грудь стояла там же, где на фото (735 × 520 на 1440×859),
       видео поднимаем на 20% выше экрана — шеф выходит на ~15% крупнее, лицо на своём месте.
       Фокус — среднее положение груди за ролик (шеф наклоняется на ±15 px). */
  const FRAMES = {
    photo: { w: 2048, h: 1348.5, u: 1043 / 2048, v: 720 / 1344, ky: 1.122, km: 1.04 },
    video: { w: 2048, h: 1152, u: 1016 / 2048, v: 580 / 1152, ky: 1.2, km: 1.01 },
  };

  /* ---------- Видео вместо фото ----------
     Два ролика для сравнения: выбор запоминается и задаётся ссылкой ?video=2.
     Фото остаётся запасным вариантом — без JS, при «уменьшить движение», экономии трафика
     и если видео не загрузилось; только тогда включается WebGL-пар (у видео свой живой пар). */
  const VIDEOS = { "1": "hero-video-1", "2": "hero-video-2" };
  const store = {
    get() { try { return localStorage.getItem("myata-video"); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem("myata-video", v); } catch (e) { /* приватный режим */ } },
  };
  const fromUrl = new URLSearchParams(location.search).get("video");
  let clip = VIDEOS[fromUrl] ? fromUrl : VIDEOS[store.get()] ? store.get() : "1";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const canVideo = !!(video && video.canPlayType && video.canPlayType("video/mp4"));
  let mode = hero && media && canVideo && !reduceMotion && !saveData ? "video" : "photo";

  function setVideoSource() {
    const base = `assets/${VIDEOS[clip]}`;
    video.poster = `${base}.webp`; // первый кадр ролика — той же геометрии, без скачка при старте
    video.src = `${base}.mp4`;
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* автозапуск запрещён (энергосбережение) — остаётся постер */ });
  }

  // первый кадр видео готов (или видео не будет)
  const videoFrameReady = () => new Promise((r) => {
    if (video.readyState >= 2) return r();
    ["loadeddata", "canplay", "error"].forEach((ev) => video.addEventListener(ev, r, { once: true }));
  });

  // пар нужен только фото — для видео его скрипты не грузим вовсе
  let steamRequested = false;
  function loadSteam() {
    if (steamRequested) return;
    steamRequested = true;
    ["steam-texture.js", "steam.js"].forEach((name) => {
      const s = document.createElement("script");
      s.src = name + version;
      s.async = false; // строго по порядку: сначала слой пара, потом шейдер
      document.body.appendChild(s);
    });
  }

  function placeMedia() {
    if (!hero || !media) return;
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const mobile = w < 768;
    const F = FRAMES[mode];

    // десктоп: тот же зум, что в макете; телефон: шеф крупнее и по центру
    const scale = mobile
      ? Math.max(w / F.w, h / F.h) * F.km
      : Math.max((1.004 * w) / F.w, (F.ky * h) / F.h);
    const W = F.w * scale;
    const H = F.h * scale;

    const fx = mobile ? 0.5 : w < 1024 ? 0.5 : 735 / 1440;
    // на телефоне заголовок и кнопки внизу — поднимаем шефа выше, чтобы лицо было открыто
    const fy = mobile ? 0.47 : 520 / 859;

    let left = fx * w - F.u * W;
    let top = fy * h - F.v * H;
    left = Math.min(0, Math.max(w - W, left));
    top = Math.min(0, Math.max(h - H, top));

    media.style.inset = "0 auto auto 0";
    media.style.width = `${W}px`;
    media.style.height = `${H}px`;
    media.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    media.classList.add("is-placed");
    media.dispatchEvent(new CustomEvent("media:resize", { detail: { width: W, height: H } }));
  }

  const switcher = document.querySelector("[data-video-switch]");

  // исходное фото тяжёлое (без пережатия) — подставляем его только в режиме фото
  function loadPhoto() {
    const photo = media && media.querySelector(".hero__photo img");
    if (photo && !photo.getAttribute("src") && photo.dataset.src) photo.src = photo.dataset.src;
  }

  // видео не загрузилось — возвращаем фото с паром
  function fallbackToPhoto() {
    if (mode === "photo") return;
    mode = "photo";
    media.dataset.mode = "photo";
    loadPhoto();
    video.removeAttribute("src");
    video.load();
    if (switcher) switcher.hidden = true;
    placeMedia();
    loadSteam();
  }

  if (media) {
    media.dataset.mode = mode;
    if (mode === "video") {
      setVideoSource();
      video.addEventListener("error", fallbackToPhoto);
      // за кадром ролик не крутим — бережём батарею
      if ("IntersectionObserver" in window && hero) {
        new IntersectionObserver(([entry]) => {
          if (mode !== "video") return;
          if (entry.isIntersecting) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
          else video.pause();
        }).observe(hero);
      }
    } else {
      loadPhoto();
      loadSteam();
    }
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

  const img = media && media.querySelector("img");
  const imageReady = mode === "photo" && img
    ? (img.decode ? img.decode() : new Promise((r) => (img.complete ? r() : img.addEventListener("load", r, { once: true })))).catch(() => {})
    : Promise.resolve();
  const steamReady = new Promise((r) => {
    if (!media || mode === "video") return r();
    media.addEventListener("steam:ready", r, { once: true });
    media.addEventListener("steam:none", r, { once: true });
  });
  // у видео ждём первый кадр — фон проявляется уже живым
  const videoReady = mode === "video" ? videoFrameReady() : Promise.resolve();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  // ждём всё вместе, но не дольше 2.5 с — на медленной сети страница не должна висеть пустой
  // (если видео не успело, видно его постер — первый кадр ролика)
  Promise.race([Promise.all([imageReady, steamReady, videoReady, fontsReady]), wait(2500)]).then(() => {
    void root.offsetWidth;
    root.classList.add("is-loaded");
  });

  /* ---------- Еле заметный переключатель роликов ----------
     Фон гаснет, ролик меняется и проявляется снова — без перезагрузки страницы. */
  if (switcher && mode === "video") {
    switcher.hidden = false;
    const buttons = [...switcher.querySelectorAll("[data-video]")];
    const mark = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.video === clip)));
    mark();
    let busy = false;
    switcher.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-video]");
      if (!btn || busy || mode !== "video" || btn.dataset.video === clip || !VIDEOS[btn.dataset.video]) return;
      busy = true;
      clip = btn.dataset.video;
      store.set(clip);
      mark();
      media.classList.add("is-swapping");
      await wait(350);
      setVideoSource();
      // ждём первый кадр нового ролика, но не дольше 1,5 с — смена не должна зависать
      await Promise.race([videoFrameReady(), wait(1500)]);
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
