/**
 * PixelSwap.js — Vanilla ES module implementation of React Bits PixelSwap.
 *
 * Implements the full pixel-grid cover transition using the Web Animations API,
 * dynamic grid generation, easing functions, and hover/click/manual triggers.
 */

const MAX_PIXELS = 220;
const KEYFRAME_STEPS = 14;

const PATTERNS = {
  random: () => null,
  center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
  edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
  'left-to-right': x => x,
  'right-to-left': x => 1 - x,
  'top-to-bottom': (_x, y) => y,
  'bottom-to-top': (_x, y) => 1 - y,
  diagonal: (x, y) => (x + y) / 2,
  spiral: (x, y) => {
    const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
    const radius = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
    return (angle + radius) % 1;
  }
};

const EASINGS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1]
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const noise = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const makeEasing = value => {
  const match = /cubic-bezier\(([^)]+)\)/.exec(value);
  const points = match ? match[1].split(',').map(Number) : EASINGS[value];
  if (!points || points.length !== 4 || points.some(Number.isNaN)) return makeEasing('ease');

  const [x1, y1, x2, y2] = points;
  if (x1 === y1 && x2 === y2) return progress => progress;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  return progress => {
    let t = progress;
    for (let i = 0; i < 5; i += 1) {
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (!slope) break;
      t -= (((ax * t + bx) * t + cx) * t - progress) / slope;
    }
    t = clamp(t, 0, 1);
    return ((ay * t + by) * t + cy) * t;
  };
};

const coverScale = (size, gap, radius) => {
  const p = clamp(radius, 0, 50) / 100;
  const corner = Math.SQRT1_2 / (Math.SQRT2 * (0.5 - p) + p);
  return ((size + gap) / size) * Math.max(1, corner);
};

const buildGrid = ({ width, height, pixelSize, gap, pattern, randomness }) => {
  let size = pixelSize;
  let columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
  let rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));

  if (columns * rows > MAX_PIXELS) {
    size = Math.ceil(size * Math.sqrt((columns * rows) / MAX_PIXELS));
    columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
    rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));
  }

  const stride = size + gap;
  const originX = (width - (columns * stride - gap)) / 2;
  const originY = (height - (rows * stride - gap)) / 2;
  const order = PATTERNS[pattern] ?? PATTERNS.random;
  const mix = clamp(randomness, 0, 1);
  const pixels = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = columns <= 1 ? 0.5 : column / (columns - 1);
      const y = rows <= 1 ? 0.5 : row / (rows - 1);
      const base = order(x, y);
      const random = noise(index + 1);

      pixels.push({
        id: index,
        left: originX + column * stride,
        top: originY + row * stride,
        offset: base === null ? random : base * (1 - mix) + random * mix
      });
    }
  }

  return { pixels, size, gap, width, height };
};

const buildKeyframes = ({ ease, startScale, endScale, spin, fade }) => {
  const windowKeyframes = [];
  const contentKeyframes = [];

  for (let step = 0; step <= KEYFRAME_STEPS; step += 1) {
    const progress = step / KEYFRAME_STEPS;
    const eased = ease(progress);
    const scale = startScale + (endScale - startScale) * eased;
    const angle = spin * (1 - eased);

    windowKeyframes.push({
      offset: progress,
      opacity: fade ? Math.min(1, eased * 1.6) : 1,
      transform: `rotate(${angle}deg) scale(${scale})`
    });
    contentKeyframes.push({
      offset: progress,
      transform: `scale(${1 / scale}) rotate(${-angle}deg)`
    });
  }

  return { windowKeyframes, contentKeyframes };
};

export default class PixelSwap {
  constructor(target, options = {}) {
    this.container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.container) return;

    this.options = {
      firstContent: '',
      secondContent: '',
      pixelSize: 64,
      gap: 0,
      pixelRadius: 0,
      pixelSpin: 0,
      pixelScale: 0.35,
      fade: true,
      duration: 1400,
      pixelDuration: 450,
      pattern: 'random',
      randomness: 0,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      trigger: 'hover',
      initialActive: false,
      aspectRatio: '16 / 10',
      onActiveChange: undefined,
      onComplete: undefined,
      className: '',
      ...options
    };

    this.active = !!this.options.initialActive;
    this.transition = null;
    this.animations = [];
    this.timer = 0;
    this.box = { width: 0, height: 0 };
    this.pixelElements = [];

