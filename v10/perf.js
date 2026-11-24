/* Пауза для бесконечных анимаций, пока блок за экраном (бегущая строка логотипов, мерцание, плавающий логотип и т.п.) */
(() => {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("is-off", !e.isIntersecting)), { rootMargin: "200px 0px" });
  document.querySelectorAll("body > section, main > section, .hero, .tm, .ct5, .tst, .cases, .sx, .rd, .mv").forEach((s) => io.observe(s));
})();
