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
    cols.forEach((c) => {
      if (!c.h) return;
      c.y += c.dir * c.speed * k * dt;
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
    if (!visible) last = 0;
    loop();
  }, { rootMargin: "100px 0px" }).observe(sec);
  document.addEventListener("visibilitychange", () => { last = 0; loop(); });
  reduce.addEventListener?.("change", loop);

  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(colsBox);
  else window.addEventListener("resize", measure);
  measure();

  /* ---------- 2. переход из дегустации ---------- */
  const tst = document.getElementById("tasting");
  if (!tst || sec.previousElementSibling !== tst) return;
  const fade = document.createElement("div");
  fade.className = "m5-fade";
  fade.setAttribute("aria-hidden", "true");
  tst.appendChild(fade);
  const backdrop = tst.querySelector("[data-tst-backdrop]");
  const text = sec.querySelector(".m5__text");
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (v) => v * v * (3 - 2 * v);
  let pending = 0;
  let prevO = -1, prevQ = -1;

  function reset() {
    fade.style.opacity = "0";
    tst.classList.remove("is-m5-dim");
    sec.classList.remove("is-m5-anim");
    text.style.opacity = text.style.transform = colsBox.style.opacity = colsBox.style.transform = "";
    prevO = prevQ = -1;
  }

  function update() {
    pending = 0;
    if (reduce.matches) { reset(); return; }
    const vh = window.innerHeight;
    const phone = window.innerWidth < 768;
    const bottom = tst.getBoundingClientRect().bottom; // = верх меню
    // затемнение: низ дегустации поднимается от низа экрана до трети (на телефоне короче — до 55%)
    const end = vh * (phone ? 0.55 : 1 / 3);
    const p = clamp01((vh - bottom) / (vh - end));
    // быстрое начало: содержимое растворяется в первой половине пути
    let o = 1 - (1 - p) * (1 - p);
    if (backdrop && !backdrop.hidden) o = 0; // открыта форма на телефоне — не мешаем
    if (Math.abs(o - prevO) > 0.002) {
      fade.style.opacity = o.toFixed(3);
      tst.classList.toggle("is-m5-dim", o > 0.6);
      prevO = o;
    }
    // появление меню — следом за затемнением
    const qa = vh * (phone ? 0.62 : 0.5), qb = vh * (phone ? 0.2 : 0.06);
    const q = clamp01((qa - bottom) / (qa - qb));
    if (Math.abs(q - prevQ) > 0.002) {
      prevQ = q;
      if (q >= 1) {
        sec.classList.remove("is-m5-anim");
        text.style.opacity = text.style.transform = colsBox.style.opacity = colsBox.style.transform = "";
      } else {
        sec.classList.add("is-m5-anim");
        const qt = smooth(q);
        const qc = smooth(clamp01(q * 1.25 - 0.2)); // колонки чуть позже текста
        text.style.opacity = qt.toFixed(3);
        text.style.transform = `translate3d(0, ${((1 - qt) * 28).toFixed(1)}px, 0)`;
        colsBox.style.opacity = qc.toFixed(3);
        colsBox.style.transform = `translate3d(0, ${((1 - qc) * 44).toFixed(1)}px, 0)`;
      }
    }
  }
  const schedule = () => { if (!pending) pending = requestAnimationFrame(update); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  reduce.addEventListener?.("change", schedule);
  update();
})();
