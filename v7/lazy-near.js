/* МЯТА — «настоящая» ленивая загрузка картинок в лентах (видео, меню).
   Встроенный loading="lazy" иногда срабатывает ещё во время заставки, пока страница не разложена,
   и телефон качает картинки снизу страницы сразу. Здесь src ставится, только когда до блока
   осталось около полутора экранов — и только после заставки. */
(() => {
  "use strict";
  const show = (im) => { if (im.dataset.lazySrc) { im.src = im.dataset.lazySrc; im.removeAttribute("data-lazy-src"); } };
  const start = () => {
    // собираем картинки в момент старта — к этому времени ленты уже размножили свои карточки
    const imgs = [...document.querySelectorAll("img[data-lazy-src]")];
    if (!("IntersectionObserver" in window)) { imgs.forEach(show); return; }
    const groups = new Map();
    imgs.forEach((im) => { const sec = im.closest("section") || document.body; if (!groups.has(sec)) groups.set(sec, []); groups.get(sec).push(im); });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      (groups.get(e.target) || []).forEach(show);
      io.unobserve(e.target);
    }), { rootMargin: "150% 0px" });
    groups.forEach((_, sec) => io.observe(sec));
  };
  const root = document.documentElement;
  if (root.classList.contains("is-loaded")) start();
  else new MutationObserver((_, mo) => { if (root.classList.contains("is-loaded")) { mo.disconnect(); setTimeout(start, 50); } }).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
