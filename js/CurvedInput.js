/**
 * CurvedInput.js — Vanilla ES module implementation of React Bits CurvedInput.
 *
 * Maps text and inputs onto a mathematically computed circular arc with custom bend,
 * height, SVG textPath rendering, caret interpolation along the curve, and synchronization
 * with a hidden accessible HTML input.
 */

const DEG = 180 / Math.PI;

const round2 = n => Math.round(n * 100) / 100;

const hexToRgba = (hex, alpha) => {
  let h = String(hex).replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const SHADOWS = { sm: [5, 12, 0.3], md: [10, 24, 0.4], lg: [16, 40, 0.52] };

const THEMES = {
  dark: {
    backgroundColor: '#13111C',
    textColor: '#f5f5f5',
    placeholderColor: '#a1a1aa',
    borderColor: 'rgba(229, 181, 79, 0.35)',
    buttonColor: '#E5B54F',
    buttonTextColor: '#0d0d0d',
    shadowColor: '#000000'
  },
  light: {
    backgroundColor: '#ffffff',
    textColor: '#1d2050',
    placeholderColor: '#9aa0b6',
    borderColor: '#262a56',
    buttonColor: '#4763eb',
    buttonTextColor: '#ffffff',
    shadowColor: '#0b0e2a'
  }
};

const buildGeometry = (width, bend, thickness, pad) => {
  const W = width;
  const T = thickness;
  const s = Math.max(-W * 0.35, Math.min(bend, W * 0.35));
  const a = Math.abs(s);
  const dir = s >= 0 ? 1 : -1;
  const svgH = T + a + pad * 2;

  if (a < 0.75) {
    const midY = pad + T / 2;
    return {
      straight: true,
      W,
      T,
      svgH,
      uPerLen: 1,
      point: (u, v) => [u, midY + v],
      angleAt: () => 0,
      uFromPoint: x => x
    };
  }

  const R = (W * W * 0.25 + a * a) / (2 * a);
  const cx = W / 2;
  const apexY = pad + T / 2 + (dir > 0 ? 0 : a);
  const cy = apexY + dir * R;
  const phi = Math.asin(Math.min(1, W / (2 * R)));

  return {
    straight: false,
    W,
    T,
    svgH,
    R,
    dir,
    uPerLen: W / (2 * R * phi),
    point: (u, v) => {
      const th = ((u - cx) / cx) * phi;
      const rho = R - dir * v;
      return [cx + rho * Math.sin(th), cy - dir * rho * Math.cos(th)];
    },
    angleAt: u => dir * ((u - cx) / cx) * phi * DEG,
    uFromPoint: (x, y) => {
      const th = Math.atan2(x - cx, dir * (cy - y));
      return cx + (th / phi) * cx;
    }
  };
};

const fmt = (g, u, v) => {
  const [x, y] = g.point(u, v);
  return `${round2(x)} ${round2(y)}`;
};

const edgeSeg = (g, uTo, v, ltr) => {
  if (g.straight) return `L ${fmt(g, uTo, v)}`;
  const rho = round2(g.R - g.dir * v);
  const sweep = ltr === g.dir > 0 ? 1 : 0;
  return `A ${rho} ${rho} 0 0 ${sweep} ${fmt(g, uTo, v)}`;
};

const bentRectPath = (g, u0, u1, vTop, vBot, radius) => {
  const rc = Math.max(0, Math.min(radius, (vBot - vTop) / 2, (u1 - u0) / 2));
  return [
    `M ${fmt(g, u0 + rc, vTop)}`,
    edgeSeg(g, u1 - rc, vTop, true),
    `Q ${fmt(g, u1, vTop)} ${fmt(g, u1, vTop + rc)}`,
    `L ${fmt(g, u1, vBot - rc)}`,
    `Q ${fmt(g, u1, vBot)} ${fmt(g, u1 - rc, vBot)}`,
    edgeSeg(g, u0 + rc, vBot, false),
    `Q ${fmt(g, u0, vBot)} ${fmt(g, u0, vBot - rc)}`,
    `L ${fmt(g, u0, vTop + rc)}`,
    `Q ${fmt(g, u0, vTop)} ${fmt(g, u0 + rc, vTop)}`,
    'Z'
  ].join(' ');
};

const bentLinePath = (g, u0, u1, v) => `M ${fmt(g, u0, v)} ${edgeSeg(g, u1, v, true)}`;

let idCounter = 0;

export default class CurvedInput {
  constructor(target, options = {}) {
    this.root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.root) return;

    this.options = {
      placeholder: 'Enter your email address...',
      buttonText: 'Get Started Free →',
      type: 'email',
      theme: 'dark',
      width: 520,
      bend: 24,
      height: 62,
      cornerRadius: 20,
      borderWidth: 1.5,
      fontSize: 15,
      showButton: true,
      showIcon: true,
      shadowSize: 'md',
      onSubmit: undefined,
      onChange: undefined,
      ...options
    };

    this.uid = `ci-${++idCounter}`;
    this.val = this.options.defaultValue || '';
    this.caretIndex = this.val.length;
    this.focused = false;
    this.w = typeof this.options.width === 'number' ? this.options.width : 520;
    this.btnTextW = 120;
    this.scrollLen = 0;

    this._setupDOM();
    this._render();
    this._attachEvents();
  }

  _setupDOM() {
    this.root.classList.add('curved-input');
    if (this.options.className) this.root.classList.add(this.options.className);
    this.root.style.width = typeof this.options.width === 'number' ? `${this.options.width}px` : this.options.width;
    this.root.innerHTML = '';

    this.svgContainer = document.createElement('div');
    this.root.appendChild(this.svgContainer);

    this.input = document.createElement('input');
    this.input.className = 'curved-input__field';
    this.input.type = this.options.type || 'email';
    this.input.value = this.val;
    this.input.placeholder = this.options.placeholder;
    this.input.setAttribute('aria-label', this.options.placeholder);
    this.input.autocomplete = 'off';
    this.root.appendChild(this.input);
  }

  _render() {
    const palette = THEMES[this.options.theme] || THEMES.dark;
    const bgColor = this.options.backgroundColor || palette.backgroundColor;
    const fgColor = this.options.textColor || palette.textColor;
    const phColor = this.options.placeholderColor || palette.placeholderColor;
    const strokeColor = this.options.borderColor || palette.borderColor;
    const accentColor = this.options.buttonColor || palette.buttonColor;
    const btnFgColor = this.options.buttonTextColor || palette.buttonTextColor;
    const shColor = this.options.shadowColor || palette.shadowColor;

    const pad = Math.ceil(this.options.borderWidth / 2) + 6;
    const geom = buildGeometry(this.w, this.options.bend, this.options.height, pad);
    this.geom = geom;

    const T = this.options.height;
    const btnInset = Math.max(5, this.options.borderWidth + 4);
    const chipH = Math.min(34, Math.max(16, T * 0.34));
    const chipW = chipH * 1.25;
    const iconU = 22 + chipW / 2;
    const textStartU = this.options.showIcon ? 22 + chipW + 13 : 24;
    const btnW = this.options.showButton ? Math.max(this.btnTextW + this.options.fontSize * 2.7, T * 1.35) : 0;
    const btnU1 = geom.W - btnInset;
    const btnU0 = btnU1 - btnW;
    const textEndU = Math.max(textStartU + 20, this.options.showButton ? btnU0 - 14 : geom.W - 24);
    const winLen = (textEndU - textStartU) / geom.uPerLen;
    this.layout = { btnInset, chipH, chipW, iconU, textStartU, textEndU, btnU0, btnU1, winLen };

    const vBase = this.options.fontSize * 0.34;
    const scrollU = this.scrollLen * geom.uPerLen;
    const bandPath = bentRectPath(geom, 0, geom.W, -T / 2, T / 2, this.options.cornerRadius);
    const layoutPath = bentLinePath(geom, textStartU - scrollU, geom.W, vBase);
    const clipPath = bentRectPath(geom, textStartU - 6, textEndU + 8, -T / 2, T / 2, 0);

    const chipFill = this.options.iconColor || accentColor;
    const [ix, iy] = geom.point(iconU, 0);
    const iconAngle = geom.angleAt(iconU);

    const btnH = T - btnInset * 2;
    const buttonPath = this.options.showButton
      ? bentRectPath(geom, btnU0, btnU1, -T / 2 + btnInset, T / 2 - btnInset, Math.min(this.options.cornerRadius * 0.72, btnH / 2))
      : '';
    const buttonTextPath = this.options.showButton ? bentLinePath(geom, btnU0, btnU1, vBase) : '';

    const shadow = SHADOWS[this.options.shadowSize];
    const shadowFilter = shadow
      ? `filter: drop-shadow(0 ${shadow[0]}px ${shadow[1]}px ${hexToRgba(shColor, shadow[2])});`
      : '';

    const textToDisplay = this.val || '';
    const placeholderText = !textToDisplay ? this.options.placeholder : '';

    const layoutPathId = `ci-text-${this.uid}`;
    const buttonPathId = `ci-btn-${this.uid}`;
    const clipId = `ci-clip-${this.uid}`;

    const ew = chipW * 0.5;
    const eh = chipH * 0.5;
    const sw = Math.max(1.1, chipH * 0.075);

    this.svgContainer.innerHTML = `
      <svg
        class="curved-input__svg"
        width="${geom.W}"
        height="${round2(geom.svgH)}"
        viewBox="0 0 ${geom.W} ${round2(geom.svgH)}"
        style="${shadowFilter}"
      >
        <defs>
          <clipPath id="${clipId}">
            <path d="${clipPath}" />
          </clipPath>
        </defs>

        <path class="curved-input__ring" d="${bandPath}" fill="none" stroke="${accentColor}" stroke-width="${this.options.borderWidth + 6}" />
        <path d="${bandPath}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="${this.options.borderWidth}" />

        <path id="${layoutPathId}" d="${layoutPath}" fill="none" />

        ${this.options.showIcon ? `
          <g transform="translate(${round2(ix)} ${round2(iy)}) rotate(${round2(iconAngle)})" aria-hidden="true">
            <rect x="${-chipW / 2}" y="${-chipH / 2}" width="${chipW}" height="${chipH}" rx="${chipH * 0.27}" fill="${chipFill}" />
            <rect x="${-ew / 2}" y="${-eh / 2}" width="${ew}" height="${eh}" rx="1.4" fill="none" stroke="#000" stroke-width="${sw}" stroke-linejoin="round" />
            <path d="M ${round2(-ew / 2)} ${round2(-eh / 2 + sw * 0.4)} L 0 ${round2(eh * 0.14)} L ${round2(ew / 2)} ${round2(-eh / 2 + sw * 0.4)}" fill="none" stroke="#000" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" />
          </g>
        ` : ''}

        <g clip-path="url(#${clipId})">
          <text id="${layoutPathId}-text" style="font-size: ${this.options.fontSize}px; font-weight: 500;" fill="${fgColor}" xml:space="preserve" aria-hidden="true">
            <textPath href="#${layoutPathId}">${textToDisplay}</textPath>
          </text>
          ${placeholderText ? `
            <text style="font-size: ${this.options.fontSize}px; font-weight: 500;" fill="${phColor}" xml:space="preserve" aria-hidden="true">
              <textPath href="#${layoutPathId}">${placeholderText}</textPath>
            </text>
          ` : ''}
        </g>

        ${this.options.showButton ? `
          <g class="curved-input__button" role="button" tabindex="0" aria-label="${this.options.buttonText}">
            <path class="curved-input__button-bg" d="${buttonPath}" fill="${accentColor}" />
            <path id="${buttonPathId}" d="${buttonTextPath}" fill="none" />
            <text fill="${btnFgColor}" text-anchor="middle" style="font-size: ${this.options.fontSize}px; font-weight: 700; pointer-events: none;">
              <textPath href="#${buttonPathId}" startOffset="50%">${this.options.buttonText}</textPath>
            </text>
          </g>
        ` : ''}
      </svg>
    `;

    this._measureButton();
  }

  _measureButton() {
    const btnText = this.svgContainer.querySelector('.curved-input__button text');
    if (btnText) {
      try {
        const len = btnText.getComputedTextLength();
        if (len > 0 && Math.abs(this.btnTextW - len) > 10) {
          this.btnTextW = len;
        }
      } catch (_) {}
    }
  }

  _attachEvents() {
    this.input.addEventListener('input', e => {
      this.val = e.target.value;
      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.val);
      }
      this._render();
      this._wireDynamicClick();
    });

    this.input.addEventListener('focus', () => {
      this.focused = true;
      this.root.classList.add('curved-input--focused');
    });

    this.input.addEventListener('blur', () => {
      this.focused = false;
      this.root.classList.remove('curved-input--focused');
    });

    this.root.addEventListener('submit', e => {
      e.preventDefault();
      this._submit();
    });

    this._wireDynamicClick();

    this.resizeObserver = new ResizeObserver(entries => {
      const cw = entries[0]?.contentRect?.width;
      if (cw && Math.abs(this.w - cw) > 4) {
        this.w = Math.round(cw);
        this._render();
        this._wireDynamicClick();
      }
    });
    this.resizeObserver.observe(this.root);
  }

  _wireDynamicClick() {
    const svg = this.svgContainer.querySelector('svg');
    if (svg) {
      svg.addEventListener('click', e => {
        const btn = e.target.closest('.curved-input__button');
        if (btn) {
          this._submit();
        } else {
          this.input.focus();
        }
      });
    }
  }

  _submit() {
    if (typeof this.options.onSubmit === 'function') {
      this.options.onSubmit(this.val);
    }
  }

  getValue() {
    return this.val;
  }

  setValue(newVal) {
    this.val = newVal;
    this.input.value = newVal;
    this._render();
    this._wireDynamicClick();
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }
}
