import React, { useState } from 'react';
import { Terminal, Lightbulb, Shield, Briefcase, ChevronRight, Star } from 'lucide-react';
import TiltedCard from './animations/TiltedCard';

const TEAM_DATA = [
  {
    id: 'software',
    label: 'Software Development',
    icon: Terminal,
    title: 'The #1 software development tool for agile teams',
    description: 'Jira Software is built specifically for software teams, offering unmatched support for Scrum, Kanban, and hybrid methodologies. Plan sprints, track issues across your development lifecycle, and ship with confidence.',
    bullets: [
      'Agile boards: Custom Scrum and Kanban boards keep sprint backlogs organized.',
      'Developer tool integrations: Connect branch creations, commits, and PRs from GitHub directly to tickets.',
      'Release hubs: Track deployments, environments, and feature flags in one dashboard.'
    ],
    cta: 'Explore Software Features',
    visual: {
      header: 'Dev Workflow: JIRA-420',
      tag: 'Ready to Deploy',
      tagColor: 'bg-jira-green/10 text-jira-green',
      metricTitle: 'Commits Linked',
      metricVal: '14 Commits (4 PRs merged)',
      progressVal: 92,
      subItems: [
        { label: 'Feature Branch: oauth-v2-auth-flow', ok: true },
        { label: 'Unit Tests passing (182/182)', ok: true },
        { label: 'Linter and security checks approved', ok: true },
        { label: 'Build deployment to Staging success', ok: true }
      ]
    }
  },
  {
    id: 'product',
    label: 'Product Management',
    icon: Lightbulb,
    title: 'Prioritize ideas, plan roadmaps, and align teams',
    description: 'Jira Product Discovery helps product managers capture ideas, prioritize them based on real customer impact, and share interactive roadmaps with stakeholders to align on goals.',
    bullets: [
      'Idea collection: Log product concepts and assign scores for impact, effort, and confidence.',
      'Roadmap matrices: Create visual roadmap views to justify feature priorities to executive leadership.',
      'Customer insights: Tag user feedback directly to backlog ideas for clear context.'
    ],
    cta: 'Explore Product Discovery',
    visual: {
      header: 'Q3 Product Priorities',
      tag: 'Planning Phase',
      tagColor: 'bg-accent-light text-accent',
      metricTitle: 'Idea Score Matrix',
      metricVal: 'Top Choice: "AI Assistant Integration" (Impact 9.2, Effort 5.0)',
      progressVal: 65,
      subItems: [
        { label: 'AI Assistant integration (Score: 82)', ok: true },
        { label: 'Global Search optimization (Score: 68)', ok: true },
        { label: 'Multi-workspace file sharing (Score: 54)', ok: true },
        { label: 'Offline offline synchronization (Score: 41)', ok: false }
      ]
    }
  },
  {
    id: 'it',
    label: 'IT & Service Desk',
    icon: Shield,
    title: 'High-velocity ITSM for dev, IT, and operations',
    description: 'Jira Service Management empowers support and IT teams to respond to incidents, changes, and service requests rapidly, closing the gap between developers and IT.',
    bullets: [
      'Incident management: Instantly link support tickets to software bugs to resolve downtime fast.',
      'SLA tracking: Set specific response and resolution times for varying priority tiers.',
      'Self-service portals: Deflect tickets with Confluence-backed knowledge base queries.'
    ],
    cta: 'Explore Service Management',
    visual: {
      header: 'IT Service Queue',
      tag: 'SLA Active',
      tagColor: 'bg-jira-red/10 text-jira-red',
      metricTitle: 'Average Response Time',
      metricVal: '14.2 minutes (Target: < 30 mins)',
      progressVal: 98,
      subItems: [
        { label: 'Incident #889: Database API downtime', ok: true },
        { label: 'SLA: Response met in 2 mins', ok: true },
        { label: 'Linked PR: hotfix/db-pool-reconnect', ok: true },
        { label: 'Incident review scheduled for Friday', ok: false }
      ]
    }
  },
  {
    id: 'marketing',
    label: 'Marketing & Business Ops',
    icon: Briefcase,
    title: 'Streamline team campaigns, workflows, and budgets',
    description: 'Jira Work Management brings Jira’s power to business teams (Marketing, HR, Finance). Track campaign deadlines, organize content calendars, and streamline creative briefings.',
    bullets: [
      'Content calendars: Visualize asset schedules in timeline, list, or calendar forms.',
      'Form builder: Collect creative briefs and asset requests with custom fields.',
      'Approval workflows: Track progress from copywriting to design review to launch.'
    ],
    cta: 'Explore Work Management',
    visual: {
      header: 'Q3 Marketing Launch Campaign',
      tag: 'In Progress',
      tagColor: 'bg-jira-yellow/10 text-jira-yellow',
      metricTitle: 'Deliverables Ready',
      metricVal: '18 of 24 creative assets approved',
      progressVal: 75,
      subItems: [
        { label: 'Write announcement email sequence', ok: true },
        { label: 'Design blog banner & social images', ok: true },
        { label: 'Set up promotion landing page', ok: true },
        { label: 'Schedule newsletter and press release', ok: false }
      ]
    }
  }
];

