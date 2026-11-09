/* Отзывы: лента на нативной прокрутке со snap, стрелки и счётчик, поп-ап «отзыв полностью».
   Логотипы клиентов: если не помещаются в ряд — бегущая строка (копия списка, CSS-анимация). */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- логотипы ---------- */
  const mq = document.querySelector("[data-tm-marquee]");
  if (mq) {
    const list = mq.querySelector("ul");
    let clone = null;
    const check = () => {
      if (clone) { clone.remove(); clone = null; }
      mq.classList.remove("is-running");
      // помещаются — стоят ровным рядом, как в макете
      if (list.scrollWidth <= mq.clientWidth + 1 || reduce) return;
      clone = list.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("img").forEach((i) => (i.alt = ""));
      mq.appendChild(clone);
      mq.style.setProperty("--tm-dur", `${Math.round(list.scrollWidth / 45)}s`); // ~45px/с
      mq.classList.add("is-running");
    };
    let t = 0;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(check, 150); });
    if (document.readyState === "complete") check(); else window.addEventListener("load", check);
    check();
  }

  /* ---------- лента отзывов ---------- */
  const rv = document.querySelector("[data-rv]");
  if (!rv) return;
  const vp = rv.querySelector("[data-rv-viewport]");
  const cards = [...rv.querySelectorAll("[data-rv-card]")];
  const prev = rv.querySelector("[data-rv-prev]");
  const next = rv.querySelector("[data-rv-next]");
  const count = rv.querySelector("[data-rv-count]");
  const N = cards.length;

  const step = () => {
    if (cards.length < 2) return vp.clientWidth;
    return cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
  };
  const index = () => Math.round(vp.scrollLeft / Math.max(1, step()));
  function update() {
    const max = vp.scrollWidth - vp.clientWidth - 2;
    prev.disabled = vp.scrollLeft <= 2;
    next.disabled = vp.scrollLeft >= max;
    const i = Math.min(N - 1, index());
    count.textContent = `${pad2(i + 1)} / ${pad2(N)}`;
  }
  const go = (d) => vp.scrollBy({ left: d * step(), behavior: reduce ? "auto" : "smooth" });
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  vp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  let raf = 0;
  vp.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();

  // мышью — тянем ленту, как в «Услугах»
  let drag = null, moved = false;
  vp.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button, a")) return;
    drag = { x: e.clientX, left: vp.scrollLeft }; moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 5) { moved = true; vp.classList.add("is-dragging"); }
    if (moved) vp.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    drag = null;
    if (!moved) return;
    const target = Math.round(vp.scrollLeft / step()) * step();
    vp.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
    setTimeout(() => vp.classList.remove("is-dragging"), 450);
  });

  // ссылки на оригиналы появятся позже — пока не прыгаем наверх страницы
  rv.querySelectorAll("[data-rv-orig]").forEach((a) => a.addEventListener("click", (e) => { if (a.getAttribute("href") === "#") e.preventDefault(); }));

  /* ---------- поп-ап ---------- */
  const m = rv.querySelector("[data-rvm]");
  const f = (sel) => m.querySelector(sel);
  let cur = 0, lastFocus = null;
  function fill(i) {
    cur = (i + N) % N;
    const c = cards[cur];
    const type = c.querySelector("[data-rv-type]").textContent;
    f("[data-rvm-type]").textContent = type;
    f("[data-rvm-type2]").textContent = type;
    f("[data-rvm-date]").textContent = c.querySelector("[data-rv-date]").textContent;
    f("[data-rvm-text]").textContent = c.querySelector("[data-rv-text]").textContent;
    f("[data-rvm-name]").textContent = c.querySelector(".rv-card__name").textContent;
    f("[data-rvm-ava]").src = c.querySelector(".rv-card__ava").getAttribute("src");
    f(".rvm__body").classList.remove("is-swap"); void f(".rvm__body").offsetWidth; f(".rvm__body").classList.add("is-swap");
  }
  function open(i) {
    lastFocus = document.activeElement;
    fill(i);
    m.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => { m.classList.add("is-open"); f(".rvm__close").focus({ preventScroll: true }); });
  }
  function close() {
    m.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => { m.hidden = true; }, reduce ? 0 : 350);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  cards.forEach((c, i) => c.querySelector("[data-rv-open]").addEventListener("click", () => open(i)));
  rv.querySelector("[data-rv-all]").addEventListener("click", () => open(Math.min(N - 1, index())));
  m.querySelectorAll("[data-rvm-close]").forEach((b) => b.addEventListener("click", close));
  f("[data-rvm-prev]").addEventListener("click", () => fill(cur - 1));
  f("[data-rvm-next]").addEventListener("click", () => fill(cur + 1));
  document.addEventListener("keydown", (e) => {
    if (m.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") fill(cur + 1);
    if (e.key === "ArrowLeft") fill(cur - 1);
  });
})();
