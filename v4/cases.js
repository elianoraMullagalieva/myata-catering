/* МЯТА — кейсы для блока «Наш взгляд на уникальное событие и наши проекты».

   Сейчас здесь ЗАГЛУШКИ: тексты-примеры и фото с Pinterest.
   Чтобы поставить настоящие кейсы, достаточно поменять этот файл:
   - title  — название мероприятия;
   - tags   — теги: тип мероприятия (Корпоратив, Свадьба, Презентация, Частное мероприятие) и формат;
   - guests — количество гостей (числом);
   - price  — стоимость на гостя в рублях (числом);
   - cover  — обложка карточки в ленте (показывается горизонтальным кадром 3:2);
   - photos — фото галереи, которая открывается по нажатию; обложка встаёт в ней первой сама.
   У каждого фото: src — путь от папки v2 (фото кладите в v2/assets/cases/),
   w и h — размеры фото в пикселях (по ним галерея ставит кадры без скачков),
   pos — необязательная точка кадрирования обложки (как CSS object-position), по умолчанию центр. */

(() => {
  const P = {
    canapes: { src: "assets/cases/canapes-guests.jpg", w: 736, h: 1104 },
    waiter: { src: "assets/cases/waiter-tray.jpg", w: 750, h: 1018 },
    tartlets: { src: "assets/cases/tartlets.jpg", w: 1200, h: 1800 },
    crostini: { src: "assets/cases/crostini.jpg", w: 736, h: 1030 },
    desserts: { src: "assets/cases/desserts.jpg", w: 1000, h: 1500 },
    yakitori: { src: "assets/cases/yakitori.jpg", w: 1136, h: 1376 },
    buffet: { src: "assets/buffet.jpg", w: 2048, h: 1366 },
  };
  const cover = (p, pos) => ({ ...p, pos });

  window.MYATA_CASES = [
    {
      title: "Летний корпоратив компании «Атмосфера»",
      tags: ["Корпоратив", "Фуршет"],
      guests: 150,
      price: 5000,
      cover: cover(P.canapes, "50% 52%"),
      photos: [P.canapes, P.yakitori, P.buffet, P.tartlets, P.crostini],
    },
    {
      title: "Свадьба в загородной усадьбе",
      tags: ["Свадьба", "Банкет"],
      guests: 120,
      price: 7500,
      cover: cover(P.waiter, "50% 46%"),
      photos: [P.waiter, P.desserts, P.buffet, P.canapes],
    },
    {
      title: "Презентация новой коллекции ювелирного дома",
      tags: ["Презентация", "Фуршет"],
      guests: 80,
      price: 6000,
      cover: cover(P.tartlets, "50% 78%"),
      photos: [P.tartlets, P.crostini, P.waiter, P.desserts],
    },
    {
      title: "Юбилей в частной резиденции",
      tags: ["Частное мероприятие", "Ужин"],
      guests: 40,
      price: 9000,
      cover: cover(P.crostini, "50% 50%"),
      photos: [P.crostini, P.buffet, P.waiter, P.yakitori],
    },
    {
      title: "Новогодний корпоратив IT-компании",
      tags: ["Корпоратив", "Фуршет"],
      guests: 450,
      price: 4500,
      cover: cover(P.desserts, "50% 52%"),
      photos: [P.desserts, P.canapes, P.tartlets, P.buffet],
    },
    {
      title: "Открытие флагманского шоурума",
      tags: ["Презентация", "Кофе-брейк"],
      guests: 1000,
      price: 3500,
      cover: cover(P.yakitori, "50% 56%"),
      photos: [P.yakitori, P.waiter, P.crostini, P.canapes],
    },
  ];
})();
