/* Меню v5: бесконечные колонки блюд + плавный переход из дегустации.
   Только transform/opacity, всё считается в одном rAF. */
(() => {
  const sec = document.querySelector("[data-m5]");
  if (!sec) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- 1. колонки ---------- */
  const cols = [...sec.querySelectorAll("[data-m5-col]")].map((col) => {
    const track = col.querySelector("[data-m5-track]");
    const set = track.firstElementChild;
    // копия набора встык — для бесшовного круга; читалкам экрана не нужна
    const copy = set.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("img").forEach((img) => (img.alt = ""));
    track.appendChild(copy);
    return {
      col, track, set,
      dir: col.dataset.dir === "down" ? 1 : -1,
      shift: +col.dataset.shift || 0, // сдвиг из макета (при карточке 320px)
      speed: +col.dataset.speed || 30, // px/с
      h: 0, y: 0, started: false,
    };
  });

  // высота набора меряется только при ресайзе, не каждый кадр
  function measure() {
    cols.forEach((c) => {
      const h = c.set.offsetHeight;
      if (!h) return; // колонка скрыта на этой ширине
      const card = c.set.firstElementChild.offsetHeight || 320;
      if (!c.started || !c.h) { c.y = c.shift * (card / 320); c.started = true; }
      else c.y = (c.y / c.h) * h; // сохраняем фазу при смене размера
      c.h = h;
      wrap(c);
      paint(c);
    });
  }
  const wrap = (c) => { if (c.h) c.y = (((c.y % c.h) - c.h) % c.h); }; // держим в [-h, 0)
  const paint = (c) => { c.track.style.transform = `translate3d(0, ${c.y.toFixed(2)}px, 0)`; };

  const phone = window.matchMedia("(max-width: 767px)");
  let lastScroll = window.scrollY;
  let visible = false;
  let hover = false;
  let k = 1; // текущий множитель скорости (при наведении плавно падает)
  let last = 0;
  let raf = 0;

  function tick(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    k += ((hover ? 0.2 : 1) - k) * Math.min(1, dt * 4);
    // телефон: колонки откликаются на прокрутку пальцем — левая уезжает вверх, правая вниз
    const sy = window.scrollY, ds = phone.matches ? sy - lastScroll : 0;
    lastScroll = sy;
    cols.forEach((c) => {
      if (!c.h) return;
      c.y += c.dir * (c.speed * k * dt + ds * 0.55);
      wrap(c);
      paint(c);
    });
    loop();
  }
  function loop() {
    if (visible && !reduce.matches && !document.hidden && !raf) raf = requestAnimationFrame(tick);
    if (!visible || reduce.matches) last = 0;
  }

  const colsBox = sec.querySelector("[data-m5-cols]");
  colsBox.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; });
  colsBox.addEventListener("pointerleave", () => { hover = false; });

  // вне экрана — пауза
  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    lastScroll = window.scrollY;
    if (!visible) last = 0;
    loop();
  }, { rootMargin: "100px 0px" }).observe(sec);
  document.addEventListener("visibilitychange", () => { last = 0; loop(); });
  reduce.addEventListener?.("change", loop);

  /* ---------- телефон: вместо колонок — лента блюд, листается пальцем ---------- */
  (() => {
    const seen = new Set(), items = [];
    sec.querySelectorAll(".m5__set:not([aria-hidden]) .m5-card").forEach((li) => {
      const img = li.querySelector("img");
      const src = img && (img.dataset.lazySrc || img.getAttribute("src"));
      if (!src || seen.has(src)) return;
      seen.add(src);
      const c = li.cloneNode(true), ci = c.querySelector("img");
      ci.removeAttribute("data-lazy-src"); ci.setAttribute("src", src); ci.setAttribute("loading", "lazy");
      items.push(c);
    });
    if (!items.length) return;
    const strip = document.createElement("div");
    strip.className = "m5-strip";
    strip.innerHTML = `<p class="m5-swipe" aria-hidden="true"><svg class="cases-swipe__hand" viewBox="0 0 24 24"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10M12 9.5a1.5 1.5 0 0 1 3 0V11M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L4.6 16a1.6 1.6 0 0 1 2.4-2.1L9 15.5V11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Листайте</p><div class="m5-strip__vp" tabindex="0" aria-label="Блюда из меню, листаются вправо"><ul class="m5-strip__list" role="list"></ul></div>`;
    const ul = strip.querySelector("ul");
    items.forEach((c) => ul.appendChild(c));
    colsBox.after(strip);
  })();

  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(colsBox);
  else window.addEventListener("resize", measure);
  measure();
})();
