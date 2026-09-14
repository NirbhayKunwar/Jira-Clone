import React, { useEffect } from 'react';
import Lenis from 'lenis';
import useReducedMotion from '../hooks/useReducedMotion';

export default function SmoothScrollProvider({ children }) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do not initialize Lenis if user prefers reduced motion
    if (prefersReducedMotion) return;

    // Do not initialize Lenis on mobile/touch devices to maintain native high-speed touch scrolling
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing curve for smooth virtual inertia
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
      infinite: false
    });

    let animationFrameId;

    function raf(time) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  return <>{children}</>;
}
