import type { AiEmployeeSlug } from "@/lib/ai-workforce/employees";

export const AI_GOAL_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type AiGoalPriority = (typeof AI_GOAL_PRIORITIES)[number];

export const AI_GOAL_STATUSES = [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
] as const;
export type AiGoalStatus = (typeof AI_GOAL_STATUSES)[number];

export const AI_ASSIGNMENT_STATUSES = [
  "assigned",
  "in_progress",
  "awaiting_approval",
  "approved",
  "rejected",
  "completed",
  "blocked",
] as const;
export type AiAssignmentStatus = (typeof AI_ASSIGNMENT_STATUSES)[number];

export const AI_HANDOFF_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
] as const;
export type AiHandoffStatus = (typeof AI_HANDOFF_STATUSES)[number];

export type AiWeeklyGoal = {
  id: string;
  employeeSlug: AiEmployeeSlug;
  employeeName: string;
  title: string;
  description: string;
  weekStartDate: string;
  dueDate: string;
  priority: AiGoalPriority;
  status: AiGoalStatus;
  successMetric: string;
  notes: string;
  progressPercent: number;
  completedAt: string | null;
  latestProgressUpdate: string;
  lastProgressUpdatedAt: string | null;
  relatedTaskCompletedCount: number;
  relatedTaskTotalCount: number;
  suggestedCompletion: boolean;
  progressHistory: AiGoalProgressUpdate[];
  createdAt: string;
  updatedAt: string;
};

export type AiGoalProgressUpdate = {
  id: string;
  goalId: string;
  status: AiGoalStatus;
  progressPercent: number;
  workCompleted: string;
  blockerNotes: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
};

export type AiAssignment = {
  id: string;
  employeeSlug: AiEmployeeSlug;
  employeeName: string;
  goalId: string | null;
  title: string;
  instructions: string;
  dueDate: string;
  weekStartDate: string | null;
  priority: AiGoalPriority;
  status: AiAssignmentStatus;
  approvalRequired: boolean;
  isRecurring: boolean;
  isOneTime: boolean;
  recurringTaskId: string | null;
  rejectionFeedback: string | null;
  blockedReason: string | null;
  assignedAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiRecurringTask = {
  id: string;
  employeeSlug: AiEmployeeSlug;
  employeeName: string;
  title: string;
  instructions: string;
  priority: AiGoalPriority;
  approvalRequired: boolean;
  dayOfWeek: number;
  isActive: boolean;
  checklistItems: string[];
  createdAt: string;
  updatedAt: string;
};

export type AiHandoff = {
  id: string;
  fromEmployeeSlug: AiEmployeeSlug;
  fromEmployeeName: string;
  toEmployeeSlug: AiEmployeeSlug;
  toEmployeeName: string;
  assignmentId: string | null;
  summary: string;
  attachedSavedContentId: string | null;
  requestedNextAction: string;
  status: AiHandoffStatus;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type AiWeeklySummary = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  summaryMarkdown: string;
  generatedData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AiDashboardMetrics = {
  totalActiveEmployees: number;
  goalsInProgress: number;
  tasksDueThisWeek: number;
  awaitingApproval: number;
  completedThisWeek: number;
  overdueTasks: number;
  weeklyCompletionPercentage: number;
};
