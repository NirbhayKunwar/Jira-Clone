import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Kanban, BarChart3, Users, LogOut, Sun, Moon, Plus, Search, 
  Trash2, X, AlertTriangle, CheckCircle2, ChevronRight,
  Filter, UserCheck, Calendar, Activity, Info, User, Palette, ChevronDown,
  Target, Rocket, UserCircle, Clock, LayoutDashboard, List,
  Settings, Menu, Copy, Check, Bell, Monitor
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTasks, useCreateTask, useUpdateTaskStatus, useDeleteTask } from '../hooks/useTasks';
import { useUsers, useAddUser, useRemoveUser } from '../hooks/useUsers';
import { API_URL, getAuthHeaders } from '../config/api';
import { getApiData, getApiList } from '../config/apiResponse';
import { useUiStore } from '../store/uiStore';
import MembersTable from '../features/workspace/components/MembersTable';
import InviteMemberModal from '../features/invitations/components/InviteMemberModal';
import TeamDetailsWrapper from '../features/teams/components/TeamDetailsWrapper';
import ProfileDrawer from '../features/members/components/ProfileDrawer';
import AuditTimeline from '../features/audit/components/AuditTimeline';
import ProjectMembersModal from '../features/projects/components/ProjectMembersModal';

// Lazy-loaded sub-panels
const ProfileSettings = lazy(() => import('./ProfileSettings'));
const ScheduleCalendar = lazy(() => import('./ScheduleCalendar'));

