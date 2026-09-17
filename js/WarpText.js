/**
 * WarpText.js — Vanilla JS port of the React Bits WarpText component.
 *
 * Preserves 100% of the original WebGL shader logic, OGL internals,
 * pointer tracking, IntersectionObserver, and ResizeObserver behaviour.
 * All React-specific code (useEffect, useRef, JSX) has been replaced
 * with an ES-module class that attaches to any container element.
 *
 * Usage:
 *   import WarpText from './js/WarpText.js';
 *
 *   const wt = new WarpText(document.querySelector('#my-container'), {
 *     text: 'Judgeman',
 *     color: '#f8f5ff',
 *     warpStrength: 0.08,
 *     warpScale: 1.7,
 *     speed: 0.55,
 *     pointerInfluence: 0.42,
 *     pointerStrength: 0.38,
 *     refraction: 0.018,
 *     ripple: true,
 *     fontSize: 'clamp(3rem, 10vw, 9rem)',
 *     fontWeight: 800,
 *   });
 *
 *   // To tear down cleanly:
 *   wt.destroy();
 *
 * Dependencies: ogl (npm install ogl)
 */

import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';

/* ── GLSL Shaders (identical to the React Bits source) ───── */

const vertex = /* glsl */`#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

/* ── Helpers (identical logic to React Bits source) ─────── */

const getFontValue = v => (typeof v === 'number' ? `${v}px` : v);

const measureLine = (ctx, line, letterSpacing) => {
  const chars = Array.from(line);
  return chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0)
    + Math.max(0, chars.length - 1) * letterSpacing;
};

const drawLine = (ctx, line, x, y, letterSpacing) => {
  const chars = Array.from(line);
  let cursor = x - measureLine(ctx, line, letterSpacing) / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + (i === chars.length - 1 ? 0 : letterSpacing);
  });
};

const buildTextCanvas = ({ container, width, height, dpr, props }) => {
  const canvas = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.floor(width  * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Probe computed styles from a hidden DOM element so CSS variables resolve
  const probe = document.createElement('span');
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position:      'absolute',
    visibility:    'hidden',
    pointerEvents: 'none',
    whiteSpace:    'pre',
    inset:         '0 auto auto 0',
    fontFamily:    props.fontFamily,
    fontSize:      getFontValue(props.fontSize),
    fontWeight:    String(props.fontWeight),
    letterSpacing: getFontValue(props.letterSpacing),
    lineHeight:    typeof props.lineHeight === 'number'
                     ? String(props.lineHeight)
                     : props.lineHeight,
  });
  container.appendChild(probe);
  const computed      = window.getComputedStyle(probe);
  let fontSizePx      = parseFloat(computed.fontSize) || 96;
  const fontFamily    = computed.fontFamily || 'sans-serif';
  const fontWeight    = computed.fontWeight || String(props.fontWeight);
  let letterSpacing   = computed.letterSpacing === 'normal'
                          ? 0
                          : parseFloat(computed.letterSpacing) || 0;
  let lineHeight      = parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    lineHeight = fontSizePx * (typeof props.lineHeight === 'number' ? props.lineHeight : 0.92);
  }
  probe.remove();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign            = 'left';
  ctx.textBaseline         = 'middle';
  ctx.fillStyle            = props.color;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const lines = String(props.text || '').split('\n');
  const applyFont = () => { ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`; };
  applyFont();

  const maxWidth   = width  * 0.86;
  const maxHeight  = height * 0.78;
  const widest     = Math.max(...lines.map(l => measureLine(ctx, l, letterSpacing)), 1);
  const blockHeight = Math.max(lineHeight * lines.length, 1);
  const fit        = Math.min(1, maxWidth / widest, maxHeight / blockHeight);

  if (fit < 1) {
    fontSizePx    *= fit;
    letterSpacing *= fit;
    lineHeight    *= fit;
    applyFont();
  }

  const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, i) =>
    drawLine(ctx, line, width / 2, startY + i * lineHeight, letterSpacing));

  return canvas;
};

const syncUniforms = (program, props) => {
  const u = program.uniforms;
  u.uWarpStrength.value    = props.warpStrength;
  u.uWarpScale.value       = props.warpScale;
  u.uSpeed.value           = props.speed;
  u.uPointerInfluence.value = props.pointerInfluence;
  u.uPointerStrength.value = props.pointerStrength;
  u.uRefraction.value      = props.refraction;
  u.uRipple.value          = props.ripple ? 1 : 0;
};

