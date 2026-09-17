// js/landing.js — Landing page animations & interactions
import WarpText from './WarpText.js';
import initSplitText from './SplitText.js';
import TextType from './TextType.js';
import PixelSwap from './PixelSwap.js';
import initGlareHover from './GlareHover.js';
import ClickSpark from './ClickSpark.js';
import initStarBorder from './StarBorder.js';
import CurvedInput from './CurvedInput.js';
import CardNav from './CardNav.js';
import MoltenMetal from './MoltenMetal.js';

document.addEventListener('DOMContentLoaded', () => {
  initMoltenBackground();
  initCardNav();
  initHeroWarp();
  initBadgeTextType();
  initHeroPixelSwap();
  initCardGlares();
  initClickSparks();
  initStarBorders();
  initAllSplitTexts();
  initCounters();
  initScrollAnimations();
  initMobileMenu();
  initStickyNav();
  initCurvedCTA();
});

/* ── Animated Counters ───────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        animateCounter(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.counter.replace(/,/g, ''), 10);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 2000;
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ── Scroll Reveal Animations ────────────────────────────── */
function initScrollAnimations() {
  const els = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => observer.observe(el));
}

/* ── Mobile Menu ─────────────────────────────────────────── */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = open
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
  });
  // Close menu on link click
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

/* ── Sticky Nav Shadow on Scroll ─────────────────────────── */
function initStickyNav() {
  const nav = document.querySelector('.ln-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ── React Bits CardNav Integration ──────────────────────── */
function initCardNav() {
  const container = document.getElementById('card-nav-container');
  if (!container) return;

  const logoSvg = `
    <span style="display:inline-flex;align-items:center;gap:8px;">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="url(#nav-card-lg)"/>
        <defs><linearGradient id="nav-card-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#4f46e5"/><stop offset="1" stop-color="#818cf8"/></linearGradient></defs>
        <line x1="16" y1="7" x2="16" y2="25" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="10" y1="10" x2="22" y2="10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M10 10 L7 16 M10 10 L13 16" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M7 16 Q10 18 13 16" stroke="white" stroke-width="1.3" stroke-linecap="round" fill="none"/>
        <path d="M22 10 L19 16 M22 10 L25 16" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M19 16 Q22 18 25 16" stroke="white" stroke-width="1.3" stroke-linecap="round" fill="none"/>
        <line x1="13" y1="25" x2="19" y2="25" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span style="font-family:var(--font-heading, 'Outfit', sans-serif);font-weight:800;font-size:1.2rem;letter-spacing:-0.02em;color:#F0F4FF;">Judge<span style="color:#E5B54F;">man</span></span>
    </span>
  `;

  const items = [
    {
      label: "Platform",
      bgColor: "#171324",
      textColor: "#F0F4FF",
      links: [
        { label: "Plain-Language Decoder", href: "app.html#plain-language", ariaLabel: "Plain-Language Decoder" },
        { label: "Risk Radar Scan", href: "app.html#risk-radar", ariaLabel: "Risk Radar Scan" },
        { label: "Redline Comparison", href: "app.html#compare", ariaLabel: "Redline Comparison" },
        { label: "Attorney Prep Kit", href: "app.html#prep-kit", ariaLabel: "Attorney Prep Kit" }
      ]
    },
    {
      label: "Explore",
      bgColor: "#1F1A32",
      textColor: "#F0F4FF",
      links: [
        { label: "Features", href: "#features", ariaLabel: "Judgeman Features" },
        { label: "How It Works", href: "#how-it-works", ariaLabel: "How It Works" },
        { label: "Use Cases", href: "#use-cases", ariaLabel: "Document Use Cases" },
        { label: "Customer Reviews", href: "#testimonials", ariaLabel: "Customer Reviews" }
      ]
    },
    {
      label: "Account",
      bgColor: "#292242",
      textColor: "#F0F4FF",
      links: [
        { label: "Log In", href: "auth.html?mode=login", ariaLabel: "Log In" },
        { label: "Sign Up Free", href: "auth.html?mode=signup", ariaLabel: "Sign Up Free" },
        { label: "Open Workspace", href: "app.html", ariaLabel: "Open Legal Workspace" }
      ]
    }
  ];

  new CardNav(container, {
    logo: logoSvg,
    logoAlt: "Judgeman Logo",
    logoHref: "index.html",
    items: items,
    baseColor: "rgba(18, 15, 29, 0.92)",
    menuColor: "#E5B54F",
    buttonBgColor: "linear-gradient(135deg, #4f46e5, #818cf8)",
    buttonTextColor: "#ffffff",
    buttonText: "Get Started Free →",
    buttonHref: "auth.html?mode=signup",
    ease: "power3.out"
  });
}

/* ── CurvedInput Email CTA ───────────────────────────────── */
function initCurvedCTA() {
  const container = document.getElementById('curved-cta-input');
  if (!container) return;

  new CurvedInput(container, {
    placeholder: 'Enter your email address...',
    buttonText: 'Get Started Free →',
    theme: 'dark',
    width: '100%',
    bend: 20,
    height: 62,
    fontSize: 15,
    cornerRadius: 18,
    backgroundColor: '#161320',
    borderColor: 'rgba(229, 181, 79, 0.35)',
    buttonColor: '#E5B54F',
    buttonTextColor: '#0d0d0d',
    textColor: '#f5f5f5',
    placeholderColor: '#8a8899',
    shadowSize: 'md',
    shadowColor: '#000000',
    onSubmit: (val) => {
      const email = (val || '').trim();
      if (!email) return;
      window.location.href = `auth.html?mode=signup&email=${encodeURIComponent(email)}`;
    }
  });
}

/* ── WebGL WarpText Integration ──────────────────────────── */
function initHeroWarp() {
  const container = document.getElementById('hero-warp');
  if (!container) return;

  const warp = new WarpText(container, {
    text: 'Legal Documents,\nFinally Decoded.',
    color: '#f8f5ff',
    warpStrength: 0.08,
    warpScale: 1.7,
    speed: 0.55,
    pointerInfluence: 0.42,
    pointerStrength: 0.38,
    refraction: 0.018,
    ripple: true,
    fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '-0.04em',
    lineHeight: 1.06,
  });

  // Wire preset buttons for instant interaction
  const pills = document.querySelectorAll('.warp-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const text = pill.dataset.warp;
      warp.update({ text });
    });
  });
}

