import React, { useMemo } from 'react';
import useScrollProgress from '../../hooks/useScrollProgress';
import useMouseParallax from '../../hooks/useMouseParallax';
import useReducedMotion from '../../hooks/useReducedMotion';

const WORKFLOW_NODES = [
  { id: 'plan', label: 'PLAN', x: 15, y: 18, color: 'text-accent', bg: 'bg-accent/10 border-accent/30' },
  { id: 'track', label: 'TRACK', x: 38, y: 28, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'build', label: 'BUILD', x: 62, y: 16, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { id: 'test', label: 'TEST', x: 82, y: 32, color: 'text-jira-yellow', bg: 'bg-jira-yellow/10 border-jira-yellow/30' },
  { id: 'release', label: 'RELEASE', x: 50, y: 48, color: 'text-jira-green', bg: 'bg-jira-green/10 border-jira-green/30' },
  { id: 'deliver', label: 'DELIVER', x: 80, y: 64, color: 'text-accent', bg: 'bg-accent/10 border-accent/30' }
];

export default function InteractiveBackground({ activeSection = 'hero', activeTeamTab = 'software', hoveredIntegration = null }) {
  const { progress } = useScrollProgress();
  const prefersReduced = useReducedMotion();
  const mouse = useMouseParallax(!prefersReduced);

  // Section-aware animation parameters
  const sectionConfig = useMemo(() => {
    switch (activeSection) {
      case 'hero':
        return {
          opacity: 0.9,
          nodeOpacity: 1,
          glowX: 30 + mouse.normalizedX * 10,
          glowY: 20 + mouse.normalizedY * 10,
          pathDashOffset: 0,
          convergeRatio: 0,
          spotlightOpacity: 0
        };
      case 'showcase':
        return {
          opacity: 0.85,
          nodeOpacity: 0.8,
          glowX: 50,
          glowY: 35,
          pathDashOffset: -100,
          convergeRatio: 0.2,
          spotlightOpacity: 0.1
        };
      case 'teams':
        return {
          opacity: 0.8,
          nodeOpacity: 0.7,
          glowX: 45,
          glowY: 48,
          pathDashOffset: -250,
          convergeRatio: 0.4,
          spotlightOpacity: 0.15
        };
      case 'capabilities':
        return {
          opacity: 0.75,
          nodeOpacity: 0.6,
          glowX: 65,
          glowY: 60,
          pathDashOffset: -400,
          convergeRatio: 0.5,
          spotlightOpacity: 0.1
        };
      case 'integrations':
        return {
          opacity: 0.8,
          nodeOpacity: 0.65,
          glowX: 75,
          glowY: 72,
          pathDashOffset: -550,
          convergeRatio: 0.7,
          spotlightOpacity: 0.2
        };
      case 'testimonials':
        return {
          opacity: 0.6,
          nodeOpacity: 0.4,
          glowX: 50,
          glowY: 82,
          pathDashOffset: -700,
          convergeRatio: 0.8,
          spotlightOpacity: 0.35
        };
      case 'faq':
        return {
          opacity: 0.4,
          nodeOpacity: 0.2,
          glowX: 50,
          glowY: 88,
          pathDashOffset: -850,
          convergeRatio: 0.9,
          spotlightOpacity: 0.1
        };
      case 'cta':
        return {
          opacity: 0.95,
          nodeOpacity: 0.3,
          glowX: 50,
          glowY: 94,
          pathDashOffset: -1000,
          convergeRatio: 1.0,
          spotlightOpacity: 0.5
        };
      case 'footer':
        return {
          opacity: 0.15,
          nodeOpacity: 0.1,
          glowX: 50,
          glowY: 98,
          pathDashOffset: -1200,
          convergeRatio: 1.0,
          spotlightOpacity: 0
        };
      default:
        return {
          opacity: 0.8,
          nodeOpacity: 0.8,
          glowX: 50,
          glowY: 30,
          pathDashOffset: 0,
          convergeRatio: 0,
          spotlightOpacity: 0.1
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
      {/* Subtle Background Radial Glow Spotlights */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent blur-3xl transition-all duration-700 ease-out transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${sectionConfig.glowX}%`,
          top: `${sectionConfig.glowY}%`,
          transform: !prefersReduced ? `translate(-50%, -50%) scale(${1 + progress * 0.2})` : 'translate(-50%, -50%)'
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cyan-500/8 via-accent/5 to-transparent blur-3xl transition-all duration-1000 ease-out"
        style={{
          right: '10%',
          top: `${Math.max(10, (1 - progress) * 80)}%`
        }}
      />

      {/* Persistent Ultra-subtle Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-20" />

      {/* SVG Workflow Network Canvas */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 1000">
        <defs>
          <linearGradient id="workflowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent, #0052cc)" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#6554c0" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#00b8d9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-accent, #0052cc)" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Primary Curved Workflow Path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#workflowGradient)"
          strokeWidth="0.6"
          strokeDasharray="6 3"
          strokeDashoffset={sectionConfig.pathDashOffset}
          filter="url(#glow)"
          className="transition-all duration-500 ease-out"
        />

        {/* Secondary Branch Lines for Teams Section */}
        {activeSection === 'teams' && (
          <g className="transition-opacity duration-500">
            <path
              d="M 50 400 C 35 430, 20 460, 15 500"
              fill="none"
              stroke={activeTeamTab === 'software' ? '#0052cc' : 'rgba(0,82,204,0.15)'}
              strokeWidth={activeTeamTab === 'software' ? '0.8' : '0.4'}
              strokeDasharray="4 2"
            />
            <path
              d="M 50 400 C 45 430, 40 460, 38 500"
              fill="none"
              stroke={activeTeamTab === 'product' ? '#6554c0' : 'rgba(101,84,192,0.15)'}
              strokeWidth={activeTeamTab === 'product' ? '0.8' : '0.4'}
              strokeDasharray="4 2"
            />
            <path
              d="M 50 400 C 55 430, 65 460, 62 500"
              fill="none"
              stroke={activeTeamTab === 'it' ? '#de350b' : 'rgba(222,53,11,0.15)'}
              strokeWidth={activeTeamTab === 'it' ? '0.8' : '0.4'}
              strokeDasharray="4 2"
            />
            <path
              d="M 50 400 C 65 430, 80 460, 85 500"
              fill="none"
              stroke={activeTeamTab === 'marketing' ? '#ffab00' : 'rgba(255,171,0,0.15)'}
              strokeWidth={activeTeamTab === 'marketing' ? '0.8' : '0.4'}
              strokeDasharray="4 2"
            />
          </g>
        )}

        {/* Integration Hub Pulse Line */}
        {activeSection === 'integrations' && (
          <g className="transition-opacity duration-300">
            <circle cx="50" cy="720" r="12" fill="none" stroke="#0052cc" strokeWidth="0.4" strokeDasharray="3 3" />
            <circle cx="50" cy="720" r="4" fill="#0052cc" opacity="0.4" />
          </g>
        )}

        {/* Final CTA Converging Beam */}
        {activeSection === 'cta' && (
          <g className="transition-opacity duration-700">
            <path
              d="M 10 880 Q 50 920 50 950"
              fill="none"
              stroke="#0052cc"
              strokeWidth="0.8"
              opacity="0.6"
            />
            <path
              d="M 90 880 Q 50 920 50 950"
              fill="none"
              stroke="#0052cc"
              strokeWidth="0.8"
              opacity="0.6"
            />
            <circle cx="50" cy="950" r="6" fill="#0052cc" opacity="0.8" />
          </g>
        )}
      </svg>

      {/* Floating Interactive Workflow Nodes (PLAN, TRACK, BUILD, TEST, RELEASE, DELIVER) */}
      <div className="absolute inset-0 max-w-7xl mx-auto hidden md:block">
        {WORKFLOW_NODES.map((node) => {
          const parallaxX = !prefersReduced ? mouse.normalizedX * (node.id === 'plan' ? 12 : node.id === 'track' ? -10 : 8) : 0;
          const parallaxY = !prefersReduced ? mouse.normalizedY * (node.id === 'plan' ? 10 : node.id === 'track' ? -8 : 12) : 0;

          return (
            <div
              key={node.id}
              className="absolute transition-all duration-700 ease-out"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                opacity: sectionConfig.nodeOpacity,
                transform: `translate(${parallaxX}px, ${parallaxY}px)`
              }}
            >
              <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border backdrop-blur-xs shadow-xs ${node.bg} ${node.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{node.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