export default function TeamTabs() {
  const [activeTab, setActiveTab] = useState('software');

  const selectedTeam = TEAM_DATA.find(t => t.id === activeTab);
  const IconComponent = selectedTeam.icon;

  return (
    <section data-section-id="teams" id="teams" className="relative py-20 bg-dominant transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-secondary tracking-tight">
            One platform to connect every team
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary-muted">
            Jira connects work across your entire organization, aligning software dev, IT support, product, and business.
          </p>
        </div>

        {/* Tab Buttons Container */}
        <div className="flex flex-wrap justify-center gap-2 border-b border-border-secondary pb-4 mb-12">
          {TEAM_DATA.map((team) => {
            const ButtonIcon = team.icon;
            const isActive = team.id === activeTab;
            return (
              <button
                key={team.id}
                onClick={() => setActiveTab(team.id)}
                className={`flex items-center space-x-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-accent-light text-accent shadow-sm border border-accent/20'
                    : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                }`}
              >
                <ButtonIcon className={`w-4.5 h-4.5 ${isActive ? 'text-accent' : 'text-text-secondary-muted'}`} />
                <span>{team.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex p-2.5 bg-accent-light rounded-xl">
              <IconComponent className="w-6 h-6 text-accent" />
            </div>
            
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-text-secondary leading-tight">
              {selectedTeam.title}
            </h3>
            
            <p className="text-text-secondary-muted leading-relaxed">
              {selectedTeam.description}
            </p>

            <ul className="space-y-3">
              {selectedTeam.bullets.map((bullet, idx) => {
                const [boldText, rest] = bullet.split(':');
                return (
                  <li key={idx} className="flex items-start text-sm text-text-secondary">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-jira-green/10 text-jira-green mr-3 flex-shrink-0 mt-0.5">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <span>
                      <strong className="text-text-secondary font-semibold">{boldText}:</strong>{rest}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="pt-4">
              <a
                href="#"
                className="inline-flex items-center bg-card-secondary hover:bg-dominant-offset text-text-secondary px-5 py-3 rounded-lg text-sm font-bold border border-border-secondary group"
              >
                <span>{selectedTeam.cta}</span>
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </a>
            </div>
          </div>

          {/* Right Column: Dynamic Code mockup frame */}
          <div className="lg:col-span-7 relative px-4 sm:px-0">
            {/* Grid pattern layer behind the card for extra depth */}
            <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-30 pointer-events-none -z-10 rounded-3xl" />
            <TiltedCard>
              <div className="bg-dominant-offset p-5 sm:p-7 rounded-2xl border border-border-secondary shadow-lg relative">
                <div className="absolute -top-3 -right-3 bg-accent text-white p-2 rounded-xl shadow-md pointer-events-none hidden sm:block animate-bounce">
                  <Star className="w-5 h-5 fill-current" />
                </div>

                {/* Inner Dashboard Card */}
                <div className="bg-card-secondary rounded-xl border border-border-secondary shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-dominant-offset border-b border-border-secondary px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-text-secondary text-xs sm:text-sm font-mono">
                      {selectedTeam.visual.header}
                    </span>
                    <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedTeam.visual.tagColor}`}>
                      {selectedTeam.visual.tag}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-5">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary-muted block">
                        {selectedTeam.visual.metricTitle}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-text-secondary block mt-1 bg-accent-light p-2.5 rounded border border-accent/20">
                        {selectedTeam.visual.metricVal}
                      </span>
                    </div>

                    {/* Checklist Subitems */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary-muted block">
                        Requirements Checklist
                      </span>
                      <div className="grid gap-2.5">
                        {selectedTeam.visual.subItems.map((sub, idx) => (
                          <div key={idx} className="flex items-center space-x-3 text-xs text-text-secondary">
                            <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              sub.ok ? 'bg-jira-green/10 text-jira-green' : 'bg-dominant-offset text-text-secondary-muted/40'
                            }`}>
                              {sub.ok ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary-muted" />
                              )}
                            </div>
                            <span className={`${sub.ok ? 'text-text-secondary' : 'line-through text-text-secondary-muted/60'}`}>{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 border-t border-border-secondary">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-secondary-muted font-medium">Sprint Completion</span>
                        <span className="font-bold text-accent">{selectedTeam.visual.progressVal}%</span>
                      </div>
                      <div className="w-full h-2 bg-dominant-offset rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent transition-all duration-500" 
                          style={{ width: `${selectedTeam.visual.progressVal}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TiltedCard>
          </div>
        </div>
      </div>
    </section>
  );
}
