import { useState, useEffect, useRef } from 'react';

/**
 * Throttled mouse position hook for Hero parallax nodes.
 * Disabled on touch/mobile devices and when prefers-reduced-motion is active.
 */
export function useMouseParallax(enabled = true) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const rafId = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Disable mouse parallax on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const handleMouseMove = (e) => {
      if (rafId.current) return;

      rafId.current = requestAnimationFrame(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const x = e.clientX - width / 2;
        const y = e.clientY - height / 2;
        const normalizedX = (x / (width / 2));
        const normalizedY = (y / (height / 2));

        setMousePosition({
          x,
          y,
          normalizedX: Math.max(-1, Math.min(1, normalizedX)),
          normalizedY: Math.max(-1, Math.min(1, normalizedY))
        });
        rafId.current = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [enabled]);

  return mousePosition;
}

export default useMouseParallax;
