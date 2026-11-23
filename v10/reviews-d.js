/* Отзывы D: цитата + переключатель-аватары, поп-ап «Все отзывы» с фильтрами и поп-ап «Отзыв полностью».
   Источник данных — карточки [data-rd-review] в поп-апе «Все отзывы»: имя, тип, дата, текст, ссылка на оригинал.
   Цитата сама переключается раз в AUTO мс; стоит, только пока открыт поп-ап,
   блок не на экране или вкладка скрыта. */
(() => {
  "use strict";
  const rd = document.querySelector("[data-rd]");
  if (!rd) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AUTO = 4000;

  const cards = [...rd.querySelectorAll("[data-rd-review]")];
  const N = cards.length;
  if (!N) return;
  const data = cards.map((c) => ({
    name: c.dataset.name,
    type: c.dataset.type,
    date: c.dataset.date,
    orig: c.dataset.orig || "#",
    text: c.querySelector("[data-rd-text]").textContent.trim(),
    short: c.dataset.short || c.querySelector("[data-rd-text]").textContent.trim(),
  }));
  const initials = (n) => n.split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const preview = (d) => `<span class="rd-text-full">${esc(d.text)}</span><span class="rd-text-short">${esc(d.short)}</span>`;
  cards.forEach((c, i) => { c.querySelector("[data-rd-text]").innerHTML = preview(data[i]); });

  /* ---------- цитата и аватары ---------- */
  const slidesBox = rd.querySelector("[data-rd-slides]");
  const peopleBox = rd.querySelector("[data-rd-people]");
  slidesBox.innerHTML = data.map((d, i) => `
    <article class="rd-slide" id="rd-s${i}" role="tabpanel" aria-labelledby="rd-p${i}" data-rd-slide>
      <div class="rd-slide__meta"><span class="rd-tag">${esc(d.type)}</span><span class="rd-slide__date">${esc(d.date)}</span></div>
      <p class="rd-slide__text">${preview(d)}</p>
      <p class="rd-slide__who">${esc(d.name)}</p>
      <div class="rd-slide__links">
        <button type="button" class="rd-link" data-rd-full="${i}">Читать полностью</button>
        <a class="rd-link" href="${esc(d.orig)}" data-rd-orig>Оригинал →</a>
      </div>
    </article>`).join("");
  peopleBox.innerHTML = data.map((d, i) => `
    <button type="button" class="rd-person" id="rd-p${i}" role="tab" aria-controls="rd-s${i}" aria-selected="false" aria-label="${esc(d.name)}, ${esc(d.type)}" data-rd-person="${i}">
      <span class="rd-person__ava" aria-hidden="true">${esc(initials(d.name))}</span>
      <span class="rd-person__info" aria-hidden="true"><span class="rd-person__in"><span class="rd-person__name">${esc(d.name)}</span><span class="rd-person__type">${esc(d.type)}</span></span></span>
    </button>`).join("");
  const slides = [...slidesBox.children];
  const people = [...peopleBox.children];

  let cur = -1;
  function show(i) {
    i = ((i % N) + N) % N;
    if (i === cur) return;
    const prev = cur;
    cur = i;
    slides.forEach((s, k) => {
      s.classList.toggle("is-out", k === prev); // прежний уходит вправо, остальные ждут слева
      s.classList.toggle("is-active", k === i);
      s.inert = k !== i;
    });
    people.forEach((p, k) => {
      p.classList.toggle("is-active", k === i);
      p.setAttribute("aria-selected", k === i ? "true" : "false");
      p.tabIndex = k === i ? 0 : -1;
    });
  }
  show(0);

  /* ---------- автопереключение ---------- */
  const stage = rd.querySelector("[data-rd-stage]");
  let timer = 0;
  // блок на экране хотя бы на треть — проверяем в момент переключения
  const inView = () => {
    const r = stage.getBoundingClientRect(), h = window.innerHeight;
    return Math.min(r.bottom, h) - Math.max(r.top, 0) > r.height * 0.3;
  };
  const allModal = rd.querySelector("[data-rdm]");
  const oneModal = rd.querySelector("[data-rvm]");
  const anyOpen = () => !allModal.hidden || (oneModal && !oneModal.hidden);
  function tick() {
    if (inView() && !anyOpen() && !document.hidden) show(cur + 1);
    timer = setTimeout(tick, AUTO);
  }
  function restart() { clearTimeout(timer); if (!reduce) timer = setTimeout(tick, AUTO); }
  restart();

  peopleBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rd-person]");
    if (!b) return;
    show(+b.dataset.rdPerson);
    restart();
  });
  peopleBox.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    show(cur + (e.key === "ArrowRight" ? 1 : -1));
    people[cur].focus();
    restart();
  });

  // ссылки на оригиналы появятся позже — пока не прыгаем наверх страницы
  rd.addEventListener("click", (e) => {
    const a = e.target.closest("[data-rd-orig], [data-rv-orig]");
    if (a && a.getAttribute("href") === "#") e.preventDefault();
  });

  /* ---------- блокировка прокрутки, пока открыт хоть один поп-ап ---------- */
  const lock = () => document.body.classList.toggle("is-locked", anyOpen());

  function openModal(m, focusEl) {
    m.hidden = false;
    lock();
    requestAnimationFrame(() => { m.classList.add("is-open"); if (focusEl) focusEl.focus({ preventScroll: true }); });
  }
  function closeModal(m, back) {
    m.classList.remove("is-open");
    setTimeout(() => { m.hidden = true; lock(); restart(); }, reduce ? 0 : 350);
    if (back) back.focus({ preventScroll: true });
  }
  function trapTab(m, e) {
    const f = [...m.querySelectorAll("button, a[href]")].filter((b) => b.offsetParent && !b.closest("[hidden]"));
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  /* ---------- поп-ап «Все отзывы» ---------- */
  const filtersBox = allModal.querySelector("[data-rdm-filters]");
  const types = ["Все", ...new Set(data.map((d) => d.type))];
  filtersBox.innerHTML = types.map((t, k) =>
    `<button type="button" class="rd-tag" aria-pressed="${k === 0}" data-rdm-filter="${k === 0 ? "" : esc(t)}">${esc(t)}</button>`).join("");
  filtersBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rdm-filter]");
    if (!b) return;
    const t = b.dataset.rdmFilter;
    filtersBox.querySelectorAll("[data-rdm-filter]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    cards.forEach((c) => {
      c.hidden = !!t && c.dataset.type !== t;
      if (!c.hidden) { c.style.animation = "none"; void c.offsetWidth; c.style.animation = ""; } // карточки мягко появляются заново
    });
    allModal.querySelector("[data-rdm-grid]").scrollTop = 0;
  });

  let allBack = null;
  rd.querySelector("[data-rd-all]").addEventListener("click", (e) => {
    allBack = e.currentTarget;
    openModal(allModal, allModal.querySelector(".rdm__close"));
  });
  allModal.querySelectorAll("[data-rdm-close]").forEach((b) => b.addEventListener("click", () => closeModal(allModal, allBack)));

  /* ---------- поп-ап «Отзыв полностью» (прежняя разметка .rvm) ---------- */
  let one = 0, oneBack = null;
  const f = (sel) => oneModal.querySelector(sel);
  function fill(i) {
    one = ((i % N) + N) % N;
    const d = data[one];
    f("[data-rvm-type2]").textContent = d.type;
    f("[data-rvm-date]").textContent = d.date;
    f("[data-rvm-text]").textContent = d.text;
    f("[data-rvm-name]").textContent = d.name;
    f("[data-rv-orig]").setAttribute("href", d.orig);
    const body = f(".rvm__body");
    body.classList.remove("is-swap"); void body.offsetWidth; body.classList.add("is-swap");
  }
  rd.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rd-full]");
    if (!b) return;
    oneBack = b;
    const i = b.dataset.rdFull !== "" ? +b.dataset.rdFull : cards.indexOf(b.closest("[data-rd-review]"));
    fill(i);
    openModal(oneModal, f(".rvm__close"));
  });
  oneModal.querySelectorAll("[data-rvm-close]").forEach((b) => b.addEventListener("click", () => closeModal(oneModal, oneBack)));
  f("[data-rvm-prev]").addEventListener("click", () => fill(one - 1));
  f("[data-rvm-next]").addEventListener("click", () => fill(one + 1));

  document.addEventListener("keydown", (e) => {
    // сверху — «Отзыв полностью», под ним может быть открыт «Все отзывы»
    if (!oneModal.hidden) {
      if (e.key === "Escape") closeModal(oneModal, oneBack);
      else if (e.key === "ArrowRight") fill(one + 1);
      else if (e.key === "ArrowLeft") fill(one - 1);
      else if (e.key === "Tab") trapTab(oneModal, e);
      return;
    }
    if (!allModal.hidden) {
      if (e.key === "Escape") closeModal(allModal, allBack);
      else if (e.key === "Tab") trapTab(allModal, e);
    }
  });
})();
