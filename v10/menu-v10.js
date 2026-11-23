/* Меню v10: при наведении текст заголовка чуть сдвигается (CSS), раздел раскрывается по нажатию
   на заголовок или плюсик. Открыт один раздел; повторное нажатие на открытый его не закрывает (блок не прыгает). */
(() => {
  const root = document.querySelector("[data-mv]");
  if (!root) return;
  const secs = [...root.querySelectorAll("[data-mv-sec]")];

  function set(sec, on) {
    sec.classList.toggle("is-open", on);
    sec.querySelector(".mv-sec__head").setAttribute("aria-expanded", on ? "true" : "false");
  }

  secs.forEach((sec) => {
    sec.querySelector(".mv-sec__head").addEventListener("click", () => {
      // всегда открыт один раздел: нажатие на открытый ничего не меняет — высота блока постоянная
      if (sec.classList.contains("is-open")) return;
      secs.forEach((s) => set(s, s === sec));
    });
  });
})();
