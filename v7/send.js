/* МЯТА — отправка заявок со всех форм (квиз, дегустация, поп-апы) на почту через FormSubmit
   и переход на страницу «Спасибо» (spasibo/) — так заявки удобно считать в аналитике.
   Формы вызывают window.MYATA_QUIZ_SEND(data). Адрес получателя — константа TO.
   Первая заявка на новый адрес приходит письмом «Activate form» — его нужно один раз подтвердить. */
(() => {
  "use strict";
  // получатель: vsevolod.golovin@gmail.com (подтверждён в FormSubmit)
  const ENDPOINT = "https://formsubmit.co/ajax/e6f29a831d2c8000de82cc15794f1c11"; // код-псевдоним адреса TO от FormSubmit (адрес не виден в коде)
  const THANKS = new URL("spasibo/", document.baseURI).href;

  // метки рекламы (utm_*, yclid, gclid) и откуда пришёл человек — помним 30 дней на этом устройстве,
  // чтобы в заявке был источник, даже если человек вернулся позже или ушёл с первой страницы
  const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid"];
  const DAYS30 = 30 * 24 * 3600 * 1000;
  const store = {
    get(k) { try { const o = JSON.parse(localStorage.getItem(k) || "null"); return o && Date.now() - o.t < DAYS30 ? o.v : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify({ v, t: Date.now() })); } catch (e) {} },
  };
  try {
    const q = new URLSearchParams(location.search);
    const got = {};
    KEYS.forEach((k) => { if (q.get(k)) got[k] = q.get(k); });
    if (Object.keys(got).length) store.set("myata_utm", got);          // новый рекламный переход — новые метки
    const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";
    if (ref || !store.get("myata_ref")) store.set("myata_ref", ref || "прямой заход");
  } catch (e) {}

  const LABEL = {
    form: "Форма", type: "Мероприятие", guests: "Гостей", needs: "Что нужно",
    name: "Имя", phone: "Телефон", contact: "Как связаться",
  };
  const list = (v) => (Array.isArray(v) ? v.filter(Boolean).join(", ") : v || "");

  // последняя отправленная форма — на её кнопке пишем «Отправляем…»
  let lastForm = null;
  document.addEventListener("submit", (e) => { lastForm = e.target; }, true);
  document.addEventListener("click", (e) => { const f = e.target.closest && e.target.closest("form"); if (f) lastForm = f; }, true);

  window.MYATA_QUIZ_SEND = function (data) {
    const btn = lastForm && (lastForm.querySelector('button[type="submit"]') || [...lastForm.querySelectorAll("button")].pop());
    if (btn) {
      btn.disabled = true;
      const label = btn.querySelector("span") || btn;
      if (label.childElementCount === 0) { label.dataset.txt = label.textContent; label.textContent = "Отправляем…"; }
      // кнопка «Назад» со страницы «Спасибо» возвращает страницу из кэша — снова делаем кнопку рабочей
      window.addEventListener("pageshow", () => {
        btn.disabled = false;
        if (label.dataset.txt) label.textContent = label.dataset.txt;
      }, { once: true });
    }
    const formName = data.form || "Квиз: расчёт мероприятия";
    const body = { _subject: `Заявка с сайта МЯТА — ${formName}`, _template: "table", _captcha: "false" };
    Object.keys(LABEL).forEach((k) => {
      const v = k === "form" ? formName : list(data[k]);
      if (v) body[LABEL[k]] = v;
    });
    body["Страница"] = location.href.split("#")[0];
    try {
      const utm = store.get("myata_utm");
      if (utm) body["Метки"] = Object.entries(utm).map(([k, v]) => `${k}=${v}`).join("; ");
      body["Откуда пришёл"] = store.get("myata_ref") || "";
    } catch (e) {}

    // keepalive — запрос долетит, даже если страница уже переходит на «Спасибо»
    const req = fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
    const go = () => { location.href = THANKS + "?form=" + encodeURIComponent(formName); };
    Promise.race([req, new Promise((r) => setTimeout(r, 1800))]).then(go, go);
  };
})();
