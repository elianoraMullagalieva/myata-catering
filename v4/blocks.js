/* МЯТА — блоки «Видео», «Почему мы» и «Меню»:
   1) аккордеоны — открыт один пункт, раскрытие плавное, открытый пункт не уходит под шапку;
   2) лента вертикальных видео — дуга (у центра крупнее), стрелки, перетаскивание, свайп; играет только ролик у центра;
      по нажатию — полноэкранный просмотр со звуком;
   3) меню — если блюд больше, чем влезает в ряд, лента медленно едет (пауза при наведении); на телефоне — сетка. */
(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 767px)");
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- 1. Аккордеоны ---------- */
  document.querySelectorAll("[data-acc]").forEach((acc) => {
    const items = [...acc.querySelectorAll("[data-acc-item]")];
    const single = acc.hasAttribute("data-acc-single");

    function setOpen(item, open) {
      item.classList.toggle("is-open", open);
      item.querySelector("[data-acc-head]").setAttribute("aria-expanded", String(open));
    }

    items.forEach((item) => {
      const head = item.querySelector("[data-acc-head]");
      head.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        if (single && open) items.forEach((it) => it !== item && setOpen(it, false));
        setOpen(item, open);
        if (!open) return;
        // после раскрытия: если заголовок ушёл выше экрана (закрылся длинный пункт сверху) — возвращаем его в поле зрения
        setTimeout(() => {
          const r = head.getBoundingClientRect();
          if (r.top < 80 || r.top > window.innerHeight * 0.75) head.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }, 560);
        item.dispatchEvent(new CustomEvent("acc:open", { bubbles: true }));
      });
    });
  });

  /* ---------- 2. Лента видео ---------- */
  const st = document.querySelector("[data-st]");
  if (st) {
    const vp = st.querySelector("[data-st-viewport]");
    const cards = [...st.querySelectorAll(".st-card")];
    const countEl = st.querySelector("[data-st-count]");
    let current = 0;

    // ближайший к центру ролик и масштаб остальных — дуга, как в макете
    function layout() {
      const vr = vp.getBoundingClientRect();
      const mid = vr.left + vp.clientWidth / 2;
      const w = cards[0].offsetWidth;
      let best = 0, bestD = Infinity;
      // положение по раскладке (без сдвигов): центр карточки относительно центра экрана, в ширинах карточки
      const ds = cards.map((c) => (c.offsetLeft - vp.scrollLeft + w / 2 - vp.clientWidth / 2) / w);
      const sc = ds.map((d, i) => {
        if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
        if (phone.matches) return 1;
        const a = Math.min(Math.abs(d), 2.2);
        return a <= 0.5 ? 1 : 1 - Math.min(0.28, (a - 0.5) * 0.17);
      });
      // уменьшенные ролики подтягиваем к центру, чтобы зазоры между кадрами оставались одинаковыми
      cards.forEach((c, i) => {
        // сумма «усадки» всех роликов между центральным и этим + половина собственной
        let shift = 0;
        const dir = i > best ? -1 : 1; // справа от центра — тянем влево, слева — вправо
        const lo = Math.min(i, best) + 1, hi = Math.max(i, best);
        for (let k = lo; k < hi; k++) shift += (1 - sc[k]) * w;
        if (i !== best) shift += (1 - sc[i]) * w / 2;
        c.style.setProperty("--s", sc[i].toFixed(3));
        c.style.setProperty("--x", `${(dir * shift).toFixed(1)}px`);
      });
      if (best !== current) { current = best; playCurrent(); }
      countEl.textContent = `${pad2(current + 1)} / ${pad2(cards.length)}`;
    }

    // играет без звука только ролик у центра — остальные стоят обложкой (так лента не тормозит на 4K и телефонах)
    let inView = false;
    function playCurrent() {
      cards.forEach((c, i) => {
        const v = c.querySelector("video");
        if (i === current && inView && !reduce) {
          if (!v.src) v.src = v.dataset.src;
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
          v.addEventListener("playing", () => v.classList.add("is-playing"), { once: true });
        } else if (v.src) {
          v.pause();
          v.classList.remove("is-playing");
        }
      });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; playCurrent(); }, { threshold: 0.25 }).observe(vp);
    }

    function goTo(i, smooth = true) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      const c = cards[i];
      const left = c.offsetLeft + c.offsetWidth / 2 - vp.clientWidth / 2;
      vp.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
    }
    st.querySelector("[data-st-prev]").addEventListener("click", () => goTo(current - 1));
    st.querySelector("[data-st-next]").addEventListener("click", () => goTo(current + 1));
    vp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
    });

    let ticking = false;
    vp.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; layout(); });
    }, { passive: true });
    window.addEventListener("resize", () => { layout(); goTo(current, false); }, { passive: true });

    // старт: средний ролик по центру — слева и справа ролики поровну, как в макете
    requestAnimationFrame(() => { goTo(Math.floor((cards.length - 1) / 2), false); layout(); });

    // перетаскивание мышью (на телефоне работает родной свайп со щелчком на карточку)
    let drag = null, moved = false;
    vp.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: vp.scrollLeft };
      moved = false;
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; vp.classList.add("is-dragging"); }
      if (moved) vp.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      drag = null;
      if (moved) {
        vp.classList.remove("is-dragging");
        // доводим до ближайшего ролика
        requestAnimationFrame(() => { layout(); goTo(current); });
      }
    });
    vp.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    vp.addEventListener("dragstart", (e) => e.preventDefault());

    /* --- полноэкранный просмотр --- */
    const stp = document.querySelector("[data-stp]");
    const pv = stp.querySelector("[data-stp-video]");
    const nameEl = stp.querySelector("[data-stp-name]");
    const bars = stp.querySelector("[data-stp-bars]");
    const soundBtn = stp.querySelector("[data-stp-sound]");
    bars.innerHTML = cards.map(() => "<i><b></b></i>").join("");
    const barEls = [...bars.querySelectorAll("b")];
    let idx = 0, lastFocus = null, sound = true;

    function show(i) {
      idx = (i + cards.length) % cards.length;
      const v = cards[idx].querySelector("video");
      const img = cards[idx].querySelector("img");
      pv.poster = img.currentSrc || img.src;
      pv.src = v.dataset.src;
      pv.muted = !sound;
      nameEl.textContent = cards[idx].querySelector(".st-card__name").textContent;
      barEls.forEach((b, k) => b.style.setProperty("--p", k < idx ? 1 : 0));
      const p = pv.play();
      if (p && p.catch) p.catch(() => { sound = false; pv.muted = true; syncSound(); pv.play().catch(() => {}); });
    }
    function syncSound() {
      soundBtn.classList.toggle("is-on", sound);
      soundBtn.setAttribute("aria-label", sound ? "Выключить звук" : "Включить звук");
    }
    pv.addEventListener("timeupdate", () => {
      if (pv.duration) barEls[idx].style.setProperty("--p", (pv.currentTime / pv.duration).toFixed(3));
    });
    pv.addEventListener("ended", () => show(idx + 1));

    function open(i) {
      lastFocus = document.activeElement;
      stp.hidden = false;
      document.body.classList.add("is-locked");
      cards.forEach((c) => { const v = c.querySelector("video"); if (v.src) v.pause(); });
      syncSound();
      show(i);
      requestAnimationFrame(() => stp.classList.add("is-open"));
      stp.querySelector("[data-stp-close]").focus({ preventScroll: true });
    }
    function close() {
      stp.classList.remove("is-open");
      pv.pause();
      document.body.classList.remove("is-locked");
      setTimeout(() => { stp.hidden = true; pv.removeAttribute("src"); pv.load(); }, 350);
      playCurrent();
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }

    st.querySelectorAll("[data-st-open]").forEach((b) => b.addEventListener("click", () => open(+b.dataset.stOpen)));
    stp.querySelector("[data-stp-close]").addEventListener("click", close);
    stp.querySelector("[data-stp-prev]").addEventListener("click", () => show(idx - 1));
    stp.querySelector("[data-stp-next]").addEventListener("click", () => show(idx + 1));
    soundBtn.addEventListener("click", () => { sound = !sound; pv.muted = !sound; syncSound(); });
    stp.addEventListener("click", (e) => { if (e.target === stp) close(); });
    // нажатие по видео: левая треть — назад, правая — вперёд, середина — пауза (как в сторис)
    pv.addEventListener("click", (e) => {
      const r = pv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x < 0.3) show(idx - 1);
      else if (x > 0.7) show(idx + 1);
      else if (pv.paused) pv.play().catch(() => {}); else pv.pause();
    });
    // свайп вниз закрывает, вбок — листает
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
  }

  /* ---------- 3. Меню: метки на фото открывают категорию; лента блюд едет, только если не влезает в ряд ---------- */
  const mnTags = [...document.querySelectorAll("[data-mn-go]")];
  const mnCats = [...document.querySelectorAll(".mn-cat")];
  const syncTags = () => mnTags.forEach((t) => t.classList.toggle("is-on", mnCats[+t.dataset.mnGo]?.classList.contains("is-open")));
  mnTags.forEach((t) => t.addEventListener("click", () => {
    const cat = mnCats[+t.dataset.mnGo];
    if (!cat) return;
    const head = cat.querySelector("[data-acc-head]");
    if (!cat.classList.contains("is-open")) head.click();
    else head.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }));
  mnCats.forEach((c) => c.querySelector("[data-acc-head]").addEventListener("click", () => setTimeout(syncTags, 0)));
  syncTags();

  const SPEED = 28; // px/с — спокойно, чтобы успеть прочитать название
  document.querySelectorAll("[data-mn-rail]").forEach((rail) => {
    const track = rail.querySelector("[data-mn-track]");
    const item = rail.closest("[data-acc-item]");
    const base = [...track.children];
    let pos = 0, raf = 0, last = 0, hover = false, setW = 0, cloned = false;

    function measure() {
      if (phone.matches) { reset(); return false; }
      if (!rail.clientWidth || !base[0].offsetWidth) return false; // пункт ещё закрыт — мерить нечего
      const need = track.scrollWidth > rail.clientWidth + 2 || cloned;
      if (!need) return false;
      if (!cloned) {
        base.forEach((li) => { const c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); });
        cloned = true;
      }
      setW = base.reduce((w, li) => w + li.offsetWidth, 0) + base.length * parseFloat(getComputedStyle(track).columnGap || 0);
      return setW > rail.clientWidth;
    }
    function reset() {
      cancelAnimationFrame(raf); raf = 0;
      track.style.transform = "";
      if (cloned) { [...track.children].slice(base.length).forEach((c) => c.remove()); cloned = false; }
    }
    function frame(now) {
      const dt = Math.min(64, now - (last || now)) / 1000;
      last = now;
      if (!hover) pos = (pos + SPEED * dt) % setW;
      track.style.transform = `translate3d(${-pos}px, 0, 0)`;
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (reduce || raf || !item.classList.contains("is-open")) return;
      if (!measure()) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    rail.addEventListener("pointerenter", () => { hover = true; });
    rail.addEventListener("pointerleave", () => { hover = false; });
    item.addEventListener("acc:open", () => setTimeout(start, 60));
    item.querySelector("[data-acc-head]").addEventListener("click", () => { if (!item.classList.contains("is-open")) stop(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop())).observe(rail);
    }
    phone.addEventListener("change", () => { stop(); reset(); start(); });
    window.addEventListener("resize", () => { stop(); if (cloned) reset(); start(); }, { passive: true });
  });
})();
