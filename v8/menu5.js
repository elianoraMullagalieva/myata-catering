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

  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(colsBox);
  else window.addEventListener("resize", measure);
  measure();
})();
