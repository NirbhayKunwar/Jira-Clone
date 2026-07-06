import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Kanban, Layers, ArrowRight, ArrowLeft, Check, Loader2, 
  Sparkles, Clock, Sliders, X, Info 
} from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function WorkspaceSetup() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  
  const canCancel = user?.hasConfiguredWorkspace && workspaces.length > 0;
  const [step, setStep] = useState(1); // 1: Choose Template, 2: Configure Settings, 3: Loader
  const [template, setTemplate] = useState('scrum'); // 'scrum' or 'kanban'
  
  // Settings Form States
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [boardName, setBoardName] = useState('');
  const [description, setDescription] = useState('');
  const [sprintDuration, setSprintDuration] = useState('2'); // in weeks, for scrum
  const [wipLimit, setWipLimit] = useState('5'); // for kanban
  
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [error, setError] = useState('');
  const [loadingStatus, setLoadingStatus] = useState('Initializing workspace...');

  // Auto-generate project key and board name from workspace name in the input handler to avoid cascading renders
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    
    if (val.trim()) {
      const words = val.trim().split(/\s+/);
      const autoKeyRaw = words.length === 1
        ? words[0].slice(0, 3).toUpperCase()
        : words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
      // Clean non-alphanumeric
      const autoKey = autoKeyRaw.replace(/[^A-Z0-9]/g, '');
      setKey(autoKey);
      setBoardName(`${val.trim()} Board`);
    } else {
      setKey('');
      setBoardName('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !boardName.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    setStep(3);
    setLoading(true);

    const statuses = [
      'Creating database records...',
      'Setting up project columns...',
      `Generating ${template === 'scrum' ? 'Scrum Sprints & Backlog' : 'Kanban WIP limits'}...`,
      'Seeding default workflow tasks...',
      'Wrapping up...'
    ];

    // Cycle through status messages to create a rich onboarding feedback loop
    let statusIndex = 0;
    const interval = setInterval(() => {
      if (statusIndex < statuses.length - 1) {
        statusIndex++;
        setLoadingStatus(statuses[statusIndex]);
      }
    }, 500);

    try {
      const token = localStorage.getItem('jira_token');
      const response = await fetch(`${API_URL}/api/workspaces`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: name.trim(),
          key: key.toUpperCase().trim(),
          template_type: template,
          board_name: boardName.trim(),
          description: description.trim(),
          sprint_duration: template === 'scrum' ? parseInt(sprintDuration) : null,
          wip_limit: template === 'kanban' ? parseInt(wipLimit) : null
        })
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw new Error(resJson.message || 'Failed to create workspace.');
      }

      const newWorkspace = resJson.data || resJson;

      // Finish loading
      setTimeout(async () => {
        clearInterval(interval);
        setLoading(false);
        
        // Update local workspace list and selection
        const currentWorkspaces = Array.isArray(workspaces) ? workspaces : [];
        setWorkspaces([...currentWorkspaces, newWorkspace]);
        setActiveWorkspace(newWorkspace);

        // Update user config in DB if needed
        if (user && !user.hasConfiguredWorkspace) {
          try {
            const token = localStorage.getItem('jira_token');
            const profileRes = await fetch(`${API_URL}/api/auth/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
              },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                hasConfiguredWorkspace: true
              })
            });
            if (profileRes.ok) {
              const updatedData = await profileRes.json();
              updateProfile(updatedData.user);
            }
          } catch (profileErr) {
            console.error('Error updating user configuration state:', profileErr);
          }
        }

        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setStep(2);
      setError(err.message || 'Something went wrong while setting up the workspace.');
    }
  };

  return (
    <div className="min-h-screen bg-dominant flex items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">
      


      {/* Main Card */}
      <div className="w-full max-w-4xl bg-card-secondary border border-border-secondary/60 rounded-3xl shadow-xl flex flex-col relative z-10 overflow-hidden animate-[fade-in_300ms_ease-out]">
        
        {/* Close/Cancel Button */}
        {canCancel && step !== 3 && (
          <button 
            onClick={() => navigate('/dashboard')}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-dominant-offset text-text-secondary-muted hover:text-text-secondary cursor-pointer border-none bg-transparent"
            title="Cancel Setup"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Progress Bar (hidden in loader step) */}
        {step !== 3 && (
          <div className="w-full h-1 bg-dominant flex">
            <div 
              className="h-full bg-accent transition-all duration-300" 
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row h-full">
          
          {/* Left Panel: Description & Info */}
          <div className="w-full md:w-1/3 bg-dominant-offset/30 border-r border-border-secondary/40 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M11.5 2C11.5 2 11.5 5.5 8 9C4.5 12.5 1 12.5 1 12.5L7.5 19L11.5 23L15 19.5L11.5 2Z" fill="var(--color-accent)" />
                    <path d="M23 12.5C23 12.5 19.5 12.5 16 9C12.5 5.5 12.5 2 12.5 2L16.5 6L20.5 10L23 12.5Z" fill="var(--color-accent-hover)" />
                    <path d="M12.5 22C12.5 22 16 22 19.5 18.5C23 15 23 11.5 23 11.5L19 15L15 19L12.5 22Z" fill="var(--color-accent)" opacity="0.8" />
                  </svg>
                </div>
                <span className="font-display font-extrabold text-lg text-accent">Jira Clone</span>
              </div>

              <div>
                <h2 className="text-xl font-display font-extrabold text-text-secondary">Project Setup</h2>
                <p className="text-xs text-text-secondary-muted mt-2 leading-relaxed">
                  Start your journey by selecting a template that represents how your team works. Customize settings to configure sprints, limits, and columns.
                </p>
              </div>

              {step === 1 && (
                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 space-y-3">
                  <h4 className="text-xs font-bold text-text-secondary flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-accent mr-1.5" />
                    How to choose?
                  </h4>
                  <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                    Choose <strong>Scrum</strong> if your team works in time-boxed intervals (sprints) and manages a product backlog.
                  </p>
                  <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                    Choose <strong>Kanban</strong> to manage continuous flows of work and limit work-in-progress to reduce bottlenecks.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 space-y-3">
                  <h4 className="text-xs font-bold text-text-secondary flex items-center">
                    <Info className="w-3.5 h-3.5 text-accent mr-1.5" />
                    Workspace Settings
                  </h4>
                  <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                    <strong>Project Key:</strong> Unique prefix code (e.g. ENG, DES) prepended to issue names (e.g. ENG-101) to identify tasks.
                  </p>
                  {template === 'scrum' ? (
                    <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                      <strong>Sprint Duration:</strong> Sprints will automatically run for the selected duration, organizing tasks in cycles.
                    </p>
                  ) : (
                    <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                      <strong>WIP Limits:</strong> Keeps tasks in "In Progress" column strictly capped to prevent team overload.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-[10px] text-text-secondary-muted pt-6">
              Need help? Read our workspace templates documentation.
            </div>
          </div>

          {/* Right Panel: Active Step Content */}
          <div className="w-full md:w-2/3 p-8 flex flex-col justify-between">
            
            {/* STEP 1: CHOOSE TEMPLATE */}
            {step === 1 && (
              <div className="space-y-6 flex-grow">
                <div>
                  <h3 className="text-lg font-bold text-text-secondary">Choose a project template</h3>
                  <p className="text-xs text-text-secondary-muted mt-1">Select the operational methodology that fits your workflow best.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2" role="radiogroup" aria-label="Project template">
                  
                  {/* SCRUM CARD */}
                  <button
                    type="button"
                    onClick={() => setTemplate('scrum')}
                    role="radio"
                    aria-checked={template === 'scrum'}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between h-72 hover:-translate-y-1 text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card-secondary ${
                      template === 'scrum' 
                        ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                        : 'border-border-secondary hover:border-text-secondary-muted/40 bg-card-secondary'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className={`p-2.5 rounded-xl ${template === 'scrum' ? 'bg-accent text-white' : 'bg-dominant text-text-secondary-muted'}`}>
                          <Layers className="w-5 h-5" />
                        </div>
                        {template === 'scrum' && (
                          <span className="bg-accent/15 text-accent text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Selected</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-secondary">Scrum Template</h4>
                        <p className="text-[10px] text-text-secondary-muted mt-1 leading-relaxed">
                          Sprint cycles, backlogs, velocity burnups, and incremental deliveries.
                        </p>
                      </div>
                    </div>

                    {/* Scrum SVG Board Illustration */}
                    <div className="w-full bg-dominant/40 p-2.5 rounded-lg border border-border-secondary/20 flex flex-col space-y-1.5">
                      <div className="flex justify-between text-[8px] font-bold text-text-secondary-muted uppercase">
                        <span>Backlog</span>
                        <span>Todo</span>
                        <span>In Progress</span>
                        <span>Done</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-8">
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-3/4 h-1 bg-purple-500/30 rounded" />
                          <span className="w-1/2 h-1 bg-text-secondary-muted/20 rounded" />
                        </div>
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-full h-1 bg-slate-500/30 rounded" />
                          <span className="w-1/3 h-1 bg-text-secondary-muted/20 rounded" />
                        </div>
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-5/6 h-1 bg-blue-500/30 rounded" />
                          <span className="w-2/3 h-1 bg-text-secondary-muted/20 rounded" />
                        </div>
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-2/3 h-1 bg-green-500/30 rounded" />
                          <span className="w-1/2 h-1 bg-text-secondary-muted/20 rounded" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* KANBAN CARD */}
                  <button
                    type="button"
                    onClick={() => setTemplate('kanban')}
                    role="radio"
                    aria-checked={template === 'kanban'}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between h-72 hover:-translate-y-1 text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card-secondary ${
                      template === 'kanban' 
                        ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                        : 'border-border-secondary hover:border-text-secondary-muted/40 bg-card-secondary'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className={`p-2.5 rounded-xl ${template === 'kanban' ? 'bg-accent text-white' : 'bg-dominant text-text-secondary-muted'}`}>
                          <Kanban className="w-5 h-5" />
                        </div>
                        {template === 'kanban' && (
                          <span className="bg-accent/15 text-accent text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Selected</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-secondary">Kanban Template</h4>
                        <p className="text-[10px] text-text-secondary-muted mt-1 leading-relaxed">
                          Continuous work streams, custom columns, visual WIP limits, and pipeline management.
                        </p>
                      </div>
                    </div>

                    {/* Kanban SVG Board Illustration */}
                    <div className="w-full bg-dominant/40 p-2.5 rounded-lg border border-border-secondary/20 flex flex-col space-y-1.5">
                      <div className="flex justify-between text-[8px] font-bold text-text-secondary-muted uppercase">
                        <span>Todo</span>
                        <span className="text-accent flex items-center">In Progress <span className="ml-1 bg-accent/25 text-accent px-1 rounded font-extrabold text-[6px]">max 2</span></span>
                        <span>Review</span>
                        <span>Done</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-8">
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-full h-1 bg-slate-500/30 rounded" />
                        </div>
                        <div className="bg-card-secondary rounded border border-accent/40 p-0.5 flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />
                          <span className="w-5/6 h-1 bg-blue-500/30 rounded" />
                          <span className="w-2/3 h-1 bg-blue-500/30 rounded" />
                        </div>
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-4/5 h-1 bg-amber-500/30 rounded" />
                        </div>
                        <div className="bg-card-secondary rounded border border-border-secondary/40 p-0.5 flex flex-col justify-between">
                          <span className="w-2/3 h-1 bg-green-500/30 rounded" />
                        </div>
                      </div>
                    </div>
                  </button>

                </div>

                <div className="pt-8 border-t border-border-secondary/40 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none"
                  >
                    <span>Configure Settings</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONFIGURE SETTINGS */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-secondary">Configure Workspace Settings</h3>
                    <p className="text-xs text-text-secondary-muted mt-1">Provide specific details for your new {template} project.</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold flex items-center">
                      <Info className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ws-name" className="block text-xs font-semibold text-text-secondary mb-1.5">Workspace Name <span className="text-red-500">*</span></label>
                      <input
                        id="ws-name"
                        type="text"
                        required
                        placeholder="e.g. Core Engineering"
                        value={name}
                        onChange={handleNameChange}
                        className="block w-full px-3.5 py-2 text-xs rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="ws-key" className="block text-xs font-semibold text-text-secondary mb-1.5">Project Key <span className="text-red-500">*</span></label>
                      <input
                        id="ws-key"
                        type="text"
                        required
                        maxLength={10}
                        placeholder="e.g. COR"
                        value={key}
                        onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        className="block w-full px-3.5 py-2 text-xs rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ws-board" className="block text-xs font-semibold text-text-secondary mb-1.5">Board Name <span className="text-red-500">*</span></label>
                    <input
                      id="ws-board"
                      type="text"
                      required
                      placeholder="e.g. Sprint board"
                      value={boardName}
                      onChange={(e) => setBoardName(e.target.value)}
                      className="block w-full px-3.5 py-2 text-xs rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="ws-desc" className="block text-xs font-semibold text-text-secondary mb-1.5">Workspace Description (Optional)</label>
                    <textarea
                      id="ws-desc"
                      rows={2}
                      placeholder="Brief details about the focus area..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="block w-full px-3.5 py-2 text-xs rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all resize-none"
                    />
                  </div>

                  {/* Template specific configuration */}
                  <div className="pt-2 border-t border-border-secondary/40">
                    {template === 'scrum' ? (
                      <div>
                        <label htmlFor="ws-sprint" className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center">
                          <Clock className="w-3.5 h-3.5 text-accent mr-1.5" />
                          Default Sprint Duration
                        </label>
                        <select
                          id="ws-sprint"
                          value={sprintDuration}
                          onChange={(e) => setSprintDuration(e.target.value)}
                          className="block w-full px-3 py-2 text-xs rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="1">1 Week</option>
                          <option value="2">2 Weeks (Standard)</option>
                          <option value="3">3 Weeks</option>
                          <option value="4">4 Weeks</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="ws-wip" className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center">
                            <Sliders className="w-3.5 h-3.5 text-accent mr-1.5" />
                            "In Progress" WIP Limit
                          </label>
                          <input
                            id="ws-wip"
                            type="number"
                            min={1}
                            max={50}
                            value={wipLimit}
                            onChange={(e) => setWipLimit(e.target.value)}
                            className="block w-full px-3.5 py-2 text-xs rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                          />
                        </div>
                        <div className="flex items-center text-[10px] text-text-secondary-muted mt-6 bg-dominant/20 p-2 rounded border border-border-secondary/20">
                          We will highlight the column title when tasks exceed this limit.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-8 border-t border-border-secondary/40 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-border-secondary hover:border-text-secondary-muted text-text-secondary-muted hover:text-text-secondary text-xs font-semibold cursor-pointer bg-transparent"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none"
                  >
                    <span>Create Workspace</span>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: LOADER / GENERATION ANIMATION */}
            {step === 3 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6 flex-grow py-12">
                <div className="relative flex items-center justify-center">
                  <Loader2 className="w-16 h-16 text-accent animate-spin" />
                  <div className="absolute w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2 max-w-xs">
                  <h4 className="font-display font-extrabold text-sm text-text-secondary">Generating Workspace</h4>
                  <p className="text-[11px] text-text-secondary-muted leading-relaxed transition-all duration-300">
                    {loadingStatus}
                  </p>
                </div>
                
                {/* Visual Progress Steps */}
                <div className="w-48 bg-dominant h-1.5 rounded-full overflow-hidden border border-border-secondary/20">
                  <div className="h-full bg-accent rounded-full animate-[loading-bar_2s_infinite]" style={{ width: '60%' }} />
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
