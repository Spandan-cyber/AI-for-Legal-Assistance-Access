/**
 * BorderGlow.js — Vanilla ES module implementation of React Bits BorderGlow.
 *
 * Dynamically computes proximity to element boundaries and cursor angle to render
 * a directional glowing edge with multi-stop radial gradients, conic gradient masks,
 * and high-fidelity multi-tier box-shadow bloom.
 */

function parseHSL(hslStr) {
  const match = String(hslStr).match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function isLightColor(color) {
  const value = String(color).trim().replace('#', '');
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(value)) return false;
  const hex = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 180;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x) { return x * x * x; }

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
  const t0 = performance.now() + delay;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  setTimeout(() => requestAnimationFrame(tick), delay);
}

export default class BorderGlow {
  constructor(element, options = {}) {
    this.card = typeof element === 'string' ? document.querySelector(element) : element;
    if (!this.card) return;

    this.options = {
      edgeSensitivity: options.edgeSensitivity ?? 30,
      glowColor: options.glowColor ?? '40 80 80',
      backgroundColor: options.backgroundColor ?? '#120F17',
      borderRadius: options.borderRadius ?? 28,
      glowRadius: options.glowRadius ?? 40,
      glowIntensity: options.glowIntensity ?? 1.0,
      coneSpread: options.coneSpread ?? 25,
      animated: options.animated ?? false,
      colors: options.colors ?? ['#c084fc', '#f472b6', '#38bdf8'],
      fillOpacity: options.fillOpacity ?? 0.5,
      className: options.className ?? ''
    };

    this.init();
  }

  init() {
    const {
      edgeSensitivity,
      glowColor,
      backgroundColor,
      borderRadius,
      glowRadius,
      glowIntensity,
      coneSpread,
      animated,
      colors,
      fillOpacity,
      className
    } = this.options;

    // Apply class names
    this.card.classList.add('border-glow-card');
    if (isLightColor(backgroundColor)) {
      this.card.classList.add('border-glow-card--light');
    }
    if (className) {
      className.split(' ').forEach(c => c && this.card.classList.add(c));
    }

    // Ensure edge-light span exists
    if (!this.card.querySelector(':scope > .edge-light')) {
      const edgeSpan = document.createElement('span');
      edgeSpan.className = 'edge-light';
      this.card.prepend(edgeSpan);
    }

    // Set CSS properties
    this.card.style.setProperty('--card-bg', backgroundColor);
    this.card.style.setProperty('--edge-sensitivity', edgeSensitivity);
    this.card.style.setProperty('--border-radius', `${borderRadius}px`);
    this.card.style.setProperty('--glow-padding', `${glowRadius}px`);
    this.card.style.setProperty('--cone-spread', coneSpread);
    this.card.style.setProperty('--fill-opacity', fillOpacity);

    const glowVars = buildGlowVars(glowColor, glowIntensity);
    Object.entries(glowVars).forEach(([k, v]) => this.card.style.setProperty(k, v));

    const gradientVars = buildGradientVars(colors);
    Object.entries(gradientVars).forEach(([k, v]) => this.card.style.setProperty(k, v));

    // Pointer move listener
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.card.addEventListener('pointermove', this.onPointerMove);

    // Initial sweep animation if enabled
    if (animated) {
      this.playSweepAnimation();
    }
  }

  getCenterOfElement() {
    const { width, height } = this.card.getBoundingClientRect();
    return [width / 2, height / 2];
  }

  getEdgeProximity(x, y) {
    const [cx, cy] = this.getCenterOfElement();
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }

  getCursorAngle(x, y) {
    const [cx, cy] = this.getCenterOfElement();
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }

  handlePointerMove(e) {
    const rect = this.card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const edge = this.getEdgeProximity(x, y);
    const angle = this.getCursorAngle(x, y);

    this.card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    this.card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }

  playSweepAnimation() {
    const angleStart = 110;
    const angleEnd = 465;
    this.card.classList.add('sweep-active');
    this.card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animateValue({ duration: 500, onUpdate: v => this.card.style.setProperty('--edge-proximity', v) });
    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
      this.card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }});
    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
      this.card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }});
    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => this.card.style.setProperty('--edge-proximity', v),
      onEnd: () => this.card.classList.remove('sweep-active'),
    });
  }

  destroy() {
    if (this.onPointerMove) {
      this.card.removeEventListener('pointermove', this.onPointerMove);
    }
  }
}

/**
 * Convenience helper to initialize BorderGlow on multiple elements matching a selector.
 */
export function initBorderGlow(selector = '.border-glow-target', options = {}) {
  const elements = document.querySelectorAll(selector);
  return Array.from(elements).map(el => new BorderGlow(el, options));
}
