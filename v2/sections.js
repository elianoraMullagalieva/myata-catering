/* МЯТА v2 — блоки «Услуги» (слайдер карточек) и «Квиз» (расчёт мероприятия).
   Слайдер — нативная горизонтальная прокрутка: палец и тачпад работают сами,
   мышью ленту можно тянуть, стрелки листают по карточке, полоса и счётчик следят за положением.
   Квиз — 4 шага с проверкой, «Подробнее» на карточке сразу отмечает тип мероприятия. */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad2 = (n) => String(n).padStart(2, "0");

  // ширина экрана без полосы прокрутки — по ней считаются карточки (в CSS — var(--svc-w))
  const setVw = () => root.style.setProperty("--svc-w", `${root.clientWidth}px`);
  setVw();
  window.addEventListener("resize", setVw, { passive: true });

  /* ---------- появление при прокрутке ---------- */
  document.querySelectorAll("[data-reveal]").forEach((sec) => {
    sec.querySelectorAll(".svc-slot").forEach((el, i) => el.style.setProperty("--d", `${(0.12 + Math.min(i, 5) * 0.08).toFixed(2)}s`));
    sec.querySelectorAll(".qz__left > *").forEach((el, i) => el.style.setProperty("--d", `${(i * 0.1).toFixed(2)}s`));
    const card = sec.querySelector(".qz__card");
    if (card) card.style.setProperty("--d", "0.2s");
    const prog = sec.querySelector(".svc__progress");
    if (prog) prog.style.setProperty("--d", "0.5s");
  });
  // фото проявляются, только когда загрузились, — без «пустых» карточек и резкой подмены
  document.querySelectorAll(".svc-card__photo img, .qz__photo img").forEach((img) => {
    const done = () => img.classList.add("is-ready");
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
  });

  // блок появляется, когда готовы шрифты и фото первых карточек (но не дольше 1,5 с),
  // чтобы ничего не подменялось и не дёргалось во время анимации
  const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));
  const imgReady = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); }));
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  function reveal(sec) {
    const imgs = [...sec.querySelectorAll(".svc-card__photo img, .qz__photo img")].slice(0, 4);
    Promise.race([Promise.all([fontsReady, ...imgs.map(imgReady)]), waitFor(1500)]).then(() => {
      requestAnimationFrame(() => sec.classList.add("is-in"));
    });
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach((s) => io.observe(s));
  } else {
    document.querySelectorAll("[data-reveal]").forEach((s) => s.classList.add("is-in"));
  }

  /* ---------- слайдер услуг ---------- */
  const vp = document.querySelector("[data-svc-viewport]");
  if (vp) {
    const slots = [...vp.querySelectorAll(".svc-slot")];
    const bar = document.querySelector("[data-svc-bar]");
    const count = document.querySelector("[data-svc-count]");
    const prev = document.querySelector("[data-svc-prev]");
    const next = document.querySelector("[data-svc-next]");
    const N = slots.length;

    const stepW = () => (slots[1] ? slots[1].offsetLeft - slots[0].offsetLeft : slots[0].offsetWidth);
    const maxScroll = () => vp.scrollWidth - vp.clientWidth;

    function update() {
      const total = vp.scrollWidth, vis = vp.clientWidth, x = vp.scrollLeft;
      if (bar) {
        bar.classList.add("is-ready");
        bar.style.width = `${Math.min(100, (vis / total) * 100)}%`;
        bar.style.transform = `translate3d(${(x / vis) * 100}%, 0, 0)`;
      }
      const step = stepW();
      const first = Math.min(N, Math.round(x / step) + 1);
      // карточка считается видимой, если на экране хотя бы 70% её ширины
      const per = Math.max(1, Math.floor((vis - slots[0].offsetLeft) / step + 0.3));
      const last = Math.min(N, first + per - 1);
      if (count) count.textContent = `${pad2(first)} — ${pad2(last)} / ${pad2(N)}`;
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= maxScroll() - 2;
    }

    const go = (dir) => vp.scrollBy({ left: dir * stepW(), behavior: reduce ? "auto" : "smooth" });
    prev && prev.addEventListener("click", () => go(-1));
    next && next.addEventListener("click", () => go(1));
    vp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });

    let raf = 0;
    vp.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(vp);
    update();

    // мышью — тянем ленту; после отпускания она мягко встаёт по карточке
    let drag = null, moved = false;
    vp.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: vp.scrollLeft };
      moved = false;
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 5) { moved = true; vp.classList.add("is-dragging"); }
      if (moved) vp.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      drag = null;
      if (moved) {
        const step = stepW();
        const target = Math.round(vp.scrollLeft / step) * step;
        vp.classList.remove("is-dragging");
        vp.scrollTo({ left: Math.min(maxScroll(), target), behavior: reduce ? "auto" : "smooth" });
      }
    });
    vp.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    vp.addEventListener("dragstart", (e) => e.preventDefault());
  }

  /* ---------- фото Алины: плашка с именем никогда не заходит на лицо ----------
     Фото 736×981, лицо — примерно 27–38% ширины и 29–39% высоты кадра.
     Считаем, где лицо окажется в рамке, и сдвигаем фото вправо ровно настолько,
     чтобы лицо начиналось правее плашки (с запасом). Пустое место слева — продолжение стены. */
  const photo = document.querySelector(".qz__photo");
  if (photo) {
    const pimg = photo.querySelector("img");
    const badge = photo.querySelector(".qz__badge");
    const IW = 736, IH = 981, FACE_L = 0.27, GAP = 14, POS_X = 0.1;
    const placeAlina = () => {
      const w = photo.clientWidth, h = photo.clientHeight;
      if (!w || !h || !badge) return;
      const s = Math.max(w / IW, h / IH);
      const dw = IW * s;
      const ox = (w - dw) * POS_X;
      const pr = photo.getBoundingClientRect(), br = badge.getBoundingClientRect();
      const badgeRight = br.right - pr.left;
      const need = badgeRight + GAP - (ox + FACE_L * dw);
      const shift = Math.min(w * 0.45, Math.max(w * 0.08, need));
      photo.style.setProperty("--shift", `${Math.round(shift)}px`);
    };
    placeAlina();
    if ("ResizeObserver" in window) new ResizeObserver(placeAlina).observe(photo);
    else window.addEventListener("resize", placeAlina, { passive: true });
    if (document.fonts) document.fonts.ready.then(placeAlina);
  }

  /* ---------- квиз ---------- */
  const form = document.querySelector("[data-quiz]");
  if (!form) return;

  const steps = [...form.querySelectorAll(".qz-step")];
  const segs = [...form.querySelectorAll(".qz__progress i")];
  const status = form.querySelector("[data-qz-status]");
  const done = form.querySelector("[data-qz-done]");
  let cur = 0;

  const val = (name) => [...form.querySelectorAll(`[name="${name}"]:checked`)].map((i) => i.value);
  const field = (name) => form.querySelector(`[name="${name}"]`);
  const digits = (s) => s.replace(/\D/g, "");

  const valid = [
    () => val("type").length > 0,
    () => val("guests").length > 0 || +digits(field("guestsExact").value) > 0,
    () => val("needs").length > 0,
    () => field("name").value.trim().length > 1 && digits(field("phone").value).length >= 11 && field("consent").checked,
  ];

  function refresh() {
    const btn = steps[cur] && steps[cur].querySelector("[data-qz-next]");
    if (btn) btn.disabled = !valid[cur]();
  }

  function show(i, focus = true) {
    steps.forEach((s, k) => {
      const on = k === i;
      s.hidden = !on;
      s.classList.toggle("is-active", on);
    });
    done.hidden = true;
    cur = i;
    segs.forEach((s, k) => s.classList.toggle("is-on", k <= i));
    if (status) status.textContent = `Шаг ${i + 1} из ${steps.length}`;
    refresh();
    if (focus) {
      const first = steps[i].querySelector("input:checked, input");
      if (first) first.focus({ preventScroll: true });
      const r = form.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.6) form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "guests") field("guestsExact").value = "";
    if (e.target.name === "consent") e.target.closest(".qz-consent").classList.remove("is-error");
    refresh();
  });

  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.name === "guestsExact") {
      t.value = digits(t.value).slice(0, 5);
      if (t.value) form.querySelectorAll('[name="guests"]').forEach((r) => { r.checked = false; });
    }
    if (t.name === "phone") t.value = maskPhone(t.value);
    if (t.closest(".qz-field")) t.closest(".qz-field").classList.remove("is-error");
    refresh();
  });

  // +7 (999) 999-99-99
  function maskPhone(v) {
    let d = digits(v);
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    let s = "+7";
    if (d.length > 1) s += " (" + d.slice(1, 4);
    if (d.length >= 4) s += ")";
    if (d.length > 4) s += " " + d.slice(4, 7);
    if (d.length > 7) s += "-" + d.slice(7, 9);
    if (d.length > 9) s += "-" + d.slice(9, 11);
    return s;
  }

  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-qz-back]")) { show(Math.max(0, cur - 1)); return; }
    const nx = e.target.closest("[data-qz-next]");
    if (nx && nx.type !== "submit" && valid[cur]()) show(Math.min(steps.length - 1, cur + 1));
    if (e.target.closest("[data-qz-again]")) { form.reset(); show(0); }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!valid[3]()) {
      if (field("name").value.trim().length < 2) field("name").closest(".qz-field").classList.add("is-error");
      if (digits(field("phone").value).length < 11) field("phone").closest(".qz-field").classList.add("is-error");
      if (!field("consent").checked) field("consent").closest(".qz-consent").classList.add("is-error");
      return;
    }
    const data = {
      type: val("type")[0],
      guests: val("guests")[0] || digits(field("guestsExact").value),
      needs: val("needs"),
      name: field("name").value.trim(),
      phone: field("phone").value,
      contact: val("contact"),
    };
    // отправка заявки подключится здесь (например, в Telegram-бота): window.MYATA_QUIZ_SEND(data)
    if (typeof window.MYATA_QUIZ_SEND === "function") window.MYATA_QUIZ_SEND(data);
    steps.forEach((s) => { s.hidden = true; s.classList.remove("is-active"); });
    segs.forEach((s) => s.classList.add("is-on"));
    done.hidden = false;
    if (status) status.textContent = "Заявка принята";
  });

  // «Подробнее» на карточке услуги: открываем квиз с уже отмеченным типом мероприятия
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-quiz-type]");
    if (!a) return;
    const r = form.querySelector(`[name="type"][value="${a.dataset.quizType}"]`);
    if (r) { r.checked = true; show(0, false); }
  });

  show(0, false);
})();
