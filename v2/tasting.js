/* МЯТА — блок «Бесплатная дегустация»:
   фото-карточка у строки при наведении (на телефоне — по нажатию) и форма-билет. */
(() => {
  "use strict";

  const sec = document.querySelector(".tst");
  if (!sec) return;

  /* ---------- фото-карточка у строк ---------- */
  const list = sec.querySelector("[data-tst-rows]");
  const rows = [...sec.querySelectorAll("[data-tst-row]")];
  const peek = sec.querySelector("[data-tst-peek]");
  const [imgA, imgB] = peek.querySelectorAll("img");
  let front = imgA;
  let active = null;

  // заранее подгружаем кадры, чтобы при наведении не было пустой карточки
  let warmed = false;
  const warm = () => {
    if (warmed) return;
    warmed = true;
    rows.forEach((r) => { const i = new Image(); i.src = r.dataset.img; });
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en], io) => { if (en.isIntersecting) { warm(); io.disconnect(); } }, { rootMargin: "300px" }).observe(sec);
  }

  function activate(row) {
    if (row === active) return;
    warm();
    const first = !active;
    if (active) active.classList.remove("is-active");
    active = row;
    row.classList.add("is-active");
    list.classList.add("is-hover");

    // карточка встаёт в пустую колонку строки — между названием и пояснением, не задевая текст
    const box = peek.offsetParent.getBoundingClientRect();
    const r = row.querySelector(".tst__slot").getBoundingClientRect();
    const y = r.top - box.top + r.height / 2;
    // по горизонтали — ровно посередине между концом названия и началом пояснения;
    // на телефоне (пояснение под названием) — по центру пустой колонки справа
    let x = r.left + r.width / 2;
    const name = row.querySelector(".tst__name");
    const desc = row.querySelector(".tst__desc");
    const dr = desc.getBoundingClientRect();
    if (dr.left > r.left) {
      const rng = document.createRange();
      rng.selectNodeContents(name);
      const nameEnd = Math.max(...[...rng.getClientRects()].map((b) => b.right));
      x = (nameEnd + dr.left) / 2;
    }
    peek.style.setProperty("--x", `${x - box.left}px`);
    peek.style.setProperty("--y", `${y}px`);

    // кадр: на первом показе — сразу, дальше новый въезжает снизу, старый уходит вверх
    const src = row.dataset.img;
    if (first) {
      front.src = src;
      front.className = "is-in";
      (front === imgA ? imgB : imgA).className = "is-wait";
    } else {
      const back = front === imgA ? imgB : imgA;
      back.className = "is-wait";
      back.src = src;
      void back.offsetWidth;
      back.className = "is-in";
      front.className = "is-out";
      front = back;
    }
    peek.classList.add("is-on");
  }

  function reset() {
    if (active) active.classList.remove("is-active");
    active = null;
    list.classList.remove("is-hover");
    peek.classList.remove("is-on");
  }

  rows.forEach((row) => {
    row.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") activate(row); });
    row.addEventListener("focus", () => activate(row));
    // на сенсорных экранах — по нажатию, повторное нажатие прячет карточку
    row.addEventListener("click", () => { if (active === row && !matchMedia("(hover: hover)").matches) reset(); else activate(row); });
  });
  // при смене размера карточка прячется — позиция строк поменялась
  window.addEventListener("resize", reset, { passive: true });
  list.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") reset(); });
  list.addEventListener("focusout", (e) => { if (!list.contains(e.relatedTarget)) reset(); });

  /* ---------- форма-билет ---------- */
  const form = sec.querySelector("[data-tst-form]");
  const body = form.querySelector("[data-tst-body]");
  const done = form.querySelector("[data-tst-done]");
  const field = (n) => form.elements[n];

  function maskPhone(v) {
    let d = v.replace(/\D/g, "");
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    let out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 4) out += ")";
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  }

  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.name === "phone") t.value = maskPhone(t.value);
    const box = t.closest(".tst-field, .qz-consent");
    if (box) box.classList.remove("is-error");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = field("name");
    const phone = field("phone");
    const consent = field("consent");
    let ok = true;
    if (!name.value.trim()) { name.closest(".tst-field").classList.add("is-error"); ok = false; }
    if (phone.value.replace(/\D/g, "").length < 11) { phone.closest(".tst-field").classList.add("is-error"); ok = false; }
    if (!consent.checked) { consent.closest(".qz-consent").classList.add("is-error"); ok = false; }
    if (!ok) return;

    const data = {
      form: "Дегустация",
      name: name.value.trim(),
      phone: phone.value,
      contact: (form.querySelector('[name="contact"]:checked') || {}).value || "",
    };
    // отправка заявки подключится здесь, так же как у квиза: window.MYATA_QUIZ_SEND(data)
    if (typeof window.MYATA_QUIZ_SEND === "function") window.MYATA_QUIZ_SEND(data);
    body.hidden = true;
    done.hidden = false;
  });
})();