/* ── SplitText ScrollTrigger Animations ──────────────────── */
function initAllSplitTexts() {
  const elements = document.querySelectorAll('[data-split-text]');
  elements.forEach(el => {
    initSplitText(el, {
      splitType: 'chars',
      duration: 0.8,
      delay: 25,
      ease: 'power3.out',
      from: { opacity: 0, y: 30 },
      to: { opacity: 1, y: 0 },
      threshold: 0.15,
      rootMargin: '-40px'
    });
  });
}

/* ── TextType Hero Badge Animation ───────────────────────── */
function initBadgeTextType() {
  const badge = document.getElementById('hero-badge-type');
  if (!badge) return;
  new TextType(badge, {
    text: [
      "AI for Legal Assistance & Access Challenge",
      "Instant Contract Analysis & Risk Detection",
      "Translate Legal Jargon to Plain English",
      "Your 24/7 AI-Powered Legal Assistant"
    ],
    typingSpeed: 45,
    pauseDuration: 2200,
    deletingSpeed: 25,
    loop: true,
    showCursor: true,
    cursorCharacter: '|'
  });
}

/* ── PixelSwap Interactive Decoder ───────────────────────── */
function initHeroPixelSwap() {
  const container = document.getElementById('hero-pixelswap-stage');
  if (!container) return;

  const firstContent = `
    <div class="pixelswap-clause-card legalese">
      <div class="pixelswap-clause-badge badge-red">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Original Legal Clause (Legalese)
      </div>
      <div class="pixelswap-clause-body">
        "Tenant shall remain liable for all remaining rent through the end of the lease term plus attorney's fees and costs, regardless of any re-letting mitigation efforts by Landlord..."
      </div>
      <div class="pixelswap-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 16 16 12 12 8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        Click or hover to decode with PixelSwap
      </div>
    </div>
  `;

  const secondContent = `
    <div class="pixelswap-clause-card decoded">
      <div class="pixelswap-clause-badge badge-green">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Judgeman Plain English Translation
      </div>
      <div class="pixelswap-clause-body">
        "If you are evicted, you still owe ALL remaining rent for the year — plus the landlord's lawyer fees, even if they find a new tenant immediately. Severe double penalty."
      </div>
      <div class="pixelswap-hint" style="color:#34d399">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Decoded &amp; Risk Flagged by Gemini AI (Click to view original)
      </div>
    </div>
  `;

  new PixelSwap(container, {
    firstContent,
    secondContent,
    pixelSize: 44,
    gap: 0,
    pixelRadius: 10,
    pixelSpin: 0,
    pixelScale: 0.35,
    fade: true,
    duration: 1100,
    pixelDuration: 400,
    pattern: 'spiral',
    randomness: 0.1,
    trigger: 'click'
  });
}

/* ── GlareHover Specular Reflection Effects ─────────────── */
function initCardGlares() {
  // Feature bento grid cards (gold specular sweep)
  initGlareHover('.feature-card', {
    glareColor: '#E5B54F',
    glareOpacity: 0.22,
    glareAngle: -45,
    glareSize: 220,
    transitionDuration: 750
  });

  // Use case audience cards (violet specular sweep)
  initGlareHover('.usecase-card', {
    glareColor: '#818CF8',
    glareOpacity: 0.25,
    glareAngle: -45,
    glareSize: 220,
    transitionDuration: 700
  });

  // Testimonial cards (cyan specular sweep)
  initGlareHover('.testimonial-card', {
    glareColor: '#38BDF8',
    glareOpacity: 0.2,
    glareAngle: -45,
    glareSize: 220,
    transitionDuration: 750
  });
}

/* ── ClickSpark Global Particle Emission ─────────────────── */
function initClickSparks() {
  new ClickSpark(document.body, {
    sparkColor: '#E5B54F',
    sparkSize: 12,
    sparkRadius: 22,
    sparkCount: 8,
    duration: 420,
    easing: 'ease-out'
  });
}

/* ── StarBorder Glowing Orbiting Borders ─────────────────── */
function initStarBorders() {
  initStarBorder('#hero-cta-btn', {
    color: '#ffffff',
    speed: '4s',
    thickness: 2,
    backgroundColor: 'linear-gradient(135deg, #E5B54F, #c98a1a)',
    textColor: '#0d0d0d',
    borderColor: 'transparent'
  });
}

/* ── React Bits MoltenMetal Wallpaper ────────────────────── */
function initMoltenBackground() {
  const container = document.getElementById('molten-bg');
  if (!container) return;

  new MoltenMetal(container, {
    color1: '#1b1432',
    color2: '#E5B54F',
    color3: '#FFF3CF',
    speed: 0.22,
    scale: 3.5,
    detail: 3,
    glow: 1.5,
    coreSize: 0.08,
    swirl: 0.85,
    fold: -0.18,
    blackPoint: 0.06,
    brightness: 1.15,
    colorMode: 'molten',
    grain: true,
    grainIntensity: 0.04,
    mouseInteraction: true,
    mouseStrength: 0.25,
    opacity: 0.65
  });
}
