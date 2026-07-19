import { create } from 'zustand';

export const useUiStore = create((set) => ({
  isProfileDrawerOpen: false,
  selectedMemberId: null,
  isInviteModalOpen: false,
  workspaceMembersFilter: { role: '', status: 'ACTIVE', search: '' },
  selectedTeamId: null,
  activeTeamTab: 'overview',
  isTransferLeadModalOpen: false,

  setProfileDrawer: (open, memberId = null) => set({
    isProfileDrawerOpen: open,
    selectedMemberId: memberId
  }),

  setInviteModal: (open) => set({ isInviteModalOpen: open }),

  setWorkspaceMembersFilter: (filterUpdate) => set((state) => ({
    workspaceMembersFilter: { ...state.workspaceMembersFilter, ...filterUpdate }
  })),

  setSelectedTeam: (teamId, activeTab = 'overview') => set({
    selectedTeamId: teamId,
    activeTeamTab: activeTab
  }),

  setTransferLeadModal: (open) => set({ isTransferLeadModalOpen: open }),

  resetUiStore: () => set({
    isProfileDrawerOpen: false,
    selectedMemberId: null,
    isInviteModalOpen: false,
    workspaceMembersFilter: { role: '', status: 'ACTIVE', search: '' },
    selectedTeamId: null,
    activeTeamTab: 'overview',
    isTransferLeadModalOpen: false
  })
}));
