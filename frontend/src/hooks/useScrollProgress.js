import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to track scroll position, normalized scroll progress (0-1), and scroll direction.
 * Uses requestAnimationFrame for high performance without continuous state thrashing.
 */
export function useScrollProgress() {
  const [scrollData, setScrollData] = useState({
    scrollY: 0,
    progress: 0,
    direction: 'down'
  });

  const lastScrollY = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateScroll = () => {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const totalHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      ) - window.innerHeight;

      const progress = totalHeight > 0 ? Math.min(1, Math.max(0, currentScrollY / totalHeight)) : 0;
      const direction = currentScrollY >= lastScrollY.current ? 'down' : 'up';

      if (
        Math.abs(currentScrollY - lastScrollY.current) > 2 ||
        Math.abs(progress - scrollData.progress) > 0.005
      ) {
        lastScrollY.current = currentScrollY;
        setScrollData({
          scrollY: currentScrollY,
          progress,
          direction
        });
      }

      rafId.current = null;
    };

    const handleScroll = () => {
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(updateScroll);
      }
    };

    // Initial calculation
    updateScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return scrollData;
}

export default useScrollProgress;
