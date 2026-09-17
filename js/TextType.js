/**
 * TextType.js — Vanilla ES module implementation of React Bits TextType.
 *
 * Types and deletes strings in a loop with GSAP blinking cursor,
 * customizable typing/deleting speeds, color changes, and pause durations.
 */

import { gsap } from 'gsap';

export default class TextType {
  /**
   * @param {HTMLElement|string} target - Container element or selector
   * @param {object} options - Options matching React Bits TextType props
   */
  constructor(target, options = {}) {
    this.el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.el) return;

    this.options = {
      text: ['Hello World'],
      typingSpeed: 50,
      initialDelay: 0,
      pauseDuration: 2000,
      deletingSpeed: 30,
      loop: true,
      className: '',
      showCursor: true,
      hideCursorWhileTyping: false,
      cursorCharacter: '|',
      cursorClassName: '',
      cursorBlinkDuration: 0.5,
      textColors: [],
      variableSpeed: undefined,
      onSentenceComplete: undefined,
      startOnVisible: false,
      reverseMode: false,
      ...options
    };

    this.textArray = Array.isArray(this.options.text) ? this.options.text : [this.options.text];
    this.displayedText = '';
    this.currentCharIndex = 0;
    this.isDeleting = false;
    this.currentTextIndex = 0;
    this.isVisible = !this.options.startOnVisible;
    this.timeoutId = null;
    this.cursorTween = null;
    this.disposed = false;

    this._buildDOM();
    this._initCursor();

    if (this.options.startOnVisible) {
      this._observeVisibility();
    } else {
      this._start();
    }
  }

  _buildDOM() {
    this.el.classList.add('text-type');
    if (this.options.className) {
      this.el.classList.add(this.options.className);
    }

    this.el.innerHTML = '';
    this.contentSpan = document.createElement('span');
    this.contentSpan.className = 'text-type__content';
    this.el.appendChild(this.contentSpan);

    if (this.options.showCursor) {
      this.cursorSpan = document.createElement('span');
      this.cursorSpan.className = `text-type__cursor ${this.options.cursorClassName}`.trim();
      this.cursorSpan.textContent = this.options.cursorCharacter;
      this.el.appendChild(this.cursorSpan);
    }
  }

  _initCursor() {
    if (!this.options.showCursor || !this.cursorSpan) return;
    gsap.set(this.cursorSpan, { opacity: 1 });
    this.cursorTween = gsap.to(this.cursorSpan, {
      opacity: 0,
      duration: this.options.cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });
  }

  _observeVisibility() {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isVisible) {
            this.isVisible = true;
            this._start();
            this.observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.el);
  }

  _getRandomSpeed() {
    if (!this.options.variableSpeed) return this.options.typingSpeed;
    const { min, max } = this.options.variableSpeed;
    return Math.random() * (max - min) + min;
  }

  _getCurrentTextColor() {
    if (!this.options.textColors || this.options.textColors.length === 0) return 'inherit';
    return this.options.textColors[this.currentTextIndex % this.options.textColors.length];
  }

  _start() {
    if (this.disposed) return;
    if (this.options.initialDelay > 0) {
      this.timeoutId = setTimeout(() => this._tick(), this.options.initialDelay);
    } else {
      this._tick();
    }
  }

  _tick() {
    if (this.disposed) return;

    const currentText = this.textArray[this.currentTextIndex] || '';
    const processedText = this.options.reverseMode
      ? currentText.split('').reverse().join('')
      : currentText;

    if (this.isDeleting) {
      if (this.displayedText === '') {
        this.isDeleting = false;

        if (this.currentTextIndex === this.textArray.length - 1 && !this.options.loop) {
          return;
        }

        if (typeof this.options.onSentenceComplete === 'function') {
          this.options.onSentenceComplete(this.textArray[this.currentTextIndex], this.currentTextIndex);
        }

        this.currentTextIndex = (this.currentTextIndex + 1) % this.textArray.length;
        this.currentCharIndex = 0;
        this.timeoutId = setTimeout(() => this._tick(), this.options.pauseDuration);
        return;
      } else {
        this.displayedText = this.displayedText.slice(0, -1);
        this.contentSpan.textContent = this.displayedText;
        this._updateCursorVisibility(currentText);
        this.timeoutId = setTimeout(() => this._tick(), this.options.deletingSpeed);
        return;
      }
    } else {
      if (this.currentCharIndex < processedText.length) {
        this.displayedText += processedText[this.currentCharIndex];
        this.contentSpan.textContent = this.displayedText;
        this.currentCharIndex++;

        // Update text color if defined
        const color = this._getCurrentTextColor();
        if (color && color !== 'inherit') {
          this.contentSpan.style.color = color;
        }

        this._updateCursorVisibility(currentText);
        const speed = this._getRandomSpeed();
        this.timeoutId = setTimeout(() => this._tick(), speed);
        return;
      } else if (this.textArray.length >= 1) {
        if (!this.options.loop && this.currentTextIndex === this.textArray.length - 1) {
          if (typeof this.options.onSentenceComplete === 'function') {
            this.options.onSentenceComplete(this.textArray[this.currentTextIndex], this.currentTextIndex);
          }
          return;
        }
        this.timeoutId = setTimeout(() => {
          this.isDeleting = true;
          this._tick();
        }, this.options.pauseDuration);
        return;
      }
    }
  }

  _updateCursorVisibility(currentText) {
    if (!this.options.showCursor || !this.cursorSpan) return;
    if (this.options.hideCursorWhileTyping) {
      const isTyping = this.currentCharIndex < currentText.length || this.isDeleting;
      this.cursorSpan.classList.toggle('text-type__cursor--hidden', isTyping);
    }
  }

  destroy() {
    this.disposed = true;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.cursorTween) this.cursorTween.kill();
    if (this.observer) this.observer.disconnect();
  }
}
