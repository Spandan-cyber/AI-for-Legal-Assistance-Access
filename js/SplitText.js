/**
 * SplitText.js — Vanilla ES module implementation of React Bits SplitText.
 *
 * Uses GSAP, ScrollTrigger, and SplitText to animate text splitting (chars, words, lines)
 * on scroll or trigger.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

export default function initSplitText(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return null;

  const {
    text,
    delay = 50,
    duration = 1.25,
    ease = 'power3.out',
    splitType = 'chars',
    from = { opacity: 0, y: 40 },
    to = { opacity: 1, y: 0 },
    threshold = 0.1,
    rootMargin = '-100px',
    onLetterAnimationComplete
  } = options;

  if (text !== undefined) {
    el.textContent = text;
  }

  el.classList.add('split-parent');

  const startPct = (1 - threshold) * 100;
  const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
  const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
  const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
  const sign =
    marginValue === 0
      ? ''
      : marginValue < 0
        ? `-=${Math.abs(marginValue)}${marginUnit}`
        : `+=${marginValue}${marginUnit}`;
  const start = `top ${startPct}%${sign}`;

  let targets;
  const assignTargets = self => {
    if (splitType.includes('chars') && self.chars.length) targets = self.chars;
    if (!targets && splitType.includes('words') && self.words.length) targets = self.words;
    if (!targets && splitType.includes('lines') && self.lines.length) targets = self.lines;
    if (!targets) targets = self.chars || self.words || self.lines;
  };

  const splitInstance = new GSAPSplitText(el, {
    type: splitType,
    smartWrap: true,
    autoSplit: splitType === 'lines',
    linesClass: 'split-line',
    wordsClass: 'split-word',
    charsClass: 'split-char',
    reduceWhiteSpace: false
  });

  assignTargets(splitInstance);

  const tween = gsap.fromTo(
    targets,
    { ...from },
    {
      ...to,
      duration,
      ease,
      stagger: delay / 1000,
      scrollTrigger: {
        trigger: el,
        start,
        once: true,
        fastScrollEnd: true,
        anticipatePin: 0.4
      },
      onComplete: () => {
        if (typeof onLetterAnimationComplete === 'function') {
          onLetterAnimationComplete();
        }
      },
      willChange: 'transform, opacity',
      force3D: true
    }
  );

  return {
    tween,
    splitInstance,
    revert: () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
      try {
        splitInstance.revert();
      } catch (_) {
        /* noop */
      }
    }
  };
}
