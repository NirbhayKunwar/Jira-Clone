import React, { useMemo } from 'react';
import useScrollProgress from '../../hooks/useScrollProgress';
import useMouseParallax from '../../hooks/useMouseParallax';
import useReducedMotion from '../../hooks/useReducedMotion';

export default function InteractiveBackground({ activeSection = 'hero', activeTeamTab = 'software' }) {
  const { progress } = useScrollProgress();
  const prefersReduced = useReducedMotion();
  const mouse = useMouseParallax(!prefersReduced);

  // Section-aware animation parameters (ultra-minimalist opacities)
  const sectionConfig = useMemo(() => {
    switch (activeSection) {
      case 'hero':
        return {
          opacity: 0.85,
          glowX: 30 + mouse.normalizedX * 8,
          glowY: 20 + mouse.normalizedY * 8,
          pathDashOffset: 0,
        };
      case 'showcase':
        return {
          opacity: 0.75,
          glowX: 50,
          glowY: 35,
          pathDashOffset: -100,
        };
      case 'teams':
        return {
          opacity: 0.7,
          glowX: 45,
          glowY: 48,
          pathDashOffset: -250,
        };
      case 'capabilities':
        return {
          opacity: 0.65,
          glowX: 65,
          glowY: 60,
          pathDashOffset: -400,
        };
      case 'integrations':
        return {
          opacity: 0.7,
          glowX: 75,
          glowY: 72,
          pathDashOffset: -550,
        };
      case 'testimonials':
        return {
          opacity: 0.55,
          glowX: 50,
          glowY: 82,
          pathDashOffset: -700,
        };
      case 'faq':
        return {
          opacity: 0.4,
          glowX: 50,
          glowY: 88,
          pathDashOffset: -850,
        };
      case 'cta':
        return {
          opacity: 0.85,
          glowX: 50,
          glowY: 94,
          pathDashOffset: -1000,
        };
      case 'footer':
        return {
          opacity: 0.15,
          glowX: 50,
          glowY: 98,
          pathDashOffset: -1200,
        };
      default:
        return {
          opacity: 0.7,
          glowX: 50,
          glowY: 30,
          pathDashOffset: 0,
        };
    }
  }, [activeSection, mouse.normalizedX, mouse.normalizedY]);

  // Compute SVG workflow path morphing coordinates based on scroll progress
  const pathD = useMemo(() => {
    const p = Math.min(1, Math.max(0, progress));
    const startX = 15;
    const endX = 85;
    const cp1Y = 20 + p * 30;
    const cp2Y = 60 - p * 20;

    return `M ${startX} 150 C ${30 + p * 20} ${cp1Y}, ${70 - p * 20} ${cp2Y}, ${endX} 850`;
  }, [progress]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700 ease-out"
      style={{ opacity: sectionConfig.opacity }}
      aria-hidden="true"
    >
      {/* Ultra-faint Ambient Glow Spotlights */}
      <div
        className="absolute w-[650px] h-[650px] rounded-full bg-gradient-to-br from-accent/5 via-purple-500/3 to-transparent blur-3xl transition-all duration-700 ease-out transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${sectionConfig.glowX}%`,
          top: `${sectionConfig.glowY}%`,
          transform: !prefersReduced ? `translate(-50%, -50%) scale(${1 + progress * 0.15})` : 'translate(-50%, -50%)'
        }}
      />
      <div
        className="absolute w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-cyan-500/4 via-accent/3 to-transparent blur-3xl transition-all duration-1000 ease-out"
        style={{
          right: '8%',
          top: `${Math.max(10, (1 - progress) * 80)}%`
        }}
      />

      {/* Persistent Ultra-subtle Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 dark:opacity-10" />

      {/* SVG Flow Network Canvas */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 1000">
        <defs>
          <linearGradient id="workflowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent, #0052cc)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#6554c0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-accent, #0052cc)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Primary Curved Workflow Line */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#workflowGradient)"
          strokeWidth="0.4"
          strokeDasharray="4 4"
          strokeDashoffset={sectionConfig.pathDashOffset}
          className="transition-all duration-500 ease-out"
        />

        {/* Secondary Branch Lines for Teams Section */}
        {activeSection === 'teams' && (
          <g className="transition-opacity duration-500">
            <path
              d="M 50 400 C 35 430, 20 460, 15 500"
              fill="none"
              stroke={activeTeamTab === 'software' ? 'rgba(0,82,204,0.3)' : 'rgba(0,82,204,0.08)'}
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
            <path
              d="M 50 400 C 45 430, 40 460, 38 500"
              fill="none"
              stroke={activeTeamTab === 'product' ? 'rgba(101,84,192,0.3)' : 'rgba(101,84,192,0.08)'}
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
            <path
              d="M 50 400 C 55 430, 65 460, 62 500"
              fill="none"
              stroke={activeTeamTab === 'it' ? 'rgba(222,53,11,0.3)' : 'rgba(222,53,11,0.08)'}
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
            <path
              d="M 50 400 C 65 430, 80 460, 85 500"
              fill="none"
              stroke={activeTeamTab === 'marketing' ? 'rgba(255,171,0,0.3)' : 'rgba(255,171,0,0.08)'}
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
          </g>
        )}

        {/* Integration Hub Pulse Line */}
        {activeSection === 'integrations' && (
          <g className="transition-opacity duration-300">
            <circle cx="50" cy="720" r="10" fill="none" stroke="rgba(0,82,204,0.2)" strokeWidth="0.3" strokeDasharray="2 2" />
            <circle cx="50" cy="720" r="3" fill="#0052cc" opacity="0.25" />
          </g>
        )}
      </svg>
    </div>
  );
}

