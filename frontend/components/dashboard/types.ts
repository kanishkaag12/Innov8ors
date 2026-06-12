export type QuickStats = {
  activeContracts: number;
  proposalsSent: number;
  profileViews: number;
  earnings: number;
  escrowBalance: number;
  pfiScore: number;
  pfiStatus: string;
};

export type DashboardProject = {
  id: string;
  title: string;
  description: string;
  budget: number;
  employerName: string;
  createdAt: string;
};

export type OnboardingItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type DashboardSummary = {
  authenticatedUserId: string;
  quickStats: QuickStats;
  messages: {
    unreadCount: number;
    emptyStateMessage: string;
  };
  onboarding: {
    checklist: OnboardingItem[];
    completedCount: number;
    totalCount: number;
    progress: number;
  };
  activeProjects: DashboardProject[];
};