// Static lookup tables
const THEMES = [
  { id: 'atlassian', name: 'Atlassian Blue (Default)', colorBg: 'bg-[#0052cc]' },
  { id: 'emerald', name: 'Emerald Forest', colorBg: 'bg-[#10b981]' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', colorBg: 'bg-[#db2777]' },
  { id: 'sunset', name: 'Sunset Amber', colorBg: 'bg-[#d97706]' }
];
const ROADMAP_COLORS = ['#0052cc', '#ff5630', '#36b37e', '#ffab00', '#6554c0'];

// Kanban Card Item
function Card({ task, onDragStart, onDelete, onTouchStart, isDragging, isPreview, onClaim }) {
  const { user } = useAuthStore();
  const canDeleteOrEdit = user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER' || (task.assignee && task.assignee === user?.name);

  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchTimeout = useRef(null);

  const handleCardTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimeout.current) clearTimeout(touchTimeout.current);

    touchTimeout.current = setTimeout(() => {
      if (onTouchStart) onTouchStart(e, task);
    }, 250);
  };

  const handleCardTouchMove = (e) => {
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);

    if (diffX > 8 || diffY > 8) {
      clearTimeout(touchTimeout.current);
    }
  };

  const handleCardTouchEnd = () => {
    clearTimeout(touchTimeout.current);
  };

  const getPriorityStyle = (p) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getEpicStyle = (epic) => {
    switch(epic) {
      case 'Design System': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/15';
      case 'DevOps & Security': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/15';
      case 'Integrations': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/15';
      case 'Tech Stack Upgrade': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/15';
    }
  };

  if (!task) return null;

  return (
    <div
      draggable={!isPreview}
      onDragStart={(e) => onDragStart(e, task.id)}
      onTouchStart={!isPreview && onTouchStart ? handleCardTouchStart : undefined}
      onTouchMove={!isPreview && onTouchStart ? handleCardTouchMove : undefined}
      onTouchEnd={!isPreview && onTouchStart ? handleCardTouchEnd : undefined}
      className={`bg-card-secondary p-4.5 rounded-xl border border-border-secondary/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing group relative overflow-hidden ${
        isDragging ? 'opacity-40 scale-95 border-accent/40 bg-accent-light/5' : ''
      } ${isPreview ? 'pointer-events-none shadow-2xl border-accent/60' : ''}`}
    >
      {/* Epic Badge */}
      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border mb-2.5 uppercase tracking-wider ${getEpicStyle(task.epic)}`}>
        {task.epic || 'Task'}
      </span>

      {/* Task Summary */}
      <h4 className="text-xs font-bold text-text-secondary leading-normal group-hover:text-accent transition-colors">
        {task.title}
      </h4>

      {!task.assignee && (
        <div className="mt-2.5 flex items-center space-x-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">
            Unassigned
          </span>
          {user?.rbacRole === 'MEMBER' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClaim) onClaim(task.id);
              }}
              className="text-[9px] font-bold px-2 py-0.5 rounded bg-accent hover:bg-accent-hover text-white cursor-pointer border-none shadow-sm transition-all"
            >
              Claim Task
            </button>
          )}
        </div>
      )}

      {/* Task Description */}
      {task.desc && (
        <p className="text-[10px] text-text-secondary-muted mt-1.5 leading-relaxed line-clamp-2">
          {task.desc}
        </p>
      )}

      {/* Card Footer Info */}
      <div className="mt-4 pt-3 border-t border-border-secondary/30 flex items-center justify-between">
        
        {/* Priority */}
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityStyle(task.priority)}`}>
          {task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🔵'} {task.priority}
        </span>

        {/* Assignee & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Delete (only visible on card hover) */}
          {!isPreview && canDeleteOrEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="text-text-secondary-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-dominant-offset cursor-pointer"
              title="Delete Issue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* Avatar */}
          <div className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border border-border-secondary ${task.assignee ? 'bg-dominant-offset text-text-secondary' : 'bg-red-500/10 text-red-500 font-bold border-red-500/20'}`} title={`Assignee: ${task.assignee || 'Unassigned'}`}>
            {task.assignee 
              ? task.assignee.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : 'U'}
          </div>
        </div>

      </div>

    </div>
  );
}

// Column Empty State
function EmptyPlaceholder({ text }) {
  return (
    <div className="py-8 px-4 rounded-xl border border-dashed border-border-secondary/50 flex flex-col items-center justify-center text-center text-[10px] text-text-secondary-muted">
      <span>{text}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboardOpenedAt] = useState(() => Date.now());


  const { user, logout: authLogout } = useAuthStore();
  const { theme, mode, resolvedMode, setTheme, setMode, toggleMode } = useTheme();
  const { activeWorkspace, workspaces, setActiveWorkspace: storeSwitchWorkspace, deleteWorkspace, workspaceError } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const { selectedTeamId, setSelectedTeam } = useUiStore();

  const onSwitchWorkspace = (ws) => {
    queryClient.clear();
    setSelectedTeam(null);
    storeSwitchWorkspace(ws);
  };

  const onLogout = () => {
    queryClient.clear();
    useWorkspaceStore.getState().resetWorkspaceStore?.();
    useUiStore.getState().resetUiStore?.();
    localStorage.removeItem('jira_current_user');
    localStorage.removeItem('jira_token');
    localStorage.removeItem('jira_active_workspace');
    localStorage.removeItem('jira_dashboard_active_tab');
    localStorage.removeItem('jira_recent_visits');
    sessionStorage.clear();
    authLogout();
    navigate('/auth');
  };

  // Support window.visualViewport for mobile soft keyboard changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualViewportResize = () => {
      const vv = window.visualViewport;
      document.documentElement.style.setProperty('--vv-height', `${vv.height}px`);
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    window.visualViewport.addEventListener('scroll', handleVisualViewportResize);
    handleVisualViewportResize();

    return () => {
      window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
    };
  }, []);

  const onTriggerCreateWorkspace = () => navigate('/workspace-setup');

  const onDeleteWorkspace = async (id) => {
    const success = await deleteWorkspace(id, user, (path) => navigate(path));
    if (success) {
      navigate('/dashboard');
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Form States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const defaultStatus = useMemo(() => (activeWorkspace?.template_type === 'scrum' ? 'backlog' : 'todo'), [activeWorkspace?.template_type]);
  const [newStatus, setNewStatus] = useState(defaultStatus);
  const [newPriority, setNewPriority] = useState('Medium');
  const [newEpic, setNewEpic] = useState('');
  const [newAssignee, setNewAssignee] = useState('You');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addedMemberCreds, setAddedMemberCreds] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Touch Drag-and-Drop States
  const [touchDragTaskId, setTouchDragTaskId] = useState(null);
  const [touchDragActive, setTouchDragActive] = useState(false);
  const [touchDragOffset, setTouchDragOffset] = useState({ x: 0, y: 0 });
  const [touchDragPosition, setTouchDragPosition] = useState({ x: 0, y: 0 });
  const [touchTargetColumnId, setTouchTargetColumnId] = useState(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchTimeoutRef = useRef(null);
  const touchLastCoordsRef = useRef({ x: 0, y: 0 });
  const kanbanGridRef = useRef(null);

  // TanStack Query Hooks (Hoisted to prevent TDZ ReferenceErrors in effects)
  const { data: tasks = [] } = useTasks(activeWorkspace?.id);
  const { data: dbUsers = [], refetch: refetchUsers } = useUsers();

  const createTaskMutation = useCreateTask(activeWorkspace?.id);
  const updateTaskStatusMutation = useUpdateTaskStatus(activeWorkspace?.id);
  const deleteTaskMutation = useDeleteTask(activeWorkspace?.id);
  const addUserMutation = useAddUser();
  const removeUserMutation = useRemoveUser();

  // Effect to handle window touchmove and touchend during touch drag
  useEffect(() => {
    if (!touchDragActive || !touchDragTaskId) return;

    const handleWindowTouchMove = (e) => {
      // Prevent browser from scrolling the body/page
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      touchLastCoordsRef.current = { x: touch.clientX, y: touch.clientY };

      // Update the preview element's position relative to touch
      setTouchDragPosition({
        x: touch.clientX - touchDragOffset.x,
        y: touch.clientY - touchDragOffset.y
      });

      // Find target column/status element under the touch coordinates
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      let current = element;
      let foundColumnId = null;
      while (current && current !== document.body) {
        if (current.dataset && current.dataset.columnId) {
          foundColumnId = current.dataset.columnId;
          break;
        }
        current = current.parentElement;
      }
      if (foundColumnId) {
        setTouchTargetColumnId(foundColumnId);
      }
    };

    const handleWindowTouchEnd = () => {
      // Trigger status update mutation if dropped inside a column
      if (touchTargetColumnId) {
        const task = tasks.find(t => t.id === touchDragTaskId);
        if (task) {
          const isAdminOrLeader = user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER';
          const isAssignedToMe = task.assignee && task.assignee === user?.name;

          if (!isAdminOrLeader && !isAssignedToMe) {
            alert('You do not have permission to perform this action.');
          } else {
            updateTaskStatusMutation.mutate({ taskId: touchDragTaskId, status: touchTargetColumnId });
          }
        }
      }

      // Cleanup drag states
      setTouchDragTaskId(null);
      setTouchDragActive(false);
      setTouchTargetColumnId(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [touchDragActive, touchDragTaskId, touchDragOffset, touchTargetColumnId, updateTaskStatusMutation, tasks, user]);

  // Effect to perform auto-scrolling horizontally and vertically when drag position is near viewport edges
  useEffect(() => {
    if (!touchDragActive) return;

    const scrollInterval = setInterval(() => {
      const coords = touchLastCoordsRef.current;
      if (!coords) return;

      // 1. Scroll the main kanban board columns horizontally
      if (kanbanGridRef.current) {
        const grid = kanbanGridRef.current;
        const rect = grid.getBoundingClientRect();
        const threshold = 60; // Pixels from outer edges
        const speed = 12; // Pixels per frame

        if (coords.x > rect.right - threshold) {
          grid.scrollLeft += speed;
        } else if (coords.x < rect.left + threshold) {
          grid.scrollLeft -= speed;
        }
      }

      // 2. Scroll overflowed column content lists vertically
      const element = document.elementFromPoint(coords.x, coords.y);
      let current = element;
      while (current && current !== document.body) {
        // Match scrollable card container inside columns
        if (current.classList && (current.classList.contains('overflow-y-auto') || current.classList.contains('overflow-y-scroll'))) {
          const colRect = current.getBoundingClientRect();
          const threshold = 60;
          const speed = 10;
          if (coords.y > colRect.bottom - threshold) {
            current.scrollTop += speed;
          } else if (coords.y < colRect.top + threshold) {
            current.scrollTop -= speed;
          }
          break;
        }
        current = current.parentElement;
      }
    }, 16); // ~60fps checking interval

    return () => clearInterval(scrollInterval);
  }, [touchDragActive]);

  const handleTouchStart = (e, task) => {
    if (touchDragActive) return;

    const touch = e.touches[0];
    const cardElement = e.currentTarget;
    const rect = cardElement.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchLastCoordsRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);

    touchTimeoutRef.current = setTimeout(() => {
      setTouchDragTaskId(task.id);
      setTouchDragActive(true);
      setTouchDragOffset({ x: offsetX, y: offsetY });
      setTouchDragPosition({ x: rect.left, y: rect.top });
      setTouchTargetColumnId(task.status);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 250);
  };

  const activeTab = searchParams.get('tab') || 'board';
  const setActiveTab = (tab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      return prev;
    });
    localStorage.setItem('jira_dashboard_active_tab', tab);
  };

  const [boardFilter, setBoardFilter] = useState('all'); // 'all', 'foryou', 'recent'

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, activeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNewTitle('');
        setNewDesc('');
        setNewStatus(defaultStatus);
        setNewPriority('Medium');
        setNewEpic('');
        setNewAssignee('You');
        setShowCreateModal(false);
        setShowAddMemberModal(false);
        setIsSidebarOpen(false);
      }
    };
    if (showCreateModal || showAddMemberModal || isSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreateModal, showAddMemberModal, isSidebarOpen, defaultStatus]);

  // Lock body scroll when modals or mobile menu sidebar are open
  useEffect(() => {
    if (showCreateModal || showAddMemberModal || isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal, showAddMemberModal, isSidebarOpen]);

  const isScrum = activeWorkspace?.template_type === 'scrum';

  // TanStack Query Hooks moved to top to satisfy module execution order and rules of hooks

  // Reset newStatus when workspace template changes (deferred to avoid cascading renders)
  const prevWorkspaceIdRef = useRef(activeWorkspace?.id);
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== activeWorkspace?.id) {
      prevWorkspaceIdRef.current = activeWorkspace?.id;
      const timer = setTimeout(() => setNewStatus(defaultStatus), 0);
      return () => clearTimeout(timer);
    }
  }, [activeWorkspace?.id, defaultStatus]);

  const columns = useMemo(() => {
    return isScrum ? [
      { id: 'backlog', name: 'Backlog', color: 'bg-purple-500' },
      { id: 'todo', name: 'To Do', color: 'bg-slate-400' },
      { id: 'progress', name: 'In Progress', color: 'bg-blue-500' },
      { id: 'done', name: 'Done', color: 'bg-green-500' }
    ] : [
      { id: 'todo', name: 'To Do', color: 'bg-slate-400' },
      { id: 'progress', name: 'In Progress', color: 'bg-blue-500', hasWipLimit: true },
      { id: 'review', name: 'Under Review', color: 'bg-amber-500' },
      { id: 'done', name: 'Done', color: 'bg-green-500' }
    ];
  }, [isScrum]);

  // Compute team members dynamically from registered database users and current user session
    const teamMembers = useMemo(() => {
      const list = [...dbUsers];
      if (user && user.email) {
        const exists = list.some(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (!exists) {
          list.push({
            id: user.id ? String(user.id) : 'current',
            name: user.name || user.email.split('@')[0],
            email: user.email,
            role: user.role || 'Full Stack Engineer',
            dept: user.dept || 'Core Engineering',
            location: user.location || 'San Francisco, CA',
            isOwner: !user.teamOwnerId
          });
        }
      }

      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500'];
      return list.map((u, idx) => {
        const isYou = user && u.email.toLowerCase() === user.email.toLowerCase();
        const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const activeTasksCount = tasks.filter(t => 
          (isYou && (t.assignee === 'You' || t.assignee === u.name)) || 
          (!isYou && t.assignee === u.name)
        ).filter(t => t.status !== 'done').length;

        const completedTasksCount = tasks.filter(t => 
          (isYou && (t.assignee === 'You' || t.assignee === u.name)) || 
          (!isYou && t.assignee === u.name)
        ).filter(t => t.status === 'done').length;

        return {
          id: u.id,
          name: isYou ? 'You' : u.name,
          email: u.email,
          role: u.role || 'Software Engineer',
          dept: u.dept,
          location: u.location,
          avatar: initials,
          color: colors[idx % colors.length],
          activeTasks: activeTasksCount,
          completedTasks: completedTasksCount
        };
      });
    }, [dbUsers, user, tasks]);
  
  // Modal & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEpic, setFilterEpic] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [recentSearchQuery, setRecentSearchQuery] = useState('');
  const [forYouSubTab, setForYouSubTab] = useState('recommended');

  const [goalsList, setGoalsList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);

  const [showCreateGoalForm, setShowCreateGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalOwner, setNewGoalOwner] = useState('You');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalProgress, setNewGoalProgress] = useState(50);
  const [newGoalStatus, setNewGoalStatus] = useState('on_track');

  // Teams Directory State
  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamMembers, setNewTeamMembers] = useState([]);

  // Project Members Modal & Detailed Projects state
  const [projectMembersModalState, setProjectMembersModalState] = useState({ isOpen: false, project: null });
  const [workspaceMembersList, setWorkspaceMembersList] = useState([]);
  const [workspaceProjectsList, setWorkspaceProjectsList] = useState([]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;

    fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/members`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setWorkspaceMembersList(data.data || []);
      })
      .catch(() => {});

    fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/projects`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setWorkspaceProjectsList(data.data || []);
      })
      .catch(() => {});
  }, [activeWorkspace?.id, projectMembersModalState.isOpen]);

  // Fetch Goals and Teams from backend database
  useEffect(() => {
    if (!user || !activeWorkspace?.id) return;
    
    const loadGoalsAndTeams = async () => {
      try {
        const headers = getAuthHeaders();
        const wsParam = `?workspaceId=${activeWorkspace.id}`;
        const [goalsRes, teamsRes] = await Promise.all([
          fetch(`${API_URL}/api/goals${wsParam}`, { headers }),
          fetch(`${API_URL}/api/teams${wsParam}`, { headers })
        ]);
        
        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          setGoalsList(getApiList(goalsData, 'Goals'));
        }
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeamsList(getApiList(teamsData, 'Teams'));
        }
      } catch (err) {
        console.error('Failed to load goals or teams from backend:', err);
      }
    };
    
    loadGoalsAndTeams();
  }, [user, activeWorkspace?.id]);
  
  const [expandedEpic, setExpandedEpic] = useState(null);
  const [customEpics, setCustomEpics] = useState([]);
  const [epicTimelineOverrides, setEpicTimelineOverrides] = useState({});

  const months = useMemo(() => {
    const result = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
      result.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
    }
    return result;
  }, []);

  const epicsList = useMemo(() => (
    [...new Set([
      ...tasks.map(task => task.epic?.trim()).filter(Boolean),
      ...customEpics
    ])]
      .sort((a, b) => a.localeCompare(b))
  ), [customEpics, tasks]);

  const epicTimelines = useMemo(() => {
    const rangeStart = new Date(dashboardOpenedAt);
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);

    const toMonthIndex = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 0;
      return (date.getFullYear() - rangeStart.getFullYear()) * 12
        + date.getMonth() - rangeStart.getMonth();
    };

    return Object.fromEntries(epicsList.map((epic, index) => {
      const epicTasks = tasks.filter(task => task.epic?.trim() === epic);
      const starts = epicTasks.map(task => toMonthIndex(task.createdAt));
      const ends = epicTasks.map(task => toMonthIndex(task.completedAt || dashboardOpenedAt));
      const clamp = value => Math.min(5, Math.max(0, value));

      return [epic, epicTimelineOverrides[epic] || {
        start: clamp(Math.min(...starts)),
        end: clamp(Math.max(...ends)),
        color: ROADMAP_COLORS[index % ROADMAP_COLORS.length]
      }];
    }));
  }, [dashboardOpenedAt, epicTimelineOverrides, epicsList, tasks]);

  // Form States cleared (moved to top of functional component)

  // Add Member Modal States
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('Full Stack Engineer');
  const [memberDept, setMemberDept] = useState('Core Engineering');
  const [memberLocation, setMemberLocation] = useState('San Francisco, CA');

  // Theme & Profile Picker support
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pickerRef = useRef(null);
  const recentRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileMenuMobileRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationsMobileRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const createModalRef = useRef(null);
  const addMemberModalRef = useRef(null);
  const sidebarRef = useRef(null);

  // Local storage save removed - now persisting dynamically to PostgreSQL database

  useEffect(() => {
    const activeModal = showCreateModal ? createModalRef.current : showAddMemberModal ? addMemberModalRef.current : null;
    const isMobileSidebar = isSidebarOpen && window.innerWidth < 1280;
    const container = activeModal || (isMobileSidebar ? sidebarRef.current : null);
    if (!container) return;

    const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = [...container.querySelectorAll(focusableSelector)];
    
    if (activeModal) {
      const preferredFocus = container.querySelector('[data-autofocus]');
      (preferredFocus || focusable[0])?.focus();
    }

    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;
      const currentFocusable = [...container.querySelectorAll(focusableSelector)].filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      if (currentFocusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', trapFocus);
    return () => container.removeEventListener('keydown', trapFocus);
  }, [showCreateModal, showAddMemberModal, isSidebarOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
      if (recentRef.current && !recentRef.current.contains(e.target)) {
        setShowRecentDropdown(false);
      }
      if (
        (profileMenuRef.current && profileMenuRef.current.contains(e.target)) ||
        (profileMenuMobileRef.current && profileMenuMobileRef.current.contains(e.target))
      ) {
        // clicked inside either profile menu
      } else {
        setShowProfileMenu(false);
      }
      if (
        (notificationsRef.current && notificationsRef.current.contains(e.target)) ||
        (notificationsMobileRef.current && notificationsMobileRef.current.contains(e.target))
      ) {
        // clicked inside either notification menu
      } else {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [recentItems, setRecentItems] = useState(() => {
    const savedRecents = localStorage.getItem('jira_recent_visits');
    return savedRecents ? JSON.parse(savedRecents) : [];
  });

  // Fetch activity log notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('jira_token');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/notifications`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  const unreadNotifications = useMemo(() => {
    // Reference showNotifications to trigger re-evaluation when dropdown is toggled
    void showNotifications;
    const lastCheck = localStorage.getItem('jira_last_notification_check') || 0;
    return notifications.filter(n => new Date(n.createdAt).getTime() > Number(lastCheck)).length;
  }, [notifications, showNotifications]);

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      localStorage.setItem('jira_last_notification_check', String(Date.now()));
    }
  };

  // Track workspace visits
  useEffect(() => {
    if (!activeWorkspace) return;
    
    // Load existing recents from localStorage
    const savedRecents = localStorage.getItem('jira_recent_visits');
    let recents = savedRecents ? JSON.parse(savedRecents) : [];
    
    // Remove if already exists to avoid duplicates
    recents = recents.filter(item => item.id !== activeWorkspace.id);
    
    // Add new visit
    recents.unshift({
      id: activeWorkspace.id,
      name: activeWorkspace.name,
      key: activeWorkspace.key,
      template_type: activeWorkspace.template_type,
      visitedAt: new Date().toISOString()
    });
    
    // Limit to top 10
    recents = recents.slice(0, 10);
    
    localStorage.setItem('jira_recent_visits', JSON.stringify(recents));
    const timer = setTimeout(() => {
      setRecentItems(recents);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeWorkspace]);

  // Handle case where local storage recent visits is empty
  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const savedRecents = localStorage.getItem('jira_recent_visits');
      let recents = savedRecents ? JSON.parse(savedRecents) : [];
      
      if (recents.length === 0) {
        recents = workspaces.map((ws, index) => {
          const date = new Date();
          if (index === 0) {
            date.setMinutes(date.getMinutes() - 25);
          } else {
            date.setDate(date.getDate() - 2);
          }
          return {
            id: ws.id,
            name: ws.name,
            key: ws.key,
            template_type: ws.template_type,
            visitedAt: date.toISOString()
          };
        });
        localStorage.setItem('jira_recent_visits', JSON.stringify(recents));
      }
      const timer = setTimeout(() => {
        setRecentItems(recents);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [workspaces]);

  const recentDisplayItems = useMemo(() => {
    let items = [];
    const validRecents = (recentItems || []).filter(r => r && r.id && workspaces.some(w => String(w.id) === String(r.id)));
    
    // If no stored recents match active workspaces, fallback to current workspaces
    const listToRender = validRecents.length > 0 ? validRecents : workspaces.map(ws => ({
      id: ws.id,
      name: ws.name,
      key: ws.key,
      template_type: ws.template_type,
      visitedAt: new Date().toISOString()
    }));

    listToRender.forEach((ws, idx) => {
      const wsName = ws.name || 'Project';
      // Board item
      items.push({
        id: `board-${ws.id}`,
        wsId: ws.id,
        name: wsName.toLowerCase().includes('board') ? wsName : `${wsName} Board`,
        type: 'board',
        visitedAt: ws.visitedAt || new Date().toISOString()
      });
      // Dashboard item
      if (idx === 0) {
        items.push({
          id: `dash-${ws.id}`,
          wsId: ws.id,
          name: 'Default dashboard',
          type: 'dashboard',
          visitedAt: ws.visitedAt || new Date().toISOString()
        });
      }
    });

    if (recentSearchQuery) {
      items = items.filter(item => 
        item.name && item.name.toLowerCase().includes(recentSearchQuery.toLowerCase())
      );
    }

    return items;
  }, [recentItems, workspaces, recentSearchQuery]);

  const groupedRecentItems = useMemo(() => {
    const today = [];
    const thisWeek = [];
    const earlier = [];

    recentDisplayItems.forEach(item => {
      const date = new Date(item.visitedAt);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays === 0) {
        today.push(item);
      } else if (diffDays <= 7) {
        thisWeek.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, thisWeek, earlier };
  }, [recentDisplayItems]);

  const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleSelectRecentWorkspace = (wsId, type) => {
    const ws = workspaces.find(w => String(w.id) === String(wsId));
    if (ws) {
      onSwitchWorkspace(ws);
      if (type === 'dashboard') {
        setActiveTab('analytics');
      } else {
        setActiveTab('board');
      }
      setShowRecentDropdown(false);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const isAdminOrLeader = user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER';
        const isAssignedToMe = task.assignee && task.assignee === user?.name;

        if (!isAdminOrLeader && !isAssignedToMe) {
          alert('You do not have permission to perform this action.');
          return;
        }
      }
      updateTaskStatusMutation.mutate({ taskId, status: targetStatus });
    }
  };

  // Create Issue
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTaskData = {
      title: newTitle,
      desc: newDesc,
      status: newStatus,
      priority: newPriority,
      epic: newEpic,
      assignee: newAssignee
    };

    createTaskMutation.mutate(newTaskData, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewStatus(isScrum ? 'backlog' : 'todo');
        setNewPriority('Medium');
        setNewEpic('');
        setNewAssignee('You');
      },
      onError: (err) => {
        console.error('Error creating task:', err);
        alert('Error creating task. Make sure the backend is running.');
      }
    });
  };

  // Delete Issue
  const handleDeleteIssue = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      deleteTaskMutation.mutate(taskId, {
        onError: (err) => {
          console.error('Error deleting task:', err);
          alert('Error deleting task. Make sure the backend is running.');
        }
      });
    }
  };

  // Add Team Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) {
      alert('Name and Email are required.');
      return;
    }

    const newMemberData = {
      name: memberName,
      email: memberEmail,
      role: memberRole,
      dept: memberDept,
      location: memberLocation
    };

    addUserMutation.mutate(newMemberData, {
      onSuccess: (data) => {
        setAddedMemberCreds({
          ...data.invite,
          email: data.user.email,
          name: data.user.name
        });
        setMemberName('');
        setMemberEmail('');
        setMemberRole('Full Stack Engineer');
        setMemberDept('Core Engineering');
        setMemberLocation('San Francisco, CA');
      },
      onError: (err) => {
        alert(err.message || 'Failed to add team member.');
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!addedMemberCreds) return;
    const pwdText = addedMemberCreds.temporaryPassword || '(Use your existing account password)';
    const text = `Jira Clone Team Member Invite\n============================\nName: ${addedMemberCreds.name}\nEmail: ${addedMemberCreds.email}\nPassword: ${pwdText}\nInvitation Link: ${addedMemberCreds.inviteUrl || '(Check your profile settings)'}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  // Remove Team Member
  const handleRemoveMember = async (memberId, memberName) => {
    if (!memberId) return;
    if (window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      removeUserMutation.mutate(memberId, {
        onError: (err) => {
          alert(err.message || 'Failed to remove team member.');
        }
      });
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    if (!memberId) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${memberId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        refetchUsers();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update member role.');
      }
    } catch (err) {
      console.error('Error updating member role:', err);
      alert('Error updating member role.');
    }
  };

  const handleUpdateMemberRbacRole = async (memberId, newRbacRole) => {
    if (!memberId) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${memberId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rbacRole: newRbacRole })
      });
      if (res.ok) {
        refetchUsers();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update member RBAC role.');
      }
    } catch (err) {
      console.error('Error updating member RBAC role:', err);
      alert('Error updating member RBAC role.');
    }
  };

  const handleClaimTask = async (taskId) => {
    if (!taskId) return;
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/claim`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        // Immediately invalidate React Query cache to refresh board
        queryClient.invalidateQueries({ queryKey: ['tasks', activeWorkspace?.id] });
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to claim task.');
      }
    } catch (err) {
      console.error('Error claiming task:', err);
      alert('Error claiming task.');
    }
  };

  // Filters
  const filteredTasks = tasks.filter(t => {
    const title = t.title || '';
    const desc = t.desc || '';
    const epic = t.epic || '';
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesSearch = title.toLowerCase().includes(normalizedSearch) ||
                          desc.toLowerCase().includes(normalizedSearch) ||
                          epic.toLowerCase().includes(normalizedSearch);
    const matchesEpic = filterEpic === 'All' || t.epic === filterEpic;
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    
    // For You assignee filter
    let matchesAssignee = true;
    if (boardFilter === 'foryou') {
      const userName = user?.name || 'You';
      matchesAssignee = t.assignee === 'You' || t.assignee === userName;
    }

    return matchesSearch && matchesEpic && matchesPriority && matchesAssignee;
  });

  // Process tasks (handling sorting for Recent filter)
  const processedTasks = useMemo(() => {
    let list = [...filteredTasks];
    if (boardFilter === 'recent') {
      // Sort by task ID descending (newest created first)
      list.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    }
    return list;
  }, [filteredTasks, boardFilter]);

  // Calculate Metrics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const progressTasks = tasks.filter(t => t.status === 'progress').length;
  const reviewTasks = tasks.filter(t => t.status === 'review').length;
  const highPriorityCount = tasks.filter(t => t.priority === 'High').length;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Dynamic Burnup Tracker Calculations
  const burnupData = useMemo(() => {
    if (!activeWorkspace) return { points: [], idealPoints: [], labels: [] };

    // Default duration is 2 weeks (14 days)
    const durationWeeks = activeWorkspace.sprint_duration || 2;
    const totalPoints = 10;
    
    // Start of the sprint (use workspace creation date as reference)
    const workspaceCreated = new Date(activeWorkspace.created_at || dashboardOpenedAt);
    const sprintDurationMs = durationWeeks * 7 * 24 * 60 * 60 * 1000;
    const elapsed = dashboardOpenedAt - workspaceCreated.getTime();
    const sprintIndex = Math.max(0, Math.floor(elapsed / sprintDurationMs));
    const sprintStart = new Date(workspaceCreated.getTime() + sprintIndex * sprintDurationMs);
    
    const intervalMs = sprintDurationMs / (totalPoints - 1);

    const getCompletionTime = (t) => {
      if (t.completedAt) return new Date(t.completedAt).getTime();
      if (t.status === 'done') return new Date(t.createdAt || dashboardOpenedAt).getTime();
      return Infinity;
    };

    // Filter tasks belonging to the current sprint (active tasks + tasks completed during current sprint)
    const sprintTasks = tasks.filter(t => {
      const compTime = getCompletionTime(t);
      return compTime === Infinity || compTime >= sprintStart.getTime();
    });

    const totalSprintTasks = sprintTasks.length;
    
    const points = [];
    const idealPoints = [];
    const labels = [];
    
    for (let i = 0; i < totalPoints; i++) {
      const timeAtPoint = sprintStart.getTime() + i * intervalMs;
      
      // Calculate how many tasks were completed before or at this point in time
      const completedCount = sprintTasks.filter(t => getCompletionTime(t) <= timeAtPoint).length;
      
      // Y position: 180 (0% completed) to 20 (100% completed)
      const completionFraction = totalSprintTasks > 0 ? completedCount / totalSprintTasks : 0;
      const yVal = 180 - completionFraction * 160;
      
      // X position: 10 to 490
      const xVal = 10 + (i / (totalPoints - 1)) * 480;
      
      points.push({ x: xVal, y: yVal, count: completedCount });
      
      // Ideal scope: linear increase from 0 to totalSprintTasks
      const idealFraction = totalPoints > 1 ? i / (totalPoints - 1) : 1;
      const idealY = totalSprintTasks > 0 ? 180 - idealFraction * 160 : 180;
      idealPoints.push({ x: xVal, y: idealY });
      
      // Create labels
      const dayNum = i + 1;
      if (dayNum === 1) labels.push("Day 1");
      else if (dayNum === totalPoints) labels.push(`Day ${totalPoints} (Sprint End)`);
      else if (dayNum % 2 === 1) labels.push(`Day ${dayNum}`);
      else labels.push("");
    }
    
    return { points, idealPoints, labels };
  }, [activeWorkspace, tasks, dashboardOpenedAt]);

  const completedPathD = useMemo(() => {
    if (!burnupData.points || burnupData.points.length === 0) return "";
    return burnupData.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [burnupData.points]);

  const completedGradientD = useMemo(() => {
    if (!burnupData.points || burnupData.points.length === 0) return "";
    const startX = burnupData.points[0].x;
    const endX = burnupData.points[burnupData.points.length - 1].x;
    return `M ${startX} 180 ` + burnupData.points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${endX} 180 Z`;
  }, [burnupData.points]);

  // Get user avatar initials
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-dvh flex bg-dominant text-text-secondary transition-colors duration-300 relative overflow-hidden">
      
      {/* Sidebar Backdrop Overlay for Mobile/Tablet */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-45 xl:hidden animate-[fade-in_150ms_ease-out]"
        />
      )}

      {/* 1. Sidebar Navigation */}
      <aside ref={sidebarRef} className={`fixed inset-y-0 left-0 h-dvh w-64 bg-card-secondary border-r border-border-secondary/60 flex flex-col justify-between flex-shrink-0 z-50 transform transition-transform duration-300 xl:relative xl:translate-x-0 overflow-hidden ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full invisible pointer-events-none xl:visible xl:pointer-events-auto'
      }`} aria-label="Workspace navigation">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Sidebar Header/Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border-secondary/40">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path d="M11.5 2C11.5 2 11.5 5.5 8 9C4.5 12.5 1 12.5 1 12.5L7.5 19L11.5 23L15 19.5L11.5 2Z" fill="var(--color-accent)" />
                  <path d="M23 12.5C23 12.5 19.5 12.5 16 9C12.5 5.5 12.5 2 12.5 2L16.5 6L20.5 10L23 12.5Z" fill="var(--color-accent-hover)" />
                  <path d="M12.5 22C12.5 22 16 22 19.5 18.5C23 15 23 11.5 23 11.5L19 15L15 19L12.5 22Z" fill="var(--color-accent)" opacity="0.8" />
                </svg>
              </div>
              <span className="font-display font-extrabold text-base text-accent">
                Jira Clone <span className="text-text-secondary font-medium">Workspace</span>
              </span>
            </div>
          </div>

          {/* Workspace Switcher dropdown */}
          <div className="px-4 py-3 border-b border-border-secondary/20 bg-dominant-offset/10">
            <label htmlFor="workspace-switcher" className="block text-[9px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1">
              Active Project
            </label>
            <div className="relative group/ws">
              <select
                id="workspace-switcher"
                value={activeWorkspace?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__new__') {
                    onTriggerCreateWorkspace();
                  } else {
                    const ws = workspaces.find(w => w.id.toString() === val);
                    if (ws) onSwitchWorkspace(ws);
                  }
                }}
                className="w-full text-xs font-bold py-2 pl-2.5 pr-8 rounded-lg border border-border-secondary bg-card-secondary text-text-secondary focus:outline-none cursor-pointer appearance-none"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.key})
                  </option>
                ))}
                <option value="__new__">+ Create Workspace...</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-text-secondary-muted">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
            {activeWorkspace && (
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-text-secondary-muted font-bold">
                <span className="capitalize">Methodology: <strong className="text-accent">{activeWorkspace.template_type}</strong></span>
                <div className="flex items-center space-x-1.5">
                  {activeWorkspace.template_type === 'scrum' ? (
                    <span className="mr-1">Sprint: {activeWorkspace.sprint_duration}w</span>
                  ) : (
                    <span className="mr-1">WIP: {activeWorkspace.wip_limit}</span>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete/remove the workspace "${activeWorkspace.name}"? This will permanently delete all of its tasks.`)) {
                        onDeleteWorkspace(activeWorkspace.id);
                      }
                    }}
                    className="text-text-secondary-muted hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-500/10 cursor-pointer border-none bg-transparent"
                    title="Delete / Leave Workspace"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <span className="block text-[9px] font-bold text-text-secondary-muted uppercase tracking-wider px-4 mb-1">
              Your Work
            </span>
            <button
              onClick={() => {
                setActiveTab('foryou');
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'foryou'
                  ? 'bg-accent/10 text-accent border-l-2 border-accent'
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <UserCircle className="w-4.5 h-4.5" />
              <span>For you</span>
            </button>

            <div className="relative" ref={recentRef}>
              <button
                onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  showRecentDropdown || (activeTab === 'board' && boardFilter === 'recent')
                    ? 'bg-accent/10 text-accent border-l-2 border-accent'
                    : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Clock className="w-4.5 h-4.5" />
                  <span>Recent</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${showRecentDropdown ? 'rotate-90' : ''}`} />
              </button>

              {/* Floating Dropdown (responsive positioning to avoid overflow clipping on mobile/tablet drawer) */}
              {showRecentDropdown && (
                <div className="xl:absolute xl:left-[242px] xl:top-0 xl:w-80 relative left-0 w-full mt-1 bg-card-secondary border border-border-secondary rounded-xl shadow-xl z-50 p-4 animate-[fade-in_150ms_ease-out] text-text-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-text-secondary">Recent</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRecentDropdown(false);
                      }}
                      className="text-text-secondary-muted hover:text-text-secondary cursor-pointer border-none bg-transparent"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-muted" />
                    <input
                      type="text"
                      placeholder="Search recent items"
                      value={recentSearchQuery}
                      onChange={(e) => setRecentSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-dominant border border-border-secondary rounded-lg focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-text-secondary placeholder-text-secondary-muted"
                    />
                    {recentSearchQuery && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecentSearchQuery('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary-muted hover:text-text-secondary cursor-pointer border-none bg-transparent"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                    {/* Today Group */}
                    {groupedRecentItems.today.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1 px-1">
                          Today
                        </div>
                        <div className="space-y-1">
                          {groupedRecentItems.today.map(item => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRecentWorkspace(item.wsId, item.type);
                              }}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dominant-offset transition-colors cursor-pointer text-left"
                            >
                              {item.type === 'dashboard' ? (
                                <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                                  <LayoutDashboard className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                                  item.wsId % 3 === 0 ? 'bg-blue-500/10 text-blue-500' :
                                  item.wsId % 3 === 1 ? 'bg-emerald-500/10 text-emerald-500' :
                                  'bg-amber-500/10 text-amber-500'
                                }`}>
                                  <Kanban className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-grow">
                                <div className="text-xs font-semibold text-text-secondary truncate">{item.name}</div>
                                <div className="text-[9px] text-text-secondary-muted">{getRelativeTime(item.visitedAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* This Week Group */}
                    {groupedRecentItems.thisWeek.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1 px-1">
                          This week
                        </div>
                        <div className="space-y-1">
                          {groupedRecentItems.thisWeek.map(item => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRecentWorkspace(item.wsId, item.type);
                              }}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dominant-offset transition-colors cursor-pointer text-left"
                            >
                              {item.type === 'dashboard' ? (
                                <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                                  <LayoutDashboard className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                                  item.wsId % 3 === 0 ? 'bg-blue-500/10 text-blue-500' :
                                  item.wsId % 3 === 1 ? 'bg-emerald-500/10 text-emerald-500' :
                                  'bg-amber-500/10 text-amber-500'
                                }`}>
                                  <Kanban className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-grow">
                                <div className="text-xs font-semibold text-text-secondary truncate">{item.name}</div>
                                <div className="text-[9px] text-text-secondary-muted">{getRelativeTime(item.visitedAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Earlier Group */}
                    {groupedRecentItems.earlier.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1 px-1">
                          Earlier
                        </div>
                        <div className="space-y-1">
                          {groupedRecentItems.earlier.map(item => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRecentWorkspace(item.wsId, item.type);
                              }}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dominant-offset transition-colors cursor-pointer text-left"
                            >
                              {item.type === 'dashboard' ? (
                                <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                                  <LayoutDashboard className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                                  item.wsId % 3 === 0 ? 'bg-blue-500/10 text-blue-500' :
                                  item.wsId % 3 === 1 ? 'bg-emerald-500/10 text-emerald-500' :
                                  'bg-amber-500/10 text-amber-500'
                                }`}>
                                  <Kanban className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-grow">
                                <div className="text-xs font-semibold text-text-secondary truncate">{item.name}</div>
                                <div className="text-[9px] text-text-secondary-muted">{getRelativeTime(item.visitedAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedRecentItems.today.length === 0 && 
                     groupedRecentItems.thisWeek.length === 0 && 
                     groupedRecentItems.earlier.length === 0 && (
                      <div className="text-xs text-text-secondary-muted py-4 text-center">
                        No recent items found.
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('board');
                      setBoardFilter('recent');
                      setShowRecentDropdown(false);
                    }}
                    className="w-full flex items-center space-x-2 pt-2.5 mt-2 border-t border-border-secondary/30 text-xs font-semibold text-text-secondary-muted hover:text-accent transition-colors cursor-pointer text-left border-none bg-transparent"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>View all recent items</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2" />
            
             <button
              onClick={() => setActiveTab('roadmap')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'roadmap'
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Roadmap</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <Clock className="w-4.5 h-4.5" />
              <span>Schedule Calendar</span>
            </button>

            {/* Active Board Nested Sub-menu */}
            <div className="space-y-2">
              <div className="w-full flex items-center px-4 py-2 text-xs font-bold text-text-secondary-muted uppercase tracking-wider select-none">
                <Kanban className="w-4 h-4 mr-2.5 text-accent" />
                <span>Active Board</span>
              </div>

              {/* Sub-items (grouped by template type) */}
              <div className="pl-4 border-l border-border-secondary/35 ml-6 space-y-3">
                {/* Kanban Boards */}
                <div className="space-y-1">
                  <div className="px-3 text-[10px] font-bold text-text-secondary-muted/80 uppercase tracking-wider flex items-center space-x-1.5 select-none">
                    <span>📋</span>
                    <span>Kanban Board</span>
                  </div>
                  <div className="space-y-0.5">
                    {workspaces.filter(ws => ws.template_type === 'kanban').map(ws => {
                      const isActive = activeWorkspace?.id === ws.id;
                      return (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSwitchWorkspace(ws);
                            setActiveTab('board');
                            setBoardFilter('all');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left border-none bg-transparent pl-5 ${
                            isActive && activeTab === 'board'
                              ? 'bg-accent/10 text-accent font-bold'
                              : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          <span className="text-[8px] opacity-65 uppercase font-mono border border-border-secondary/40 px-1 py-0.5 rounded ml-1.5 flex-shrink-0">
                            {ws.key}
                          </span>
                        </button>
                      );
                    })}
                    {workspaces.filter(ws => ws.template_type === 'kanban').length === 0 && (
                      <div className="text-[10px] text-text-secondary-muted/65 italic pl-5 py-1">
                        No Kanban boards
                      </div>
                    )}
                  </div>
                </div>

                {/* Scrum Boards */}
                <div className="space-y-1">
                  <div className="px-3 text-[10px] font-bold text-text-secondary-muted/80 uppercase tracking-wider flex items-center space-x-1.5 select-none">
                    <span>⏱️</span>
                    <span>Scrum Board</span>
                  </div>
                  <div className="space-y-0.5">
                    {workspaces.filter(ws => ws.template_type === 'scrum').map(ws => {
                      const isActive = activeWorkspace?.id === ws.id;
                      return (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSwitchWorkspace(ws);
                            setActiveTab('board');
                            setBoardFilter('all');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left border-none bg-transparent pl-5 ${
                            isActive && activeTab === 'board'
                              ? 'bg-accent/10 text-accent font-bold'
                              : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          <span className="text-[8px] opacity-65 uppercase font-mono border border-border-secondary/40 px-1 py-0.5 rounded ml-1.5 flex-shrink-0">
                            {ws.key}
                          </span>
                        </button>
                      );
                    })}
                    {workspaces.filter(ws => ws.template_type === 'scrum').length === 0 && (
                      <div className="text-[10px] text-text-secondary-muted/65 italic pl-5 py-1">
                        No Scrum boards
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics' 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5" />
              <span>Insights & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('workspace-members')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'workspace-members' 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Workspace Members</span>
            </button>

            <button
              onClick={() => setActiveTab('audit-logs')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'audit-logs' 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <Activity className="w-4.5 h-4.5" />
              <span>Audit Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
              }`}
            >
              <User className="w-4.5 h-4.5" />
              <span>Profile Settings</span>
            </button>
          </nav>

          {/* Quick Links Section */}
          <div className="p-4 border-t border-border-secondary/20 space-y-3">
            <span className="block text-[9px] font-bold text-text-secondary-muted uppercase tracking-wider px-2">
              Jira Discover
            </span>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('goals')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none bg-transparent ${
                  activeTab === 'goals'
                    ? 'bg-accent/10 text-accent font-bold'
                    : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    activeTab === 'goals'
                      ? 'bg-accent/20 border-accent/30 text-accent'
                      : 'bg-dominant-offset border-border-secondary/20 text-text-secondary'
                  }`}>
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span>Goals</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('teams')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none bg-transparent ${
                  activeTab === 'teams'
                    ? 'bg-accent/10 text-accent font-bold'
                    : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    activeTab === 'teams'
                      ? 'bg-accent/20 border-accent/30 text-accent'
                      : 'bg-dominant-offset border-border-secondary/20 text-text-secondary'
                  }`}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Teams</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none bg-transparent ${
                  activeTab === 'projects'
                    ? 'bg-accent/10 text-accent font-bold'
                    : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    activeTab === 'projects'
                      ? 'bg-accent/20 border-accent/30 text-accent'
                      : 'bg-dominant-offset border-border-secondary/20 text-text-secondary'
                  }`}>
                    <Rocket className="w-3.5 h-3.5" />
                  </div>
                  <span>Projects</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer — Pinned User Account & Sign Out */}
        <div className="p-3 border-t border-border-secondary/40 bg-card-secondary mt-auto pb-safe">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-dominant-offset/30 border border-border-secondary/30">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold flex items-center justify-center text-xs flex-shrink-0">
                {getUserInitials()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-text-secondary truncate leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-text-secondary-muted truncate leading-tight mt-0.5">
                  {user?.email || 'user@jira.clone'}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent flex-shrink-0 touch-target"
              title="Sign Out"
              aria-label="Sign Out of Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main content container */}
      <div className="flex-grow flex flex-col min-w-0">
          {/* Top Header */}
        <header className="sticky top-0 z-30 bg-card-secondary border-b border-border-secondary/60 w-full flex flex-col transition-colors duration-300">
          
          {/* Mobile Header Bar (<768px) */}
          <div className="h-14 px-4 flex md:hidden items-center justify-between w-full relative">
            {/* Hamburger on Left */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-text-secondary-muted hover:text-accent rounded-lg cursor-pointer border-none bg-transparent flex items-center justify-center min-w-[44px] min-h-[44px]"
              title="Open Navigation"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Center Workspace Name */}
            <div className="absolute left-1/2 -translate-x-1/2 font-display font-extrabold text-sm text-text-secondary truncate max-w-[160px] select-none">
              {activeWorkspace?.name || 'Jira Clone'}
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-2 ml-auto z-40">
              {/* Notifications (Mobile) */}
              <div className="relative" ref={notificationsMobileRef}>
                <button
                  onClick={handleToggleNotifications}
                  className={`p-2 rounded-full hover:bg-dominant-offset transition-colors cursor-pointer border-none bg-transparent min-w-[44px] min-h-[44px] flex items-center justify-center relative ${
                    showNotifications ? 'text-accent bg-accent/10' : 'text-text-secondary-muted hover:text-accent'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-card-secondary animate-[pulse_2s_infinite]">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card-secondary border border-border-secondary rounded-xl shadow-xl p-3.5 z-50 animate-[fade-in_150ms_ease-out] text-left">
                    <div className="flex items-center justify-between border-b border-border-secondary/40 pb-2 mb-2">
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Activity Feed</h4>
                      <span className="text-[9px] font-semibold text-accent bg-accent-light px-1.5 py-0.5 rounded">
                        {notifications.length} Updates
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <p className="text-[10px] text-text-secondary-muted italic text-center py-4">No recent activity logs.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="p-2 rounded-lg bg-dominant/30 border border-border-secondary/20 hover:border-accent/20 transition-all text-[10px] leading-relaxed flex items-start space-x-2">
                            <span className="mt-0.5 select-none text-[12px]">
                              {notif.type === 'task' ? '📋' : notif.type === 'member' ? '👥' : notif.type === 'team' ? '🛡️' : notif.type === 'goal' ? '🎯' : notif.type === 'calendar' ? '📅' : '🔔'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-text-secondary font-medium whitespace-pre-wrap">{notif.text || notif.message || 'Activity notification content unavailable'}</p>
                              <span className="text-[8px] text-text-secondary-muted block mt-1 font-mono">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar on Right (Mobile) */}
              <div className="relative" ref={profileMenuMobileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 h-9 rounded-full focus:outline-none border-none bg-transparent p-0 cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
                  title="User Profile Menu"
                >
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-border-secondary/80" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
                      {getUserInitials()}
                    </div>
                  )}
                </button>
              
              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-card-secondary border border-border-secondary rounded-xl shadow-xl p-2.5 z-50 animate-[fade-in_150ms_ease-out] text-left">
                  <div className="p-2 border-b border-border-secondary/40 space-y-0.5">
                    <p className="text-xs font-bold text-text-secondary truncate">{user?.name}</p>
                    <p className="text-[10px] text-text-secondary-muted truncate">{user?.email}</p>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-dominant-offset transition-colors border-none bg-transparent cursor-pointer text-left"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/5 transition-colors border-none bg-transparent cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Mobile Search & Filters Row (<768px) */}
          <div className="px-4 py-2 bg-dominant-offset/10 border-t border-border-secondary/30 flex md:hidden items-center justify-between gap-2.5 w-full">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-muted" />
              <input
                aria-label="Search issues"
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-card-secondary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-secondary placeholder-text-secondary-muted transition-colors min-h-[44px]"
              />
            </div>
            
            {/* Filter drawer toggle button */}
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`p-2.5 rounded-lg border flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] ${
                isFilterPanelOpen 
                  ? 'bg-accent/10 border-accent text-accent' 
                  : 'bg-card-secondary border-border-secondary text-text-secondary-muted'
              }`}
              title="Filter Panel"
              aria-label="Filter Panel"
            >
              <Filter className="w-4 h-4" />
              {(filterEpic !== 'All' || filterPriority !== 'All') && (
                <span className="ml-1 text-[9px] font-bold bg-accent text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                  {(filterEpic !== 'All' ? 1 : 0) + (filterPriority !== 'All' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Tablet & Desktop Header Row (>=768px) */}
          <div className="hidden md:flex h-14 lg:h-16 px-6 lg:px-8 items-center justify-between gap-4 w-full border-b border-border-secondary/20 lg:border-b-0">
            
            {/* Left: Breadcrumbs & Sidebar Toggle */}
            <div className="flex items-center space-x-2 text-xs font-semibold text-text-secondary-muted justify-start min-w-0 flex-shrink">
              {/* Sidebar toggle visible only on md and lg, hidden on xl */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 -ml-1.5 mr-1.5 text-text-secondary-muted hover:text-accent hover:bg-dominant-offset rounded-lg xl:hidden cursor-pointer border-none bg-transparent flex items-center justify-center min-w-[44px] min-h-[44px]"
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="hidden sm:inline">Workspaces</span>
              <ChevronRight className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="text-text-secondary font-bold truncate max-w-[120px] lg:max-w-[200px]">{activeWorkspace?.name || 'Loading...'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="capitalize truncate max-w-[100px] lg:max-w-[150px]">
                {activeTab === 'board' 
                  ? 'Board' 
                  : activeTab === 'calendar'
                  ? 'Calendar'
                  : activeTab === 'analytics' 
                  ? 'Insights' 
                  : activeTab === 'team' 
                  ? 'Team' 
                  : activeTab === 'foryou'
                  ? 'For You'
                  : activeTab === 'roadmap'
                  ? 'Roadmap'
                  : activeTab === 'goals'
                  ? 'Goals Directory'
                  : activeTab === 'teams'
                  ? 'Teams Directory'
                  : activeTab === 'projects'
                  ? 'Projects Directory'
                  : 'Profile Settings'}
              </span>

              {/* Inline Search: Visible only on Laptop/Desktop (>=1024px) */}
              <div className="hidden lg:block relative pl-4 flex-shrink">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-muted" />
                <input
                  aria-label="Search issues"
                  type="text"
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-40 xl:w-56 text-xs bg-dominant border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-secondary placeholder-text-secondary-muted transition-all"
                />
              </div>
            </div>

            {/* Right: Controls & Create Button */}
            <div className="flex items-center justify-end space-x-3 flex-shrink-0">
              {/* Desktop Theme Picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="flex items-center space-x-1.5 p-2 text-xs font-semibold text-text-secondary-muted hover:text-accent rounded-lg hover:bg-dominant-offset transition-colors cursor-pointer border-none bg-transparent min-w-[44px] min-h-[44px]"
                  title="Choose Color Theme"
                >
                  <Palette className="w-4 h-4" />
                  <span className="hidden xl:inline">
                    {THEMES.find(t => t.id === theme)?.name}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showThemePicker && (
                  <div className="absolute right-0 mt-2 w-56 bg-card-secondary border border-border-secondary rounded-xl shadow-xl p-2.5 z-50 animate-[fade-in_150ms_ease-out]">
                    <div className="text-[9px] font-bold text-text-secondary-muted px-2 py-1 uppercase tracking-wider">
                      Color Palette
                    </div>
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                        }}
                        className={`w-full flex items-center space-x-2.5 p-2 rounded-lg text-[10px] font-bold hover:bg-dominant-offset cursor-pointer text-left transition-colors border-none bg-transparent ${
                          theme === t.id ? 'text-accent bg-accent-light' : 'text-text-secondary'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${t.colorBg} block border border-white/20`} />
                        <span>{t.name}</span>
                      </button>
                    ))}

                    <div className="text-[9px] font-bold text-text-secondary-muted px-2 py-1 mt-2 uppercase tracking-wider border-t border-border-secondary/40 pt-2">
                      Appearance Mode
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      <button
                        onClick={() => setMode('light')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          mode === 'light'
                            ? 'border-accent bg-accent-light text-accent'
                            : 'border-border-secondary/40 text-text-secondary-muted hover:bg-dominant-offset'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 mb-1" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => setMode('dark')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          mode === 'dark'
                            ? 'border-accent bg-accent-light text-accent'
                            : 'border-border-secondary/40 text-text-secondary-muted hover:bg-dominant-offset'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 mb-1" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => setMode('system')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          mode === 'system'
                            ? 'border-accent bg-accent-light text-accent'
                            : 'border-border-secondary/40 text-text-secondary-muted hover:bg-dominant-offset'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5 mb-1" />
                        <span>System</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Toggle */}
              <button
                onClick={toggleMode}
                className="p-2 text-text-secondary-muted hover:text-accent rounded-full hover:bg-dominant-offset transition-colors cursor-pointer border-none bg-transparent min-w-[44px] min-h-[44px] flex items-center justify-center touch-target"
                title={resolvedMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {resolvedMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications Toggle */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={handleToggleNotifications}
                  className={`p-2 rounded-full hover:bg-dominant-offset transition-colors cursor-pointer border-none bg-transparent min-w-[44px] min-h-[44px] flex items-center justify-center relative ${
                    showNotifications ? 'text-accent bg-accent/10' : 'text-text-secondary-muted hover:text-accent'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-card-secondary animate-[pulse_2s_infinite]">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card-secondary border border-border-secondary rounded-xl shadow-xl p-3.5 z-50 animate-[fade-in_150ms_ease-out] text-left">
                    <div className="flex items-center justify-between border-b border-border-secondary/40 pb-2 mb-2">
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Activity Feed</h4>
                      <span className="text-[9px] font-semibold text-accent bg-accent-light px-1.5 py-0.5 rounded">
                        {notifications.length} Updates
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <p className="text-[10px] text-text-secondary-muted italic text-center py-4">No recent activity logs.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="p-2 rounded-lg bg-dominant/30 border border-border-secondary/20 hover:border-accent/20 transition-all text-[10px] leading-relaxed flex items-start space-x-2">
                            <span className="mt-0.5 select-none text-[12px]">
                              {notif.type === 'task' ? '📋' : notif.type === 'member' ? '👥' : notif.type === 'team' ? '🛡️' : notif.type === 'goal' ? '🎯' : notif.type === 'calendar' ? '📅' : '🔔'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-text-secondary font-medium whitespace-pre-wrap">{notif.text || notif.message || 'Activity notification content unavailable'}</p>
                              <span className="text-[8px] text-text-secondary-muted block mt-1 font-mono">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Toggle */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`p-2 rounded-full hover:bg-dominant-offset transition-colors cursor-pointer border-none bg-transparent min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  activeTab === 'profile' ? 'text-accent bg-accent/10' : 'text-text-secondary-muted hover:text-accent'
                }`}
                title="Settings"
              >
                <Settings className="w-4.5 h-4.5" />
              </button>

              {/* Profile Avatar (Desktop/Tablet) */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full focus:outline-none border-none bg-transparent p-0 cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
                  title="User Profile Menu"
                >
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-border-secondary/80 hover:border-accent transition-colors" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center font-bold text-xs border border-accent/20 hover:border-accent transition-colors">
                      {getUserInitials()}
                    </div>
                  )}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-card-secondary border border-border-secondary rounded-xl shadow-xl p-2.5 z-50 animate-[fade-in_150ms_ease-out] text-left">
                    <div className="p-2 border-b border-border-secondary/40 space-y-0.5">
                      <p className="text-xs font-bold text-text-secondary truncate">{user?.name}</p>
                      <p className="text-[10px] text-text-secondary-muted truncate">{user?.email}</p>
                    </div>
                    <div className="py-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-dominant-offset transition-colors border-none bg-transparent cursor-pointer text-left"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Profile Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/5 transition-colors border-none bg-transparent cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Create button (pinned to right on Laptop/Desktop) */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="hidden lg:flex items-center space-x-1 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Sub-Header Row for Tablet only (768px – 1023px) */}
          <div className="hidden md:flex lg:hidden h-12 px-6 bg-dominant-offset/10 border-t border-border-secondary/30 items-center justify-between gap-4 w-full">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-muted" />
              <input
                aria-label="Search issues"
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-60 text-xs bg-card-secondary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-secondary placeholder-text-secondary-muted transition-colors min-h-[36px]"
              />
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer border-none min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>

        </header>

        {workspaceError ? (
          <main className="flex-grow min-w-0 p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-dominant-offset/10">
            <div className="max-w-md w-full bg-card-secondary border border-red-500/20 p-8 rounded-xl shadow-xl text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8v6m0 5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-secondary">Workspace Access Denied</h3>
                <p className="text-xs text-text-secondary-muted leading-relaxed">
                  {workspaceError}
                </p>
              </div>
              <div className="p-4 bg-dominant rounded-lg text-left text-xs text-text-secondary-muted border border-border-secondary/40 space-y-2">
                <p className="font-semibold text-text-secondary">What can you do?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Use the active workspace switcher in the sidebar to load another project.</li>
                  <li>Ask the project administrator to adjust your permissions or membership roles.</li>
                  <li>Or sign out and sign in using a different account.</li>
                </ul>
              </div>
              <div className="pt-2">
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                >
                  Sign Out of Account
                </button>
              </div>
            </div>
          </main>
        ) : (
          <>
            {/* sticky Global Filter Bar */}
            {(activeTab === 'board' || activeTab === 'foryou' || activeTab === 'roadmap') && (
          <div className="sticky top-[104px] lg:top-[64px] z-20 bg-card-secondary border-b border-border-secondary/40 px-4 sm:px-6 lg:px-8 py-2 flex flex-col transition-colors duration-300 w-full">
            
            {/* Desktop / Laptop Inline Filter Panel (>=1024px) */}
            <div className="hidden lg:flex items-center justify-between gap-4 w-full">
              <div className="flex items-center space-x-4">
                <span className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">Quick Filters:</span>
                
                {/* Epic select dropdown */}
                <div className="flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5 text-text-secondary-muted" />
                  <span className="text-xs text-text-secondary-muted">Epic:</span>
                  <select
                    aria-label="Filter by epic"
                    value={filterEpic}
                    onChange={(e) => setFilterEpic(e.target.value)}
                    className="text-xs py-1 pl-2 pr-6 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                  >
                    <option value="All">All Epics</option>
                    {epicsList.map(epic => (
                      <option key={epic} value={epic}>{epic}</option>
                    ))}
                  </select>
                </div>

                {/* Priority select dropdown */}
                <div className="flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-text-secondary-muted" />
                  <span className="text-xs text-text-secondary-muted">Priority:</span>
                  <select
                    aria-label="Filter by priority"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="text-xs py-1 pl-2 pr-6 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🔵 Low</option>
                  </select>
                </div>
              </div>

              {/* Filter Reset Button */}
              {(filterEpic !== 'All' || filterPriority !== 'All') && (
                <button
                  onClick={() => {
                    setFilterEpic('All');
                    setFilterPriority('All');
                  }}
                  className="text-xs font-semibold text-accent hover:underline cursor-pointer border-none bg-transparent"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Tablet Horizontally Scrollable Chips (768px – 1023px) */}
            <div className="hidden md:flex lg:hidden items-center overflow-x-auto py-1.5 pb-2 gap-2 scrollbar-thin flex-nowrap w-full">
              <span className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider pr-2 flex-shrink-0">Filters:</span>
              
              {/* Epic Chips */}
              <button
                onClick={() => setFilterEpic('All')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 cursor-pointer ${
                  filterEpic === 'All' 
                    ? 'bg-accent text-white border-accent' 
                    : 'bg-card-secondary border-border-secondary text-text-secondary-muted hover:text-text-secondary'
                }`}
              >
                All Epics
              </button>
              {epicsList.map(epic => (
                <button
                  key={epic}
                  onClick={() => setFilterEpic(epic)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 cursor-pointer ${
                    filterEpic === epic 
                      ? 'bg-accent text-white border-accent' 
                      : 'bg-card-secondary border-border-secondary text-text-secondary-muted hover:text-text-secondary'
                  }`}
                >
                  {epic}
                </button>
              ))}

              <div className="h-4 w-px bg-border-secondary/40 flex-shrink-0 mx-1" />

              {/* Priority Chips */}
              <button
                onClick={() => setFilterPriority('All')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 cursor-pointer ${
                  filterPriority === 'All' 
                    ? 'bg-accent text-white border-accent' 
                    : 'bg-card-secondary border-border-secondary text-text-secondary-muted hover:text-text-secondary'
                }`}
              >
                All Priorities
              </button>
              {['High', 'Medium', 'Low'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 cursor-pointer ${
                    filterPriority === p 
                      ? 'bg-accent text-white border-accent' 
                      : 'bg-card-secondary border-border-secondary text-text-secondary-muted hover:text-text-secondary'
                  }`}
                >
                  {p === 'High' ? '🔴' : p === 'Medium' ? '🟡' : '🔵'} {p}
                </button>
              ))}
            </div>

            {/* Mobile Collapsible Filter Panel (<768px) */}
            {isFilterPanelOpen && (
              <div className="flex flex-col md:hidden py-3 gap-3 border-t border-border-secondary/20 animate-[slide-down_150ms_ease-out] w-full">
                {/* Epic Select */}
                <div className="flex flex-col gap-1 text-left">
                  <label htmlFor="mobile-filter-epic" className="text-[10px] font-bold text-text-secondary-muted uppercase">Epic Category</label>
                  <select
                    id="mobile-filter-epic"
                    value={filterEpic}
                    onChange={(e) => setFilterEpic(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none min-h-[44px] cursor-pointer"
                  >
                    <option value="All">All Epics</option>
                    {epicsList.map(epic => (
                      <option key={epic} value={epic}>{epic}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Select */}
                <div className="flex flex-col gap-1 text-left">
                  <label htmlFor="mobile-filter-priority" className="text-[10px] font-bold text-text-secondary-muted uppercase">Priority</label>
                  <select
                    id="mobile-filter-priority"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none min-h-[44px] cursor-pointer"
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🔵 Low</option>
                  </select>
                </div>

                {/* Mobile Clear Button */}
                {(filterEpic !== 'All' || filterPriority !== 'All') && (
                  <button
                    onClick={() => {
                      setFilterEpic('All');
                      setFilterPriority('All');
                      setIsFilterPanelOpen(false);
                    }}
                    className="w-full py-2 bg-dominant-offset hover:bg-dominant-offset/80 text-text-secondary font-bold text-xs rounded-lg min-h-[44px] cursor-pointer border-none"
                  >
                    Clear Active Filters
                  </button>
                )}
              </div>
            )}

          </div>
        )}

        {/* Content Area */}
        <main className="flex-grow min-w-0 p-4 pb-24 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-dominant-offset/30">
          
          {/* TAB 1: KANBAN BOARD */}
          {activeTab === 'board' && (
            <div className="space-y-6 h-full flex flex-col">
              


              {/* Sprint Banner for Scrum */}
              {isScrum && (
                <div className="bg-accent/5 border border-accent/20 p-4 rounded-xl flex items-center justify-between animate-[fade-in_200ms_ease-out]">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary flex items-center">
                        Active Sprint 1
                        <span className="ml-2.5 px-1.5 py-0.5 text-[8px] bg-accent text-white font-bold rounded-full uppercase tracking-wider">In Progress</span>
                      </h4>
                      <p className="text-[10px] text-text-secondary-muted mt-0.5">
                        Goal: Seed and build project milestone requirements. Default Duration: {activeWorkspace?.sprint_duration || 2} Weeks.
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-text-secondary-muted font-bold">
                    <span>Ends in 12 days</span>
                  </div>
                </div>
              )}

              {/* Kanban Grid */}
              <div ref={kanbanGridRef} className="flex flex-col md:flex-row overflow-y-auto md:overflow-x-auto md:overflow-y-hidden gap-4 md:gap-6 flex-grow items-stretch md:items-start pb-4 scrollbar-thin w-full min-w-0">
                {columns.map(col => {
                  const currentCount = processedTasks.filter(t => t.status === col.id).length;
                  const wipExceeded = col.hasWipLimit && currentCount > (activeWorkspace?.wip_limit || 5);
                  const isHovered = touchDragActive && touchTargetColumnId === col.id;
                  
                  return (
                    <div 
                      key={col.id}
                      data-column-id={col.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={`bg-card-secondary/60 rounded-xl border p-4 flex flex-col w-full md:w-[320px] md:shrink-0 max-h-none md:max-h-[calc(100dvh-280px)] overflow-hidden transition-all duration-300 ${
                        wipExceeded 
                          ? 'border-red-500/40 bg-red-500/[0.02]' 
                          : isHovered
                          ? 'border-accent bg-accent-light/10 shadow-md scale-[1.01]'
                          : 'border-border-secondary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center">
                            {col.name}
                            {col.hasWipLimit && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold ${wipExceeded ? 'bg-red-500/20 text-red-500' : 'bg-dominant text-text-secondary-muted'}`}>
                                Limit {activeWorkspace?.wip_limit || 5}
                              </span>
                            )}
                          </h3>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          wipExceeded 
                            ? 'text-red-500 bg-red-500/10 border-red-500/20' 
                            : 'text-text-secondary-muted bg-dominant border-border-secondary/60'
                        }`}>
                          {currentCount}
                        </span>
                      </div>
                      
                      <div className="space-y-3 overflow-y-auto pr-1 flex-grow scrollbar-thin">
                        {processedTasks.filter(t => t.status === col.id).map(task => (
                          <Card 
                            key={task.id} 
                            task={task} 
                            onDragStart={handleDragStart} 
                            onDelete={handleDeleteIssue}
                            onTouchStart={handleTouchStart}
                            isDragging={touchDragTaskId === task.id}
                            onClaim={handleClaimTask}
                          />
                        ))}
                        {processedTasks.filter(t => t.status === col.id).length === 0 && (
                          <EmptyPlaceholder text={`No tasks in ${col.name.toLowerCase()}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB: FOR YOU */}
          {activeTab === 'foryou' && (
            <div className="space-y-8 max-w-5xl mx-auto w-full animate-[fade-in_200ms_ease-out]">
              
              {/* Section 1: Recommended spaces */}
              <div className="bg-card-secondary p-4 sm:p-6 rounded-xl border border-border-secondary/40 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-border-secondary/20 pb-3">
                  <h3 className="text-sm font-bold text-text-secondary">Recommended spaces</h3>
                  <button 
                    onClick={() => {
                      setActiveTab('board');
                      setBoardFilter('all');
                    }}
                    className="text-xs font-semibold text-accent hover:underline bg-transparent border-none cursor-pointer"
                  >
                    View all spaces
                  </button>
                </div>
                
                {workspaces.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-2xl">📁</span>
                    <h4 className="text-xs font-bold text-text-secondary">No spaces found</h4>
                    <p className="text-[11px] text-text-secondary-muted">Any recommended spaces will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workspaces.slice(0, 3).map(ws => (
                      <div 
                        key={ws.id}
                        onClick={() => onSwitchWorkspace(ws)}
                        className="p-4 rounded-lg border border-border-secondary/60 hover:border-accent/30 bg-dominant-offset/5 hover:bg-accent-light/5 transition-all cursor-pointer flex items-center space-x-3.5 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-sm group-hover:bg-accent group-hover:text-white transition-all">
                          {ws.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-text-secondary truncate group-hover:text-accent transition-colors">{ws.name}</h4>
                          <p className="text-[10px] text-text-secondary-muted truncate">Key: {ws.key} | {ws.template_type} project</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: For you */}
              <div className="bg-card-secondary p-4 sm:p-6 rounded-xl border border-border-secondary/40 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-secondary/20 pb-3 min-w-0">
                  <h3 className="text-sm font-bold text-text-secondary flex-shrink-0">For you</h3>
                  
                  {/* Sub Tab Buttons */}
                  <div className="flex items-center gap-1 bg-dominant-offset/30 p-1 rounded-lg border border-border-secondary/40 max-w-full overflow-x-auto scrollbar-thin">
                    <button
                      onClick={() => setForYouSubTab('recommended')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none whitespace-nowrap flex-shrink-0 ${
                        forYouSubTab === 'recommended' 
                          ? 'bg-card-secondary text-accent shadow-sm' 
                          : 'text-text-secondary-muted hover:text-text-secondary bg-transparent'
                      }`}
                    >
                      Recommended
                    </button>
                    <button
                      onClick={() => setForYouSubTab('assigned')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none flex items-center whitespace-nowrap flex-shrink-0 ${
                        forYouSubTab === 'assigned' 
                          ? 'bg-card-secondary text-accent shadow-sm' 
                          : 'text-text-secondary-muted hover:text-text-secondary bg-transparent'
                      }`}
                    >
                      <span>Assigned to me</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 text-[9px] rounded-full font-bold ${
                        forYouSubTab === 'assigned' ? 'bg-accent text-white' : 'bg-dominant-offset text-text-secondary-muted'
                      }`}>
                        {tasks.filter(t => t.assignee === 'You' || t.assignee === user?.name).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setForYouSubTab('starred')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none whitespace-nowrap flex-shrink-0 ${
                        forYouSubTab === 'starred' 
                          ? 'bg-card-secondary text-accent shadow-sm' 
                          : 'text-text-secondary-muted hover:text-text-secondary bg-transparent'
                      }`}
                    >
                      Starred
                    </button>
                    <button
                      onClick={() => setForYouSubTab('worked')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none whitespace-nowrap flex-shrink-0 ${
                        forYouSubTab === 'worked' 
                          ? 'bg-card-secondary text-accent shadow-sm' 
                          : 'text-text-secondary-muted hover:text-text-secondary bg-transparent'
                      }`}
                    >
                      Worked on
                    </button>
                    <button
                      onClick={() => setForYouSubTab('viewed')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none whitespace-nowrap flex-shrink-0 ${
                        forYouSubTab === 'viewed' 
                          ? 'bg-card-secondary text-accent shadow-sm' 
                          : 'text-text-secondary-muted hover:text-text-secondary bg-transparent'
                      }`}
                    >
                      Viewed
                    </button>
                  </div>
                </div>

                {/* Sub Tab Content */}
                <div className="space-y-4">
                  {forYouSubTab === 'recommended' && (
                    <div className="border border-border-secondary/60 rounded-xl p-4 sm:p-5 bg-dominant-offset/5">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-grow min-w-0 space-y-3">
                          <div>
                            <h4 className="text-xs font-bold text-text-secondary">View popular spaces</h4>
                            <p className="text-[11px] text-text-secondary-muted">View spaces used by teams in your organization.</p>
                          </div>
                          
                          {workspaces.length === 0 ? (
                            <div className="text-[10px] text-text-secondary-muted italic">No spaces active in organization yet.</div>
                          ) : (
                            <div className="space-y-2 border-t border-border-secondary/20 pt-3">
                              {workspaces.slice(0, 3).map(ws => (
                                <div key={ws.id} className="group/item">
                                  <div 
                                    onClick={() => onSwitchWorkspace(ws)}
                                    className="flex items-center space-x-2 font-bold text-xs text-text-secondary hover:text-accent cursor-pointer transition-colors"
                                  >
                                    <span className="text-[11px] opacity-80">📁</span>
                                    <span>{ws.name}</span>
                                  </div>
                                  <div className="text-[9px] text-text-secondary-muted pl-5">
                                    {user?.name || 'Administrator'} (space lead)
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {forYouSubTab === 'assigned' && (
                    <div className="space-y-3">
                      {tasks.filter(t => t.assignee === 'You' || t.assignee === user?.name).length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-text-secondary-muted italic">
                          No tasks currently assigned to you.
                        </div>
                      ) : (
                        <div className="divide-y divide-border-secondary/30">
                          {tasks.filter(t => t.assignee === 'You' || t.assignee === user?.name).map(t => (
                            <div key={t.id} className="py-3 flex items-center justify-between text-xs hover:bg-dominant-offset/10 px-2 rounded-lg transition-colors">
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                                  t.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                                  t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                                  'bg-blue-500/10 text-blue-500'
                                }`}>
                                  {t.priority}
                                </span>
                                <span className="font-semibold text-text-secondary truncate">{t.title}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-[10px] text-text-secondary-muted capitalize">Epic: {t.epic}</span>
                                <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider text-white ${
                                  t.status === 'done' ? 'bg-green-500' :
                                  t.status === 'progress' ? 'bg-blue-500' :
                                  t.status === 'review' ? 'bg-amber-500' :
                                  'bg-slate-400'
                                }`}>
                                  {t.status === 'todo' ? 'To Do' : t.status === 'progress' ? 'In Progress' : t.status === 'review' ? 'Under Review' : t.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {forYouSubTab === 'starred' && (
                    <div className="py-8 text-center text-[11px] text-text-secondary-muted italic">
                      No starred spaces. Star workspaces from the switcher to see them here.
                    </div>
                  )}

                  {forYouSubTab === 'worked' && (
                    <div className="space-y-3">
                      {tasks.slice(0, 5).length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-text-secondary-muted italic">
                          No tasks worked on recently.
                        </div>
                      ) : (
                        <div className="divide-y divide-border-secondary/30">
                          {tasks.slice(0, 5).map(t => (
                            <div key={t.id} className="py-3 flex items-center justify-between text-xs hover:bg-dominant-offset/10 px-2 rounded-lg transition-colors">
                              <div className="min-w-0">
                                <div className="font-semibold text-text-secondary truncate">{t.title}</div>
                                <div className="text-[9px] text-text-secondary-muted">Assigned to: {t.assignee}</div>
                              </div>
                              <span className="text-[10px] text-text-secondary-muted">Modified recently</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {forYouSubTab === 'viewed' && (
                    <div className="space-y-3">
                      {recentItems.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-text-secondary-muted italic">
                          No spaces viewed recently.
                        </div>
                      ) : (
                        <div className="divide-y divide-border-secondary/30">
                          {recentItems.slice(0, 5).map(item => (
                            <div 
                              key={item.id}
                              onClick={() => handleSelectRecentWorkspace(item.id, 'board')}
                              className="py-3 flex items-center justify-between text-xs hover:bg-dominant-offset/10 px-2 rounded-lg cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-text-secondary">{item.name}</span>
                                <span className="text-[10px] text-text-secondary-muted ml-2">({item.key})</span>
                              </div>
                              <span className="text-[9px] text-text-secondary-muted">{getRelativeTime(item.visitedAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Feedback Card */}
              <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 shadow-sm flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] text-text-secondary-muted text-center">
                <span>Were these recommendations useful?</span>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  <button className="flex items-center space-x-1.5 hover:text-accent bg-transparent border-none cursor-pointer">
                    <span>👍</span>
                    <span>Yes</span>
                  </button>
                  <button className="flex items-center space-x-1.5 hover:text-accent bg-transparent border-none cursor-pointer">
                    <span>👎</span>
                    <span>No</span>
                  </button>
                  <span className="hidden sm:inline text-border-secondary/60">|</span>
                  <button className="flex items-center space-x-1.5 hover:text-accent bg-transparent border-none cursor-pointer">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Give us feedback</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB: ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="space-y-6 animate-[fade-in_200ms_ease-out]">
              
              {/* Header */}
              <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-text-secondary text-base">Project Roadmap</h3>
                  <p className="text-xs text-text-secondary-muted mt-0.5">Plan and track your epics across a quarterly timeline. Click columns to adjust epic schedules.</p>
                </div>
                <button
                  onClick={() => {
                    const newEpicName = prompt('Enter new Epic name:');
                    if (newEpicName && newEpicName.trim()) {
                      const name = newEpicName.trim();
                      if (!epicsList.includes(name)) {
                        setCustomEpics(prev => [...prev, name]);
                        setEpicTimelineOverrides(prev => ({
                          ...prev,
                          [name]: { start: 1, end: 3, color: 'bg-indigo-500' }
                        }));
                      }
                    }
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Epic</span>
                </button>
              </div>

              {/* Roadmap Timeline */}
              <div className="bg-card-secondary rounded-xl border border-border-secondary/60 shadow-sm overflow-x-auto scrollbar-thin">
                <div className="min-w-[800px]">
                  
                  {/* Timeline Grid Header */}
                  <div className="flex border-b border-border-secondary/40 bg-dominant-offset/10">
                  <div className="w-80 p-4 font-bold text-xs text-text-secondary border-r border-border-secondary/40 flex-shrink-0">
                    Epics
                  </div>
                  <div className="flex-grow grid grid-cols-6 divide-x divide-border-secondary/20">
                    {months.map((m, idx) => (
                      <div key={idx} className="p-4 text-center font-bold text-[11px] text-text-secondary-muted uppercase tracking-wider">
                        {m}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Epic Rows */}
                <div className="divide-y divide-border-secondary/40">
                  {epicsList.map(epic => {
                    const timeline = epicTimelines[epic] || { start: 1, end: 3, color: 'bg-slate-500' };
                    const epicTasks = tasks.filter(t => t.epic === epic);
                    const doneCount = epicTasks.filter(t => t.status === 'done').length;
                    const totalCount = epicTasks.length;
                    const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
                    const isExpanded = expandedEpic === epic;

                    return (
                      <div key={epic} className="flex flex-col">
                        <div className="flex items-stretch hover:bg-dominant-offset/5 transition-colors min-h-[72px]">
                          
                          {/* Epic Info details */}
                          <div 
                            onClick={() => setExpandedEpic(isExpanded ? null : epic)}
                            className="w-80 p-4 border-r border-border-secondary/40 flex-shrink-0 flex flex-col justify-center cursor-pointer select-none"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-text-secondary hover:text-accent transition-colors flex items-center">
                                <ChevronRight className={`w-3.5 h-3.5 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                {epic}
                              </span>
                              <span className="text-[10px] text-text-secondary-muted font-semibold">
                                {doneCount}/{totalCount} issues
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2 flex items-center space-x-2">
                              <div className="w-full bg-dominant rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-accent h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-accent">{progressPct}%</span>
                            </div>
                          </div>

                          {/* 6-Month Visual Timeline Bar */}
                          <div className="flex-grow grid grid-cols-6 relative divide-x divide-border-secondary/10 bg-dominant/5">
                            {months.map((_, mIdx) => (
                              <div 
                                key={mIdx}
                                onClick={() => {
                                  // Click to adjust timeline
                                  const current = epicTimelines[epic] || { start: 1, end: 3, color: 'bg-slate-500' };
                                  let next = { ...current };
                                  if (mIdx < current.start) {
                                    next.start = mIdx;
                                  } else {
                                    next.end = mIdx;
                                  }
                                  setEpicTimelineOverrides(prev => ({
                                    ...prev,
                                    [epic]: next
                                  }));
                                }}
                                className="h-full cursor-pointer hover:bg-accent-light/5 transition-colors"
                              />
                            ))}

                            {/* Floating Timeline Bar Overlay */}
                            <div 
                              className="absolute inset-y-4 rounded-lg flex items-center justify-between px-3 text-[10px] font-bold text-white shadow-sm hover:opacity-95 transition-all cursor-pointer pointer-events-none select-none"
                              style={{
                                left: `${(timeline.start / 6) * 100}%`,
                                width: `${((timeline.end - timeline.start + 1) / 6) * 100}%`,
                                backgroundColor: timeline.color === 'bg-blue-500' ? '#0052cc' :
                                                 timeline.color === 'bg-red-500' ? '#ff5630' :
                                                 timeline.color === 'bg-emerald-500' ? '#36b37e' :
                                                 timeline.color === 'bg-amber-500' ? '#ffab00' :
                                                 timeline.color === 'bg-purple-500' ? '#875442' : '#6554c0'
                              }}
                            >
                              <span className="truncate">{epic} Timeline</span>
                              <span className="text-[8px] bg-white/20 px-1 py-0.5 rounded font-mono">
                                {timeline.end - timeline.start + 1}m
                              </span>
                            </div>

                          </div>
                        </div>

                        {/* Expanded Issues list */}
                        {isExpanded && (
                          <div className="bg-dominant-offset/15 border-b border-border-secondary/20 p-4 pl-12 space-y-2">
                            <div className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">
                              Issues in epic
                            </div>
                            
                            {epicTasks.length === 0 ? (
                              <div className="text-xs text-text-secondary-muted italic py-1 pl-2">
                                No issues linked to this epic. Link issues when creating them.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {epicTasks.map(task => (
                                  <div key={task.id} className="flex items-center justify-between bg-card-secondary border border-border-secondary/40 rounded-lg p-2.5 text-xs hover:border-accent/30 transition-all">
                                    <div className="flex items-center space-x-2">
                                      <span className={`w-2.5 h-2.5 rounded-full ${
                                        task.status === 'done' ? 'bg-green-500' :
                                        task.status === 'progress' ? 'bg-blue-500' :
                                        task.status === 'review' ? 'bg-amber-500' : 'bg-slate-400'
                                      }`} />
                                      <span className="font-semibold text-text-secondary">{task.title}</span>
                                    </div>
                                    <div className="flex items-center space-x-2.5">
                                      <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase ${
                                        task.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                                        task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-blue-500/10 text-blue-500'
                                      }`}>
                                        {task.priority}
                                      </span>
                                      <span className="text-[10px] text-text-secondary-muted font-bold capitalize">
                                        {task.status === 'todo' ? 'To Do' : task.status === 'progress' ? 'In Progress' : task.status === 'review' ? 'Under Review' : task.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

          {/* TAB: GOALS */}
          {activeTab === 'goals' && (
            <div className="space-y-8 animate-[fade-in_200ms_ease-out]">
              
              {/* Header */}
              <div className="bg-card-secondary p-5 sm:p-6 rounded-xl border border-border-secondary/40 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-text-secondary text-base">Goals Directory</h3>
                  <p className="text-xs text-text-secondary-muted mt-0.5">Define corporate objectives, track progress slider values, and align deliverables.</p>
                </div>
                <button
                  onClick={() => setShowCreateGoalForm(!showCreateGoalForm)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none whitespace-nowrap self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showCreateGoalForm ? 'Cancel Goal' : 'Create Goal'}</span>
                </button>
              </div>

              {/* Goal metrics row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">Total Goals</span>
                    <h3 className="text-xl font-extrabold text-text-secondary mt-1">{goalsList.length}</h3>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-500">
                    <Target className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">On Track</span>
                    <h3 className="text-xl font-extrabold text-green-500 mt-1">{goalsList.filter(g => g.status === 'on_track').length}</h3>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">At Risk</span>
                    <h3 className="text-xl font-extrabold text-amber-500 mt-1">{goalsList.filter(g => g.status === 'at_risk').length}</h3>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">Off Track</span>
                    <h3 className="text-xl font-extrabold text-red-500 mt-1">{goalsList.filter(g => g.status === 'off_track').length}</h3>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                    <X className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Create Goal Form Card */}
              {showCreateGoalForm && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newGoalTitle.trim()) return;
                    const dateVal = newGoalDate ? newGoalDate : new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
                    const goalPayload = {
                      title: newGoalTitle.trim(),
                      desc: newGoalDesc.trim(),
                      owner: newGoalOwner,
                      targetDate: dateVal,
                      status: newGoalStatus,
                      progress: parseInt(newGoalProgress)
                    };
                    
                    fetch(`${API_URL}/api/goals`, {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify(goalPayload)
                    })
                      .then(res => {
                        if (!res.ok) throw new Error('Failed to create goal');
                        return res.json();
                      })
                      .then(getApiData)
                      .then(createdGoal => {
                        setGoalsList(prev => [createdGoal, ...prev]);
                        setNewGoalTitle('');
                        setNewGoalDesc('');
                        setNewGoalOwner(user?.name || 'You');
                        setNewGoalDate('');
                        setNewGoalProgress(50);
                        setNewGoalStatus('on_track');
                        setShowCreateGoalForm(false);
                      })
                      .catch(err => console.error('Error creating goal:', err));
                  }}
                  className="bg-card-secondary p-6 rounded-xl border border-border-secondary/60 shadow-md space-y-4 animate-[fade-in_150ms_ease-out]"
                >
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-1 border-b border-border-secondary/20">Add New Objective Goal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="goal-title" className="text-[10px] font-bold text-text-secondary-muted uppercase">Goal Title</label>
                      <input
                        id="goal-title"
                        type="text"
                        required
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="e.g. Launch frontend updates"
                        className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="goal-owner" className="text-[10px] font-bold text-text-secondary-muted uppercase">Owner / Lead</label>
                      <select
                        id="goal-owner"
                        value={newGoalOwner}
                        onChange={(e) => setNewGoalOwner(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
                      >
                        <option value="You">You</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="goal-desc" className="text-[10px] font-bold text-text-secondary-muted uppercase">Description</label>
                    <textarea
                      id="goal-desc"
                      value={newGoalDesc}
                      onChange={(e) => setNewGoalDesc(e.target.value)}
                      placeholder="Outline key metrics and align targets..."
                      className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none h-16 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="goal-target-date" className="text-[10px] font-bold text-text-secondary-muted uppercase">Target Date</label>
                      <input
                        id="goal-target-date"
                        type="date"
                        value={newGoalDate}
                        onChange={(e) => setNewGoalDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="goal-status" className="text-[10px] font-bold text-text-secondary-muted uppercase">Status</label>
                      <select
                        id="goal-status"
                        value={newGoalStatus}
                        onChange={(e) => setNewGoalStatus(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
                      >
                        <option value="on_track">On Track</option>
                        <option value="at_risk">At Risk</option>
                        <option value="off_track">Off Track</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="goal-progress" className="text-[10px] font-bold text-text-secondary-muted uppercase">Initial Progress ({newGoalProgress}%)</label>
                      <input
                        id="goal-progress"
                        type="range"
                        min="0"
                        max="100"
                        value={newGoalProgress}
                        onChange={(e) => setNewGoalProgress(parseInt(e.target.value))}
                        className="w-full accent-accent h-2 mt-3 bg-dominant rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer border-none shadow-sm"
                    >
                      Save Goal Objective
                    </button>
                  </div>
                </form>
              )}

              {/* Goals Cards List */}
              {goalsList.length === 0 ? (
                <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-12 text-center space-y-2">
                  <span className="text-3xl">🎯</span>
                  <h4 className="text-sm font-bold text-text-secondary">No goals defined</h4>
                  <p className="text-xs text-text-secondary-muted">Create a goal objective above to outline your alignment paths.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goalsList.map(goal => (
                    <div key={goal.id} className="bg-card-secondary rounded-xl border border-border-secondary/60 hover:border-accent/30 shadow-sm p-6 space-y-4 hover:shadow transition-all relative group/card">
                      
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-text-secondary leading-tight">{goal.title}</h4>
                          <p className="text-[10px] text-text-secondary-muted italic">Lead: {goal.owner}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2.5">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                            goal.status === 'on_track' ? 'bg-green-500/10 text-green-500' :
                            goal.status === 'at_risk' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {goal.status.replace('_', ' ')}
                          </span>

                          {(user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER') && (
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this goal?')) {
                                  fetch(`${API_URL}/api/goals/${goal.id}`, {
                                    method: 'DELETE',
                                    headers: getAuthHeaders()
                                  })
                                    .then(res => {
                                      if (res.ok) {
                                        setGoalsList(prev => prev.filter(g => String(g.id) !== String(goal.id)));
                                      }
                                    })
                                    .catch(err => console.error('Error deleting goal:', err));
                                }
                              }}
                              className="text-text-secondary-muted hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100 p-1 rounded hover:bg-red-500/5 cursor-pointer border-none bg-transparent"
                              title="Delete Goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Desc */}
                      <p className="text-[11px] text-text-secondary-muted leading-relaxed">{goal.desc}</p>

                      {/* Timeline */}
                      <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary-muted">
                        <span>Target: {goal.targetDate}</span>
                        <span>{goal.progress}% Complete</span>
                      </div>

                      {/* Interactive Progress Slider */}
                      <div className="space-y-1 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={goal.progress}
                          disabled={user?.rbacRole === 'MEMBER'}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setGoalsList(prev => prev.map(g => String(g.id) === String(goal.id) ? { ...g, progress: val } : g));
                          }}
                          onMouseUp={(e) => {
                            const val = parseInt(e.target.value);
                            fetch(`${API_URL}/api/goals/${goal.id}`, {
                              method: 'PUT',
                              headers: getAuthHeaders(),
                              body: JSON.stringify({ progress: val })
                            }).catch(err => console.error('Error updating goal progress:', err));
                          }}
                          onTouchEnd={(e) => {
                            const val = parseInt(e.target.value);
                            fetch(`${API_URL}/api/goals/${goal.id}`, {
                              method: 'PUT',
                              headers: getAuthHeaders(),
                              body: JSON.stringify({ progress: val })
                            }).catch(err => console.error('Error updating goal progress:', err));
                          }}
                          className="w-full accent-accent h-1.5 bg-dominant rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="w-full bg-dominant rounded-full h-1.5 overflow-hidden hidden">
                          <div 
                            className="bg-accent h-1.5 rounded-full"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: INSIGHTS & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-[fade-in_200ms_ease-out]">
              
              {/* Quick Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-secondary-muted uppercase tracking-wider">Total Tasks</span>
                    <h3 className="text-2xl font-extrabold text-text-secondary mt-1">{totalTasks}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-500">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-secondary-muted uppercase tracking-wider">Completion Rate</span>
                    <h3 className="text-2xl font-extrabold text-text-secondary mt-1">{completionRate}%</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-secondary-muted uppercase tracking-wider">In Progress</span>
                    <h3 className="text-2xl font-extrabold text-text-secondary mt-1">{progressTasks + reviewTasks}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-secondary-muted uppercase tracking-wider">Critical Issues</span>
                    <h3 className="text-2xl font-extrabold text-text-secondary mt-1">{highPriorityCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Visual SVG Chart & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SVG Mock Burnup Chart */}
                <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-text-secondary text-sm">Sprint Velocity & Burnup Tracker</h4>
                      <p className="text-[10px] text-text-secondary-muted mt-0.5">Tasks completed over the current sprint cycle.</p>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] font-semibold">
                      <span className="flex items-center"><span className="w-2.5 h-1.5 bg-accent rounded-full mr-1.5" />Completed</span>
                      <span className="flex items-center"><span className="w-2.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mr-1.5" />Ideal scope</span>
                    </div>
                  </div>

                  <div className="h-64 relative flex items-end justify-center w-full">
                    {/* SVG Chart */}
                    <svg className="w-full h-full text-accent" viewBox="0 0 500 200" fill="none" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="var(--border-secondary)" strokeWidth="0.5" opacity="0.3" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="var(--border-secondary)" strokeWidth="0.5" opacity="0.3" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="var(--border-secondary)" strokeWidth="0.5" opacity="0.3" />

                      {/* Ideal Line (dashed) */}
                      {burnupData.idealPoints && burnupData.idealPoints.length > 0 && (
                        <line 
                          x1={burnupData.idealPoints[0].x} 
                          y1={burnupData.idealPoints[0].y} 
                          x2={burnupData.idealPoints[burnupData.idealPoints.length - 1].x} 
                          y2={burnupData.idealPoints[burnupData.idealPoints.length - 1].y} 
                          stroke="var(--text-secondary-muted)" 
                          strokeWidth="1.5" 
                          strokeDasharray="4 4" 
                          opacity="0.4" 
                        />
                      )}

                      {/* Completed Line */}
                      {completedPathD && (
                        <path 
                          d={completedPathD} 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                        />
                      )}
                      
                      {/* Gradient Fill Area */}
                      {completedGradientD && (
                        <path 
                          d={completedGradientD} 
                          fill="url(#chart-gradient)" 
                          opacity="0.1"
                        />
                      )}

                      {/* Micro-indicator Circle Marks */}
                      {burnupData.points && burnupData.points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          className="fill-accent stroke-card-secondary stroke-2"
                        />
                      ))}

                      <defs>
                        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-accent)" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Chart Labels */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[8px] font-semibold text-text-secondary-muted">
                      {burnupData.labels && burnupData.labels.map((lbl, idx) => (
                        <span key={idx}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Priority Breakdown Progress bars */}
                <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/40 shadow-sm space-y-6">
                  <div>
                    <h4 className="font-bold text-text-secondary text-sm">Issue Priority Distribution</h4>
                    <p className="text-[10px] text-text-secondary-muted mt-0.5">Focus breakdown across priority categories.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* High */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-text-secondary-muted">High Priority</span>
                        <span className="font-bold text-red-500">{tasks.filter(t => t.priority === 'High').length}</span>
                      </div>
                      <div className="w-full bg-dominant rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${totalTasks ? (tasks.filter(t => t.priority === 'High').length / totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Medium */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-text-secondary-muted">Medium Priority</span>
                        <span className="font-bold text-amber-500">{tasks.filter(t => t.priority === 'Medium').length}</span>
                      </div>
                      <div className="w-full bg-dominant rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${totalTasks ? (tasks.filter(t => t.priority === 'Medium').length / totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Low */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-text-secondary-muted">Low Priority</span>
                        <span className="font-bold text-blue-500">{tasks.filter(t => t.priority === 'Low').length}</span>
                      </div>
                      <div className="w-full bg-dominant rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${totalTasks ? (tasks.filter(t => t.priority === 'Low').length / totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-dominant-offset/40 p-3 rounded-lg border border-border-secondary/30 flex items-start space-x-2 text-[10px] text-text-secondary-muted leading-relaxed">
                    <Info className="w-4.5 h-4.5 text-accent flex-shrink-0 mt-0.5" />
                    <span>Resolving <strong>High Priority</strong> issues first ensures code delivery alignments across cross-functional team milestones.</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: TEAMS DIRECTORY */}
          {activeTab === 'teams' && (
            selectedTeamId ? (
              <TeamDetailsWrapper workspaceId={activeWorkspace?.id} />
            ) : (
            <div className="space-y-6 animate-[fade-in_200ms_ease-out]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-text-secondary text-base">Teams Directory</h3>
                  <p className="text-xs text-text-secondary-muted mt-0.5">Manage custom project teams, assign members, and track group workload distribution.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {teamsList.length} Active Teams
                  </span>
                  <button
                    onClick={() => setShowCreateTeamForm(!showCreateTeamForm)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showCreateTeamForm ? 'Cancel Team' : 'Create Team'}</span>
                  </button>
                </div>
              </div>

              {/* Create Team Form */}
              {showCreateTeamForm && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTeamName.trim()) return;
                    
                    const teamPayload = {
                      name: newTeamName.trim(),
                      desc: newTeamDesc.trim(),
                      workspaceId: activeWorkspace?.id,
                      members: newTeamMembers
                    };

                    try {
                      const res = await fetch(`${API_URL}/api/teams`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(teamPayload)
                      });

                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.message || 'Failed to create team');
                      }

                      const data = await res.json();
                      const createdTeam = getApiData(data);
                      setTeamsList(prev => [createdTeam, ...prev]);
                      setNewTeamName('');
                      setNewTeamDesc('');
                      setNewTeamMembers([]);
                      setShowCreateTeamForm(false);
                    } catch (err) {
                      alert(err.message || 'Error saving team.');
                    }
                  }}
                  className="bg-card-secondary p-6 rounded-xl border border-border-secondary/60 shadow-md space-y-4 animate-[fade-in_150ms_ease-out]"
                >
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-1 border-b border-border-secondary/20">Create Custom Team</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="team-name" className="text-[10px] font-bold text-text-secondary-muted uppercase">Team Name</label>
                      <input
                        id="team-name"
                        type="text"
                        required
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Frontend Avengers"
                        className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="team-desc" className="text-[10px] font-bold text-text-secondary-muted uppercase">Description</label>
                      <input
                        id="team-desc"
                        type="text"
                        value={newTeamDesc}
                        onChange={(e) => setNewTeamDesc(e.target.value)}
                        placeholder="e.g. Focuses on UI components and React client-side logic"
                        className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-text-secondary-muted uppercase">Select Team Members</label>
                      <button
                        type="button"
                        onClick={() => setShowAddMemberModal(true)}
                        className="text-[10px] font-semibold text-accent hover:underline bg-transparent border-none cursor-pointer"
                      >
                        + Add new member to organization
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-border-secondary/40 rounded-lg p-3 bg-dominant space-y-2">
                      {teamMembers.map(m => {
                        const isChecked = newTeamMembers.includes(m.id);
                        return (
                          <label key={m.id} className="flex items-center space-x-2.5 cursor-pointer select-none text-xs text-text-secondary">
                            <input
                              aria-label={`Select ${m.name === 'You' && user?.name ? user.name : m.name} for this team`}
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setNewTeamMembers(prev => prev.filter(id => id !== m.id));
                                } else {
                                  setNewTeamMembers(prev => [...prev, m.id]);
                                }
                              }}
                              className="accent-accent w-3.5 h-3.5"
                            />
                            <div className="flex items-center space-x-2">
                              <div className={`w-5 h-5 rounded-full ${m.color} text-white flex items-center justify-center font-bold text-[8px]`}>
                                {m.avatar}
                              </div>
                              <span className="font-medium">
                                {m.name === 'You' && user?.name ? user.name : m.name}
                                <span className="ml-1.5 text-[10px] text-text-secondary-muted font-mono font-normal lowercase">
                                  @{m.email ? m.email.split('@')[0] : 'user'}
                                </span>
                              </span>
                              <span className="text-[9px] text-text-secondary-muted font-normal">({m.role || 'Member'})</span>
                            </div>
                          </label>
                        );
                      })}
                      {teamMembers.length === 0 && (
                        <div className="text-[10px] text-text-secondary-muted italic p-1">No database users found</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer border-none shadow-sm"
                    >
                      Save Team
                    </button>
                  </div>
                </form>
              )}

              {/* Teams List */}
              {teamsList.length === 0 ? (
                <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-12 text-center space-y-4">
                  <span className="text-3xl">👥</span>
                  <div>
                    <h4 className="text-sm font-bold text-text-secondary">No teams created yet</h4>
                    <p className="text-xs text-text-secondary-muted mt-1 max-w-sm mx-auto">Create custom teams to group members, outline department scopes, and track workloads in a centralized view.</p>
                  </div>
                  <button
                    onClick={() => setShowCreateTeamForm(true)}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer border-none shadow-sm"
                  >
                    + Create your first team
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teamsList.map(team => {
                    // Resolve members details
                    const resolvedMembers = teamMembers.filter(m => team.members.map(String).includes(String(m.id)));
                    
                    // Aggregate tasks
                    const totalActiveTasks = resolvedMembers.reduce((sum, m) => sum + (m.activeTasks || 0), 0);
                    const totalCompletedTasks = resolvedMembers.reduce((sum, m) => sum + (m.completedTasks || 0), 0);
                    const totalTasks = totalActiveTasks + totalCompletedTasks;
                    
                    return (
                      <div key={team.id} className="bg-card-secondary rounded-xl border border-border-secondary/60 hover:border-accent/30 shadow-sm p-6 space-y-5 hover:shadow transition-all relative group/card flex flex-col justify-between">
                        <div className="space-y-3.5">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-0.5">
                              <h4 
                                onClick={() => setSelectedTeam(team.id)}
                                className="text-sm font-bold text-text-secondary leading-tight cursor-pointer hover:text-accent transition-colors"
                              >
                                {team.name}
                              </h4>
                              <p className="text-[10px] text-text-secondary-muted font-medium">{resolvedMembers.length} Members</p>
                            </div>
                            
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete the team "${team.name}"?`)) {
                                  fetch(`${API_URL}/api/teams/${team.id}`, {
                                    method: 'DELETE',
                                    headers: getAuthHeaders()
                                  })
                                    .then(res => {
                                      if (res.ok) {
                                        setTeamsList(prev => prev.filter(t => String(t.id) !== String(team.id)));
                                      }
                                    })
                                    .catch(err => console.error('Error deleting team:', err));
                                }
                              }}
                              className="text-text-secondary-muted hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100 p-1.5 rounded hover:bg-red-500/5 cursor-pointer border-none bg-transparent"
                              title="Delete Team"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-text-secondary-muted leading-relaxed min-h-[32px]">
                            {team.desc || 'No description provided.'}
                          </p>

                          {/* Avatars row */}
                          <div className="flex items-center space-x-1 overflow-hidden">
                            {resolvedMembers.slice(0, 5).map(m => (
                              <div 
                                key={m.id}
                                className={`w-7 h-7 rounded-full ${m.color} text-white flex items-center justify-center font-bold text-[9px] border border-card-secondary -mr-1.5`}
                                title={`${m.name === 'You' && user?.name ? user.name : m.name} (${m.role || 'Member'})`}
                              >
                                {m.avatar}
                              </div>
                            ))}
                            {resolvedMembers.length > 5 && (
                              <div className="w-7 h-7 rounded-full bg-dominant text-text-secondary border border-border-secondary flex items-center justify-center text-[9px] font-bold z-10">
                                +{resolvedMembers.length - 5}
                              </div>
                            )}
                            {resolvedMembers.length === 0 && (
                              <span className="text-[10px] text-text-secondary-muted italic">No members assigned</span>
                            )}
                          </div>
                        </div>

                        {/* Capacity / Workload summary */}
                        <div className="space-y-2 border-t border-border-secondary/20 pt-4 mt-auto">
                          <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary-muted">
                            <span>Workspace Workload</span>
                            <span>{totalCompletedTasks} / {totalTasks} Completed</span>
                          </div>

                          <div className="w-full bg-dominant rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${totalTasks ? (totalCompletedTasks / totalTasks) * 100 : 0}%` }}
                            />
                          </div>

                          {/* Inline Member Adder */}
                          <div className="pt-2 flex items-center justify-between gap-3">
                            <label htmlFor={`team-${team.id}-member-add`} className="text-[9px] font-bold text-text-secondary-muted uppercase flex-shrink-0">Add Member:</label>
                            <select
                              id={`team-${team.id}-member-add`}
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const memberId = String(val);
                                if (team.members.map(String).includes(memberId)) return;
                                
                                const updatedMembers = [...team.members.map(String), memberId];
                                
                                fetch(`${API_URL}/api/teams/${team.id}`, {
                                  method: 'PUT',
                                  headers: getAuthHeaders(),
                                  body: JSON.stringify({ members: updatedMembers })
                                })
                                  .then(res => {
                                    if (res.ok) {
                                      setTeamsList(prev => prev.map(t => 
                                        String(t.id) === String(team.id) 
                                          ? { ...t, members: updatedMembers } 
                                          : t
                                      ));
                                    }
                                  })
                                  .catch(err => console.error('Error adding team member:', err));
                              }}
                              className="text-[10px] px-2 py-1.5 rounded border border-border-secondary bg-dominant text-text-secondary focus:outline-none max-w-[150px] cursor-pointer"
                            >
                              <option value="">Select user...</option>
                              {teamMembers.filter(m => !team.members.map(String).includes(String(m.id))).map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name === 'You' && user?.name ? user.name : m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )
          )}

          {/* TAB: PROJECTS DIRECTORY */}
          {activeTab === 'projects' && (
            <div className="space-y-6 animate-[fade-in_200ms_ease-out]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-text-secondary text-base">Projects Directory</h3>
                  <p className="text-xs text-text-secondary-muted mt-0.5">View all workspaces, methodology configurations, leads, and manage project lifecycles.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {workspaces.length} Active Projects
                  </span>
                  <button
                    onClick={onTriggerCreateWorkspace}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Project</span>
                  </button>
                </div>
              </div>

              {/* Projects List */}
              {workspaces.length === 0 ? (
                <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-12 text-center space-y-4">
                  <span className="text-3xl">🚀</span>
                  <div>
                    <h4 className="text-sm font-bold text-text-secondary">No projects found</h4>
                    <p className="text-xs text-text-secondary-muted mt-1 max-w-sm mx-auto">Get started by setting up a project workspace using Kanban or Scrum templates.</p>
                  </div>
                  <button
                    onClick={onTriggerCreateWorkspace}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer border-none shadow-sm"
                  >
                    + Create your first project
                  </button>
                </div>
              ) : (
                <div className="bg-card-secondary rounded-xl border border-border-secondary/60 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-secondary/40 text-[10px] font-bold text-text-secondary-muted uppercase bg-dominant-offset/10 select-none">
                          <th className="p-4 pl-6">Project Name</th>
                          <th className="p-4">Key</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Lead</th>
                          <th className="p-4">Project Members</th>
                          <th className="p-4">Date Created</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-secondary/30 text-xs font-semibold">
                        {workspaces.map(ws => {
                          const rawDate = ws.created_at || ws.createdAt;
                          const createdDate = rawDate
                            ? new Date(rawDate).toLocaleDateString('default', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : new Date().toLocaleDateString('default', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });

                          const detailedProj = workspaceProjectsList.find(p => p.id === ws.id || p.key === ws.key);
                          const memberCount = detailedProj?.projectMembers?.length || 1;

                          return (
                            <tr key={ws.id} className="hover:bg-dominant-offset/5 transition-colors group/row">
                              {/* Name */}
                              <td className="p-4 pl-6">
                                <div className="space-y-0.5">
                                  <span className="text-text-secondary font-bold hover:text-accent cursor-pointer transition-colors block" onClick={() => {
                                    onSwitchWorkspace(ws);
                                    setActiveTab('board');
                                  }}>
                                    {ws.name}
                                  </span>
                                  {ws.description && (
                                    <span className="text-[10px] text-text-secondary-muted font-normal block truncate max-w-xs">{ws.description}</span>
                                  )}
                                </div>
                              </td>

                              {/* Key */}
                              <td className="p-4">
                                <span className="font-mono text-[10px] font-bold border border-border-secondary/40 px-1.5 py-0.5 rounded opacity-80 bg-dominant">
                                  {ws.key}
                                </span>
                              </td>

                              {/* Type */}
                              <td className="p-4">
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  isScrum ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                  <span>{isScrum ? '⏱️' : '📋'}</span>
                                  <span>{ws.template_type}</span>
                                </span>
                              </td>

                              {/* Lead */}
                              <td className="p-4 text-text-secondary-muted">
                                {user?.name || 'Administrator'}
                              </td>

                              {/* Project Members */}
                              <td className="p-4">
                                <button
                                  onClick={() => setProjectMembersModalState({ isOpen: true, project: detailedProj || ws })}
                                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-dominant hover:bg-dominant-offset text-text-secondary border border-border-secondary/60 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  title="View & Manage Assigned Project Members"
                                >
                                  <Users className="w-3.5 h-3.5 text-accent" />
                                  <span>{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</span>
                                </button>
                              </td>

                              {/* Created Date */}
                              <td className="p-4 text-text-secondary-muted font-normal">
                                {createdDate}
                              </td>

                              {/* Actions */}
                              <td className="p-4 pr-6 text-right">
                                <div className="flex items-center justify-end space-x-2.5">
                                  <button
                                    onClick={() => {
                                      onSwitchWorkspace(ws);
                                      setActiveTab('board');
                                    }}
                                    className="px-2.5 py-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer border-none"
                                  >
                                    Open Board
                                  </button>
                                  {(user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER') && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete the project "${ws.name}"? This will also delete all tasks associated with it.`)) {
                                          onDeleteWorkspace(ws.id);
                                        }
                                      }}
                                      className="p-1.5 hover:bg-red-500/10 text-text-secondary-muted hover:text-red-500 rounded transition-all cursor-pointer border-none bg-transparent"
                                      title="Delete Project"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workspace-members' && (
            <MembersTable workspaceId={activeWorkspace?.id} />
          )}

          {activeTab === 'audit-logs' && (
            <AuditTimeline workspaceId={activeWorkspace?.id} />
          )}

          {/* TAB 3: TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div className="bg-card-secondary rounded-xl border border-border-secondary/60 shadow-sm overflow-hidden animate-[fade-in_200ms_ease-out]">
              <div className="px-6 py-5 border-b border-border-secondary/40 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-text-secondary text-base">Active Team Workload</h3>
                  <p className="text-xs text-text-secondary-muted mt-0.5">Track workload distribution and completion progress by individual members.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {teamMembers.length} Active Members
                  </span>
                  {(user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER') && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm cursor-pointer border-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-border-secondary/40">
                {teamMembers.map((member, idx) => {
                  const initials = member.avatar;
                  const displayName = member.name === 'You' && user?.name ? user.name : member.name;
                  const totalMemberTasks = member.activeTasks;
                  
                  return (
                    <div key={idx} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-dominant-offset/10 transition-colors">
                      {/* Avatar/Name */}
                      <div className="flex items-center space-x-4 min-w-[280px]">
                        {member.name === 'You' && user?.picture ? (
                          <img src={user.picture} alt={displayName} className="w-12 h-12 rounded-full border border-border-secondary" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${member.color} text-white flex items-center justify-center font-bold text-base border border-white/10 shadow-sm`}>
                            {initials}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-text-secondary text-sm flex items-center">
                            {displayName}
                            <span className="ml-2 text-xs font-normal text-text-secondary-muted font-mono lowercase">
                              @{member.email ? member.email.split('@')[0] : 'user'}
                            </span>
                            {member.name === 'You' && (
                              <span className="ml-2 px-1.5 py-0.5 text-[8px] bg-accent/15 text-accent font-bold rounded-full uppercase tracking-wider">You</span>
                            )}
                          </h4>
                          {((user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER') && member.name !== 'You') ? (
                             <div className="flex flex-col space-y-1.5 mt-1">
                               <select
                                 aria-label={`Assign job title for ${displayName}`}
                                 value={member.role || 'Full Stack Engineer'}
                                 onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                 className="text-[10px] font-semibold bg-dominant border border-border-secondary rounded px-2 py-1 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer w-full"
                               >
                                 <option value="Full Stack Engineer">Full Stack Engineer</option>
                                 <option value="Frontend Developer">Frontend Developer</option>
                                 <option value="Backend Developer">Backend Developer</option>
                                 <option value="Project Manager">Project Manager</option>
                                 <option value="QA Engineer">QA Engineer</option>
                                 <option value="UI/UX Designer">UI/UX Designer</option>
                                 <option value="DevOps Engineer">DevOps Engineer</option>
                               </select>

                               <select
                                 aria-label={`Assign access level for ${displayName}`}
                                 value={member.rbacRole || 'MEMBER'}
                                 onChange={(e) => handleUpdateMemberRbacRole(member.id, e.target.value)}
                                 className="text-[10px] font-bold bg-dominant border border-border-secondary rounded px-2 py-1 text-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer w-full uppercase"
                               >
                                 <option value="ADMIN">Admin</option>
                                 <option value="LEADER">Team Leader</option>
                                 <option value="MEMBER">Team Member</option>
                               </select>
                             </div>
                           ) : (
                             <p className="text-xs text-text-secondary-muted mt-0.5">
                               {member.role} • <span className="font-bold text-accent uppercase">{member.rbacRole || 'MEMBER'}</span>
                             </p>
                           )}
                        </div>
                      </div>

                      {/* Task Info stats */}
                      <div className="flex items-center space-x-8 text-xs font-semibold">
                        <div className="text-center">
                          <span className="block text-text-secondary-muted text-[10px] uppercase">Active Tasks</span>
                          <span className="block font-bold text-text-secondary text-base mt-0.5">{totalMemberTasks}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-text-secondary-muted text-[10px] uppercase">Completed</span>
                          <span className="block font-bold text-green-500 text-base mt-0.5">{member.completedTasks}</span>
                        </div>
                      </div>

                      {/* Workload Capacity Bar */}
                      <div className="w-full md:w-64 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary-muted">Workload Density</span>
                          <span>{totalMemberTasks > 3 ? 'Overloaded' : totalMemberTasks > 0 ? 'Optimal' : 'Idle'}</span>
                        </div>
                        <div className="w-full bg-dominant rounded-full h-2 border border-border-secondary/20">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              totalMemberTasks > 3 
                                ? 'bg-red-500' 
                                : totalMemberTasks > 0 
                                ? 'bg-accent' 
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ width: `${Math.min((totalMemberTasks / 4) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-end">
                        {((user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER') && member.name !== 'You') ? (
                          <button
                            onClick={() => handleRemoveMember(member.id, displayName)}
                            className="text-text-secondary-muted hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 cursor-pointer border-none bg-transparent"
                            title={`Remove ${displayName} from Team`}
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        ) : (
                          <div className="w-8.5 h-8.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <Suspense fallback={<div className="p-8 text-center text-text-secondary animate-pulse">Loading Profile Settings...</div>}>
              <ProfileSettings />
            </Suspense>
          )}

          {activeTab === 'calendar' && (
            <Suspense fallback={<div className="p-8 text-center text-text-secondary animate-pulse">Loading Calendar Schedule...</div>}>
              <ScheduleCalendar activeWorkspace={activeWorkspace} />
            </Suspense>
          )}

        </main>
        </>
        )}
      </div>

      {/* 3. Create Issue Dialog Modal */}
      {showCreateModal && (
        <div ref={createModalRef} role="dialog" aria-modal="true" aria-labelledby="issue-modal-title" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto z-50 animate-[fade-in_150ms_ease-out]">
          <div className="w-full max-w-lg bg-card-secondary rounded-2xl shadow-xl border border-border-secondary/60 overflow-hidden relative my-auto">
            {/* Accent border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent-hover" />
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-secondary/40 flex justify-between items-center mt-1.5">
              <h3 id="issue-modal-title" className="font-display font-extrabold text-lg text-text-secondary">Create a New Issue</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary-muted hover:text-text-secondary p-1 rounded-lg hover:bg-dominant-offset cursor-pointer"
                aria-label="Close create issue dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateIssue} className="p-6 space-y-4">
              <div>
                <label htmlFor="issue-title" className="block text-xs font-semibold text-text-secondary mb-1.5">Summary / Title</label>
                <input
                  id="issue-title"
                  type="text"
                  required
                  data-autofocus
                  placeholder="e.g. Add validation to Signup form"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                />
              </div>

              <div>
                <label htmlFor="issue-desc" className="block text-xs font-semibold text-text-secondary mb-1.5">Description (Optional)</label>
                <textarea
                  id="issue-desc"
                  rows="3"
                  placeholder="Provide details about the work required..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="issue-status" className="block text-xs font-semibold text-text-secondary mb-1.5">Initial Status</label>
                  <select
                    id="issue-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-3 py-2 text-sm rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-assignee" className="block text-xs font-semibold text-text-secondary mb-1.5">Assignee</label>
                  <select
                    id="issue-assignee"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="block w-full px-3 py-2 text-sm rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="You">You (Default)</option>
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} (@{member.email ? member.email.split('@')[0] : 'user'}) ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="issue-priority" className="block text-xs font-semibold text-text-secondary mb-1.5">Priority</label>
                  <select
                    id="issue-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="block w-full px-3 py-2 text-sm rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🔵 Low</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-epic" className="block text-xs font-semibold text-text-secondary mb-1.5">Epic Category</label>
                  <select
                    id="issue-epic"
                    value={newEpic}
                    onChange={(e) => setNewEpic(e.target.value)}
                    className="block w-full px-3 py-2 text-sm rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {epicsList.map(epic => (
                      <option key={epic} value={epic}>{epic}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border-secondary/40 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border-secondary text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset rounded-lg text-xs font-semibold cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer border-none"
                >
                  Create
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 4. Add Team Member Dialog Modal */}
      {showAddMemberModal && (
        <div ref={addMemberModalRef} role="dialog" aria-modal="true" aria-labelledby="member-modal-title" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto z-50 animate-[fade-in_150ms_ease-out]">
          <div className="w-full max-w-lg bg-card-secondary rounded-2xl shadow-xl border border-border-secondary/60 overflow-hidden relative my-auto">
            {/* Accent border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent-hover" />
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-secondary/40 flex justify-between items-center mt-1.5">
              <h3 id="member-modal-title" className="font-display font-extrabold text-lg text-text-secondary">
                {addedMemberCreds ? 'Invitation Ready' : 'Add a New Team Member'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddedMemberCreds(null);
                }}
                className="text-text-secondary-muted hover:text-text-secondary p-1 rounded-lg hover:bg-dominant-offset cursor-pointer border-none bg-transparent"
                aria-label="Close add member dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addedMemberCreds ? (
              <div className="p-6 space-y-5 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-display font-extrabold text-base text-text-secondary">
                    {addedMemberCreds.isSignup ? 'Invitation Ready!' : 'Team Member Added!'}
                  </h4>
                  <p className="text-xs text-text-secondary-muted max-w-sm">
                    {addedMemberCreds.isSignup ? (
                      <>An invitation link has been prepared for <strong>{addedMemberCreds.name}</strong> to sign up.</>
                    ) : (
                      <><strong>{addedMemberCreds.name}</strong> was successfully registered in the system.</>
                    )}
                  </p>
                </div>

                {addedMemberCreds.mock ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-left space-y-1">
                    <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Mock Mode Active</h5>
                    <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                      {addedMemberCreds.isSignup 
                        ? 'SMTP credentials are not configured. The signup invitation link was not emailed, but you can copy and share the signup link below directly.'
                        : 'SMTP credentials are not configured. The invitation email was not sent, but you can copy and share the credentials below directly with your teammate.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-left space-y-1">
                    <h5 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Email Dispatched</h5>
                    <p className="text-[10px] text-text-secondary-muted leading-relaxed">
                      {addedMemberCreds.isSignup 
                        ? 'A signup invitation email has been sent successfully to the user\'s email address.'
                        : 'A premium HTML invitation email has been sent successfully to the user\'s email address.'
                      }
                    </p>
                  </div>
                )}

                <div className="p-4 bg-dominant border border-border-secondary/60 rounded-xl text-left space-y-3.5">
                  <div>
                    <span className="block text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1">Email Username</span>
                    <span className="text-xs font-mono font-bold text-text-secondary select-all bg-card-secondary px-2.5 py-1.5 rounded border border-border-secondary/30 block">{addedMemberCreds.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1">
                      {addedMemberCreds.isSignup ? 'Password' : addedMemberCreds.temporaryPassword ? 'Temporary Password' : 'Password'}
                    </span>
                    <span className={`text-xs font-bold select-all bg-card-secondary px-2.5 py-1.5 rounded border border-border-secondary/30 block ${addedMemberCreds.temporaryPassword ? 'text-red-400 font-mono' : 'text-emerald-500 font-sans'}`}>
                      {addedMemberCreds.isSignup ? 'Configure your own password during registration' : addedMemberCreds.temporaryPassword || 'Use existing account password'}
                    </span>
                  </div>
                  {addedMemberCreds.inviteUrl && (
                    <div>
                      <span className="block text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1">Direct Invite Link</span>
                      <span className="text-xs font-mono text-text-secondary truncate select-all bg-card-secondary px-2.5 py-1.5 rounded border border-border-secondary/30 block" title={addedMemberCreds.inviteUrl}>{addedMemberCreds.inviteUrl}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border-secondary/40 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="px-4 py-2 border border-border-secondary text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset rounded-lg text-xs font-semibold cursor-pointer bg-transparent flex items-center space-x-1.5"
                  >
                    {copiedCreds ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Credentials</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setAddedMemberCreds(null);
                    }}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer border-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="member-name" className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name</label>
                    <input
                      id="member-name"
                      type="text"
                      data-autofocus
                      required
                      placeholder="e.g. Jane Doe"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="member-email" className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address</label>
                    <input
                      id="member-email"
                      type="email"
                      required
                      placeholder="e.g. jane@example.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="member-role" className="block text-xs font-semibold text-text-secondary mb-1.5">Role / Job Title</label>
                  <input
                    id="member-role"
                    type="text"
                    placeholder="e.g. Frontend Engineer, Product Manager"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="member-dept" className="block text-xs font-semibold text-text-secondary mb-1.5">Department</label>
                    <input
                      id="member-dept"
                      type="text"
                      placeholder="e.g. Core Engineering, Design"
                      value={memberDept}
                      onChange={(e) => setMemberDept(e.target.value)}
                      className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="member-location" className="block text-xs font-semibold text-text-secondary mb-1.5">Location</label>
                    <input
                      id="member-location"
                      type="text"
                      placeholder="e.g. Boston, MA"
                      value={memberLocation}
                      onChange={(e) => setMemberLocation(e.target.value)}
                      className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-border-secondary/40 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 border border-border-secondary text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset rounded-lg text-xs font-semibold cursor-pointer bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer border-none"
                  >
                    Add Member
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}
      {/* Mobile Floating Action Button (FAB) for Create Task */}
      {activeTab === 'board' && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 md:hidden w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-40 border-none cursor-pointer"
          aria-label="Create Task"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Touch Drag Floating Preview */}
      {touchDragActive && touchDragTaskId && (
        <div
          className="fixed pointer-events-none z-50 shadow-2xl scale-[1.03] rotate-1 transition-transform duration-75"
          style={{
            left: `${touchDragPosition.x}px`,
            top: `${touchDragPosition.y}px`,
            width: `280px`
          }}
        >
          <Card 
            task={tasks.find(t => t.id === touchDragTaskId)}
            onDragStart={() => {}}
            onDelete={() => {}}
            onTouchStart={() => {}}
            isDragging={false}
            isPreview={true}
          />
        </div>
      )}

      {/* Redesigned overlays */}
      <InviteMemberModal workspaceId={activeWorkspace?.id} />
      <ProfileDrawer />
      <ProjectMembersModal
        isOpen={projectMembersModalState.isOpen}
        onClose={() => setProjectMembersModalState({ isOpen: false, project: null })}
        project={projectMembersModalState.project}
        workspaceId={activeWorkspace?.id}
        workspaceMembers={workspaceMembersList}
      />
    </div>
  );
}

// Kanban helper components hoisted above Dashboard to prevent bundler initialization ReferenceError