/* ── Default prop values ────────────────────────────────── */
const DEFAULTS = {
  text:             'Bend the moment',
  color:            '#f8f5ff',
  warpStrength:     0.08,
  warpScale:        1.7,
  speed:            0.55,
  pointerInfluence: 0.42,
  pointerStrength:  0.38,
  refraction:       0.018,
  ripple:           true,
  fontSize:         'clamp(3rem, 10vw, 9rem)',
  fontWeight:       800,
  fontFamily:       'inherit',
  letterSpacing:    '-0.06em',
  lineHeight:       0.9,
  className:        '',
  style:            undefined,
};

/* ── WarpText Class ─────────────────────────────────────── */

export default class WarpText {
  /**
   * @param {HTMLElement} container  — element to mount the WebGL canvas into.
   * @param {object}      [options]  — prop overrides (see DEFAULTS above).
   */
  constructor(container, options = {}) {
    if (!container || typeof window === 'undefined') return;

    this._container = container;
    this._props = { ...DEFAULTS, ...options };
    this._disposed = false;
    this._contextLost = false;
    this._visible = true;
    this._pageVisible = !document.hidden;
    this._reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this._rasterVersion = 0;
    this._raf = 0;

    this._pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    this._startTime = performance.now();

    // Add CSS class
    container.classList.add('warp-text');
    if (this._props.className) container.classList.add(this._props.className);
    if (this._props.style) Object.assign(container.style, this._props.style);
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', this._props.text);

    this._init();
  }

  _init() {
    const container = this._container;

    /* ── WebGL setup ──────────────────────────────────── */
    let renderer, gl;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      gl = renderer.gl;
    } catch (err) {
      console.warn('WarpText: WebGL could not be initialised.', err);
      return;
    }

    this._renderer = renderer;
    this._gl = gl;

    gl.clearColor(0, 0, 0, 0);

