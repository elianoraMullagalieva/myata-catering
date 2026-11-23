/* МЯТА — аккордеоны («Почему мы?»): открыт один пункт, раскрытие плавное,
   открытый пункт не уходит под шапку. */
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Аккордеоны ---------- */
  document.querySelectorAll("[data-acc]").forEach((acc) => {
    const items = [...acc.querySelectorAll("[data-acc-item]")];
    const single = acc.hasAttribute("data-acc-single");

    function setOpen(item, open) {
      item.classList.toggle("is-open", open);
      item.querySelector("[data-acc-head]").setAttribute("aria-expanded", String(open));
    }

    items.forEach((item) => {
      const head = item.querySelector("[data-acc-head]");
      head.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        if (single && open) items.forEach((it) => it !== item && setOpen(it, false));
        setOpen(item, open);
        if (!open) return;
        // после раскрытия: если заголовок ушёл выше экрана (закрылся длинный пункт сверху) — возвращаем его в поле зрения
        setTimeout(() => {
          const r = head.getBoundingClientRect();
          if (r.top < 80 || r.top > window.innerHeight * 0.75) head.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }, 560);
        item.dispatchEvent(new CustomEvent("acc:open", { bubbles: true }));
      });
    });
  });
  /* ---------- 2. «Почему мы?» на компьютере: пункт раскрывается при наведении ----------
     Открыт всегда один пункт (под курсором или последний, на котором был курсор).
     Высота списка зафиксирована по самому длинному описанию — блок не прыгает. */
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  document.querySelectorAll(".why__list[data-acc]").forEach((list) => {
    const items = [...list.querySelectorAll("[data-acc-item]")];
    const open = (item) => items.forEach((it) => {
      const on = it === item;
      it.classList.toggle("is-open", on);
      it.querySelector("[data-acc-head]").setAttribute("aria-expanded", String(on));
    });
    let t = 0;
    items.forEach((item) => item.addEventListener("pointerenter", (e) => {
      if (!fine.matches || e.pointerType !== "mouse") return;
      clearTimeout(t);
      t = setTimeout(() => { if (!item.classList.contains("is-open")) open(item); }, 90);
    }));
    list.addEventListener("pointerleave", () => clearTimeout(t));
    // клик по уже открытому пункту на компьютере его не закрывает (иначе высота изменится)
    list.addEventListener("click", (e) => {
      if (!fine.matches) return;
      const item = e.target.closest("[data-acc-item]");
      if (item) setTimeout(() => { if (!items.some((it) => it.classList.contains("is-open"))) open(item); }, 0);
    });
    function fix() {
      list.style.height = "";
      if (!fine.matches) return;
      const cur = items.find((it) => it.classList.contains("is-open")) || items[0];
      if (!cur.classList.contains("is-open")) open(cur);
      const inners = items.map((it) => it.querySelector(".acc-panel__in"));
      const curIn = cur.querySelector(".acc-panel__in");
      const maxIn = Math.max(...inners.map((n) => n.scrollHeight));
      // ждём конца раскрытия, чтобы мерить готовую высоту
      setTimeout(() => { list.style.height = `${Math.ceil(list.offsetHeight - curIn.offsetHeight + maxIn)}px`; }, 620);
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fix);
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fix, 200); });
    fine.addEventListener?.("change", fix);
  });
})();
