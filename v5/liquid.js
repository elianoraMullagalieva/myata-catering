/* МЯТА — «живая вода» на фото листа в контактах (как на osply.co).
   WebGL на библиотеке OGL (vendor/ogl.mjs, лежит на сайте): широкая мягкая линза под курсором — лист чуть
   выпукло увеличивается, линии плавно изгибаются и с инерцией тянутся за мышью. Знак «МЯТА» не двигается.
   Только для мыши; библиотека грузится, когда блок близко к экрану. Без WebGL остаётся обычное фото. */
(() => {
  "use strict";
  const box = document.querySelector("[data-ct5-visual]");
  if (!box) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const img = box.querySelector(".ct5__photo");
  if (!img) return;

  let started = false;
  const io = new IntersectionObserver((es) => {
    if (es[0].isIntersecting && !started) { started = true; io.disconnect(); start().catch(() => {}); }
  }, { rootMargin: "400px 0px" });
  io.observe(box);

  async function start() {
    let O;
    try { O = await import("./vendor/ogl.mjs"); } catch (e) { return; }
    const { Renderer, Program, Mesh, Triangle, Texture } = O;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true });
    const gl = renderer.gl;
    if (!gl) return;
    const canvas = gl.canvas;
    canvas.className = "ct5__liquid";
    canvas.setAttribute("aria-hidden", "true");
    box.insertBefore(canvas, box.querySelector(".ct5__logo"));

    const texture = new Texture(gl, { minFilter: gl.LINEAR, magFilter: gl.LINEAR, generateMipmaps: false });
    const U = {
      tImage: { value: texture },
      uCover: { value: [1, 1] },   // кадрирование как object-fit: cover
      uAspect: { value: 1 },
      uMouse: { value: [0.5, 0.5] },
      uVel: { value: [0, 0] },
      uHover: { value: 0 },
    };
    const program = new Program(gl, {
      vertex: /* glsl */ `
        attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }`,
      fragment: /* glsl */ `
        precision highp float;
        uniform sampler2D tImage; uniform vec2 uCover; uniform float uAspect;
        uniform vec2 uMouse; uniform vec2 uVel; uniform float uHover;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv;
          vec2 d = p - uMouse; d.x *= uAspect;
          // широкая мягкая «линза» вокруг курсора
          float g = exp(-dot(d, d) / 0.16);
          // выпуклость: слегка увеличиваем изображение к центру линзы
          vec2 q = p - (p - uMouse) * g * 0.085 * uHover;
          // инерция: поверхность тянется за движением мыши и пружинисто догоняет
          q -= uVel * g;
          vec2 uv = (q - vec2(0.5, 0.55)) * uCover + vec2(0.5, 0.55);
          gl_FragColor = vec4(texture2D(tImage, uv).rgb, 1.0);
        }`,
      uniforms: U,
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    let iw = 960, ih = 1280;
    const draw = () => renderer.render({ scene: mesh });
    const resize = () => {
      const w = box.clientWidth, h = box.clientHeight;
      renderer.setSize(w, h);
      const ia = ih / iw;
      U.uCover.value = h / w < ia ? [1, (h / w) / ia] : [(w / h) * ia, 1];
      U.uAspect.value = w / h;
      draw();
    };

    const image = new Image();
    image.decoding = "async";
    image.src = img.currentSrc || img.src;
    try { await image.decode(); } catch (e) { return; }
    iw = image.naturalWidth; ih = image.naturalHeight;
    texture.image = image;

    // физика: линза едет за курсором с запаздыванием, «скорость» — пружина с затуханием
    let tx = 0.5, ty = 0.5, mx = 0.5, my = 0.5, vx = 0, vy = 0, hover = 0, hoverT = 0, raf = 0, visible = true;
    const loop = () => {
      const px = mx, py = my;
      mx += (tx - mx) * 0.055; my += (ty - my) * 0.055;
      // скорость линзы → сдвиг; пружинка даёт мягкое «желе» после остановки
      vx += ((mx - px) * 1.4 - vx) * 0.07; vy += ((my - py) * 1.4 - vy) * 0.07;
      hover += (hoverT - hover) * 0.04;
      U.uMouse.value = [mx, my];
      U.uVel.value = [vx, vy];
      U.uHover.value = hover;
      draw();
      const busy = Math.abs(tx - mx) + Math.abs(ty - my) > 0.0005 || Math.abs(vx) + Math.abs(vy) > 0.00005 || Math.abs(hoverT - hover) > 0.002;
      raf = visible && busy ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    box.addEventListener("pointerenter", () => { hoverT = 1; kick(); });
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
      hoverT = 1; kick();
    });
    box.addEventListener("pointerleave", () => { hoverT = 0; kick(); });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(box);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box); else window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(() => box.classList.add("has-liquid"));
  }
})();
