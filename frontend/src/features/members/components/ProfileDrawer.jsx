import React, { useState } from 'react';
import { X, Briefcase, MapPin, Mail, Globe, Shield } from 'lucide-react';
import { useUiStore } from '../../../store/uiStore';
import { useMemberProfile } from '../hooks/useMemberProfile';
import TasksTab from './TasksTab';
import ProjectsTab from './ProjectsTab';
import ActivityTab from './ActivityTab';

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function ProfileDrawer() {
  const { isProfileDrawerOpen, selectedMemberId, setProfileDrawer } = useUiStore();
  const { data, isLoading, error } = useMemberProfile(selectedMemberId);
  const [activeTab, setActiveTab] = useState('tasks');

  if (!isProfileDrawerOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/45 z-50 flex justify-end animate-[fade-in_150ms_ease-out] backdrop-blur-xs text-left">
      {/* Background click close */}
      <div className="absolute inset-0" onClick={() => setProfileDrawer(false)} />

      {/* Slide Drawer */}
      <div className="relative w-full max-w-md bg-card-secondary border-l border-border-secondary shadow-2xl h-full flex flex-col z-10 animate-[slide-in_200ms_ease-out]">
        
        {/* Header Close */}
        <div className="flex items-center justify-between p-5 border-b border-border-secondary/35">
          <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center space-x-1.5">
            <Shield className="w-4.5 h-4.5 text-accent" />
            <span>Member Profile Profile</span>
          </h4>
          <button
            onClick={() => setProfileDrawer(false)}
            className="p-1 rounded-lg hover:bg-dominant-offset text-text-secondary-muted hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error / Content */}
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-text-secondary-muted text-xs font-semibold">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2.5" />
            <span>Fetching profile details...</span>
          </div>
        ) : error ? (
          <div className="flex-grow p-12 text-center text-xs font-bold text-red-500">
            <span>Error: {error.message}</span>
          </div>
        ) : !data ? (
          <div className="flex-grow p-12 text-center text-xs font-bold text-text-secondary-muted">
            <span>No profile data.</span>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col">
            {/* Top Identity details card */}
            <div className="p-6 bg-dominant-offset/10 border-b border-border-secondary/20 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xl border border-white/10 shadow-md">
                  {data.profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-text-secondary leading-tight">{data.profile.name}</h4>
                  <div className="text-[11px] text-text-secondary-muted font-bold uppercase mt-1 tracking-wider flex items-center gap-1.5">
                    <span className="text-accent">{data.profile.role}</span>
                    <span>•</span>
                    <span>{data.profile.workspaceRole}</span>
                  </div>
                </div>
              </div>

              {/* Workload Indicator Bar */}
              <div className="space-y-1.5 bg-card-secondary/50 border border-border-secondary/35 p-3 rounded-lg">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary-muted">
                  <span>Workload Saturation</span>
                  <span className={
                    data.tasks.workloadStatus === 'Overloaded' ? 'text-red-500' :
                    data.tasks.workloadStatus === 'Optimal' ? 'text-accent' : 'text-text-secondary-muted'
                  }>{data.tasks.workloadStatus}</span>
                </div>
                <div className="w-full bg-dominant rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      data.tasks.workloadStatus === 'Overloaded' ? 'bg-red-500' :
                      data.tasks.workloadStatus === 'Optimal' ? 'bg-accent' : 'bg-slate-400 dark:bg-slate-700'
                    }`}
                    style={{ width: `${Math.min((data.tasks.activeCount / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Metadata rows */}
              <div className="space-y-2 text-xs text-text-secondary-muted font-medium pt-2">
                <div className="flex items-center space-x-2.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{data.profile.email}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{data.profile.dept}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{data.profile.location}</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center space-x-2.5 pt-2 border-t border-border-secondary/20">
                {data.profile.githubUrl && (
                  <a href={data.profile.githubUrl} target="_blank" rel="noreferrer" className="text-text-secondary-muted hover:text-text-secondary p-1 rounded hover:bg-dominant-offset">
                    <GithubIcon className="w-4 h-4" />
                  </a>
                )}
                {data.profile.linkedinUrl && (
                  <a href={data.profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-text-secondary-muted hover:text-text-secondary p-1 rounded hover:bg-dominant-offset">
                    <LinkedinIcon className="w-4 h-4" />
                  </a>
                )}
                {data.profile.websiteUrl && (
                  <a href={data.profile.websiteUrl} target="_blank" rel="noreferrer" className="text-text-secondary-muted hover:text-text-secondary p-1 rounded hover:bg-dominant-offset">
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border-secondary/35 bg-card-secondary sticky top-0 z-10 px-4">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-grow py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                  activeTab === 'tasks' ? 'border-accent text-accent' : 'border-transparent text-text-secondary-muted hover:text-text-secondary'
                }`}
              >
                Tasks ({data.tasks.activeCount})
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex-grow py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                  activeTab === 'projects' ? 'border-accent text-accent' : 'border-transparent text-text-secondary-muted hover:text-text-secondary'
                }`}
              >
                Projects ({data.projects.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-grow py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                  activeTab === 'activity' ? 'border-accent text-accent' : 'border-transparent text-text-secondary-muted hover:text-text-secondary'
                }`}
              >
                Timeline
              </button>
            </div>

            {/* Tab content panel */}
            <div className="p-6 flex-grow">
              {activeTab === 'tasks' && <TasksTab tasks={data.tasks} />}
              {activeTab === 'projects' && <ProjectsTab projects={data.projects} />}
              {activeTab === 'activity' && <ActivityTab activities={data.activities} />}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
