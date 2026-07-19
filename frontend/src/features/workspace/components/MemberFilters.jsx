import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useUiStore } from '../../../store/uiStore';

export default function MemberFilters() {
  const { workspaceMembersFilter, setWorkspaceMembersFilter } = useUiStore();

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full bg-card-secondary p-4 rounded-xl border border-border-secondary/60">
      {/* Search Input */}
      <div className="relative flex-grow w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-muted" />
        <input
          aria-label="Search members"
          type="text"
          placeholder="Search by name or email..."
          value={workspaceMembersFilter.search}
          onChange={(e) => setWorkspaceMembersFilter({ search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 text-xs bg-dominant border border-border-secondary rounded-lg focus:outline-none focus:ring-1 focus:ring-accent text-text-secondary placeholder-text-secondary-muted"
        />
      </div>

      {/* Role Filter */}
      <div className="flex items-center space-x-2.5 w-full sm:w-auto">
        <Filter className="w-3.5 h-3.5 text-text-secondary-muted" />
        <select
          aria-label="Filter by role"
          value={workspaceMembersFilter.role}
          onChange={(e) => setWorkspaceMembersFilter({ role: e.target.value })}
          className="text-xs px-2.5 py-2 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer w-full sm:w-auto"
        >
          <option value="">All Roles</option>
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="GUEST">Guest</option>
        </select>

        {/* Status Filter */}
        <select
          aria-label="Filter by status"
          value={workspaceMembersFilter.status}
          onChange={(e) => setWorkspaceMembersFilter({ status: e.target.value })}
          className="text-xs px-2.5 py-2 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer w-full sm:w-auto"
        >
          <option value="ACTIVE">Active</option>
          <option value="DEACTIVATED">Deactivated</option>
          <option value="ARCHIVED">Archived / Removed</option>
        </select>
      </div>
    </div>
  );
}
