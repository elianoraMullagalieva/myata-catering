/* МЯТА v6 — «оркестр» анимаций: сайт дышит по кусочкам.
   1) Появление по прокрутке: элементы, вошедшие в экран вместе, идут волной с перехлёстом
      (следующий стартует, пока предыдущий ещё не закончил).
   2) Фото раскрываются шторкой и чуть отъезжают из приближения; крупные фото мягко плывут при прокрутке.
   3) Цифры «О компании» набегают от нуля.
   4) Главные кнопки слегка тянутся к курсору (магнит).
   Всё отключается при «уменьшить движение». Без JS контент виден сразу (класс ставится только здесь). */
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;
  const root = document.documentElement;

  /* ---------- 1. что и как появляется ---------- */
  // [селектор, тип]: rise — выплывает снизу из лёгкого размытия; clip — шторка снизу вверх (для фото);
  // fade — просто проявляется (для лент, которые и так движутся)
  const MAP = [
    [".tst__over, .tst__title, .tst__lead, .tst__row, .tst__bar", "rise"],
    [".tst-ticket", "rise"],
    [".why__title, .why__lead, .why-item, .why__btn", "rise"],
    [".why__photo", "clip"],
    [".m5__title, .m5__lead, .m5__btn", "rise"],
    [".st__title, .st__lead, .st__nav, .st__dots", "rise"],
    [".st__viewport", "fade"],
    [".tm__title, .tm__lead, .tm-stat, .tm__logos-label", "rise"],
    [".tm__marquee", "rise"],
    [".tm__photo", "clip"],
    [".rv__title, .rv__lead, .rv-card, .rv__foot", "rise"],
    [".ct5__title, .ct5__row, .ct5__btn", "rise"],
    [".ct5__visual", "clip"],
    [".ft5__nav li, .ft5__docs li, .ft5__copy", "rise"],
  ];
  const items = [];
  MAP.forEach(([sel, type]) => document.querySelectorAll(sel).forEach((el) => {
    if (el.dataset.a) return;
    el.dataset.a = type;
    items.push(el);
  }));
  root.classList.add("anim-ready");

  // волна: всё, что вошло в экран в одном кадре, получает задержки по порядку на странице
  let batch = [], flushRaf = 0;
  const STEP = 0.085; // с — шаг волны (меньше длительности → перехлёст)
  function flush() {
    flushRaf = 0;
    batch.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    batch.forEach((el, i) => {
      el.style.setProperty("--ad", `${Math.min(i * STEP, 0.9).toFixed(3)}s`);
      el.classList.add("is-in");
      // после появления снимаем служебные стили — дальше работают обычные правила блока (наведение и т.п.)
      const d = Math.min(i * STEP, 0.9);
      setTimeout(() => { el.removeAttribute("data-a"); el.classList.remove("is-in"); el.style.removeProperty("--ad"); }, (d + 1.6) * 1000);
      if (el.matches(".tm-stat")) countUp(el, Math.min(i * STEP, 0.9));
    });
    batch = [];
  }
  const watchOf = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      (watchOf.get(en.target) || [en.target]).forEach((el) => {
        if (!el.classList.contains("is-in") && !batch.includes(el)) batch.push(el);
      });
    });
    if (batch.length && !flushRaf) flushRaf = requestAnimationFrame(flush);
  }, { rootMargin: "0px 0px -5% 0px", threshold: 0.06 });
  items.forEach((el) => {
    // скрытое на этой ширине (точки слайдера на десктопе и т.п.) — не анимируем вовсе
    if (!el.getClientRects().length) { el.removeAttribute("data-a"); return; }
    // фото со шторкой — по родителю; карточки отзывов за краем ленты — по самой ленте (появляются вместе)
    const w = el.dataset.a === "clip" ? el.parentElement : (el.closest("[data-rv-viewport]") || el);
    if (!watchOf.has(w)) { watchOf.set(w, []); io.observe(w); }
    watchOf.get(w).push(el);
  });
  // низ страницы: то, что уже на экране, но не может подняться выше (страница кончилась), показываем сразу
  let endRaf = 0;
  window.addEventListener("scroll", () => {
    if (endRaf) return;
    endRaf = requestAnimationFrame(() => {
      endRaf = 0;
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 4) return;
      items.forEach((el) => {
        if (el.classList.contains("is-in") || !el.dataset.a || batch.includes(el)) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0 && r.width) batch.push(el);
      });
      if (batch.length && !flushRaf) flushRaf = requestAnimationFrame(flush);
    });
  }, { passive: true });

  /* ---------- 2. цифры набегают ---------- */
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function countUp(stat, delay) {
    const el = stat.querySelector(".tm-stat__num");
    if (!el || el.dataset.done) return;
    el.dataset.done = "1";
    const txt = el.textContent;
    const target = parseInt(txt.replace(/\D/g, ""), 10);
    const suffix = txt.replace(/[\d\s ]/g, "");
    if (!target) return;
    const width = el.getBoundingClientRect().width;
    el.style.minWidth = `${width}px`; // ширина не прыгает, пока цифры растут
    const dur = 1700;
    let t0 = 0;
    const ease = (t) => 1 - Math.pow(2, -10 * t); // мягкое торможение в конце
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(target * ease(p))) + suffix;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = txt;
    };
    setTimeout(() => requestAnimationFrame(tick), delay * 1000 + 150);
  }

  /* ---------- 3. крупные фото плывут при прокрутке ---------- */
  const para = [...document.querySelectorAll(".why__photo img, .tm__photo img")].filter((im) => getComputedStyle(im).position === "absolute");
  let pRaf = 0;
  function parallax() {
    pRaf = 0;
    const vh = window.innerHeight;
    para.forEach((img) => {
      const box = img.parentElement.closest("figure") || img.parentElement;
      const r = box.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -1…1 вокруг центра экрана
      img.style.setProperty("--py", `${(p * -28).toFixed(1)}px`);
    });
  }
  if (para.length) {
    window.addEventListener("scroll", () => { if (!pRaf) pRaf = requestAnimationFrame(parallax); }, { passive: true });
    parallax();
  }

  /* ---------- 4. кнопки-магниты ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".dark-btn, .ct5__btn, .m5__btn, .tst-submit, .rv__all, .ft5__btn, .svc-btn").forEach((btn) => {
      let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
      const step = () => {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        btn.style.setProperty("--mx", `${x.toFixed(2)}px`);
        btn.style.setProperty("--my", `${y.toFixed(2)}px`);
        raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(step) : 0;
      };
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * Math.min(14, r.width * 0.05);
        ty = ((e.clientY - r.top) / r.height - 0.5) * 8;
        if (!raf) raf = requestAnimationFrame(step);
      });
      btn.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
      btn.classList.add("is-magnet");
    });
  }
  /* ---------- 5. фон дегустации: пятна чуть тянутся за курсором ---------- */
  const tbg = document.querySelector("[data-tst-bg]");
  if (tbg && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const area = tbg.parentElement;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      tbg.style.setProperty("--mx", x.toFixed(3));
      tbg.style.setProperty("--my", y.toFixed(3));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    area.addEventListener("pointermove", (e) => {
      const r = area.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    area.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }
})();
