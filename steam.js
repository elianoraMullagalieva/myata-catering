(() => {
  "use strict";

  /* Живой пар из самой фотографии.
     Слой пара выделен из снимка (steam-texture.js) — это родные завитки, струйки и зерно.
     Шейдер накладывает несколько копий этого слоя (screen): одна «дышит» на месте и уплотняет
     пар у живота, другие продолжают его вверх по фартуку и едва дымят у краёв рукавов.
     Движение почти незаметное: подъём ~0,6 px/с и медленное колыхание.
     Координаты — в пикселях фото в базе 2048×1344 (Повар/Любимка 4к.png — ровно 2×). */

  const canvas = document.querySelector("[data-steam]");
  const media = document.querySelector("[data-hero-media]");
  const TEX = window.MYATA_STEAM_TEXTURE;
  if (!canvas || !media) return;

  // сообщаем main.js, что первый кадр пара готов (или что пара не будет) —
  // фото и пар появляются одновременно, без «догоняющего» пара
  const announce = (ok) => media.dispatchEvent(new CustomEvent(ok ? "steam:ready" : "steam:none"));

  const gl = TEX && canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) { announce(false); return; }

  const SRC = { x: TEX.x + TEX.w / 2, y: TEX.y + TEX.h / 2 }; // центр родного пара
  // [x, y центра копии (px фото), масштаб, поворот°] и [зеркало, прозрачность, фаза, амплитуда колыхания px]
  const COPIES = [
    [SRC.x, SRC.y, 1.0, 0,    0, 0.50, 0.00, 4.0], // на месте: пар у живота гуще и «дышит»
    [1046, 850, 1.08, -4,     1, 0.38, 0.37, 5.5], // продолжение вверх по фартуку к груди
    [775, 880, 0.75, 8,       0, 0.28, 0.61, 5.0], // край левого рукава
    [1488, 880, 0.75, -8,     1, 0.24, 0.83, 5.0], // край правого рукава
  ];
  const N = COPIES.length;
  // зона, где вообще может быть пар (в пикселях фото) — остальное не рисуем
  const REGION = { x0: 600, y0: 620, x1: 1660, y1: 1160 };
  const PHOTO = { w: 2048, h: 1344, ox: 0, oy: 0 };

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec4 uBox;      // x, y, w, h слоя пара в пикселях фото
    uniform vec4 uA[${N}];  // центр, масштаб, поворот (рад)
    uniform vec4 uB[${N}];  // зеркало, прозрачность, фаза, амплитуда
    uniform float uGain;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    // родной пар в точке s (координаты макета, относительно центра источника)
    float steamAt(vec2 s) {
      vec2 uv = (s + vec2(uBox.x + uBox.z * 0.5, uBox.y + uBox.w * 0.5) - uBox.xy) / uBox.zw;
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
      return texture2D(uTex, uv).r / uGain;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      uv.y = 1.0 - uv.y;
      vec2 P = uv * vec2(${PHOTO.w}.0, ${PHOTO.h}.0) - vec2(${PHOTO.ox}.0, ${PHOTO.oy}.0);
      float t = uTime;

      float acc = 0.0;
      for (int i = 0; i < ${N}; i++) {
        vec4 a = uA[i];
        vec4 b = uB[i];
        vec2 d = P - a.xy;
        float c = cos(a.w), s = sin(a.w);
        vec2 v = vec2(c * d.x + s * d.y, -s * d.x + c * d.y) / a.z;
        if (b.x > 0.5) v.x = -v.x;

        // медленное колыхание: плавное смещение, сильнее у верхушки струй
        float top = clamp(0.5 - v.y / 150.0, 0.2, 1.0);
        vec2 sway = (vec2(noise(v * 0.013 + vec2(t * 0.035, b.z * 9.0)),
                          noise(v * 0.013 + vec2(5.2 - t * 0.03, b.z * 4.0))) - 0.5) * 2.0 * b.w * top;

        // почти незаметный подъём без накопления: две фазы с перекрёстным переходом
        float ph1 = fract(t / 14.0 + b.z);
        float ph2 = fract(ph1 + 0.5);
        float w1 = 1.0 - abs(ph1 * 2.0 - 1.0);
        float rise = 11.0;
        float st = steamAt(v + sway + vec2(0.0, ph1 * rise)) * w1
                 + steamAt(v + sway + vec2(0.0, ph2 * rise)) * (1.0 - w1);
        acc += st * b.y;
      }

      float alpha = clamp(acc, 0.0, 0.85);
      // цвет как у пара в кадре — почти белый, чуть тёплый
      gl_FragColor = vec4(vec3(0.98, 0.96, 0.93) * alpha, alpha);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("steam shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  let program, uRes, uTime;
  let texImage = null;

  function init() {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texImage);

    uRes = gl.getUniformLocation(program, "uRes");
    uTime = gl.getUniformLocation(program, "uTime");
    gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);
    gl.uniform1f(gl.getUniformLocation(program, "uGain"), TEX.gain);
    gl.uniform4f(gl.getUniformLocation(program, "uBox"), TEX.x, TEX.y, TEX.w, TEX.h);
    gl.uniform4fv(gl.getUniformLocation(program, "uA"), COPIES.flatMap((c) => [c[0], c[1], c[2], (c[3] * Math.PI) / 180]));
    gl.uniform4fv(gl.getUniformLocation(program, "uB"), COPIES.flatMap((c) => c.slice(4, 8)));
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.SCISSOR_TEST);
    return true;
  }

  // пар мягкий — рендерим с бюджетом пикселей, но не грубее 0,75 от экрана, чтобы сохранить зерно
  const PIXEL_BUDGET = 900000;

  function resize() {
    const cssW = media.clientWidth;
    const cssH = media.clientHeight;
    if (!cssW || !cssH) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, Math.max(0.75, Math.sqrt(PIXEL_BUDGET / (cssW * cssH))));
    const w = Math.max(1, Math.round(cssW * scale));
    const h = Math.max(1, Math.round(cssH * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);

    // ножницы: рисуем только прямоугольник вокруг шефа
    const sx = (REGION.x0 + PHOTO.ox) / PHOTO.w;
    const ex = (REGION.x1 + PHOTO.ox) / PHOTO.w;
    const sy = (REGION.y0 + PHOTO.oy) / PHOTO.h;
    const ey = (REGION.y1 + PHOTO.oy) / PHOTO.h;
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(Math.floor(sx * w), Math.floor((1 - ey) * h), Math.ceil((ex - sx) * w), Math.ceil((ey - sy) * h));
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FRAME_MS = 1000 / 30;
  let raf = 0;
  let last = 0;
  let visible = true;
  const start = performance.now();

  function draw(now) {
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME_MS * 0.92) return;
    last = now;
    draw(now);
  }

  function play() {
    if (raf || !visible || document.hidden) return;
    if (reduceMotion.matches) { draw(performance.now()); return; }
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function boot() {
    if (!init()) { announce(false); return; }
    resize();
    draw(performance.now());
    announce(true);

    media.addEventListener("media:resize", () => { resize(); draw(performance.now()); });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
    reduceMotion.addEventListener("change", () => { stop(); play(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? play() : stop();
      }).observe(canvas.closest(".hero") || canvas);
    } else {
      play();
    }

    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); });
    canvas.addEventListener("webglcontextrestored", () => { if (init()) { resize(); play(); } });
  }

  texImage = new Image();
  texImage.onload = boot;
  texImage.onerror = () => announce(false);
  texImage.src = TEX.src;
})();
