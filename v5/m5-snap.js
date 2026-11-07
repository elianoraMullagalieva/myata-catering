/* МЯТА v5 — переход «дегустация → меню» по жесту.
   Когда дегустация досмотрена до низа, следующий жест прокрутки вниз сам плавно уводит к меню:
   по пути дегустация гаснет в тёмный (это делает menu5.js по положению прокрутки), меню проявляется.
   Жест вверх у самого верха меню так же плавно возвращает к низу дегустации. */
(() => {
  "use strict";
  const tst = document.getElementById("tasting");
  const menu = document.getElementById("menu");
  if (!tst || !menu || tst.nextElementSibling !== menu) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let busy = false;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function glide(to, dur) {
    busy = true;
    const from = window.scrollY, d = to - from, t0 = performance.now();
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + d * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else { root.style.scrollBehavior = prev; setTimeout(() => { busy = false; }, 250); }
    })(t0);
  }

  // зона «вниз»: низ дегустации уже у низа экрана (досмотрели форму), а меню ещё не сверху
  function zoneDown() {
    const tb = tst.getBoundingClientRect().bottom, mt = menu.getBoundingClientRect().top, vh = window.innerHeight;
    return tb <= vh + 4 && mt > 2;
  }
  // зона «вверх»: меню стоит у верха экрана (±40px)
  function zoneUp() {
    const mt = menu.getBoundingClientRect().top;
    return mt > -40 && mt < 40;
  }
  const toMenu = () => glide(window.scrollY + menu.getBoundingClientRect().top, 900);
  const toTasting = () => glide(window.scrollY + tst.getBoundingClientRect().bottom - window.innerHeight, 800);

  function intent(dy, e) {
    if (busy) { e && e.cancelable && e.preventDefault(); return; }
    if (dy > 0 && zoneDown()) { e && e.cancelable && e.preventDefault(); toMenu(); }
    else if (dy < 0 && zoneUp()) { e && e.cancelable && e.preventDefault(); toTasting(); }
  }

  window.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) < 4 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    intent(e.deltaY, e);
  }, { passive: false });

  let ty = 0;
  window.addEventListener("touchstart", (e) => { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    const dy = ty - e.touches[0].clientY;
    if (Math.abs(dy) < 12) return;
    intent(dy, e);
    ty = e.touches[0].clientY;
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) intent(1, e);
    else if (["ArrowUp", "PageUp"].includes(e.key)) intent(-1, e);
  });
})();
