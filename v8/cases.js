/* МЯТА — кейсы для блока «Наш взгляд на уникальное событие и наши проекты».
   Чтобы поменять кейсы, достаточно этого файла:
   - title  — название мероприятия;
   - tags   — теги (тип мероприятия, формат);
   - guests — количество гостей (числом);
   - price  — стоимость на гостя в рублях (числом);
   - cover  — обложка карточки в ленте (горизонтальный кадр);
   - photos — фото галереи по порядку; обложка встаёт в ней первой сама.
   У каждого фото: src — путь от папки версии (фото лежат в assets/cases/<кейс>/),
   w и h — размеры фото в пикселях (по ним галерея ставит кадры без скачков),
   pos — необязательная точка кадрирования обложки (как CSS object-position). */

(() => {
  window.MYATA_CASES = [
    {
      title: "Фуршет на открытии выставки",
      tags: ["Выставка", "Фуршет"],
      guests: 80,
      price: 2500,
      cover: { src: "assets/cases/vystavka/cover.png", w: 1448, h: 1086 },
      photos: [
        { src: "assets/cases/vystavka/01.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/vystavka/02.jpg", w: 959, h: 1280 },
        { src: "assets/cases/vystavka/03.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/vystavka/04.jpg", w: 3024, h: 4032 },
        { src: "assets/cases/vystavka/05.jpg", w: 960, h: 1280 },
        { src: "assets/cases/vystavka/06.jpg", w: 3024, h: 4032 },
        { src: "assets/cases/vystavka/07.jpg", w: 3024, h: 4032 }
      ],
    },
    {
      title: "День рождения Алисы",
      tags: ["День рождения"],
      guests: 25,
      price: 2500,
      cover: { src: "assets/cases/den-rozhdeniya/cover.png", w: 1448, h: 1086 },
      photos: [
        { src: "assets/cases/den-rozhdeniya/01.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/den-rozhdeniya/02.jpg", w: 1330, h: 2365 },
        { src: "assets/cases/den-rozhdeniya/03.jpg", w: 1330, h: 2365 },
        { src: "assets/cases/den-rozhdeniya/04.jpg", w: 3213, h: 5712 },
        { src: "assets/cases/den-rozhdeniya/05.jpg", w: 3213, h: 5712 },
        { src: "assets/cases/den-rozhdeniya/06.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/den-rozhdeniya/07.jpg", w: 3213, h: 5712 }
      ],
    },
    {
      title: "Летний корпоратив «Спец Металлург»",
      tags: ["Корпоратив"],
      guests: 300,
      price: 4500,
      cover: { src: "assets/cases/spec-metallurg/cover.png", w: 1448, h: 1086 },
      photos: [
        { src: "assets/cases/spec-metallurg/01.jpg", w: 900, h: 1600 },
        { src: "assets/cases/spec-metallurg/02.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/spec-metallurg/03.jpg", w: 900, h: 1600 },
        { src: "assets/cases/spec-metallurg/04.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/spec-metallurg/05.jpg", w: 576, h: 1024 },
        { src: "assets/cases/spec-metallurg/06.jpg", w: 2268, h: 4032 }
      ],
    },
    {
      title: "Свадьба Тимура и Анастасии",
      tags: ["Свадьба"],
      guests: 60,
      price: 5500,
      cover: { src: "assets/cases/svadba-timur-anastasia/cover.png", w: 1448, h: 1086 },
      photos: [
        { src: "assets/cases/svadba-timur-anastasia/01.jpg", w: 1330, h: 2365 },
        { src: "assets/cases/svadba-timur-anastasia/02.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-timur-anastasia/03.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-timur-anastasia/04.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-timur-anastasia/05.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-timur-anastasia/06.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-timur-anastasia/07.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-timur-anastasia/08.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/svadba-timur-anastasia/09.jpg", w: 576, h: 1024 },
        { src: "assets/cases/svadba-timur-anastasia/10.jpg", w: 1330, h: 2364 }
      ],
    },
    {
      title: "Свадьба Артёма и Мирославы",
      tags: ["Свадьба"],
      guests: 75,
      price: 6000,
      cover: { src: "assets/cases/svadba-artem-miroslava/cover.png", w: 1448, h: 1086 },
      photos: [
        { src: "assets/cases/svadba-artem-miroslava/01.jpg", w: 3024, h: 4032 },
        { src: "assets/cases/svadba-artem-miroslava/02.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-artem-miroslava/03.jpg", w: 2268, h: 4032 },
        { src: "assets/cases/svadba-artem-miroslava/04.jpg", w: 576, h: 1024 },
        { src: "assets/cases/svadba-artem-miroslava/05.jpg", w: 1330, h: 2364 },
        { src: "assets/cases/svadba-artem-miroslava/06.jpg", w: 1330, h: 2364 }
      ],
    },
  ];
})();
