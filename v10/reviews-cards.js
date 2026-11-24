/* Отзывы — лента карточек. Данные — из карточек окна «Все отзывы» ([data-rd-review]):
   имя, тип, дата, аватар, текст. Второй карточкой — фото из data-photo блока.
   Нажатие на карточку открывает отзыв полностью (обработчик [data-rd-full] в reviews-d.js). */
(() => {
  "use strict";
  const rc = document.querySelector("[data-rc]"), rd = document.querySelector("[data-rd]");
  if (!rc || !rd) return;
  const track = rc.querySelector("[data-rc-track]"), vp = rc.querySelector("[data-rc-vp]");
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const items = [...rd.querySelectorAll("[data-rd-review]")].map((c, i) => ({
    i, name: c.dataset.name, type: c.dataset.type, date: c.dataset.date, ava: c.dataset.ava,
    text: c.querySelector("[data-rd-text]").textContent.trim(),
  }));
  const card = (d) => `<li class="rc-card"><button type="button" class="rc-card__btn" data-rd-full="${d.i}" aria-label="Отзыв полностью: ${esc(d.name)}">
      <span class="rc-card__ava">${d.ava ? `<img src="${esc(d.ava)}" alt="" width="56" height="56" loading="lazy" decoding="async">` : ""}</span>
      <p class="rc-card__text">«${esc(d.text.replace(/\s+/g, " "))}»</p>
      <span class="rc-card__foot"><p class="rc-card__name">${esc(d.name)}</p><p class="rc-card__meta">${esc(d.type)} · ${esc(d.date)}</p></span>
    </button></li>`;
  const photo = rc.dataset.photo ? `<li class="rc-card rc-card--photo"><div class="rc-card__btn">
      <img src="${esc(rc.dataset.photo)}" alt="${esc(rc.dataset.photoName || "")}" loading="lazy" decoding="async">
      <span class="rc-card__foot"><p class="rc-card__name">${esc(rc.dataset.photoName || "")}</p><p class="rc-card__meta">${esc(rc.dataset.photoRole || "")}</p></span>
    </div></li>` : "";
  track.innerHTML = items.map((d, k) => (k === 1 ? photo : "") + card(d)).join("");

  // стрелки: на одну карточку
  const step = () => { const c = track.children; return c.length > 1 ? c[1].getBoundingClientRect().left - c[0].getBoundingClientRect().left : vp.clientWidth; };
  const prev = rd.querySelector("[data-rc-prev]"), next = rd.querySelector("[data-rc-next]");
  const upd = () => { if (!prev) return; prev.disabled = vp.scrollLeft <= 2; next.disabled = vp.scrollLeft >= vp.scrollWidth - vp.clientWidth - 2; };
  prev && prev.addEventListener("click", () => vp.scrollBy({ left: -step(), behavior: "smooth" }));
  next && next.addEventListener("click", () => vp.scrollBy({ left: step(), behavior: "smooth" }));
  vp.addEventListener("scroll", upd, { passive: true }); window.addEventListener("resize", upd); upd();

  // мышью — тянем ленту; короткое нажатие остаётся кликом
  let drag = null, moved = false;
  vp.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; drag = { x: e.clientX, left: vp.scrollLeft }; moved = false; });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return; const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 6) { moved = true; vp.classList.add("is-drag"); }
    if (moved) vp.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => { if (!drag) return; drag = null; if (moved) { vp.classList.remove("is-drag"); setTimeout(() => (moved = false), 0); } });
  vp.addEventListener("click", (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
})();
