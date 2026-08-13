import { animate, cubicBezier, stagger, type JSAnimation } from 'animejs';

const easeOut = cubicBezier(0.23, 1, 0.32, 1);
const easeInOut = cubicBezier(0.77, 0, 0.175, 1);

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function enter(targets: HTMLElement | HTMLElement[], options: { offset?: number; duration?: number; staggerMs?: number } = {}) {
  const reduced = prefersReducedMotion();
  return animate(targets, {
    opacity: { from: 0 },
    translateY: { from: reduced ? 0 : options.offset ?? 8 },
    duration: reduced ? 120 : options.duration ?? 280,
    delay: options.staggerMs && !reduced ? stagger(options.staggerMs) : 0,
    ease: easeOut,
  });
}

export function reveal(target: HTMLElement) {
  const reduced = prefersReducedMotion();
  return animate(target, {
    opacity: 1,
    translateY: 0,
    duration: reduced ? 140 : 440,
    ease: easeOut,
  });
}

export function openPopup(target: HTMLElement) {
  const reduced = prefersReducedMotion();
  return animate(target, {
    opacity: { from: 0 },
    translateY: { from: reduced ? 0 : -4 },
    scale: { from: reduced ? 1 : 0.98 },
    duration: reduced ? 100 : 180,
    ease: easeOut,
  });
}

export function openDialog(backdrop: HTMLElement, dialog: HTMLElement) {
  const reduced = prefersReducedMotion();
  const animations: JSAnimation[] = [animate(backdrop, { opacity: { from: 0 }, duration: reduced ? 100 : 220, ease: easeOut })];
  animations.push(animate(dialog, {
    opacity: { from: 0 },
    translateY: { from: reduced ? 0 : 8 },
    scale: { from: reduced ? 1 : 0.98 },
    duration: reduced ? 100 : 220,
    ease: easeOut,
  }));
  return animations;
}

export function closeDialog(backdrop: HTMLElement, dialog: HTMLElement, done: () => void) {
  if (prefersReducedMotion()) { done(); return; }
  animate(backdrop, { opacity: 0, duration: 160, ease: easeOut });
  animate(dialog, { opacity: 0, translateY: 6, scale: 0.98, duration: 160, ease: easeOut, onComplete: done });
}

export function switchContent(target: HTMLElement) {
  const reduced = prefersReducedMotion();
  return animate(target, {
    opacity: { from: 0 },
    translateX: { from: reduced ? 0 : 6 },
    duration: reduced ? 100 : 200,
    ease: easeOut,
  });
}

export function moveTabIndicator(target: HTMLElement, left: number, width: number) {
  target.style.width = `${width}px`;
  if (prefersReducedMotion()) { target.style.transform = `translateX(${left}px)`; return; }
  animate(target, { translateX: left, duration: 220, ease: easeInOut });
}

export function emphasize(targets: HTMLElement | HTMLElement[]) {
  if (prefersReducedMotion()) return animate(targets, { opacity: [0.72, 1], duration: 120, ease: easeOut });
  return animate(targets, { scale: [1, 1.02, 1], duration: 240, ease: easeInOut });
}

export function fadeOut(target: HTMLElement, done: () => void) {
  const reduced = prefersReducedMotion();
  return animate(target, { opacity: 0, scale: reduced ? 1 : 0.98, duration: reduced ? 100 : 200, ease: easeOut, onComplete: done });
}
