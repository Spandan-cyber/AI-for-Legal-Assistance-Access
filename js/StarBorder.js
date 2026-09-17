/**
 * StarBorder.js — Vanilla ES module implementation of React Bits StarBorder.
 *
 * Enriches any button or container with orbiting radial gradient star movement
 * borders and an inner surface.
 */

export default function initStarBorder(target, options = {}) {
  const elements = typeof target === 'string'
    ? document.querySelectorAll(target)
    : (target instanceof NodeList || Array.isArray(target)) ? target : [target];

  const {
    color = '#E5B54F',
    speed = '6s',
    thickness = 1,
    backgroundColor = 'rgba(13, 18, 37, 0.95)',
    textColor = '#ffffff',
    borderColor = 'rgba(229, 181, 79, 0.3)',
    className = ''
  } = options;

  elements.forEach(el => {
    if (!el || el.dataset.starBorderInitialized) return;
    el.dataset.starBorderInitialized = 'true';

    el.classList.add('star-border-container');
    if (className) el.classList.add(className);
    el.style.padding = `${thickness}px 0`;

    // Extract current inner HTML
    const originalContent = el.innerHTML;
    el.innerHTML = '';

    // Bottom gradient
    const bottomGrad = document.createElement('div');
    bottomGrad.className = 'border-gradient-bottom';
    bottomGrad.style.background = `radial-gradient(circle, ${color}, transparent 10%)`;
    bottomGrad.style.animationDuration = speed;

    // Top gradient
    const topGrad = document.createElement('div');
    topGrad.className = 'border-gradient-top';
    topGrad.style.background = `radial-gradient(circle, ${color}, transparent 10%)`;
    topGrad.style.animationDuration = speed;

    // Inner content surface
    const inner = document.createElement('div');
    inner.className = 'inner-content';
    inner.style.background = backgroundColor;
    inner.style.color = textColor;
    inner.style.borderColor = borderColor;
    inner.innerHTML = originalContent;

    el.appendChild(bottomGrad);
    el.appendChild(topGrad);
    el.appendChild(inner);
  });

  return {
    destroy: () => {
      elements.forEach(el => {
        if (!el || !el.dataset.starBorderInitialized) return;
        const inner = el.querySelector('.inner-content');
        if (inner) el.innerHTML = inner.innerHTML;
        el.classList.remove('star-border-container');
        if (className) el.classList.remove(className);
        el.style.removeProperty('padding');
        delete el.dataset.starBorderInitialized;
      });
    }
  };
}
