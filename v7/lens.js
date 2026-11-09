/* МЯТА v7 — фон за формой дегустации: переливающиеся световые ленты (WebGL2) и «мозаичная линза» под курсором.
   Поле лент считается в половинном разрешении, затем второй проход собирает мозаику: крупные плитки,
   которые под курсором кольцами проясняются до гладкой картинки.
   Цвета — мята, изумруд и тёплый терракотовый отблеск (константы C1…C3 ниже).
   Вне экрана не рисует; при «уменьшить движение» — один неподвижный кадр; без WebGL2 остаются CSS-пятна. */
(() => {
  "use strict";
  const box = document.querySelector(".tst__right");
  if (!box) return;
  const canvas = document.createElement("canvas");
  canvas.className = "tst-lens";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  if (!gl) return;

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const BG = hex("#0f1513");  // фон блока, как у пятен
  const C1 = hex("#2c9f79");  // мята
  const C2 = hex("#0d5444");  // изумруд
  const C3 = hex("#a24f3e");  // тёплый отблеск (из присланного примера, приглушён)
  const LAYERS = 74, GAIN = 0.4, TIERS = 4;
  const TILE = 10, REACH = 280, HOVER = 0.88, SIZE = 1.53;

  const VERT = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }`;

  const FIELD = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uSize;
out vec4 o;
const float LAYERS = ${LAYERS.toFixed(1)};
const float GAIN = ${GAIN.toFixed(3)};
const vec2 CENTRE = vec2(-0.25, -0.56);
const float TILT = -2.2; const float ZOOM = 1.05; const float THETA = 2.12; const float SHEAR = 0.956; const float SHRINK = 0.949;
const vec2 WARP_FREQ = vec2(0.58, 2.8); const vec2 WARP_AMP = vec2(0.16, 0.034); const vec2 ASPECT = vec2(1.65, 0.22);
const float OFFSET = 0.31; const float GLOW = 0.0021; const float SOFT = 0.0019; const float FALLOFF = 0.37;
const float PHASE = 64.0; const float CYCLE = 0.16; const float HUE_TRAVEL = 2.0;
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
void main() {
  vec2 R = uRes;
  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y / uSize;
  float t = uTime * 0.49 + PHASE;
  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;
  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));
  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));
  vec3 col = vec3(0.0);
  for (float i = 1.0; i <= LAYERS; i += 1.0) {
    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;
    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;
    u = fold * u * SHRINK;
    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;
    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);
    float r = length(u);
    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
    // мята ↔ изумруд, тёплый отблеск — только на гребнях переливов
    vec3 c = mix(uC2, uC1, k);
    c = mix(c, uC3, smoothstep(0.72, 1.0, sin(i * 0.11 - t * 0.7 + r * 1.4) * 0.5 + 0.5) * 0.75);
    col += g * c * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);
  }
  vec3 x = max(col * GAIN, 0.0);
  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));
  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;
  o = vec4(col, 1.0);
}`;

  const FINISH = `#version 300 es
precision highp float;
uniform sampler2D uField; uniform vec2 uRes; uniform float uTime; uniform vec3 uBg;
uniform vec2 uMouse; uniform float uOn; uniform float uReach; uniform float uTile;
out vec4 o;
const float TIERS = ${TIERS.toFixed(1)};
float ign(vec2 p, float f) { p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
vec3 scene(vec2 uv) { return texture(uField, clamp(uv, 0.0, 1.0)).rgb; }
vec3 mosaic(vec2 frag, vec2 uv) {
  float base = uTile; float tier = 0.0;
  if (uOn > 1e-4) {
    vec2 cc = (floor(frag / base) + 0.5) * base;
    vec2 d = (cc - uMouse) / uReach;
    float w = uOn * exp(-dot(d, d));
    tier = floor(min(w * (TIERS + 1.0), TIERS));
  }
  if (tier >= TIERS) return scene(uv);
  float cell = base / exp2(tier);
  vec2 c = (floor(frag / cell) + 0.5) * cell;
  vec3 s = scene((c + cell * vec2(-0.25, -0.25)) / uRes) + scene((c + cell * vec2(0.25, -0.25)) / uRes)
         + scene((c + cell * vec2(-0.25, 0.25)) / uRes) + scene((c + cell * vec2(0.25, 0.25)) / uRes);
  return s * 0.25;
}
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec3 L = max(mosaic(frag, frag / uRes), 0.0);
  vec3 col = uBg + L * (1.0 - uBg);
  col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function link(frag) {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error("lens shader:", gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error("lens link:", gl.getProgramInfoLog(p)); return null; }
    return p;
  }
  const field = link(FIELD), finish = link(FINISH);
  if (!field || !finish) return;
  const loc = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const uf = loc(field, ["uRes", "uTime", "uC1", "uC2", "uC3", "uSize"]);
  const un = loc(finish, ["uField", "uRes", "uTime", "uBg", "uMouse", "uOn", "uReach", "uTile"]);
  gl.bindVertexArray(gl.createVertexArray());

  // цель первого прохода — половинное разрешение, half float, если умеет видеокарта (без полос в градиентах)
  const fbo = gl.createFramebuffer();
  let tex = null, fw = 0, fh = 0, half = !!gl.getExtension("EXT_color_buffer_float");
  function resizeField(w, h) {
    if (w === fw && h === fh && tex) return;
    for (let a = 0; a < 2; a++) {
      if (tex) gl.deleteTexture(tex);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (ok || !half) break;
      half = false;
    }
    fw = w; fh = h;
  }

  box.prepend(canvas);
  box.classList.add("has-lens");

  // курсор: координаты относительно блока, присутствие плавно появляется и гаснет
  const ptr = { x: 0, y: 0, inside: false };
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) {
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.inside = true;
      wake();
    }, { passive: true });
    box.addEventListener("pointerleave", () => { ptr.inside = false; });
  }

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 767px)").matches;
  const MAX_DPR = phone ? 1 : 1.5;
  let mx = 0, my = 0, on = 0, clock = 0, last = -1, raf = 0, visible = false;

  function frame(now) {
    raf = 0;
    const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!still) clock = (clock + dt) % 3600;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    const bw = Math.max(1, Math.round(cw * dpr)), bh = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    resizeField(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));

    const present = ptr.inside ? 1 : 0;
    if (present && on < 0.02) { mx = ptr.x; my = ptr.y; }
    on += (present - on) * (1 - Math.exp(-dt * 5));
    const k = 1 - Math.exp(-dt * 16);
    mx += (ptr.x - mx) * k; my += (ptr.y - my) * k;
    const sx = bw / cw, sy = bh / ch;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, fw, fh);
    gl.useProgram(field);
    gl.uniform2f(uf.uRes, fw, fh);
    gl.uniform1f(uf.uTime, clock);
    gl.uniform3fv(uf.uC1, C1); gl.uniform3fv(uf.uC2, C2); gl.uniform3fv(uf.uC3, C3);
    gl.uniform1f(uf.uSize, SIZE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, bw, bh);
    gl.useProgram(finish);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(un.uField, 0);
    gl.uniform2f(un.uRes, bw, bh);
    gl.uniform1f(un.uTime, clock);
    gl.uniform3fv(un.uBg, BG);
    gl.uniform2f(un.uMouse, mx * sx, bh - my * sy);
    gl.uniform1f(un.uOn, on * HOVER);
    gl.uniform1f(un.uReach, REACH * sy);
    gl.uniform1f(un.uTile, Math.max(1, Math.round(TILE * dpr)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!canvas.classList.contains("is-on")) canvas.classList.add("is-on");
    // при «уменьшить движение» крутим кадры только пока гаснет/появляется линза
    const busy = !still || Math.abs(present - on) > 0.01 || Math.abs(ptr.x - mx) + Math.abs(ptr.y - my) > 0.5;
    if (visible && busy) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && visible) { last = -1; raf = requestAnimationFrame(frame); } }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) wake();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: "100px 0px" }).observe(box);
})();