    const canvas = gl.canvas;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    /* ── Texture ──────────────────────────────────────── */
    this._texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    /* ── Geometry + Program ───────────────────────────── */
    this._geometry = new Triangle(gl);
    this._program  = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
      uniforms: {
        uTextTexture:     { value: this._texture },
        uResolution:      { value: new Float32Array([1, 1]) },
        uPointer:         { value: new Float32Array([0.5, 0.5]) },
        uPointerActive:   { value: 0 },
        uTime:            { value: 0 },
        uWarpStrength:    { value: this._props.warpStrength },
        uWarpScale:       { value: this._props.warpScale },
        uSpeed:           { value: this._props.speed },
        uPointerInfluence:{ value: this._props.pointerInfluence },
        uPointerStrength: { value: this._props.pointerStrength },
        uRefraction:      { value: this._props.refraction },
        uRipple:          { value: this._props.ripple ? 1 : 0 },
        uMotion:          { value: this._reduceMotion ? 0 : 1 },
      },
    });
    this._mesh = new Mesh(gl, { geometry: this._geometry, program: this._program });

    /* ── Bound handlers (so removeEventListener works) ── */
    this._onPointerMove  = this._handlePointerMove.bind(this);
    this._onPointerLeave = this._handlePointerLeave.bind(this);
    this._onContextLost  = this._handleContextLost.bind(this);
    this._onVisibility   = this._handleVisibility.bind(this);
    this._onReducedMotion = e => {
      this._reduceMotion = e.matches;
      this._program.uniforms.uMotion.value = this._reduceMotion ? 0 : 1;
      this._renderOnce();
    };

    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerleave', this._onPointerLeave);
    canvas.addEventListener('webglcontextlost', this._onContextLost, false);
    document.addEventListener('visibilitychange', this._onVisibility);

    this._mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this._mediaQuery?.addEventListener('change', this._onReducedMotion);

    /* ── ResizeObserver ───────────────────────────────── */
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(container);

    /* ── IntersectionObserver ─────────────────────────── */
    this._intersectionObserver = new IntersectionObserver(([entry]) => {
      this._visible = entry.isIntersecting;
      if (this._visible && this._pageVisible && !this._raf) {
        this._raf = requestAnimationFrame(ts => this._loop(ts));
      }
      if (!this._visible && this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = 0;
      }
    }, { threshold: 0 });
    this._intersectionObserver.observe(container);

    /* ── Kick off ─────────────────────────────────────── */
    syncUniforms(this._program, this._props);
    this._resize();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  /* ── Render ─────────────────────────────────────────── */
  _renderOnce() {
    if (this._disposed || this._contextLost) return;
    this._renderer.render({ scene: this._mesh });
  }

  /* ── Rasterise text into WebGL texture ──────────────── */
  async _rasterize() {
    const version = ++this._rasterVersion;

    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch (_) { /* ignore */ }
    }
    if (this._disposed || this._contextLost || version !== this._rasterVersion) return;

    const rect = this._container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const textCanvas = buildTextCanvas({
      container: this._container,
      width:     rect.width,
      height:    rect.height,
      dpr,
      props:     this._props,
    });
    this._texture.image = textCanvas;
    this._texture.needsUpdate = true;
    this._renderOnce();
  }

  /* ── Resize handler ─────────────────────────────────── */
  _resize() {
    if (this._disposed || this._contextLost) return;
    const rect = this._container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    this._renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._renderer.setSize(rect.width, rect.height);
    const gl = this._gl;
    this._program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
    this._program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
    this._rasterize();
  }

  /* ── Animation loop ─────────────────────────────────── */
  _loop(now) {
    if (this._disposed || this._contextLost) return;

    const elapsed = (now - this._startTime) * 0.001;
    const p = this._pointer;

    const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
    const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.10;
    const targetX = p.activeTarget > 0 ? p.tx : idleX;
    const targetY = p.activeTarget > 0 ? p.ty : idleY;
    const damping  = p.activeTarget > 0 ? 0.12 : 0.035;

    p.x += (targetX - p.x) * damping;
    p.y += (targetY - p.y) * damping;
    p.active += ((p.activeTarget > 0 ? 1 : 0.18) - p.active) * 0.06;

    const u = this._program.uniforms;
    u.uPointer.value[0]    = p.x;
    u.uPointer.value[1]    = p.y;
    u.uPointerActive.value = this._reduceMotion ? p.active * 0.35 : p.active;
    u.uTime.value          = this._reduceMotion ? 0 : elapsed;

    this._renderOnce();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  /* ── Event handlers ─────────────────────────────────── */
  _handlePointerMove(event) {
    if (event.pointerType === 'touch') return;
    const rect = this._gl.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this._pointer.tx = (event.clientX - rect.left) / rect.width;
    this._pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
    this._pointer.activeTarget = 1;
  }

  _handlePointerLeave() { this._pointer.activeTarget = 0; }

  _handleContextLost(event) {
    event.preventDefault();
    this._contextLost = true;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
  }

  _handleVisibility() {
    this._pageVisible = !document.hidden;
    if (this._pageVisible && this._visible && !this._raf) {
      this._raf = requestAnimationFrame(ts => this._loop(ts));
    }
    if (!this._pageVisible && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  /* ── Public API ─────────────────────────────────────── */

  /**
   * Update any prop at runtime and re-rasterise the text texture.
   * @param {object} newProps — partial props to merge.
   */
  update(newProps = {}) {
    Object.assign(this._props, newProps);
    if (this._program) syncUniforms(this._program, this._props);
    this._rasterize();
    if (newProps.text !== undefined) {
      this._container.setAttribute('aria-label', this._props.text);
    }
  }

  /** Tear down WebGL context, observers, and event listeners. */
  destroy() {
    this._disposed = true;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    this._resizeObserver?.disconnect();
    this._intersectionObserver?.disconnect();

    const canvas = this._gl?.canvas;
    if (canvas) {
      canvas.removeEventListener('pointermove', this._onPointerMove);
      canvas.removeEventListener('pointerleave', this._onPointerLeave);
      canvas.removeEventListener('webglcontextlost', this._onContextLost);
    }
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._mediaQuery?.removeEventListener('change', this._onReducedMotion);

    if (!this._contextLost && this._gl) {
      try {
        if (this._texture?.texture) this._gl.deleteTexture(this._texture.texture);
        this._geometry?.remove?.();
        this._program?.remove?.();
        this._gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch (_) { /* ignore */ }
    }

    if (canvas?.parentNode === this._container) this._container.removeChild(canvas);
  }
}
