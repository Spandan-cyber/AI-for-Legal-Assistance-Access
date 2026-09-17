/**
 * CardNav.js — Vanilla ES module implementation of React Bits CardNav.
 *
 * Provides expandable card navigation with GSAP timeline height calculation,
 * staggered card reveal, mobile responsive auto-height calculation, and smooth
 * collapsible hamburger toggle.
 */

import { gsap } from 'gsap';

export default class CardNav {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      console.warn('CardNav: container element not found.');
      return;
    }

    this.options = {
      logo: options.logo || '',
      logoAlt: options.logoAlt || 'Logo',
      logoHref: options.logoHref || 'index.html',
      items: options.items || [],
      ease: options.ease || 'power3.out',
      baseColor: options.baseColor || '#120f1d',
      menuColor: options.menuColor || '#E5B54F',
      buttonBgColor: options.buttonBgColor || '#E5B54F',
      buttonTextColor: options.buttonTextColor || '#0d0d0d',
      buttonText: options.buttonText || 'Get Started',
      buttonHref: options.buttonHref || 'auth.html?mode=signup',
      className: options.className || ''
    };

    this.isHamburgerOpen = false;
    this.isExpanded = false;
    this.tl = null;

    this.init();
  }

  init() {
    this.render();
    this.bindElements();
    this.setupTimeline();
    this.bindEvents();
  }

  render() {
    const {
      logo,
      logoAlt,
      logoHref,
      items,
      baseColor,
      menuColor,
      buttonBgColor,
      buttonTextColor,
      buttonText,
      buttonHref,
      className
    } = this.options;

    // Arrow up-right SVG icon matching GoArrowUpRight
    const arrowIcon = `<svg class="nav-card-link-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" d="M3.75 2.5a.75.75 0 0 0 0 1.5h6.69l-8.22 8.22a.75.75 0 1 0 1.06 1.06l8.22-8.22v6.69a.75.75 0 0 0 1.5 0V3.25a.75.75 0 0 0-.75-.75H3.75Z" clip-rule="evenodd"/></svg>`;

    const cardsHtml = (items || []).slice(0, 3).map((item, idx) => {
      const linksHtml = (item.links || []).map(lnk => `
        <a class="nav-card-link" href="${lnk.href || '#'}" aria-label="${lnk.ariaLabel || lnk.label}">
          ${arrowIcon}
          <span>${lnk.label}</span>
        </a>
      `).join('');

      return `
        <div class="nav-card" style="background-color: ${item.bgColor}; color: ${item.textColor};">
          <div class="nav-card-label">${item.label}</div>
          <div class="nav-card-links">
            ${linksHtml}
          </div>
        </div>
      `;
    }).join('');

    // Logo render: handles HTML string or image URL
    let logoHtml = '';
    if (typeof logo === 'string' && (logo.startsWith('<') || logo.includes('<svg'))) {
      logoHtml = `<a href="${logoHref}" aria-label="${logoAlt}">${logo}</a>`;
    } else if (typeof logo === 'string' && logo.length > 0) {
      logoHtml = `<a href="${logoHref}" aria-label="${logoAlt}"><img src="${logo}" alt="${logoAlt}" class="logo" /></a>`;
    } else {
      logoHtml = `<a href="${logoHref}" class="nav-brand-text" style="color:#fff;font-weight:800;font-size:1.15rem;letter-spacing:-0.02em;text-decoration:none;">Judge<span style="color:#E5B54F;">man</span></a>`;
    }

    this.container.className = `card-nav-container ${className}`.trim();
    this.container.innerHTML = `
      <nav class="card-nav" style="background-color: ${baseColor}">
        <div class="card-nav-top">
          <button
            type="button"
            class="hamburger-menu"
            role="button"
            aria-label="Open menu"
            aria-expanded="false"
            style="color: ${menuColor};"
          >
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
          </button>

          <div class="logo-container">
            ${logoHtml}
          </div>

          <a
            href="${buttonHref}"
            class="card-nav-cta-button"
            style="background-color: ${buttonBgColor}; color: ${buttonTextColor};"
          >
            ${buttonText}
          </a>
        </div>

        <div class="card-nav-content" aria-hidden="true">
          ${cardsHtml}
        </div>
      </nav>
    `;
  }

  bindElements() {
    this.navEl = this.container.querySelector('.card-nav');
    this.hamburgerEl = this.container.querySelector('.hamburger-menu');
    this.contentEl = this.container.querySelector('.card-nav-content');
    this.cardsEl = this.container.querySelectorAll('.nav-card');
  }

  calculateHeight() {
    if (!this.navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile && this.contentEl) {
      const wasVisible = this.contentEl.style.visibility;
      const wasPointerEvents = this.contentEl.style.pointerEvents;
      const wasPosition = this.contentEl.style.position;
      const wasHeight = this.contentEl.style.height;

      this.contentEl.style.visibility = 'visible';
      this.contentEl.style.pointerEvents = 'auto';
      this.contentEl.style.position = 'static';
      this.contentEl.style.height = 'auto';

      // Force layout
      this.contentEl.offsetHeight;

      const topBar = 60;
      const padding = 16;
      const contentHeight = this.contentEl.scrollHeight;

      this.contentEl.style.visibility = wasVisible;
      this.contentEl.style.pointerEvents = wasPointerEvents;
      this.contentEl.style.position = wasPosition;
      this.contentEl.style.height = wasHeight;

      return topBar + contentHeight + padding;
    }
    return 260;
  }

  setupTimeline() {
    if (!this.navEl) return;

    gsap.set(this.navEl, { height: 60, overflow: 'hidden' });
    gsap.set(this.cardsEl, { y: 50, opacity: 0 });

    this.tl = gsap.timeline({ paused: true });

    this.tl.to(this.navEl, {
      height: () => this.calculateHeight(),
      duration: 0.4,
      ease: this.options.ease
    });

    this.tl.to(
      this.cardsEl,
      {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: this.options.ease,
        stagger: 0.08
      },
      '-=0.1'
    );
  }

  toggleMenu() {
    if (!this.tl) return;

    if (!this.isExpanded) {
      this.isHamburgerOpen = true;
      this.isExpanded = true;
      this.hamburgerEl.classList.add('open');
      this.hamburgerEl.setAttribute('aria-label', 'Close menu');
      this.hamburgerEl.setAttribute('aria-expanded', 'true');
      this.navEl.classList.add('open');
      this.contentEl.setAttribute('aria-hidden', 'false');
      this.tl.play(0);
    } else {
      this.isHamburgerOpen = false;
      this.hamburgerEl.classList.remove('open');
      this.hamburgerEl.setAttribute('aria-label', 'Open menu');
      this.hamburgerEl.setAttribute('aria-expanded', 'false');
      this.tl.eventCallback('onReverseComplete', () => {
        this.isExpanded = false;
        this.navEl.classList.remove('open');
        this.contentEl.setAttribute('aria-hidden', 'true');
      });
      this.tl.reverse();
    }
  }

  bindEvents() {
    this.onHamburgerClick = e => {
      e.stopPropagation();
      this.toggleMenu();
    };

    this.onHamburgerKey = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleMenu();
      }
    };

    this.onResize = () => {
      if (!this.tl) return;
      if (this.isExpanded) {
        const newHeight = this.calculateHeight();
        gsap.set(this.navEl, { height: newHeight });

        this.tl.kill();
        this.setupTimeline();
        if (this.tl) {
          this.tl.progress(1);
        }
      } else {
        this.tl.kill();
        this.setupTimeline();
      }
    };

    this.onDocumentClick = e => {
      if (this.isExpanded && !this.container.contains(e.target)) {
        this.toggleMenu();
      }
    };

    this.hamburgerEl.addEventListener('click', this.onHamburgerClick);
    this.hamburgerEl.addEventListener('keydown', this.onHamburgerKey);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('click', this.onDocumentClick);

    // Clicking any card link closes the menu
    this.container.querySelectorAll('.nav-card-link').forEach(link => {
      link.addEventListener('click', () => {
        if (this.isExpanded) this.toggleMenu();
      });
    });
  }

  destroy() {
    this.hamburgerEl?.removeEventListener('click', this.onHamburgerClick);
    this.hamburgerEl?.removeEventListener('keydown', this.onHamburgerKey);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('click', this.onDocumentClick);
    this.tl?.kill();
    this.tl = null;
  }
}
