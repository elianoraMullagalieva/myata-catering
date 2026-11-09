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
})();
