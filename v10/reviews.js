/* Логотипы клиентов: если не помещаются в ряд — бегущая строка (копия списка, CSS-анимация). */
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

  // лента отзывов переехала в reviews-d.js (блок «Отзывы D»)
})();
