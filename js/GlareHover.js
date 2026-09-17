/**
 * GlareHover.js — Vanilla ES module implementation of React Bits GlareHover.
 *
 * Adds a modern, glossy specular reflection sweep over any card or container
 * on hover via CSS custom properties and hardware-accelerated linear gradients.
 */

export default function initGlareHover(target, options = {}) {
  const elements = typeof target === 'string'
    ? document.querySelectorAll(target)
    : (target instanceof NodeList || Array.isArray(target)) ? target : [target];

  const {
    width,
    height,
    background,
    borderRadius,
    borderColor,
    glareColor = '#ffffff',
    glareOpacity = 0.35,
    glareAngle = -45,
    glareSize = 250,
    transitionDuration = 650,
    playOnce = false,
    className = ''
  } = options;

  const hex = glareColor.replace('#', '');
  let rgba = glareColor;
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  } else if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  }

  elements.forEach(el => {
    if (!el) return;
    el.classList.add('glare-hover');
    if (playOnce) el.classList.add('glare-hover--play-once');
    if (className) el.classList.add(className);

    if (width) el.style.setProperty('--gh-width', width);
    if (height) el.style.setProperty('--gh-height', height);
    if (background) el.style.setProperty('--gh-bg', background);
    if (borderRadius) el.style.setProperty('--gh-br', borderRadius);
    if (borderColor) el.style.setProperty('--gh-border', borderColor);

    el.style.setProperty('--gh-angle', `${glareAngle}deg`);
    el.style.setProperty('--gh-duration', `${transitionDuration}ms`);
    el.style.setProperty('--gh-size', `${glareSize}%`);
    el.style.setProperty('--gh-rgba', rgba);
  });

  return {
    destroy: () => {
      elements.forEach(el => {
        if (!el) return;
        el.classList.remove('glare-hover', 'glare-hover--play-once');
        if (className) el.classList.remove(className);
        el.style.removeProperty('--gh-width');
        el.style.removeProperty('--gh-height');
        el.style.removeProperty('--gh-bg');
        el.style.removeProperty('--gh-br');
        el.style.removeProperty('--gh-border');
        el.style.removeProperty('--gh-angle');
        el.style.removeProperty('--gh-duration');
        el.style.removeProperty('--gh-size');
        el.style.removeProperty('--gh-rgba');
      });
    }
  };
}
