import React, { useState } from 'react';
import { Kanban, Milestone, Plus, Trash2, Layers, CheckCircle2 } from 'lucide-react';

const INITIAL_KANBAN = [
  { id: '1', title: 'Design landing page mockup', status: 'todo', epic: 'Design System', priority: 'High', assignee: 'Jane D.' },
  { id: '2', title: 'Setup telemetry & logging', status: 'todo', epic: 'DevOps & Logs', priority: 'Medium', assignee: 'Alex K.' },
  { id: '3', title: 'Configure Tailwind CSS v4 directives', status: 'progress', epic: 'Tech Stack Upgrade', priority: 'High', assignee: 'Sam L.' },
  { id: '4', title: 'Initialize Vite + React project structure', status: 'done', epic: 'Tech Stack Upgrade', priority: 'High', assignee: 'Sam L.' },
];

const INITIAL_EPICS = [
  { id: 'epic-1', name: 'Design System Implementation', start: 'Apr', end: 'Jun', progress: 85, color: 'bg-accent' },
  { id: 'epic-2', name: 'Mobile App Alpha Release', start: 'May', end: 'Aug', progress: 40, color: 'bg-jira-green' },
  { id: 'epic-3', name: 'Analytics & Dashboards Integration', start: 'Jun', end: 'Sep', progress: 15, color: 'bg-jira-yellow' },
  { id: 'epic-4', name: 'GDPR Compliance Audit', start: 'Jul', end: 'Oct', progress: 0, color: 'bg-jira-red' },
];

