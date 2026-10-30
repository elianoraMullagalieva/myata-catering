/* МЯТА — блок кейсов: бесконечная лента карточек и «проваливание» в галерею мероприятия.

   Лента: медленно плывёт сама; курсор у края листает её в ту сторону, в центре — замирает,
   чтобы было удобно нажать; ещё её можно тянуть мышью и пальцем, листать тачпадом и стрелками.
   Нажатие на карточку: соседние уходят, фото карточки вырастает в первый кадр галереи,
   следом выезжают остальные фото. «Все кейсы» — обратно в ленту. Данные — в cases.js. */
(() => {
  "use strict";

  const data = window.MYATA_CASES || [];
  if (!data.length) return;
  // на странице два блока кейсов: основной (галерея прямо в ленте) и экспериментальный (data-mode="popup")
  document.querySelectorAll("[data-cases-section]").forEach(initCases);

  function initCases(section) {

  const $ = (sel) => section.querySelector(sel);
  const stage = $("[data-cases]");
  const strip = $("[data-cases-strip]");
  const track = $("[data-cases-track]");
  const gallery = $("[data-cases-gallery]");
  const gtrack = $("[data-cases-gtrack]");
  const countEl = $("[data-cases-count]");
  const crumbEl = $("[data-cases-crumb]");
  const metaEl = $("[data-cases-meta]");
  const backBtn = $("[data-cases-back]");
  const prevBtn = $("[data-cases-prev]");
  const nextBtn = $("[data-cases-next]");
  const cursor = $("[data-cases-cursor]");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const N = data.length;

  /* ---------- тексты ---------- */
  const nbsp = (s) => s.replace(/[  ]/g, " ");
  const nf = new Intl.NumberFormat("ru-RU");
  const num = (n) => nbsp(nf.format(n));
  const plural = (n, one, few, many) => {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  };
  const guestsText = (c) => `${num(c.guests)} ${plural(c.guests, "гость", "гостя", "гостей")}`;
  const priceText = (c) => `${num(c.price)} ₽/гость`;
  const metaText = (c) => [c.guests && guestsText(c), c.price && priceText(c)].filter(Boolean).join(" · ");
  const pad2 = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

  // галерея кейса: обложка первой, если её нет среди фото
  const photosOf = (c) => {
    const list = (c.photos || []).slice();
    if (c.cover && !(list[0] && list[0].src === c.cover.src)) list.unshift(c.cover);
    return list.length ? list : [c.cover];
  };
  const coverOf = (c) => c.cover || photosOf(c)[0];

  const imgHtml = (p, attrs = "") =>
    `<img src="${esc(p.src)}" alt="" draggable="false" decoding="async" ${attrs}${p.pos ? ` style="object-position:${esc(p.pos)}"` : ""}>`;

  function cardHtml(c, i, copy) {
    const tags = (c.tags || []).map((t) => `<span class="case-card__tag">${esc(t)}</span>`).join("");
    const hidden = copy ? ' aria-hidden="true" tabindex="-1"' : "";
    return `<button type="button" class="case-card" data-index="${i}"${hidden} aria-label="Открыть кейс: ${esc(c.title)}. ${esc(metaText(c))}">
      <span class="case-card__in">
        <span class="case-card__media">${imgHtml(coverOf(c))}<span class="case-card__tags">${tags}</span></span>
        <span class="case-card__title">${esc(c.title)}</span>
        <span class="case-card__meta">${esc(metaText(c))}</span>
      </span>
    </button>`;
  }

  /* ---------- лента ---------- */
  let copies = 0;
  let cards = [];
  let step = 0, setW = 0, cardW = 0, padL = 0, stripW = 0;

  function renderStrip(k) {
    copies = k;
    let html = "";
    for (let r = 0; r < k; r++) data.forEach((c, i) => { html += cardHtml(c, i, r > 0); });
    track.innerHTML = html;
    cards = [...track.children];
    cards.forEach((el, j) => {
      el.dataset.j = j;
      el.style.setProperty("--d", `${(Math.min(j, 6) * 0.07).toFixed(2)}s`);
    });
  }

  function measure() {
    stripW = strip.clientWidth;
    padL = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    cardW = cards[0].offsetWidth;
    step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cardW;
    setW = step * N;
  }

  function layoutStrip() {
    if (!cards.length) renderStrip(3);
    measure();
    const need = Math.ceil(stripW / setW) + 2;
    if (need !== copies) { renderStrip(need); measure(); }
    apply();
  }

  let pos = 0;          // смещение ленты, px (растёт — лента едет влево)
  let vel = 0;          // скорость, px/с
  let coasting = false; // инерция после броска
  let tween = null;     // плавный переход к карточке (стрелки, фокус)
  let hoverX = null;    // положение курсора над лентой, 0…1
  let drag = null;
  let mode = "strip";   // strip | opening | case | closing
  let active = 0;

  const DRIFT = reduce ? 0 : 22;    // сама по себе лента едва плывёт
  const STEER = reduce ? 520 : 980; // скорость у самого края

  function targetVel() {
    if (hoverX === null) return DRIFT;
    const t = hoverX * 2 - 1;          // −1 … 1
    const dead = 0.32;                  // центр — пауза, чтобы спокойно нажать
    const a = Math.abs(t);
    if (a < dead) return 0;
    const k = Math.pow((a - dead) / (1 - dead), 1.7);
    return Math.sign(t) * k * STEER;
  }

  const mod = (a, m) => ((a % m) + m) % m;
  const centeredPos = (j) => padL + j * step + cardW / 2 - stripW / 2;
  const contIndex = () => (pos - padL - cardW / 2 + stripW / 2) / step;

  function apply() {
    if (!setW) return;
    track.style.transform = `translate3d(${-mod(pos, setW)}px, 0, 0)`;
    const a = mod(Math.round(contIndex()), N);
    if (a !== active || !countEl.textContent) {
      active = a;
      if (mode === "strip") countEl.textContent = `${pad2(a + 1)} / ${pad2(N)}`;
    }
  }

  function stepStrip(dir) {
    const j = Math.round(contIndex()) + dir;
    tween = { from: pos, to: centeredPos(j), t0: performance.now(), dur: reduce ? 1 : 900 };
    vel = 0;
    coasting = false;
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  /* ---------- курсор «Открыть» ---------- */
  const cur = { x: 0, y: 0, tx: 0, ty: 0, on: false };

  /* ---------- цикл ---------- */
  let raf = 0, last = 0, visible = false;

  function frame(now) {
    const dt = Math.min(64, now - (last || now)) / 1000;
    last = now;

    if (mode === "strip") {
      if (tween) {
        const t = Math.min(1, (now - tween.t0) / tween.dur);
        pos = tween.from + (tween.to - tween.from) * easeOut(t);
        if (t >= 1) tween = null;
      } else if (!drag) {
        const target = targetVel();
        const tau = coasting ? 0.9 : 0.35;
        vel += (target - vel) * (1 - Math.exp(-dt / tau));
        if (coasting && Math.abs(vel - target) < 8) coasting = false;
        pos += vel * dt;
      }
      apply();
    } else if ((mode === "case" || mode === "closing") && slides.length) {
      stepGallery(now, dt);
    }

    if (cursor) {
      cur.x += (cur.tx - cur.x) * (1 - Math.exp(-dt / 0.08));
      cur.y += (cur.ty - cur.y) * (1 - Math.exp(-dt / 0.08));
      cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
    }

    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
  }

  function run() {
    if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  }

  /* ---------- ввод на ленте ---------- */
  let suppressClick = false;

  strip.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && canHover) {
      const r = strip.getBoundingClientRect();
      hoverX = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    }
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      strip.setPointerCapture(e.pointerId);
      strip.classList.add("is-dragging");
    }
    if (drag.moved) {
      const now = performance.now();
      pos = drag.pos - dx;
      const dtm = Math.max(1, now - drag.lt);
      drag.v = 0.8 * (-(e.clientX - drag.lx) / dtm) * 1000 + 0.2 * drag.v;
      drag.lx = e.clientX;
      drag.lt = now;
    }
  });

  strip.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hoverX = null; });

  strip.addEventListener("pointerdown", (e) => {
    if (mode !== "strip" || e.button !== 0) return;
    tween = null;
    drag = { x: e.clientX, pos, moved: false, v: 0, lx: e.clientX, lt: performance.now() };
  });

  function endDrag() {
    if (!drag) return;
    if (drag.moved) {
      vel = Math.max(-4000, Math.min(4000, drag.v));
      coasting = true;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    }
    strip.classList.remove("is-dragging");
    drag = null;
  }
  strip.addEventListener("pointerup", endDrag);
  strip.addEventListener("pointercancel", () => { if (drag) drag.moved = false; endDrag(); });

  // тачпад: горизонтальный жест листает ленту, вертикальная прокрутка страницы не перехватывается
  strip.addEventListener("wheel", (e) => {
    if (mode !== "strip" || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    tween = null;
    coasting = false;
    pos += e.deltaX;
  }, { passive: false });

  track.addEventListener("click", (e) => {
    const card = e.target.closest(".case-card");
    if (!card || suppressClick || mode !== "strip") return;
    openCase(card);
  });

  // карточка в фокусе с клавиатуры — подъезжает в центр
  track.addEventListener("focusin", (e) => {
    const card = e.target.closest(".case-card");
    if (!card || mode !== "strip" || drag) return;
    strip.scrollLeft = 0;
    const j = +card.dataset.j;
    const jj = Math.round(contIndex()) + (((j - Math.round(contIndex())) % N) + N) % N;
    const alt = jj - N;
    const target = Math.abs(alt - contIndex()) < Math.abs(jj - contIndex()) ? alt : jj;
    tween = { from: pos, to: centeredPos(target), t0: performance.now(), dur: reduce ? 1 : 700 };
  });

  // наведение: подгружаем фото кейса заранее, показываем курсор «Открыть»
  const preloaded = new Set();
  track.addEventListener("pointerover", (e) => {
    const card = e.target.closest(".case-card");
    if (!card) return;
    const i = +card.dataset.index;
    if (!preloaded.has(i)) {
      preloaded.add(i);
      photosOf(data[i]).forEach((p) => { const im = new Image(); im.src = p.src; });
    }
  });

  if (cursor && canHover) {
    section.addEventListener("pointermove", (e) => {
      cur.tx = e.clientX;
      cur.ty = e.clientY;
      if (!cur.on) { cur.x = cur.tx; cur.y = cur.ty; }
      const onCard = mode === "strip" && !drag?.moved && !!e.target.closest(".case-card");
      const onGallery = mode === "case" && !!e.target.closest("[data-cases-gallery]");
      const on = onCard || onGallery;
      if (on !== cur.on) { cur.on = on; cursor.classList.toggle("is-on", on); }
      cursor.classList.toggle("is-scroll", onGallery);
    });
    section.addEventListener("pointerleave", () => { cur.on = false; cursor.classList.remove("is-on", "is-scroll"); });
  }

  /* ---------- галерея кейса ---------- */
  let gIdx = 0, gCount = 0, slides = [], openCard = null, openData = null;
  let slideW = 0;

  function buildGallery(c) {
    const list = photosOf(c);
    gCount = list.length;
    // кадр галереи — в пропорциях самого фото (w/h из cases.js), чтобы ничего не обрезалось
    gtrack.innerHTML = list
      .map((p, k) => {
        const r = p.w && p.h ? (p.w / p.h).toFixed(4) : "1.5";
        return `<div class="case-slide" data-k="${k}" style="--r:${r}" role="group" aria-roledescription="фото" aria-label="${k + 1} из ${list.length}">${imgHtml({ src: p.src })}</div>`;
      })
      .join("");
    slides = [...gtrack.children];
    slides.forEach((s, k) => {
      s.style.setProperty("--d", `${(0.05 + k * 0.07).toFixed(2)}s`);
      // если размеры фото не указаны — подстраиваем кадр, когда фото загрузится
      const p = list[k];
      if (!(p.w && p.h)) {
        const im = s.querySelector("img");
        im.addEventListener("load", () => {
          s.style.setProperty("--r", (im.naturalWidth / im.naturalHeight).toFixed(4));
          if (mode === "case") layoutGallery();
        }, { once: true });
      }
    });
  }

  // смещение ленты галереи, при котором кадр k стоит по центру
  const galleryX = (k) => {
    const s = slides[k];
    return gallery.clientWidth / 2 - (s.offsetLeft + s.offsetWidth / 2);
  };

  /* Галерея листается непрерывно: курсор справа — едет вправо, слева — влево;
     в центре — едва заметно, к краям — быстрее. Стрелки, клавиши и нажатие на фото
     плавно доводят нужное фото до центра. */
  let gx = 0, gvel = 0, gTween = null, gHover = null;
  const G_MIN = reduce ? 0 : 16;     // px/с в самом центре
  const G_MAX = reduce ? 420 : 820;  // px/с у края

  const gBounds = () => [galleryX(gCount - 1), galleryX(0)];
  const clampGx = (x) => { const [lo, hi] = gBounds(); return Math.min(hi, Math.max(lo, x)); };

  function nearestSlide() {
    const c = gallery.clientWidth / 2 - gx;
    let best = 0, d = Infinity;
    slides.forEach((s, k) => { const dd = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c); if (dd < d) { d = dd; best = k; } });
    return best;
  }

  function renderGallery() {
    gtrack.style.transform = `translate3d(${gx}px, 0, 0)`;
    const k = nearestSlide();
    if (k !== gIdx || !slides[k].classList.contains("is-active")) {
      gIdx = k;
      slides.forEach((s, j) => s.classList.toggle("is-active", j === gIdx));
      updateBar();
    }
  }

  function gTargetVel() {
    if (gHover === null || gdrag) return 0;
    const t = gHover * 2 - 1;                     // −1 … 1
    const a = Math.abs(t);
    return -Math.sign(t) * (G_MIN + (G_MAX - G_MIN) * Math.pow(a, 2.2));
  }

  function stepGallery(now, dt) {
    if (gTween) {
      const t = Math.min(1, (now - gTween.t0) / gTween.dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      gx = gTween.from + (gTween.to - gTween.from) * e;
      if (t >= 1) { gTween = null; if (gTween === null && closingResolve) { closingResolve(); closingResolve = null; } }
      gvel = 0;
    } else if (!gdrag) {
      gvel += (gTargetVel() - gvel) * (1 - Math.exp(-dt / 0.3));
      gx = clampGx(gx + gvel * dt);
    }
    renderGallery();
    updateScrollCursor();
  }

  // кружок над галереей: стрелка смотрит туда, куда едет лента, растёт к краям, гаснет в конце
  const DEAD = 0.16;
  function hoverDir() {
    if (gHover === null) return 0;
    const t = gHover * 2 - 1;
    return Math.abs(t) < DEAD ? 0 : Math.sign(t);
  }
  function updateScrollCursor() {
    if (!cursor || !cur.on || mode !== "case") return;
    const t = gHover === null ? 0 : gHover * 2 - 1;
    const dir = hoverDir();
    const [lo, hi] = gBounds();
    cursor.style.setProperty("--k", Math.pow(Math.abs(t), 1.5).toFixed(3));
    cursor.classList.toggle("is-mid", dir === 0);
    cursor.classList.toggle("is-left", dir < 0);
    cursor.classList.toggle("is-end", (dir > 0 && gx <= lo + 1) || (dir < 0 && gx >= hi - 1));
  }

  let closingResolve = null;
  function layoutGallery() {
    if (!slides.length) return;
    gtrack.classList.add("is-instant");
    gx = galleryX(gIdx);
    slideW = slides[gIdx].offsetWidth;
    renderGallery();
  }

  function goTo(k) {
    k = Math.max(0, Math.min(gCount - 1, k));
    gTween = { from: gx, to: galleryX(k), t0: performance.now(), dur: reduce ? 1 : 850 };
    run();
  }
  const slideTo = (dir) => goTo(Math.max(0, Math.min(gCount - 1, nearestSlide() + dir)));

  function updateBar() {
    if (mode === "strip") {
      countEl.textContent = `${pad2(active + 1)} / ${pad2(N)}`;
      prevBtn.disabled = nextBtn.disabled = false;
    } else {
      countEl.textContent = `${pad2(gIdx + 1)} / ${pad2(gCount)}`;
      prevBtn.disabled = gIdx === 0;
      nextBtn.disabled = gIdx === gCount - 1;
    }
  }

  // «двойник» фото, который перелетает между карточкой и галереей
  function flyer(p, rect) {
    const base = section.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "cases__flyer";
    el.innerHTML = imgHtml(p);
    Object.assign(el.style, {
      left: `${rect.left - base.left}px`, top: `${rect.top - base.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    });
    section.appendChild(el);
    return el;
  }

  function fly(el, from, to, dur) {
    const base = section.getBoundingClientRect();
    const box = (r) => ({ left: `${r.left - base.left}px`, top: `${r.top - base.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const a = el.animate([box(from), box(to)], { duration: reduce ? 1 : dur, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "forwards" });
    return a.finished.catch(() => {});
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  async function openCase(card) {
    if (mode !== "strip") return;
    if (section.dataset.mode === "popup") { openPopup(card); return; }
    mode = "opening";
    tween = null; vel = 0; coasting = false;
    cur.on = false;
    if (cursor) cursor.classList.remove("is-on");

    openCard = card;
    openData = data[+card.dataset.index];
    buildGallery(openData);
    gIdx = 0; gTween = null; gvel = 0; gHover = null;
    gallery.hidden = false;
    gallery.classList.add("is-entering", "is-arriving");
    layoutGallery();

    const from = card.querySelector(".case-card__media").getBoundingClientRect();
    const to = slides[0].getBoundingClientRect();
    const fl = flyer(coverOf(openData), from);

    crumbEl.textContent = openData.title;
    metaEl.innerHTML = [
      ...(openData.tags || []).map((t) => `<span class="cases__tag">${esc(t)}</span>`),
      `<span>${esc(metaText(openData))}</span>`,
    ].join("");
    card.classList.add("is-picked");
    section.classList.add("is-case");
    updateBar();

    const flight = fly(fl, from, to, 1050);
    await wait(520);
    void gallery.offsetWidth;
    gallery.classList.remove("is-entering");
    await flight;
    slides[0].classList.add("is-landed");
    gallery.classList.remove("is-arriving");
    fl.remove();
    mode = "case";
    backBtn.focus({ preventScroll: true });
  }

  async function closeCase() {
    if (mode !== "case") return;
    mode = "closing";
    gHover = null; gvel = 0;
    cur.on = false;
    if (cursor) cursor.classList.remove("is-on", "is-scroll");
    if (Math.abs(gx - galleryX(0)) > 1) {
      await new Promise((r) => { closingResolve = r; gTween = { from: gx, to: galleryX(0), t0: performance.now(), dur: reduce ? 1 : 700 }; run(); });
    }

    const from = slides[0].getBoundingClientRect();
    const to = openCard.querySelector(".case-card__media").getBoundingClientRect();
    const fl = flyer(coverOf(openData), from);
    slides[0].classList.remove("is-landed");
    gallery.classList.add("is-leaving");
    section.classList.remove("is-case");

    await fly(fl, from, to, 950);
    openCard.classList.remove("is-picked");
    fl.remove();
    gallery.hidden = true;
    gallery.classList.remove("is-leaving");
    gtrack.innerHTML = "";
    slides = [];
    mode = "strip";
    updateBar();
    if (!canHover) hoverX = null;
    openCard.focus({ preventScroll: true });
  }

  /* ---------- вариант 2: кейс во всплывающем окне ---------- */
  let pop = null, popOpener = null;
  const ARROW = '<svg viewBox="0 0 20 9" aria-hidden="true"><path d="M0 4.5h19M15 .5l4 4-4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function buildPopup() {
    pop = document.createElement("div");
    pop.className = "cpop";
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "true");
    pop.innerHTML = `
      <div class="cpop__backdrop" data-pop-close></div>
      <div class="cpop__panel">
        <header class="cpop__head">
          <div class="cpop__info">
            <p class="cpop__tags" data-pop-tags></p>
            <h3 class="cpop__title" data-pop-title></h3>
            <p class="cpop__meta" data-pop-meta></p>
          </div>
          <button type="button" class="cpop__close" data-pop-close aria-label="Закрыть"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3l14 14M17 3L3 17" fill="none" stroke="currentColor" stroke-linecap="round"/></svg></button>
        </header>
        <div class="cpop__gallery" data-pop-gallery tabindex="0"><div class="cpop__track" data-pop-track></div></div>
        <footer class="cpop__foot">
          <span class="cpop__count" data-pop-count></span>
          <button type="button" class="cases__arrow cases__arrow--prev" data-pop-prev aria-label="Предыдущее фото">${ARROW}</button>
          <button type="button" class="cases__arrow" data-pop-next aria-label="Следующее фото">${ARROW}</button>
        </footer>
      </div>`;
    document.body.appendChild(pop);
    const g = pop.querySelector("[data-pop-gallery]");
    const slidesOf = () => [...pop.querySelectorAll(".cpop__slide")];
    const nearest = () => {
      const c = g.scrollLeft + g.clientWidth / 2;
      let best = 0, d = Infinity;
      slidesOf().forEach((s, k) => { const dd = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c); if (dd < d) { d = dd; best = k; } });
      return best;
    };
    const go = (k) => {
      const list = slidesOf();
      k = Math.max(0, Math.min(list.length - 1, k));
      const s = list[k];
      g.scrollTo({ left: s.offsetLeft + s.offsetWidth / 2 - g.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
    };
    const sync = () => {
      const list = slidesOf(), k = nearest();
      pop.querySelector("[data-pop-count]").textContent = `${pad2(k + 1)} / ${pad2(list.length)}`;
      list.forEach((s, j) => s.classList.toggle("is-active", j === k));
      pop.querySelector("[data-pop-prev]").disabled = k === 0;
      pop.querySelector("[data-pop-next]").disabled = k === list.length - 1;
    };
    g.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
    pop.querySelector("[data-pop-prev]").addEventListener("click", () => go(nearest() - 1));
    pop.querySelector("[data-pop-next]").addEventListener("click", () => go(nearest() + 1));
    g.addEventListener("click", (e) => { const s = e.target.closest(".cpop__slide"); if (s) go(slidesOf().indexOf(s)); });
    pop.addEventListener("click", (e) => { if (e.target.closest("[data-pop-close]")) closePopup(); });
    pop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); closePopup(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(nearest() + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(nearest() - 1); }
      else if (e.key === "Tab") {
        // фокус не уходит из окна
        const f = [...pop.querySelectorAll("button:not([disabled]), [tabindex='0']")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    pop._sync = sync;
  }

  function openPopup(card) {
    if (!pop) buildPopup();
    const c = data[+card.dataset.index];
    popOpener = card;
    mode = "popup";
    tween = null; vel = 0; coasting = false;
    cur.on = false;
    if (cursor) cursor.classList.remove("is-on");
    pop.setAttribute("aria-label", c.title);
    pop.querySelector("[data-pop-tags]").innerHTML = (c.tags || []).map((t) => `<span class="cases__tag">${esc(t)}</span>`).join("");
    pop.querySelector("[data-pop-title]").textContent = c.title;
    pop.querySelector("[data-pop-meta]").textContent = metaText(c);
    pop.querySelector("[data-pop-track]").innerHTML = photosOf(c).map((p, k) => {
      const r = p.w && p.h ? (p.w / p.h).toFixed(4) : "1.5";
      return `<figure class="cpop__slide" style="--r:${r};--d:${(0.12 + k * 0.07).toFixed(2)}s">${imgHtml({ src: p.src })}</figure>`;
    }).join("");
    pop.querySelector("[data-pop-gallery]").scrollLeft = 0;
    pop.hidden = false;
    document.body.classList.add("is-locked");
    void pop.offsetWidth;
    pop.classList.add("is-open");
    pop._sync();
    pop.querySelector(".cpop__close").focus({ preventScroll: true });
  }

  function closePopup() {
    if (!pop || mode !== "popup") return;
    pop.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => { pop.hidden = true; pop.querySelector("[data-pop-track]").innerHTML = ""; }, reduce ? 0 : 450);
    mode = "strip";
    updateBar();
    if (popOpener) popOpener.focus({ preventScroll: true });
  }

  backBtn.addEventListener("click", closeCase);
  prevBtn.addEventListener("click", () => (mode === "strip" ? stepStrip(-1) : mode === "case" && slideTo(-1)));
  nextBtn.addEventListener("click", () => (mode === "strip" ? stepStrip(1) : mode === "case" && slideTo(1)));

  gallery.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !canHover) return;
    const r = gallery.getBoundingClientRect();
    gHover = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  });
  gallery.addEventListener("pointerleave", () => { gHover = null; });

  // галерея: нажатие на соседнее фото — к нему, на текущее — дальше; свайп — листает
  let gdrag = null;
  gallery.addEventListener("pointerdown", (e) => {
    if (mode !== "case" || e.button !== 0) return;
    gTween = null;
    gdrag = { x: e.clientX, gx, moved: false };
  });
  gallery.addEventListener("pointermove", (e) => {
    if (!gdrag) return;
    const dx = e.clientX - gdrag.x;
    if (!gdrag.moved && Math.abs(dx) > 6) { gdrag.moved = true; gallery.setPointerCapture(e.pointerId); }
    if (gdrag.moved) {
      gx = clampGx(gdrag.gx + dx);
      renderGallery();
    }
  });
  const gEnd = (e) => {
    if (!gdrag) return;
    const dx = e.clientX - gdrag.x;
    const moved = gdrag.moved;
    gdrag = null;
    if (moved) return;
    if (e.pointerType === "mouse" && canHover) { slideTo(hoverDir() || 1); return; }
    const s = e.target.closest(".case-slide");
    if (!s) return;
    const k = +s.dataset.k;
    goTo(k === gIdx ? gIdx + 1 : k);
  };
  gallery.addEventListener("pointerup", gEnd);
  gallery.addEventListener("pointercancel", () => { gdrag = null; });

  document.addEventListener("keydown", (e) => {
    if (mode === "case") {
      if (e.key === "Escape") { e.preventDefault(); closeCase(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); slideTo(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); slideTo(-1); }
    } else if (mode === "strip" && strip.contains(document.activeElement)) {
      if (e.key === "ArrowRight") { e.preventDefault(); stepStrip(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepStrip(-1); }
    }
  });

  /* ---------- размеры, видимость, появление ---------- */
  layoutStrip();
  pos = 0; // первая карточка — у левого поля, следующие уходят за край: видно, что лента продолжается
  apply();
  updateBar();

  const onResize = () => {
    const k = contIndex();
    layoutStrip();
    pos = padL + k * step + cardW / 2 - stripW / 2; // сохраняем, какая карточка в центре
    apply();
    if (mode === "case") { gx = clampGx(galleryX(gIdx)); renderGallery(); }
  };
  if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(stage);
  else window.addEventListener("resize", onResize, { passive: true });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        visible = en.isIntersecting;
        if (visible) run();
      });
    }, { rootMargin: "100px 0px" }).observe(section);

    new IntersectionObserver((entries, io) => {
      if (entries.some((en) => en.isIntersecting)) {
        section.classList.add("is-in");
        io.disconnect();
      }
    }, { threshold: 0.18 }).observe(section);
  } else {
    visible = true;
    section.classList.add("is-in");
    run();
  }
  document.addEventListener("visibilitychange", run);
  }
})();
