import React, { useState } from 'react';
import { Play, Check, ShieldCheck } from 'lucide-react';


export default function Hero({ onGetStarted }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      onGetStarted(email);
      setEmail('');
    }
  };

  return (
    <section data-section-id="hero" id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 bg-gradient-to-b from-accent-light/20 via-dominant to-dominant overflow-hidden transition-colors duration-300">




      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Banner Pill */}
        <div className="inline-flex items-center space-x-2 bg-accent-light text-accent px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-6">
          <span>Introducing Jira 10</span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-text-secondary tracking-tight leading-tight max-w-4xl mx-auto">
          Move fast, stay aligned, and build better <span className="font-extrabold">together</span>.
        </h1>

        {/* Sub-headline */}
        <p className="mt-6 text-lg md:text-xl text-text-secondary-muted max-w-2xl mx-auto leading-relaxed">
          The #1 software development tool used by agile teams to plan, track, release, and support world-class software.
        </p>

        {/* Sign up form */}
        <div className="mt-10 max-w-md mx-auto sm:max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="email"
              placeholder="Enter your work email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-grow px-4 py-3.5 text-base rounded border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-inner bg-card-secondary text-text-secondary transition-colors duration-300"
            />
            <button
              type="submit"
              className="bg-accent hover:bg-accent-hover text-white px-6 py-3.5 text-base w-full sm:w-auto font-bold rounded shadow-sm cursor-pointer border-none"
            >
              Get it free
            </button>
          </form>

          {/* Social Proof Badges / Assurances */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-secondary-muted">
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-jira-green mr-1.5" />
              Free for up to 10 users
            </span>
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-jira-green mr-1.5" />
              No credit card required
            </span>
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-accent mr-1.5" />
              GDPR & SOC2 Compliant
            </span>
          </div>
        </div>

        {/* Secondary Call to Action */}
        <div className="mt-8 flex justify-center space-x-4">
          <button 
            onClick={() => {
              const showcase = document.getElementById('product-demo');
              if (showcase) showcase.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center text-sm font-semibold text-accent hover:text-accent-hover group cursor-pointer"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-light mr-2">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </span>
            See it in action
          </button>
        </div>
      </div>
    </section>
  );
}
