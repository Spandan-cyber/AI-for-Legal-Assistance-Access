/**
 * ClickSpark.js — Vanilla ES module implementation of React Bits ClickSpark.
 *
 * Renders particle spark lines on click using an overlay HTML5 Canvas and
 * high-performance requestAnimationFrame loop with configurable colors, radii,
 * and easings.
 */

export default class ClickSpark {
  /**
   * @param {HTMLElement|string} [target=document.body] - Container to attach to
   * @param {object} [options={}] - Spark configuration options
   */
  constructor(target = document.body, options = {}) {
    this.target = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.target) this.target = document.body;

    this.options = {
      sparkColor: '#E5B54F',
      sparkSize: 12,
      sparkRadius: 20,
      sparkCount: 8,
      duration: 400,
      easing: 'ease-out',
      extraScale: 1.0,
      isGlobal: this.target === document.body || this.target === document.documentElement,
      ...options
    };

    this.sparks = [];
    this.animationId = null;
    this.disposed = false;

    this._setupCanvas();
    this._attachEvents();
    this._startLoop();
  }

  _setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'click-spark-canvas';

    if (this.options.isGlobal) {
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '99999';
    } else {
      if (getComputedStyle(this.target).position === 'static') {
        this.target.style.position = 'relative';
      }
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '9999';
    }

    this.target.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.options.isGlobal
      ? { width: window.innerWidth, height: window.innerHeight }
      : this.target.getBoundingClientRect();

    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _ease(t) {
    switch (this.options.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t * (2 - t);
    }
  }

  _attachEvents() {
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize, { passive: true });

    this._onClick = e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.trigger(x, y);
    };

    if (this.options.isGlobal) {
      window.addEventListener('pointerdown', this._onClick, { passive: true });
    } else {
      this.target.addEventListener('pointerdown', this._onClick, { passive: true });
    }
  }

  trigger(x, y) {
    const now = performance.now();
    const count = this.options.sparkCount;
    for (let i = 0; i < count; i++) {
      this.sparks.push({
        x,
        y,
        angle: (2 * Math.PI * i) / count,
        startTime: now
      });
    }
  }

  _startLoop() {
    const draw = now => {
      if (this.disposed) return;

      const rect = this.canvas.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);

      const duration = this.options.duration;
      const sparkRadius = this.options.sparkRadius;
      const extraScale = this.options.extraScale;
      const sparkSize = this.options.sparkSize;
      const sparkColor = this.options.sparkColor;

      this.sparks = this.sparks.filter(spark => {
        const elapsed = now - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = this._ease(progress);

        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        this.ctx.strokeStyle = sparkColor;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        return true;
      });

      this.animationId = requestAnimationFrame(draw);
    };

    this.animationId = requestAnimationFrame(draw);
  }

  destroy() {
    this.disposed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._onResize);
    if (this.options.isGlobal) {
      window.removeEventListener('pointerdown', this._onClick);
    } else {
      this.target.removeEventListener('pointerdown', this._onClick);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
