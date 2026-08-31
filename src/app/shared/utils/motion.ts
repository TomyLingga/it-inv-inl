// src/app/shared/utils/motion.ts
'use client'

import { useReducedMotion, type Variants } from 'framer-motion'

// ─── Reusable variants ────────────────────────────────────────────────────────
// Subtle, readability-first motion. Durations kept short so tables/timelines
// never feel like they lag behind the data.

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
}

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } },
}

// ─── Reduced-motion aware helpers ─────────────────────────────────────────────
// framer-motion animations are JS-driven, so the CSS `prefers-reduced-motion`
// rule in globals.css does not stop them — components must opt out explicitly.

export function useReducedMotionSafe(): boolean {
  return useReducedMotion() ?? false
}

/**
 * Props for an item that fades/slides in. Returns an empty object when the user
 * prefers reduced motion so the element renders instantly at its final state.
 */
export function motionItemProps(reduce: boolean) {
  return reduce
    ? {}
    : { variants: fadeInUp, initial: 'hidden' as const, animate: 'visible' as const }
}

/**
 * Props for a container that staggers its children. No-op under reduced motion.
 */
export function motionContainerProps(reduce: boolean) {
  return reduce
    ? {}
    : { variants: staggerContainer, initial: 'hidden' as const, animate: 'visible' as const }
}
