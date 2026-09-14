import { useState, useEffect, useRef } from 'react';

/**
 * Section order for landing page workflow journey:
 * hero -> showcase -> teams -> capabilities -> integrations -> testimonials -> faq -> cta -> footer
 */
export const SECTION_IDS = [
  'hero',
  'showcase',
  'teams',
  'capabilities',
  'integrations',
  'testimonials',
  'faq',
  'cta',
  'footer'
];

/**
 * High-performance IntersectionObserver hook to track the active landing page section
 * and section visibility ratios.
 */
export function useSectionProgress() {
  const [activeSection, setActiveSection] = useState('hero');
  const [sectionRatios, setSectionRatios] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const options = {
      root: null,
      rootMargin: '-10% 0px -20% 0px',
      threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0]
    };

    const handleIntersect = (entries) => {
      const updatedRatios = {};
      let highestRatio = -1;
      let mostVisibleSection = activeSection;

      entries.forEach((entry) => {
        const id = entry.target.dataset.sectionId || entry.target.id;
        if (!id) return;

        const ratio = entry.intersectionRatio;
        updatedRatios[id] = ratio;

        if (ratio > highestRatio && entry.isIntersecting) {
          highestRatio = ratio;
          mostVisibleSection = id;
        }
      });

      setSectionRatios((prev) => ({ ...prev, ...updatedRatios }));

      if (mostVisibleSection && mostVisibleSection !== activeSection && highestRatio > 0.1) {
        setActiveSection(mostVisibleSection);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, options);

    // Observe elements with data-section-id or section elements
    const targets = document.querySelectorAll('[data-section-id], section[id]');
    targets.forEach((target) => observerRef.current.observe(target));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeSection]);

  return {
    activeSection,
    sectionRatios,
    sectionIndex: SECTION_IDS.indexOf(activeSection)
  };
}

export default useSectionProgress;
