import React from 'react';
import Navbar from '../Navbar';
import Hero from '../Hero';
import InteractiveShowcase from '../InteractiveShowcase';
import TeamTabs from '../TeamTabs';
import FeaturesGrid from '../FeaturesGrid';
import Integrations from '../Integrations';
import Testimonials from '../Testimonials';
import FAQ from '../FAQ';
import Footer from '../Footer';
import InteractiveBackground from './InteractiveBackground';
import SmoothScrollProvider from '../../providers/SmoothScrollProvider';
import useSectionProgress from '../../hooks/useSectionProgress';

export default function LandingPage({ theme, setTheme, mode, toggleMode, onNavigate }) {
  const { activeSection } = useSectionProgress();

  return (
    <SmoothScrollProvider>
      <div className="relative min-h-screen bg-dominant text-text-secondary overflow-x-hidden">
        {/* Global Interactive Workflow Background */}
        <InteractiveBackground activeSection={activeSection} />

        {/* Foreground Content Layer */}
        <div className="relative z-10">
          <Navbar
            theme={theme}
            setTheme={setTheme}
            mode={mode}
            toggleMode={toggleMode}
            onNavigate={(view) => onNavigate(view === 'landing' ? '/' : `/${view}`)}
          />
          <main>
            <Hero onGetStarted={(email) => onNavigate('signup', { email })} />
            <InteractiveShowcase />
            <TeamTabs />
            <FeaturesGrid />
            <Integrations />
            <Testimonials />
            <FAQ />
          </main>
          <Footer onGetStarted={() => onNavigate('signup')} />
        </div>
      </div>
    </SmoothScrollProvider>
  );
}
