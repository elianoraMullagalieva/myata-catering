/* МЯТА v7 — понятные ошибки во всех формах (квиз, дегустация, поп-ап заявки).
   Сами формы ставят класс .is-error на поле / галочку; здесь к нему добавляется подпись,
   что именно не так, а курсор переводится к первому неверному полю. */
(() => {
  "use strict";
  const digits = (v) => v.replace(/\D/g, "");
  function message(box) {
    const inp = box.querySelector("input");
    if (!inp) return "";
    if (inp.type === "checkbox") return "Поставьте галочку — без согласия мы не сможем принять заявку";
    if (inp.name === "phone") {
      const n = digits(inp.value).length;
      return n <= 1 ? "Введите номер телефона" : "Номер неполный — введите все 11 цифр";
    }
    if (inp.name === "name") return inp.value.trim() ? "Имя слишком короткое" : "Введите имя";
    return "Заполните поле";
  }
  let focusTimer = 0;
  function sync(box) {
    let tip = box.nextElementSibling && box.nextElementSibling.classList.contains("f-err") ? box.nextElementSibling : null;
    if (box.classList.contains("is-error")) {
      if (!tip) {
        tip = document.createElement("p");
        tip.className = "f-err";
        tip.setAttribute("role", "alert");
        box.after(tip);
      }
      tip.textContent = message(box);
      const inp = box.querySelector("input");
      if (inp) inp.setAttribute("aria-invalid", "true");
      // после проверки всей формы — к первому неверному полю
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const form = box.closest("form");
        const first = form && form.querySelector(".is-error input");
        if (first && document.activeElement !== first) {
          first.focus({ preventScroll: true });
          const r = first.getBoundingClientRect();
          if (r.top < 90 || r.bottom > innerHeight - 20) first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 30);
    } else if (tip) {
      tip.remove();
      const inp = box.querySelector("input");
      if (inp) inp.removeAttribute("aria-invalid");
    }
  }
  const sel = ".tst-field, .qz-field, .qz-consent";
  const mo = new MutationObserver((list) => {
    list.forEach((m) => { if (m.target.matches && m.target.matches(sel)) sync(m.target); });
  });
  document.querySelectorAll("form").forEach((f) => mo.observe(f, { subtree: true, attributes: true, attributeFilter: ["class"] }));
})();
