/* МЯТА — шапка, которая едет за страницей.
   Копия шапки первого экрана выезжает сверху, когда первый экран ушёл вверх (на десктопе — меню, телефон, заявка;
   на телефоне — логотип и бургер). Бургер копии открывает то же мобильное меню. */
(() => {
  "use strict";
  const hero = document.querySelector(".hero");
  const header = hero && hero.querySelector(".header");
  const burger = header && header.querySelector("[data-burger]");
  if (!header) return;
  // меню живёт поверх всей страницы, а не внутри первого экрана — иначе ниже по странице его перекрывают блоки
  const drawer = document.querySelector("[data-drawer]");
  if (drawer) document.body.appendChild(drawer);

  const bar = document.createElement("div");
  bar.className = "stick";
  const copy = header.cloneNode(true);
  copy.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  const copyBurger = copy.querySelector("[data-burger]");
  if (copyBurger) copyBurger.removeAttribute("data-burger");
  bar.appendChild(copy);
  bar.inert = true;
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  // бургер копии управляет тем же меню, что и основной
  if (copyBurger && burger) {
    copyBurger.addEventListener("click", () => burger.click());
    const sync = () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      copyBurger.setAttribute("aria-expanded", String(open));
      copyBurger.setAttribute("aria-label", burger.getAttribute("aria-label") || "");
      document.documentElement.classList.toggle("menu-open", open);
      bar.inert = !(on || open);
    };
    new MutationObserver(sync).observe(burger, { attributes: true, attributeFilter: ["aria-expanded"] });
  }
  // переходы по пунктам меню из копии — как обычные якоря
  copy.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", () => {
    if (burger && burger.getAttribute("aria-expanded") === "true") burger.click();
  }));

  let on = false;
  const set = (v) => {
    if (v === on) return;
    on = v;
    bar.classList.toggle("is-on", v);
    bar.classList.toggle("is-armed", v);
    bar.inert = !v && !document.documentElement.classList.contains("menu-open");
    bar.setAttribute("aria-hidden", String(!v));
  };
  const check = () => {
    const bottom = hero.getBoundingClientRect().bottom;
    set(bottom < 80);
  };
  let raf = 0;
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; check(); }); }, { passive: true });
  window.addEventListener("resize", check, { passive: true });
  check();
})();
