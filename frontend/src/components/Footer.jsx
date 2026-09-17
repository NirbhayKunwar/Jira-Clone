import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const TwitterIcon = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GithubIcon = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

export default function Footer({ onGetStarted }) {
  const footerLinks = [
    {
      title: 'Products',
      items: ['Jira Software', 'Confluence']
    },
    {
      title: 'Resources',
      items: ['Agile Coach', 'System Status Page']
    },
    {
      title: 'Support',
      items: ['Help Center', 'Contact Sales Support']
    },
    {
      title: 'Company',
      items: ['About Atlassian', 'Careers & Hiring']
    }
  ];

  return (
    <footer data-section-id="footer" id="footer" className="bg-dominant-offset text-text-secondary border-t border-border-secondary transition-colors duration-300">
      
      {/* Bottom Hero Call to Action banner */}
      <div data-section-id="cta" id="cta" className="bg-card-secondary border-t border-b border-border-secondary py-16 px-4 sm:px-6 lg:px-8 text-center text-text-secondary relative overflow-hidden transition-colors duration-300">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight text-text-secondary">
            Build what's next, <span className="text-accent">together</span>
          </h2>
          <p className="text-text-secondary-muted text-base sm:text-lg max-w-xl mx-auto">
            Get started with Jira Clone today. Free for up to 10 users. No credit card required.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-accent text-white hover:bg-accent-hover px-8 py-3.5 rounded-xl font-bold text-base cursor-pointer border-none shadow-md hover:shadow-lg transition-all"
            >
              Get started free
            </button>
            <a 
              href="#" 
              className="w-full sm:w-auto border border-border-secondary/80 hover:border-accent hover:bg-accent-light/10 text-text-secondary px-8 py-3.5 rounded-xl font-semibold text-base transition-all text-center inline-block"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          
          {/* Logo & Description Column */}
          <div className="col-span-2 space-y-4">
            <a href="#" className="flex items-center space-x-2">
              <div className="w-8 h-8 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path d="M11.5 2C11.5 2 11.5 5.5 8 9C4.5 12.5 1 12.5 1 12.5L7.5 19L11.5 23L15 19.5L11.5 2Z" fill="var(--color-accent)" />
                  <path d="M23 12.5C23 12.5 19.5 12.5 16 9C12.5 5.5 12.5 2 12.5 2L16.5 6L20.5 10L23 12.5Z" fill="var(--color-accent-hover)" />
                  <path d="M12.5 22C12.5 22 16 22 19.5 18.5C23 15 23 11.5 23 11.5L19 15L15 19L12.5 22Z" fill="var(--color-accent)" opacity="0.8" />
                </svg>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-text-secondary flex items-center">
                Jira <span className="text-text-secondary-muted font-normal ml-1">Clone</span>
              </span>
            </a>
            <p className="text-xs text-text-secondary-muted leading-relaxed max-w-sm">
              This application is a feature-rich high-fidelity clone of the Jira landing page, built using Vite, React, and Tailwind CSS v4 to showcase premium interactive components.
            </p>
            {/* Social Icons */}
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-text-secondary-muted hover:text-accent transition-colors">
                <TwitterIcon className="w-4.5 h-4.5" />
              </a>
              <a href="#" className="text-text-secondary-muted hover:text-accent transition-colors">
                <GithubIcon className="w-4.5 h-4.5" />
              </a>
              <a href="#" className="text-text-secondary-muted hover:text-accent transition-colors">
                <LinkedinIcon className="w-4.5 h-4.5" />
              </a>
            </div>
          </div>

          {/* Sitemaps columns */}
          {footerLinks.map((col, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary-muted/80">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <a href="#" className="text-xs text-text-secondary-muted hover:text-text-secondary hover:underline transition-all flex items-center group">
                      <span>{item}</span>
                      <ArrowUpRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom copyright details */}
        <div className="mt-16 pt-8 border-t border-border-secondary flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary-muted">
          <div className="flex items-center space-x-1">
            <span>© {new Date().getFullYear()} Jira Clone Corp. All rights reserved.</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-text-secondary">Privacy Policy</a>
            <a href="#" className="hover:text-text-secondary">Terms of Service</a>
            <a href="#" className="hover:text-text-secondary">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
