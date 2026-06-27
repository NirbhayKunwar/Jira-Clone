import React from 'react';
import { Columns, CalendarRange, Workflow, BarChart3, GitFork, ShieldAlert, Zap, ArrowUpRight } from 'lucide-react';
import SpotlightCard from './animations/SpotlightCard';

const FEATURES = [
  {
    icon: Columns,
    title: 'Customizable Agile Boards',
    description: 'Scrum and Kanban boards offer your team a visual representation of tasks, allowing you to optimize flow and finish sprints faster.',
    color: 'bg-accent-light text-accent'
  },
  {
    icon: CalendarRange,
    title: 'Interactive Roadmaps',
    description: 'Plan project timelines, connect tasks, map dependencies, and communicate progress to stakeholders with Gantt-style views.',
    color: 'bg-jira-green/10 text-jira-green'
  },
  {
    icon: Workflow,
    title: 'No-Code Automation',
    description: 'Save hours by automating tedious tasks with simple rules. Create triggers, conditions, and actions in minutes without writing code.',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
  },
  {
    icon: BarChart3,
    title: 'Agile Reporting & Insights',
    description: 'Access pre-built dashboards, burndown charts, and velocity reports to track team performance and uncover bottlenecks.',
    color: 'bg-jira-yellow/10 text-jira-yellow'
  },
  {
    icon: GitFork,
    title: 'Open DevOps & CI/CD',
    description: 'Integrate directly with GitHub, GitLab, and Bitbucket. View branch status, code commits, and build progress inside Jira issues.',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
  },
  {
    icon: ShieldAlert,
    title: 'Enterprise-Grade Security',
    description: 'Protect sensitive corporate data with bank-level encryption, SAML SSO, session controls, and GDPR / SOC2 certifications.',
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
  }
];

export default function FeaturesGrid() {
  return (
    <section className="py-20 bg-dominant-offset border-t border-border-secondary transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-secondary tracking-tight">
            Key capabilities built for scale
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary-muted">
            Everything your team needs to plan, track, and release software, with customizable configurations to fit any workflow.
          </p>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feat, idx) => {
            const IconComponent = feat.icon;
            return (
              <SpotlightCard 
                key={idx}
                className="bg-card-secondary p-7 rounded-2xl border border-border-secondary shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-200 group flex flex-col justify-between h-full"
              >
                <div>
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feat.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-display font-bold text-lg sm:text-xl text-text-secondary group-hover:text-accent transition-colors duration-150">
                    {feat.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="mt-3 text-sm text-text-secondary-muted leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Learn More link */}
                <div className="mt-6 pt-4 border-t border-border-secondary flex items-center justify-between">
                  <a href="#" className="inline-flex items-center text-xs font-bold text-accent hover:text-accent-hover">
                    <span>Learn how it works</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </a>
                  <span className="text-[10px] text-text-secondary-muted font-bold bg-dominant px-2 py-0.5 rounded uppercase tracking-wider">
                    Core Feature
                  </span>
                </div>
              </SpotlightCard>
            );
          })}
        </div>

        {/* Feature highlight banner */}
        <div className="mt-16 bg-gradient-to-r from-accent to-accent-hover rounded-2xl p-8 sm:p-10 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center space-x-1.5 bg-dominant/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-current text-jira-yellow" />
              <span>Speed Spotlight</span>
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl">
              Tired of slow tool load times?
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Jira 10 loads dashboards 2.4x faster, boards render in under 150ms, and search returns answers instantly. Experience agile velocity at its finest.
            </p>
          </div>
          <div className="flex-shrink-0">
            <a 
              href="#" 
              className="bg-dominant text-accent hover:bg-dominant-offset px-6 py-3 rounded-lg font-bold text-sm shadow inline-block text-center"
            >
              Learn about performance upgrades
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
