/* МЯТА — уведомление о cookie и Яндекс Метрика.
   По Политике cookie (п. 2.7) согласие на аналитические cookie — явным выбором в уведомлении,
   поэтому счётчик загружается только после «Принять». Выбор хранится на устройстве 1 год.
   На превью (github.io) и на локальном компьютере счётчик не включается — чтобы не засорять статистику.
   Ссылка на политику — из атрибута data-policy у тега <script>. */
(() => {
  "use strict";
  const ID = 114229700;
  const KEY = "myata_cookie";
  const YEAR = 365 * 24 * 3600 * 1000;
  const me = document.currentScript;
  const policy = (me && me.dataset.policy) || "legal/cookies.html";
  const host = location.hostname;
  const preview = /github\.io$|^localhost$|^127\.|^\[?::1\]?$/.test(host) || location.protocol === "file:";

  const read = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && Date.now() - o.t < YEAR ? o.v : null; } catch (e) { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() })); } catch (e) {} };

  function loadMetrika() {
    if (preview || window.ym) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (let j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) return; }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=" + ID, "ym");
    window.ym(ID, "init", { ssr: true, webvisor: true, clickmap: true, ecommerce: "dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
  }
  // цель в Метрике: send.js вызывает при отправке любой заявки
  window.MYATA_GOAL = (name, params) => { try { if (window.ym) window.ym(ID, "reachGoal", name, params || {}); } catch (e) {} };

  const choice = read();
  if (choice === "yes") { loadMetrika(); return; }
  if (choice === "no") return;

  const css = `
.ck{position:fixed;z-index:9000;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));
  width:min(440px,calc(100vw - 32px));box-sizing:border-box;padding:clamp(18px,1rem + .3vw,24px);
  background:#161210;color:#f2ede6;border:1px solid rgba(242,237,230,.16);border-radius:0;
  font:400 14px/1.5 "Golos Text",system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.28);
  opacity:0;transform:translate3d(0,12px,0);transition:opacity .4s ease,transform .5s cubic-bezier(.16,1,.3,1)}
.ck.is-on{opacity:1;transform:none}
.ck p{margin:0 0 16px;color:rgba(242,237,230,.78)}
.ck a{color:#f2ede6;text-decoration:underline;text-underline-offset:2px}
.ck__row{display:flex;gap:10px}
.ck button{flex:1;min-height:46px;padding:0 18px;border-radius:0;cursor:pointer;font:500 12px/1 "Golos Text",system-ui,sans-serif;
  letter-spacing:.08em;text-transform:uppercase;transition:background-color .25s ease,border-color .25s ease,color .25s ease}
.ck__yes{background:#f2ede6;color:#161210;border:1px solid #f2ede6}
.ck__yes:hover{background:#fff}
.ck__no{background:transparent;color:#f2ede6;border:1px solid rgba(242,237,230,.32)}
.ck__no:hover{border-color:#f2ede6}
.ck button:focus-visible,.ck a:focus-visible{outline:2px solid #8fd3b6;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.ck{transition:none}}`;

  function show() {
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
    const box = document.createElement("div");
    box.className = "ck";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Уведомление о cookie");
    box.innerHTML = `<p>Мы используем cookie и Яндекс Метрику, чтобы понимать, как работает сайт, и делать его удобнее. Подробнее — в&nbsp;<a href="${policy}" target="_blank" rel="noopener">Политике cookie</a>.</p>
      <div class="ck__row"><button type="button" class="ck__yes">Принять</button><button type="button" class="ck__no">Отклонить</button></div>`;
    document.body.appendChild(box);
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("is-on")));
    const close = (v) => {
      save(v);
      if (v === "yes") loadMetrika();
      box.classList.remove("is-on");
      setTimeout(() => box.remove(), 450);
    };
    box.querySelector(".ck__yes").addEventListener("click", () => close("yes"));
    box.querySelector(".ck__no").addEventListener("click", () => close("no"));
  }
  // не мешаем первому экрану: показываем после загрузки страницы
  if (document.readyState === "complete") setTimeout(show, 1200);
  else window.addEventListener("load", () => setTimeout(show, 1200), { once: true });
})();
