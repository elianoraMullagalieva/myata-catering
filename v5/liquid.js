/* МЯТА — «живая вода» на фото листа в контактах (как на osply.co).
   Готовое решение: Flowmap из библиотеки OGL (vendor/ogl.mjs, лежит на сайте). Курсор рисует «карту потока»,
   по ней фото вытягивается за мышью и плавно, по-жидкому, успокаивается. Знак «МЯТА» сверху не двигается.
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
    const { Renderer, Program, Mesh, Triangle, Texture, Vec2, Vec4, Flowmap } = O;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true });
    const gl = renderer.gl;
    if (!gl) return;
    const canvas = gl.canvas;
    canvas.className = "ct5__liquid";
    canvas.setAttribute("aria-hidden", "true");
    box.insertBefore(canvas, box.querySelector(".ct5__logo"));

    const flowmap = new Flowmap(gl, { falloff: 0.5, dissipation: 0.972, alpha: 0.6 });
    const texture = new Texture(gl, { minFilter: gl.LINEAR, magFilter: gl.LINEAR, generateMipmaps: false });
    const res = new Vec4();
    const program = new Program(gl, {
      vertex: /* glsl */ `
        attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }`,
      fragment: /* glsl */ `
        precision highp float;
        uniform sampler2D tImage; uniform sampler2D tFlow; uniform vec4 res; varying vec2 vUv;
        void main() {
          vec3 flow = texture2D(tFlow, vUv).rgb;
          // кадрирование как object-fit: cover, центр чуть выше середины (как object-position 50% 45%)
          vec2 uv = (vUv - vec2(0.5, 0.55)) * res.zw + vec2(0.5, 0.55);
          vec2 d = flow.xy * 0.11;
          // лёгкое преломление по краям «волны»
          float r = texture2D(tImage, uv - d * 1.012).r;
          float g = texture2D(tImage, uv - d).g;
          float b = texture2D(tImage, uv - d * 0.988).b;
          vec3 col = vec3(r, g, b);
          // мягкий блик там, где проходит вода
          col += length(flow.xy) * 0.025;
          gl_FragColor = vec4(col, 1.0);
        }`,
      uniforms: { tImage: { value: texture }, tFlow: flowmap.uniform, res: { value: res } },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    let iw = 960, ih = 1280;
    const resize = () => {
      const w = box.clientWidth, h = box.clientHeight;
      renderer.setSize(w, h);
      const ia = ih / iw;
      let a1, a2;
      if (h / w < ia) { a1 = 1; a2 = (h / w) / ia; } else { a1 = (w / h) * ia; a2 = 1; }
      res.set(w, h, a1, a2);
      flowmap.aspect = w / h;
      draw();
    };

    const image = new Image();
    image.decoding = "async";
    image.src = img.currentSrc || img.src;
    try { await image.decode(); } catch (e) { return; }
    iw = image.naturalWidth; ih = image.naturalHeight;
    texture.image = image;

    // мышь → скорость → карта потока
    const mouse = new Vec2(-1), velocity = new Vec2();
    let last = null, lastMove = 0, raf = 0, visible = true;
    const draw = () => { renderer.render({ scene: mesh }); };
    const loop = (t) => {
      if (!velocity.needsUpdate) { mouse.set(-1); velocity.set(0); }
      velocity.needsUpdate = false;
      flowmap.mouse.copy(mouse);
      flowmap.velocity.lerp(velocity, velocity.len() ? 0.5 : 0.1);
      flowmap.update();
      draw();
      // крутимся, пока вода не успокоилась (≈2,5 с после последнего движения)
      raf = visible && performance.now() - lastMove < 2600 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      mouse.set(x / r.width, 1 - y / r.height);
      const now = performance.now();
      if (last) {
        const dt = Math.max(14, now - last.t);
        velocity.x = (x - last.x) / dt;
        velocity.y = (y - last.y) / dt;
        velocity.needsUpdate = true;
      }
      last = { x, y, t: now };
      lastMove = now;
      kick();
    });
    box.addEventListener("pointerleave", () => { last = null; });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(box);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box); else window.addEventListener("resize", resize);
    resize();
    // кадр готов — показываем холст вместо фото (картинка та же, пока курсор не двигается)
    requestAnimationFrame(() => box.classList.add("has-liquid"));
  }
})();
