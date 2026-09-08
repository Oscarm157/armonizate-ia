import type { Variants } from "motion/react";

// Ease editorial (deceleración elegante), consistente en todo el sitio.
export const editorialEase = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: editorialEase } },
};

export const maskReveal: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: editorialEase } },
};

export const stagger = (each = 0.08, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: each, delayChildren: delay } },
});