export default function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState('board'); // 'board' or 'roadmap'
  const [kanbanItems, setKanbanItems] = useState(INITIAL_KANBAN);
  const [newTitle, setNewTitle] = useState('');
  const [newEpic, setNewEpic] = useState('Feature Work');
  const [draggedId, setDraggedId] = useState(null);

  // Roadmap states
  const [epics, setEpics] = useState(INITIAL_EPICS);
  const [newEpicName, setNewEpicName] = useState('');

  // Kanban Handlers
  const moveTask = (id, targetStatus) => {
    setKanbanItems(prev => prev.map(item => item.id === id ? { ...item, status: targetStatus } : item));
  };

  const handleAddKanban = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: newTitle,
      status: 'todo',
      epic: newEpic,
      priority: 'Medium',
      assignee: 'You'
    };
    setKanbanItems(prev => [...(Array.isArray(prev) ? prev : []), newTask]);
    setNewTitle('');
  };

  const handleDeleteKanban = (id) => {
    setKanbanItems(prev => (Array.isArray(prev) ? prev : []).filter(item => item.id !== id));
  };

  // Drag and Drop
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      moveTask(id, targetStatus);
    }
    setDraggedId(null);
  };

  // Roadmap Handlers
  const handleAddEpic = (e) => {
    e.preventDefault();
    if (!newEpicName.trim()) return;
    const colors = ['bg-accent', 'bg-jira-green', 'bg-jira-yellow', 'bg-jira-red'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newEpicItem = {
      id: Date.now().toString(),
      name: newEpicName,
      start: 'May',
      end: 'Jul',
      progress: 0,
      color: randomColor
    };
    setEpics(prev => [...prev, newEpicItem]);
    setNewEpicName('');
  };

  const handleProgressChange = (id, delta) => {
    setEpics(prev => prev.map(epic => {
      if (epic.id === id) {
        const nextVal = Math.min(100, Math.max(0, epic.progress + delta));
        return { ...epic, progress: nextVal };
      }
      return epic;
    }));
  };

  // Stats for Progress Bar
  const totalTasks = kanbanItems.length;
  const doneTasks = kanbanItems.filter(t => t.status === 'done').length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <section data-section-id="showcase" id="product-demo" className="relative py-16 md:py-24 bg-dominant-offset/30 border-y border-border-secondary/60 transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-secondary tracking-tight">
            See the project flow in real time
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary-muted">
            Give the interface below a spin. Create cards, transition tasks between columns, or update Epic milestones.
          </p>
        </div>

        {/* Board vs Roadmap Toggle Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-dominant-offset border border-border-secondary p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab('board')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-card-secondary text-accent shadow-md border border-border-secondary/50'
                  : 'text-text-secondary-muted hover:text-text-secondary'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Interactive Board</span>
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer ${
                activeTab === 'roadmap'
                  ? 'bg-card-secondary text-accent shadow-md border border-border-secondary/50'
                  : 'text-text-secondary-muted hover:text-text-secondary'
              }`}
            >
              <Milestone className="w-4 h-4" />
              <span>Roadmap Timeline</span>
            </button>
          </div>
        </div>

        {/* Dashboard Frame Container */}
        <div className="bg-dominant rounded-2xl shadow-xl border border-border-secondary overflow-hidden max-w-5xl mx-auto">
          {/* Mock Window Header */}
          <div className="bg-dominant-offset border-b border-border-secondary px-5 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-400 block" />
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 block" />
              <span className="w-3.5 h-3.5 rounded-full bg-green-400 block" />
              <span className="text-xs font-semibold text-text-secondary-muted opacity-60 ml-4 font-mono select-none">
                {activeTab === 'board' ? 'board.jira-clone.app / Active Sprint' : 'roadmap.jira-clone.app / Project Roadmap'}
              </span>
            </div>
            
            {/* Real-time Sprint Progress */}
            {activeTab === 'board' && (
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-semibold text-text-secondary">Sprint Progress:</span>
                <div className="w-24 sm:w-36 h-2.5 bg-dominant-offset rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-jira-green transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-bold text-accent">{progressPercent}%</span>
              </div>
            )}
          </div>

          {/* MAIN MOCK AREA */}
          <div className="p-6 min-h-[500px]">
            {/* VIEW A: INTERACTIVE KANBAN BOARD */}
            {activeTab === 'board' && (
              <div className="space-y-6">
                {/* Task Add Bar */}
                <form onSubmit={handleAddKanban} className="flex flex-col sm:flex-row gap-3 bg-dominant-offset p-4 rounded-xl border border-border-secondary">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Add an issue to the backlog (e.g., Implement dark mode)"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded border border-border-secondary bg-card-secondary text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={newEpic}
                      onChange={(e) => setNewEpic(e.target.value)}
                      className="px-3 py-2 text-sm rounded border border-border-secondary bg-card-secondary text-text-secondary-muted focus:outline-none"
                    >
                      <option value="Tech Stack Upgrade">Tech Stack Upgrade</option>
                      <option value="Design System">Design System</option>
                      <option value="Feature Work">Feature Work</option>
                      <option value="DevOps & Logs">DevOps & Logs</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-semibold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create</span>
                    </button>
                  </div>
                </form>

                {/* Columns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['todo', 'progress', 'done'].map((status) => {
                    const colTasks = kanbanItems.filter(item => item.status === status);
                    const colName = status === 'todo' ? 'To Do' : status === 'progress' ? 'In Progress' : 'Done';
                    const colBadgeColor = status === 'todo' 
                      ? 'bg-dominant-offset border border-border-secondary text-text-secondary' 
                      : status === 'progress' 
                        ? 'bg-accent-light text-accent' 
                        : 'bg-jira-green/10 text-jira-green';
                    
                    return (
                      <div
                        key={status}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                        className={`bg-dominant-offset/60 p-4 rounded-xl border-2 border-dashed border-transparent transition-all duration-200 min-h-[350px] flex flex-col ${
                          draggedId ? 'hover:border-accent/30 hover:bg-accent-light/10' : ''
                        }`}
                      >
                        {/* Column Title */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-semibold text-text-secondary text-sm tracking-wide">{colName}</span>
                          <span className={`text-xs px-2 py-0.5 font-bold rounded-full ${colBadgeColor}`}>
                            {colTasks.length}
                          </span>
                        </div>

                        {/* Task List */}
                        <div className="space-y-3 flex-grow overflow-y-auto max-h-[400px]">
                          {colTasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-10 border border-border-secondary rounded-lg text-center bg-card-secondary/20">
                              <p className="text-xs text-text-secondary-muted opacity-60">Drop issues here</p>
                            </div>
                          ) : (
                            colTasks.map((task) => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                className="bg-card-secondary p-3.5 rounded-lg border border-border-secondary shadow-sm cursor-grab active:cursor-grabbing hover:border-accent hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] transition-all group duration-200"
                              >
                                {/* Epic Tag */}
                                <span className="text-[10px] uppercase font-bold text-accent bg-accent-light px-1.5 py-0.5 rounded">
                                  {task.epic}
                                </span>
                                
                                {/* Title */}
                                <h4 className="font-medium text-text-secondary text-sm mt-2 line-clamp-2 group-hover:text-accent transition-colors">
                                  {task.title}
                                </h4>

                                {/* Card Footer Controls */}
                                <div className="mt-4 flex items-center justify-between border-t border-border-secondary pt-2.5">
                                  <div className="flex items-center space-x-1">
                                    <span className="w-5 h-5 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center">
                                      {task.assignee.substring(0, 2)}
                                    </span>
                                    <span className="text-xs text-text-secondary-muted">{task.assignee}</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <select
                                      value={task.status}
                                      onChange={(e) => moveTask(task.id, e.target.value)}
                                      className="text-[10px] bg-dominant-offset border border-border-secondary rounded p-0.5 text-text-secondary-muted focus:outline-none"
                                    >
                                      <option value="todo">To Do</option>
                                      <option value="progress">In Progress</option>
                                      <option value="done">Done</option>
                                    </select>
                                    <button 
                                      onClick={() => handleDeleteKanban(task.id)}
                                      className="text-text-secondary-muted hover:text-jira-red p-1 rounded hover:bg-jira-red/10 cursor-pointer"
                                      title="Delete issue"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW B: ROADMAP TIMELINE */}
            {activeTab === 'roadmap' && (
              <div className="space-y-6">
                {/* Epic Creator */}
                <form onSubmit={handleAddEpic} className="flex flex-col sm:flex-row gap-3 bg-dominant-offset p-4 rounded-xl border border-border-secondary">
                  <div className="flex-grow">
                    <input
                      type="text"
                      placeholder="Add a new high-level Epic (e.g., Payment Gateway Integrations)"
                      required
                      value={newEpicName}
                      onChange={(e) => setNewEpicName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded border border-border-secondary bg-card-secondary text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-semibold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Create Epic</span>
                  </button>
                </form>

                {/* Timeline Grid */}
                <div className="border border-border-secondary rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-left">
                    <thead>
                      <tr className="bg-dominant-offset border-b border-border-secondary">
                        <th className="p-4 w-72 text-xs font-semibold text-text-secondary-muted uppercase tracking-wider border-r border-border-secondary">Epic</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary-muted uppercase tracking-wider text-center border-r border-border-secondary">Apr</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary-muted uppercase tracking-wider text-center border-r border-border-secondary">May</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary-muted uppercase tracking-wider text-center border-r border-border-secondary">Jun</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary-muted uppercase tracking-wider text-center border-r border-border-secondary">Jul</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary-muted uppercase tracking-wider text-center">Aug</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-secondary">
                      {epics.map((epic) => {
                        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug'];
                        const startIndex = months.indexOf(epic.start);
                        const endIndex = months.indexOf(epic.end);
                        
                        const leftEmpty = startIndex;
                        const duration = endIndex - startIndex + 1;

                        return (
                          <tr key={epic.id} className="hover:bg-dominant-offset/30 transition-colors">
                            {/* Epic Name */}
                            <td className="p-4 font-semibold text-text-secondary text-sm border-r border-border-secondary">
                              <div className="flex items-center space-x-2">
                                <span className={`w-3.5 h-3.5 rounded ${epic.color} inline-block`} />
                                <span className="truncate w-56 inline-block" title={epic.name}>{epic.name}</span>
                              </div>
                              <div className="flex items-center justify-between mt-2 pl-5.5">
                                <span className="text-[10px] text-text-secondary-muted font-medium">Progress: {epic.progress}%</span>
                                {/* Epic progress buttons */}
                                <div className="flex space-x-1.5">
                                  <button
                                    onClick={() => handleProgressChange(epic.id, -10)}
                                    className="px-1.5 py-0.5 text-[9px] bg-dominant-offset border border-border-secondary text-text-secondary rounded hover:bg-accent hover:text-white cursor-pointer"
                                  >
                                    -10%
                                  </button>
                                  <button
                                    onClick={() => handleProgressChange(epic.id, 10)}
                                    className="px-1.5 py-0.5 text-[9px] bg-dominant-offset border border-border-secondary text-text-secondary rounded hover:bg-accent hover:text-white cursor-pointer"
                                  >
                                    +10%
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Timeline cells */}
                            <td colSpan={5} className="p-4 relative align-middle border-r border-border-secondary">
                              <div className="grid grid-cols-5 h-8 relative w-full items-center">
                                <div 
                                  className={`absolute h-7 rounded-lg shadow-sm border border-black/10 flex items-center justify-between px-3 text-xs font-bold text-white transition-all duration-300 ${epic.color}`}
                                  style={{
                                    left: `${(leftEmpty / 5) * 100}%`,
                                    width: `${(duration / 5) * 100}%`,
                                  }}
                                >
                                  <span className="truncate pr-2 select-none">
                                    {epic.progress === 100 ? '✓ Complete' : `${epic.progress}% Completed`}
                                  </span>
                                  <div className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-lg transition-all duration-300" style={{ width: `${epic.progress}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Timeline Helper Info */}
                <div className="flex items-center space-x-2 text-xs text-text-secondary-muted px-1.5 bg-accent-light/50 py-2.5 rounded-lg border border-border-secondary">
                  <CheckCircle2 className="w-4 h-4 text-accent mr-2 flex-shrink-0" />
                  <span>Use the **-10% / +10%** buttons in the table columns to advance or regression the Epic completions.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
