/* МЯТА — бесконечная лента видео-сторис.
   Без прокрутки браузера: положение ленты считается на каждом кадре и задаётся через transform,
   поэтому лента не дёргается и никогда не кончается (карточки по кругу).
   Дуга: у центра ролики крупнее, к краям мельче, зазоры между кадрами остаются одинаковыми.
   Листают стрелками, перетаскиванием мышью, свайпом и горизонтальным жестом тачпада.
   Играет без звука только ролик у центра; по нажатию — полноэкранный просмотр со звуком. */
(() => {
  "use strict";

  const st = document.querySelector("[data-st]");
  if (!st) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ролики в ленте играют сами, только когда подключены настоящие видео (data-inline="1" на секции);
  // пока стоят заглушки — в ленте обложки, видео открывается по нажатию
  const INLINE = st.dataset.inline === "1";
  const phone = window.matchMedia("(max-width: 767px)");
  const pad2 = (n) => String(n).padStart(2, "0");

  const vp = st.querySelector("[data-st-viewport]");
  const track = st.querySelector("[data-st-track]");
  const countEl = st.querySelector("[data-st-count]");
  const base = [...track.children];
  const N = base.length;
  if (!N) return;

  // три копии по кругу — по бокам всегда есть ролики
  const COPIES = 3;
  for (let c = 1; c < COPIES; c++) {
    base.forEach((li) => {
      const cl = li.cloneNode(true);
      cl.setAttribute("aria-hidden", "true");
      cl.querySelectorAll("button").forEach((b) => b.setAttribute("tabindex", "-1"));
      track.appendChild(cl);
    });
  }
  const cards = [...track.children];
  const M = cards.length;
  cards.forEach((c, k) => { c.dataset.k = k; });

  /* ---------- геометрия ---------- */
  let w = 0, g = 0, half = 0;
  // масштаб ролика по расстоянию от центра (в карточках)
  // как в макете: два центральных кадра крупные, следующие на 15% меньше, крайние ещё меньше
  const scaleAt = (a) => {
    if (phone.matches) return 1;
    if (a <= 0.5) return 1;
    if (a <= 1.5) return 1 - 0.15 * smooth(a - 0.5);
    if (a <= 2.5) return 0.85 - 0.13 * smooth(a - 1.5);
    return 0.72;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  // на компьютере центр экрана — между двумя кадрами (позиции …,1.5, 2.5…), на телефоне — по центру кадра
  const snap = (x) => (phone.matches ? Math.round(x) : Math.floor(x) + 0.5);
  function measure() {
    w = cards[0].offsetWidth;
    g = parseFloat(getComputedStyle(track).columnGap) || 16; // зазор в px (в CSS он может быть в vw)
    half = vp.clientWidth / 2;
  }
  /* ---------- состояние ---------- */
  let p = N + 1.5; // текущая позиция (дробный индекс у центра): старт — между «Фуршет на террасе» и «Корпоратив»
  let target = p;
  let vel = 0;
  let drag = null;
  let moved = false;
  let current = -1;
  let inView = false;
  let raf = 0, last = 0;

  const wrap = (u) => { u = ((u % M) + M) % M; return u > M / 2 ? u - M : u; };

  function render() {
    // опорная пара: ролик A чуть левее центра (u ∈ (-1, 0]) и следующий за ним B;
    // центр экрана — между ними, дальше раскладываем соседей по цепочке с одинаковым зазором g
    const fl = Math.floor(p);
    const t = p - fl;                 // 0…1 — насколько ушли от A к B
    const kA = ((fl % M) + M) % M;
    const sAt = (u) => scaleAt(Math.abs(u));
    const pos = new Array(M);
    const sc = new Array(M);
    const uA = -t, uB = 1 - t;
    const kB = (kA + 1) % M;
    sc[kA] = sAt(uA); sc[kB] = sAt(uB);
    const D = w * sc[kA] / 2 + g + w * sc[kB] / 2;
    pos[kA] = -t * D; pos[kB] = (1 - t) * D;
    const side = Math.floor((M - 2) / 2);
    let x = pos[kB], prev = sc[kB];
    for (let i = 1; i <= side; i++) {               // вправо от B
      const k = (kB + i) % M, s1 = sAt(uB + i);
      x += w * prev / 2 + g + w * s1 / 2; pos[k] = x; sc[k] = s1; prev = s1;
    }
    x = pos[kA]; prev = sc[kA];
    for (let i = 1; i <= M - 2 - side; i++) {       // влево от A
      const k = (kA - i + M) % M, s1 = sAt(uA - i);
      x -= w * prev / 2 + g + w * s1 / 2; pos[k] = x; sc[k] = s1; prev = s1;
    }
    let best = 0, bestD = Infinity;
    for (let k = 0; k < M; k++) {
      const c = cards[k];
      const xx = pos[k];
      if (Math.abs(xx) - w > half + 40) { c.style.visibility = "hidden"; continue; }
      c.style.visibility = "";
      c.style.transform = `translate3d(${(half + xx - w / 2).toFixed(2)}px, 0, 0)`;
      c.style.setProperty("--s", sc[k].toFixed(4));
      if (Math.abs(xx) < bestD) { bestD = Math.abs(xx); best = k; }
    }
    if (countEl) { const idx = ((Math.round(p) % N) + N) % N; countEl.textContent = `${pad2(idx + 1)} / ${pad2(N)}`; }
    if (best !== current) { current = best; play(); }
  }

  // играет только ролик у центра, остальные стоят обложкой (лента не тормозит на 4K и телефонах)
  function play() {
    cards.forEach((c, k) => {
      const v = c.querySelector("video");
      if (!v) return;
      if (INLINE && k === current && inView && !reduce) {
        if (!v.src) v.src = v.dataset.src;
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => {});
        if (!v.classList.contains("is-playing")) v.addEventListener("playing", () => v.classList.add("is-playing"), { once: true });
      } else if (v.src) {
        if (!v.paused) v.pause();
        v.classList.remove("is-playing"); // ушёл из центра — снова видна обложка
      }
    });
  }

  function frame(now) {
    const dt = Math.min(64, now - (last || now)) / 1000;
    last = now;
    if (!drag) {
      // мягкое доведение до цели — без пружинящих рывков
      const k = 1 - Math.exp(-dt / (reduce ? 0.001 : 0.16));
      p += (target - p) * k;
      if (Math.abs(target - p) < 0.0005) p = target;
    }
    render();
    const idle = !drag && p === target;
    raf = !idle ? requestAnimationFrame(frame) : 0;
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

  function go(d) { target = snap(target) + d; kick(); }

  st.querySelector("[data-st-prev]").addEventListener("click", () => go(-1));
  st.querySelector("[data-st-next]").addEventListener("click", () => go(1));
  vp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });

  /* ---------- перетаскивание / свайп ---------- */
  vp.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, p0: p, lx: e.clientX, lt: performance.now(), v: 0, axis: null, id: e.pointerId };
    moved = false;
  });
  vp.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.axis === "y") { drag = null; return; } // вертикально — это прокрутка страницы
      moved = true;
      vp.classList.add("is-dragging");
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const unit = w + g;
    p = drag.p0 - dx / unit;
    const now = performance.now();
    const dtm = Math.max(1, now - drag.lt);
    drag.v = 0.75 * (-(e.clientX - drag.lx) / unit / dtm * 1000) + 0.25 * drag.v; // карточек в секунду
    drag.lx = e.clientX; drag.lt = now;
    kick();
  });
  function endDrag() {
    if (!drag) return;
    if (moved) {
      // бросок: доводим до ближайшей карточки по ходу движения (на телефоне — ровно на одну)
      let t = snap(p + drag.v * 0.22);
      if (phone.matches) t = Math.max(Math.round(drag.p0) - 1, Math.min(Math.round(drag.p0) + 1, t));
      target = t;
      setTimeout(() => { moved = false; }, 0);
    }
    vp.classList.remove("is-dragging");
    drag = null;
    kick();
  }
  vp.addEventListener("pointerup", endDrag);
  vp.addEventListener("pointercancel", endDrag);
  vp.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  vp.addEventListener("dragstart", (e) => e.preventDefault());

  // горизонтальный жест тачпада; вертикальную прокрутку страницы не трогаем
  let wheelT = 0;
  vp.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    p += e.deltaX / (w + g);
    target = p;
    kick();
    clearTimeout(wheelT);
    wheelT = setTimeout(() => { target = snap(p); kick(); }, 140);
  }, { passive: false });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; play(); }, { threshold: 0.25 }).observe(vp);
  }
  const relayout = () => { measure(); target = p = snap(p); render(); };
  window.addEventListener("resize", relayout, { passive: true });
  phone.addEventListener("change", relayout);
  relayout(); // старт: на телефоне — ровно один ролик по центру, на компьютере — пара

  /* ---------- полноэкранный просмотр ---------- */
  const stp = document.querySelector("[data-stp]");
  if (!stp) return;
  const pv = stp.querySelector("[data-stp-video]");
  const nameEl = stp.querySelector("[data-stp-name]");
  const bars = stp.querySelector("[data-stp-bars]");
  const soundBtn = stp.querySelector("[data-stp-sound]");
  bars.innerHTML = base.map(() => "<i><b></b></i>").join("");
  const barEls = [...bars.querySelectorAll("b")];
  let idx = 0, lastFocus = null, sound = true;

  function syncSound() {
    soundBtn.classList.toggle("is-on", sound);
    soundBtn.setAttribute("aria-label", sound ? "Выключить звук" : "Включить звук");
  }
  function show(i) {
    idx = ((i % N) + N) % N;
    const src = base[idx];
    pv.poster = src.querySelector("img").currentSrc || src.querySelector("img").src;
    const sv = src.querySelector("video");
    pv.src = sv.dataset.full || sv.dataset.src; // в плеере — полная версия ролика
    pv.muted = !sound;
    nameEl.textContent = src.querySelector(".st-card__name").textContent;
    barEls.forEach((b, k) => b.style.setProperty("--p", k < idx ? 1 : 0));
    const pr = pv.play();
    if (pr && pr.catch) pr.catch(() => { sound = false; pv.muted = true; syncSound(); pv.play().catch(() => {}); });
  }
  pv.addEventListener("timeupdate", () => { if (pv.duration) barEls[idx].style.setProperty("--p", (pv.currentTime / pv.duration).toFixed(3)); });
  pv.addEventListener("ended", () => show(idx + 1));

  function open(i) {
    lastFocus = document.activeElement;
    stp.hidden = false;
    document.body.classList.add("is-locked");
    cards.forEach((c) => { const v = c.querySelector("video"); if (v && v.src) v.pause(); });
    syncSound();
    show(i);
    requestAnimationFrame(() => stp.classList.add("is-open"));
    stp.querySelector("[data-stp-close]").focus({ preventScroll: true });
  }
  function close() {
    stp.classList.remove("is-open");
    pv.pause();
    document.body.classList.remove("is-locked");
    // лента встаёт на тот ролик, который досматривали
    const k = Math.round(target - (phone.matches ? 0 : 0.5));
    target = k + (((idx - k) % N) + N) % N - (((idx - k) % N + N) % N > N / 2 ? N : 0);
    kick();
    setTimeout(() => { stp.hidden = true; pv.removeAttribute("src"); pv.load(); play(); }, 350);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  track.addEventListener("click", (e) => {
    const b = e.target.closest("[data-st-open]");
    if (!b || moved) return;
    const k = +b.closest(".st-card").dataset.k;
    const u = wrap(k - p);
    // нажали на ролик сбоку — сначала подвозим его в центр, по второму нажатию открываем
    if (Math.abs(u) > 0.5 && !phone.matches) { target = Math.round(p + u); kick(); return; }
    open(k % N);
  });
  stp.querySelector("[data-stp-close]").addEventListener("click", close);
  stp.querySelector("[data-stp-prev]").addEventListener("click", () => show(idx - 1));
  stp.querySelector("[data-stp-next]").addEventListener("click", () => show(idx + 1));
  soundBtn.addEventListener("click", () => { sound = !sound; pv.muted = !sound; syncSound(); });
  stp.addEventListener("click", (e) => { if (e.target === stp) close(); });
  pv.addEventListener("click", (e) => {
    const r = pv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.3) show(idx - 1);
    else if (x > 0.7) show(idx + 1);
    else if (pv.paused) pv.play().catch(() => {}); else pv.pause();
  });
  let tx = 0, ty = 0;
  pv.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  pv.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (stp.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "Tab") {
      const f = [...stp.querySelectorAll("button")].filter((b) => b.offsetParent);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
})();