    this._setupDOM();
    this._attachEvents();
  }

  _setupDOM() {
    this.container.classList.add('pixel-swap');
    if (this.options.className) this.container.classList.add(this.options.className);
    if (this.options.aspectRatio) {
      this.container.style.aspectRatio = this.options.aspectRatio;
    }

    this.layer0 = document.createElement('div');
    this.layer0.className = 'pixel-swap__layer';
    this._insertContent(this.layer0, this.options.firstContent);

    this.layer1 = document.createElement('div');
    this.layer1.className = 'pixel-swap__layer';
    this._insertContent(this.layer1, this.options.secondContent);

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'pixel-swap__grid';
    this.gridContainer.setAttribute('aria-hidden', 'true');

    this.container.innerHTML = '';
    this.container.appendChild(this.layer0);
    this.container.appendChild(this.layer1);
    this.container.appendChild(this.gridContainer);

    this._updateLayerVisibility();
  }

  _insertContent(parent, content) {
    if (content instanceof HTMLElement) {
      parent.appendChild(content);
    } else if (typeof content === 'string') {
      parent.innerHTML = content;
    }
  }

  _updateLayerVisibility() {
    const isShown = this.active;
    this.layer0.dataset.visible = !isShown;
    this.layer0.style.zIndex = isShown ? '1' : '2';
    this.layer0.setAttribute('aria-hidden', isShown ? 'true' : 'false');

    this.layer1.dataset.visible = isShown;
    this.layer1.style.zIndex = isShown ? '2' : '1';
    this.layer1.setAttribute('aria-hidden', isShown ? 'false' : 'true');

    this.container.dataset.active = isShown;
  }

  _measure() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.box = { width, height };
  }

  _attachEvents() {
    this._measure();
    this.resizeObserver = new ResizeObserver(() => this._measure());
    this.resizeObserver.observe(this.container);

    if (this.options.trigger === 'hover') {
      this.container.tabIndex = 0;
      this.container.addEventListener('mouseenter', () => this.setActive(true));
      this.container.addEventListener('mouseleave', () => this.setActive(false));
      this.container.addEventListener('focus', () => this.setActive(true));
      this.container.addEventListener('blur', () => this.setActive(false));
    } else if (this.options.trigger === 'click') {
      this.container.setAttribute('role', 'button');
      this.container.tabIndex = 0;
      this.container.addEventListener('click', () => this.setActive(!this.active));
      this.container.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.setActive(!this.active);
        }
      });
    }
  }

  setActive(nextActive) {
    if (this.active === nextActive && !this.transition) return;
    this.active = nextActive;
    if (typeof this.options.onActiveChange === 'function') {
      this.options.onActiveChange(this.active);
    }
    this._startTransition(this.active);
  }

  _stopAnimations() {
    this.animations.forEach(a => a.cancel());
    this.animations = [];
    this.pixelElements.forEach(p => p.replaceChildren());
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = 0;
    }
    this.gridContainer.innerHTML = '';
  }

  _startTransition(to) {
    this._stopAnimations();
    this._measure();

    const grid = buildGrid({
      width: this.box.width,
      height: this.box.height,
      pixelSize: Math.max(8, Math.round(this.options.pixelSize)),
      gap: Math.max(0, Math.round(this.options.gap)),
      pattern: this.options.pattern,
      randomness: this.options.randomness
    });

    const source = to ? this.layer1 : this.layer0;
    const incomingIndex = to ? 1 : 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!source || !grid.pixels.length || reducedMotion) {
      this._updateLayerVisibility();
      if (typeof this.options.onComplete === 'function') {
        this.options.onComplete(to);
      }
      return;
    }

    const total = Math.max(200, this.options.duration);
    const pixelMs = clamp(this.options.pixelDuration, 60, total);
    const spread = Math.max(0, total - pixelMs);
    const endScale = coverScale(grid.size, grid.gap, this.options.pixelRadius);
    const keyframes = buildKeyframes({
      ease: makeEasing(this.options.easing),
      startScale: clamp(this.options.pixelScale, 0.05, 1) * endScale,
      endScale,
      spin: this.options.pixelSpin,
      fade: this.options.fade
    });

    this.container.dataset.transitioning = 'true';
    this.pixelElements = [];

    grid.pixels.forEach((pixel, index) => {
      const pixelEl = document.createElement('div');
      pixelEl.className = 'pixel-swap__pixel';
      pixelEl.style.left = `${pixel.left}px`;
      pixelEl.style.top = `${pixel.top}px`;
      pixelEl.style.width = `${grid.size}px`;
      pixelEl.style.height = `${grid.size}px`;
      pixelEl.style.borderRadius = `${clamp(this.options.pixelRadius, 0, 50)}%`;

      const content = document.createElement('div');
      content.className = 'pixel-swap__pixel-content';
      content.style.left = `${-pixel.left}px`;
      content.style.top = `${-pixel.top}px`;
      content.style.width = `${grid.width}px`;
      content.style.height = `${grid.height}px`;

      const originX = pixel.left + grid.size / 2;
      const originY = pixel.top + grid.size / 2;
      content.style.transformOrigin = `${originX}px ${originY}px`;

      const clone = source.cloneNode(true);
      clone.dataset.visible = 'true';
      clone.removeAttribute('aria-hidden');
      content.appendChild(clone);
      pixelEl.appendChild(content);
      this.gridContainer.appendChild(pixelEl);
      this.pixelElements.push(pixelEl);

      const timing = {
        duration: pixelMs,
        delay: pixel.offset * spread,
        easing: 'linear',
        fill: 'both'
      };

      this.animations.push(
        pixelEl.animate(keyframes.windowKeyframes, timing),
        content.animate(keyframes.contentKeyframes, timing)
      );
    });

    this.timer = window.setTimeout(() => {
      this._stopAnimations();
      this._updateLayerVisibility();
      this.container.dataset.transitioning = 'false';
      if (typeof this.options.onComplete === 'function') {
        this.options.onComplete(to);
      }
    }, total);
  }

  destroy() {
    this._stopAnimations();
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }
}
