/* МЯТА — общее для форм:
   1) маска телефона +7 (___) ___-__-__ во всех полях type="tel" (квиз и дегустация);
   2) дегустация на телефоне: кнопка «Записаться на дегустацию» открывает форму во всплывающем окне;
   3) абстрактный фон за формой дегустации чуть тянется за курсором. */
(() => {
  "use strict";

  /* ---------- 1. Маска телефона ---------- */
  const TPL = "+7 (___) ___-__-__";
  const SLOTS = [...TPL].reduce((a, ch, i) => (ch === "_" ? a.concat(i) : a), []); // позиции цифр в шаблоне

  // 10 цифр номера без кода страны
  function numberDigits(value) {
    let d = value.replace(/\D/g, "");
    if (d.length >= 11 && (d[0] === "7" || d[0] === "8")) d = d.slice(1); // вставили полный номер
    else if (value.startsWith("+7")) d = d.slice(1);                       // «+7» из шаблона — не часть номера
    else if (d.length === 11) d = d.slice(1);
    return d.slice(0, 10);
  }
  function render(d) {
    const out = [...TPL];
    for (let i = 0; i < d.length; i++) out[SLOTS[i]] = d[i];
    return out.join("");
  }
  // каретка сразу после n-й цифры
  const caretAt = (n) => (n <= 0 ? SLOTS[0] : SLOTS[n - 1] + 1);
  // сколько цифр номера стоит левее позиции pos
  const digitsBefore = (pos) => SLOTS.filter((s) => s < pos).length;

  function setValue(input, d, caretDigits) {
    input.value = render(d);
    const pos = caretAt(caretDigits);
    if (document.activeElement === input) input.setSelectionRange(pos, pos);
    input.dispatchEvent(new Event("input", { bubbles: true })); // квиз пересчитывает кнопку «Отправить»
  }

  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.removeAttribute("maxlength"); // длину держит сама маска; maxlength в Safari блокирует ввод в шаблон
    let d = numberDigits(input.value);
    let busy = false;

    input.addEventListener("focus", () => {
      if (!input.value) {
        busy = true; setValue(input, d = "", 0); busy = false;
      }
      // клик по шаблону ставит каретку на первое пустое место
      requestAnimationFrame(() => {
        const pos = caretAt(d.length);
        if (input.selectionStart > pos) input.setSelectionRange(pos, pos);
      });
    });
    input.addEventListener("blur", () => {
      if (!d.length) input.value = ""; // пустое поле — снова видно «Телефон*»
    });

    input.addEventListener("beforeinput", (e) => {
      const type = e.inputType || "";
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      let a = digitsBefore(start), b = digitsBefore(end);
      b = Math.min(b, d.length); a = Math.min(a, d.length);

      if (type.startsWith("delete")) {
        e.preventDefault();
        if (a === b) {
          if (type === "deleteContentBackward" || type === "deleteWordBackward") { if (a === 0) return; a -= 1; }
          else { if (b >= d.length) return; b += 1; }
        }
        d = d.slice(0, a) + d.slice(b);
        busy = true; setValue(input, d, a); busy = false;
        return;
      }
      if (type === "insertText" || type === "insertReplacementText" || type === "insertFromPaste") {
        const text = e.data ?? (e.dataTransfer && e.dataTransfer.getData("text")) ?? "";
        let add = text.replace(/\D/g, "");
        if (type === "insertFromPaste" || add.length > 1) {
          // вставили целый номер: +7 926 …, 8 926 …
          if (add.length >= 11 && (add[0] === "7" || add[0] === "8")) add = add.slice(1);
        }
        e.preventDefault();
        if (!add) return;
        // первая цифра 8 или 7 в пустом поле — это код страны, а не номер
        if (!d.length && a === 0 && add.length === 1 && (add === "8" || add === "7")) return;
        const next = (d.slice(0, a) + add + d.slice(b)).slice(0, 10);
        const caret = Math.min(a + add.length, next.length);
        d = next;
        busy = true; setValue(input, d, caret); busy = false;
      }
    });

    // автозаполнение браузера и клавиатуры без beforeinput
    input.addEventListener("input", () => {
      if (busy) return;
      const fresh = numberDigits(input.value);
      if (input.value === render(fresh)) { d = fresh; return; }
      d = fresh;
      busy = true; setValue(input, d, d.length); busy = false;
    });

    // после сброса формы (успешная отправка) — снова пусто
    if (input.form) input.form.addEventListener("reset", () => { d = ""; });
  });

  /* ---------- 2. Дегустация на телефоне: форма во всплывающем окне ---------- */
  const tst = document.querySelector(".tst");
  const ticket = tst && tst.querySelector("[data-tst-form]");
  const openBtn = tst && tst.querySelector("[data-tst-open]");
  const closeBtn = tst && tst.querySelector("[data-tst-close]");
  const backdrop = tst && tst.querySelector("[data-tst-backdrop]");
  const mobile = window.matchMedia("(max-width: 767px)");

  if (ticket && openBtn && closeBtn && backdrop) {
    let timer = 0;
    let lastFocus = null;
    const isOpen = () => ticket.classList.contains("is-open");

    function open() {
      clearTimeout(timer);
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      ticket.classList.add("is-sheet");
      void ticket.offsetWidth;
      ticket.classList.add("is-open");
      backdrop.classList.add("is-on");
      document.documentElement.classList.add("tst-locked");
      ticket.setAttribute("role", "dialog");
      ticket.setAttribute("aria-modal", "true");
      ticket.setAttribute("aria-label", "Запись на дегустацию");
      closeBtn.focus({ preventScroll: true });
    }
    function close(instant) {
      if (!isOpen() && !ticket.classList.contains("is-sheet")) return;
      ticket.classList.remove("is-open");
      backdrop.classList.remove("is-on");
      document.documentElement.classList.remove("tst-locked");
      ticket.removeAttribute("role");
      ticket.removeAttribute("aria-modal");
      ticket.removeAttribute("aria-label");
      const done = () => { ticket.classList.remove("is-sheet"); backdrop.hidden = true; };
      if (instant) done(); else timer = setTimeout(done, 450);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", () => close());
    backdrop.addEventListener("click", () => close());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) close(); });
    mobile.addEventListener("change", (e) => { if (!e.matches) close(true); });
  }

  /* ---------- 3. Фон дегустации тянется за курсором ---------- */
  const bg = document.querySelector("[data-tst-bg]");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (bg && fine.matches && !still.matches) {
    const area = bg.parentElement;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      bg.style.setProperty("--mx", x.toFixed(3));
      bg.style.setProperty("--my", y.toFixed(3));
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
