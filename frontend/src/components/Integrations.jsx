import React, { useState } from 'react';
import { GitBranch, MessageSquare, Paintbrush, Code, Workflow, Layers, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Integrations' },
  { id: 'dev', label: 'Developer Tools' },
  { id: 'devops', label: 'DevOps & CI/CD' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'design', label: 'Design' }
];

const INTEGRATIONS_DATA = [
  {
    name: 'GitHub',
    category: 'dev',
    desc: 'Link commits, branches, and PRs to Jira tickets automatically.',
    icon: GitBranch,
    accent: 'border-t-black dark:border-t-white/20',
    badge: 'Popular'
  },
  {
    name: 'Slack',
    category: 'collaboration',
    desc: 'Get instant ticket updates and create tickets directly from Slack channels.',
    icon: MessageSquare,
    accent: 'border-t-[#4A154B] dark:border-t-purple-500/80',
    badge: 'Popular'
  },
  {
    name: 'Figma',
    category: 'design',
    desc: 'Embed Figma design mockups inside Jira ticket descriptions.',
    icon: Paintbrush,
    accent: 'border-t-[#F24E1E] dark:border-t-orange-500/80',
    badge: 'Design Standard'
  },
  {
    name: 'VS Code',
    category: 'dev',
    desc: 'View assigned issues and update statuses inside your editor workspace.',
    icon: Code,
    accent: 'border-t-[#007ACC] dark:border-t-blue-500/80',
    badge: 'Developer Choice'
  },
  {
    name: 'Jenkins',
    category: 'devops',
    desc: 'Track build success, pipelines, and deployment status inside issue fields.',
    icon: Workflow,
    accent: 'border-t-[#D33837] dark:border-t-red-500/80',
    badge: 'CI/CD'
  },
  {
    name: 'Confluence',
    category: 'collaboration',
    desc: 'Link specifications and product requirements directly to tracking boards.',
    icon: Layers,
    accent: 'border-t-accent',
    badge: 'First-party'
  }
];

export default function Integrations() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredIntegrations = selectedCategory === 'all'
    ? INTEGRATIONS_DATA
    : INTEGRATIONS_DATA.filter(item => item.category === selectedCategory);

  return (
    <section className="relative py-20 bg-dominant transition-colors duration-300 overflow-hidden">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <span className="text-xs font-bold text-accent bg-accent-light px-3 py-1 rounded-full uppercase tracking-wider">
              Ecosystem & Plugins
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-secondary tracking-tight leading-tight">
              Connect with the tools you already use
            </h2>
            <p className="text-text-secondary-muted text-sm sm:text-base leading-relaxed">
              Jira integrates seamlessly with over 3,000+ developer, design, and collaboration tools. Eliminate context-switching and let information flow naturally.
            </p>

            {/* Category selection */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'text-text-secondary-muted border-border-secondary hover:bg-dominant-offset hover:text-text-secondary'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="pt-2 hidden lg:block">
              <a href="#" className="inline-flex items-center text-sm font-bold text-accent hover:text-accent-hover group">
                <span>Browse Atlassian Marketplace</span>
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* Right Column: Cards */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredIntegrations.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
                    className={`bg-card-secondary p-6 rounded-xl border-x border-b border-t-4 border-border-secondary shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between h-52 group ${item.accent}`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-9 h-9 rounded-lg bg-dominant shadow-sm border border-border-secondary flex items-center justify-center text-text-secondary group-hover:scale-105 transition-transform">
                          <ItemIcon className="w-5 h-5 text-text-secondary-muted" />
                        </div>
                        <span className="text-[9px] uppercase font-bold text-text-secondary-muted bg-dominant-offset px-2 py-0.5 rounded border border-border-secondary tracking-wider">
                          {item.badge}
                        </span>
                      </div>

                      {/* Info */}
                      <h4 className="font-bold text-text-secondary text-base">{item.name}</h4>
                      <p className="text-xs text-text-secondary-muted mt-2 leading-relaxed line-clamp-3">
                        {item.desc}
                      </p>
                    </div>

                    {/* Footer Trigger */}
                    <div className="mt-4 flex justify-end">
                      <a href="#" className="text-[10px] font-bold text-text-secondary-muted group-hover:text-accent transition-colors flex items-center">
                        <span>Setup Integration</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
