import { useRef, useEffect } from 'react';

export function useZeroReflowAutoScroll(containerRef, isDragging) {
  const boundsRef = useRef(null);
  const mousePosRef = useRef({ y: 0 });

  // Cache container bounds ONCE when drag begins to prevent layout thrashing
  useEffect(() => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      boundsRef.current = { top: rect.top, bottom: rect.bottom, height: rect.height };
    }
  }, [isDragging, containerRef]);

  useEffect(() => {
    if (!isDragging) return;

    let rafId;
    const SCROLL_THRESHOLD = 60; // px distance from container edge to trigger scroll
    const MAX_SPEED = 15;        // max px step per frame

    const scrollLoop = () => {
      const bounds = boundsRef.current;
      const container = containerRef.current;

      if (bounds && container) {
        const { y } = mousePosRef.current;

        if (y < bounds.top + SCROLL_THRESHOLD) {
          const intensity = (bounds.top + SCROLL_THRESHOLD - y) / SCROLL_THRESHOLD;
          container.scrollTop -= intensity * MAX_SPEED;
        } else if (y > bounds.bottom - SCROLL_THRESHOLD) {
          const intensity = (y - (bounds.bottom - SCROLL_THRESHOLD)) / SCROLL_THRESHOLD;
          container.scrollTop += intensity * MAX_SPEED;
        }
      }
      rafId = requestAnimationFrame(scrollLoop);
    };

    const handlePointerMove = (e) => {
      mousePosRef.current.y = e.clientY;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    rafId = requestAnimationFrame(scrollLoop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [isDragging, containerRef]);
}
