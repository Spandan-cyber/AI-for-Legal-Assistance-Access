/**
 * MoltenMetal.js — Vanilla ES module implementation of React Bits MoltenMetal.
 *
 * WebGL-based liquid caustic shader using domain-folding warp iterations,
 * grain overlay, mouse drift physics, and high-performance OGL pipeline.
 */

import { Renderer, Program, Mesh, Triangle } from 'ogl';

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const colorModeToFloat = mode => (mode === 'ember' ? 1 : mode === 'frost' ? 2 : 0);

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uCoreSize;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uColorMode;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform bool uEnableMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBackgroundColor;
uniform bool uLightMode;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float time = iTime * uSpeed;
  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;

  vec2 drift = vec2(0.0);
  if (uEnableMouse) {
    drift = (uMouse - 0.5) * uMouseStrength * 2.0;
  }
  p += drift;

  vec2 i = p;
  float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;

  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float glowCore = uGlow * uCoreSize;

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= uDetail) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }

  c /= 6.0;

  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;

  float g = clamp(intensity, 0.0, 1.0);

  float mid = 0.5;
  if (uColorMode > 1.5) {
    mid = 0.65;
  } else if (uColorMode > 0.5) {
    mid = 0.35;
  }

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, mid, g));
  col = mix(col, uColor3, smoothstep(mid, 1.0, g));

  float a = g;
  if (uGrain > 0.5) {
    float gr = hash(gl_FragCoord.xy + iTime);
    a += (gr - 0.5) * uGrainIntensity;
  }
  a = clamp(a, 0.0, 1.0) * uOpacity;
  if (uLightMode) {
    float signal = 1.0 - exp(-max(c, 0.0) * 6.5);
    float body = smoothstep(0.075, 0.68, signal);
    float ridge = smoothstep(0.42, 0.92, signal);

    vec3 lightCol = mix(uColor1, uColor2, smoothstep(0.08, 0.52, signal));
    lightCol = mix(lightCol, uColor3, smoothstep(0.52, 0.96, signal));
    lightCol = mix(lightCol, lightCol * 0.72, ridge * 0.24);

    float coverage = body * mix(0.2, 0.86, signal) * uOpacity;
    if (uGrain > 0.5) {
      float gr = hash(gl_FragCoord.xy + iTime);
      coverage += (gr - 0.5) * uGrainIntensity * body * 0.16;
    }
    fragColor = vec4(mix(uBackgroundColor, lightCol, clamp(coverage, 0.0, 0.92)), 1.0);
  } else {
    fragColor = vec4(col * a, a);
  }
}
`;

export default class MoltenMetal {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = {
      color1: options.color1 || '#18122B',
      color2: options.color2 || '#E5B54F',
      color3: options.color3 || '#FFFFFF',
      speed: options.speed ?? 0.35,
      scale: options.scale ?? 4,
      detail: options.detail ?? 3,
      glow: options.glow ?? 1.6,
      coreSize: options.coreSize ?? 0.1,
      swirl: options.swirl ?? 1,
      fold: options.fold ?? -0.2,
      blackPoint: options.blackPoint ?? 0.05,
      brightness: options.brightness ?? 1.3,
      colorMode: options.colorMode || 'molten',
      grain: options.grain ?? true,
      grainIntensity: options.grainIntensity ?? 0.05,
      mouseInteraction: options.mouseInteraction ?? true,
      mouseStrength: options.mouseStrength ?? 0.3,
      opacity: options.opacity ?? 1.0,
      backgroundColor: options.backgroundColor || '#080C18',
      lightMode: options.lightMode ?? false,
      className: options.className || ''
    };

    this.raf = 0;
    this.isVisible = true;
    this.isPageVisible = !document.hidden;

    this.init();
  }

  init() {
    this.container.classList.add('molten-metal-container');
    if (this.options.className) {
      this.options.className.split(' ').forEach(c => c && this.container.classList.add(c));
    }

    this.renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5)
    });

    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    this.canvas = gl.canvas;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);

    const geometry = new Triangle(gl);
    this.program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: this.options.speed },
        uScale: { value: this.options.scale },
        uDetail: { value: this.options.detail },
        uGlow: { value: this.options.glow },
        uCoreSize: { value: Math.max(this.options.coreSize, 0.001) },
        uSwirl: { value: this.options.swirl },
        uFold: { value: this.options.fold },
        uBlackPoint: { value: this.options.blackPoint },
        uBrightness: { value: this.options.brightness },
        uColorMode: { value: colorModeToFloat(this.options.colorMode) },
        uGrain: { value: this.options.grain ? 1 : 0 },
        uGrainIntensity: { value: this.options.grainIntensity },
        uOpacity: { value: this.options.opacity },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: this.options.mouseStrength },
        uEnableMouse: { value: this.options.mouseInteraction },
        uColor1: { value: new Float32Array(hexToRgb(this.options.color1)) },
        uColor2: { value: new Float32Array(hexToRgb(this.options.color2)) },
        uColor3: { value: new Float32Array(hexToRgb(this.options.color3)) },
        uBackgroundColor: { value: new Float32Array(hexToRgb(this.options.backgroundColor)) },
        uLightMode: { value: this.options.lightMode }
      }
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });

    this.setSize = () => {
      const rect = this.container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      this.renderer.setSize(w, h);
      const res = this.program.uniforms.iResolution.value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      this.renderer.render({ scene: this.mesh });
    };

    this.ro = new ResizeObserver(this.setSize);
    this.ro.observe(this.container);
    this.setSize();

    this.targetMouse = [0.5, 0.5];
    this.currentMouse = [0.5, 0.5];

    this.handleMouseMove = e => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetMouse[0] = (e.clientX - rect.left) / rect.width;
      this.targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    this.handleMouseLeave = () => {
      this.targetMouse[0] = 0.5;
      this.targetMouse[1] = 0.5;
    };

    // If mouseInteraction is enabled, listen globally so cursor drifts anywhere on screen
    window.addEventListener('mousemove', this.handleMouseMove);

    this.t0 = performance.now();

    this.loop = t => {
      this.program.uniforms.iTime.value = (t - this.t0) * 0.001;
      this.currentMouse[0] += 0.05 * (this.targetMouse[0] - this.currentMouse[0]);
      this.currentMouse[1] += 0.05 * (this.targetMouse[1] - this.currentMouse[1]);
      this.program.uniforms.uMouse.value[0] = this.currentMouse[0];
      this.program.uniforms.uMouse.value[1] = this.currentMouse[1];
      this.renderer.render({ scene: this.mesh });
      this.raf = requestAnimationFrame(this.loop);
    };

    this.tryStart = () => {
      if (this.isVisible && this.isPageVisible && this.raf === 0) {
        this.raf = requestAnimationFrame(this.loop);
      }
    };

    this.tryStop = () => {
      if (this.raf !== 0) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      }
    };

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
        this.isVisible ? this.tryStart() : this.tryStop();
      },
      { threshold: 0 }
    );
    this.io.observe(this.container);

    this.onVisibility = () => {
      this.isPageVisible = !document.hidden;
      this.isPageVisible ? this.tryStart() : this.tryStop();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.tryStart();
  }

  destroy() {
    this.tryStop();
    this.ro?.disconnect();
    this.io?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('mousemove', this.handleMouseMove);
    if (this.canvas?.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
    this.renderer?.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
