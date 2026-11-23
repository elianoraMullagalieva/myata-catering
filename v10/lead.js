/* МЯТА — поп-ап «Оставить заявку».
   Открывается со всех кнопок с атрибутом data-lead (шапка, меню-бургер, услуги, «Почему мы?», меню, подвал).
   Текст зависит от кнопки: data-lead="service" — про формат из карточки, data-lead="menu" — про полное меню.
   Отправка подключится в window.MYATA_QUIZ_SEND(data) — как у квиза и дегустации. */
(() => {
  "use strict";

  // контакты + подвал = ровно экран: высоту подвала меряем, чтобы под шапкой не оставалась полоска
  const ft = document.querySelector(".ft5");
  if (ft) {
    const setFt = () => document.documentElement.style.setProperty("--ft-h", `${ft.offsetHeight}px`);
    setFt();
    if ("ResizeObserver" in window) new ResizeObserver(setFt).observe(ft);
    else window.addEventListener("resize", setFt);
  }

  const modal = document.querySelector("[data-lead-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-lead-form]");
  const body = modal.querySelector("[data-lead-body]");
  const done = modal.querySelector("[data-lead-done]");
  const titleEl = modal.querySelector("[data-lead-title]");
  const subEl = modal.querySelector("[data-lead-sub]");
  const btnEl = modal.querySelector("[data-lead-btn]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

  const BASE = {
    title: "Давайте обсудим<br> <em>ваше</em> событие",
    sub: "Оставьте контакты, и&nbsp;мы&nbsp;свяжемся с&nbsp;вами удобным способом, чтобы обсудить детали мероприятия.",
    btn: "Оставить заявку",
    topic: "Заявка",
  };
  // «Расскажем подробнее о …» — формат из карточки услуги в нужном падеже
  // «Заказать …» — формат из карточки услуги в нужном падеже
  const ORDER = {
    "Фуршет": "фуршет",
    "Банкет": "банкет",
    "Свадьба": "кейтеринг на&nbsp;свадьбу",
    "Частные события": "кейтеринг для частного события",
    "Кофе-брейк": "кофе-брейк",
    "Backstage-сервис": "backstage-сервис",
    "Презентации и открытия": "кейтеринг для презентации",
  };

  function variant(trigger) {
    const kind = trigger.dataset.lead;
    if (kind === "menu") {
      return {
        title: "Получите<br> <em>полное</em> меню",
        sub: "Оставьте контакты&nbsp;— пришлём меню с&nbsp;ценами удобным способом и&nbsp;поможем подобрать блюда под ваше событие.",
        btn: "Получить меню",
        topic: "Полное меню",
      };
    }
    if (kind === "service") {
      const card = trigger.closest(".svc-card, .svc-slot");
      const name = card ? card.querySelector(".svc-card__title").textContent.replace(/\s+/g, " ").trim() : "";
      const what = ORDER[name];
      if (what) {
        return {
          title: `Заказать<br> <em>${what}</em>`,
          sub: "Оставьте контакты&nbsp;— обсудим формат, подберём меню и&nbsp;рассчитаем стоимость под ваше мероприятие.",
          btn: "Заказать",
          topic: name,
        };
      }
    }
    return BASE;
  }

  let lastFocus = null;
  function open(trigger) {
    const v = variant(trigger);
    titleEl.innerHTML = v.title;
    subEl.innerHTML = v.sub;
    btnEl.textContent = v.btn;
    form.elements.topic.value = v.topic;
    body.hidden = false;
    done.hidden = true;
    form.querySelectorAll(".is-error").forEach((el) => el.classList.remove("is-error"));
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      // фокус — после анимации и только с мышью: подсказки автозаполнения и клавиатура
      // на телефоне не должны появляться посреди открытия окна
      if (fine.matches) setTimeout(() => form.elements.name.focus({ preventScroll: true }), reduce ? 0 : 420);
      else modal.querySelector(".lead__close").focus({ preventScroll: true });
    });
  }
  function close() {
    modal.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => { modal.hidden = true; }, reduce ? 0 : 350);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  // делегирование: кнопки в закреплённой шапке — копии, им тоже нужно открывать окно
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-lead]");
    if (!t) return;
    e.preventDefault();
    // из мобильного меню: сначала закрываем его
    if (document.documentElement.classList.contains("menu-open")) {
      const burger = document.querySelector("[data-burger]");
      if (burger) burger.click();
    }
    open(t);
  });
  modal.querySelectorAll("[data-lead-close]").forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const f = [...modal.querySelectorAll("button, input, a[href]")].filter((el) => el.offsetParent && !el.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  // ссылка на политику пока пустая — не прокручиваем страницу
  modal.querySelectorAll('a[href="#"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));

  form.addEventListener("input", (e) => {
    const box = e.target.closest(".tst-field, .qz-consent");
    if (box) box.classList.remove("is-error");
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const { name, phone, consent } = form.elements;
    let ok = true;
    if (!name.value.trim()) { name.closest(".tst-field").classList.add("is-error"); ok = false; }
    if (phone.value.replace(/\D/g, "").length < 11) { phone.closest(".tst-field").classList.add("is-error"); ok = false; }
    if (!consent.checked) { consent.closest(".qz-consent").classList.add("is-error"); ok = false; }
    if (!ok) return;
    const data = {
      form: form.elements.topic.value,
      name: name.value.trim(),
      phone: phone.value,
      contact: (form.querySelector('[name="contact"]:checked') || {}).value || "",
    };
    if (typeof window.MYATA_QUIZ_SEND === "function") window.MYATA_QUIZ_SEND(data);
    body.hidden = true;
    done.hidden = false;
    form.reset();
  });
})();
