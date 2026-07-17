// API status payloads must use "awaiting_approval".
export const AI_WORKFORCE_STATUSES = [
  "draft",
  "awaiting_approval",
  "approved",
  "rejected",
  "completed",
] as const;

export type ApprovalStatus = (typeof AI_WORKFORCE_STATUSES)[number];

// Activity history stores labels, so approval submissions use "submitted_for_approval".
export type AiActivityAction =
  | "generated"
  | "saved_as_draft"
  | "submitted_for_approval"
  | "approved"
  | "rejected"
  | "completed";

export type AiActivityEntry = {
  id: string;
  action: AiActivityAction;
  employee: string;
  timestamp: string;
  relatedContentId: string;
  relatedTaskId: string | null;
  resultingStatus: ApprovalStatus;
  title: string;
};

export type AiWorkspaceSavedItem = {
  id: string;
  employeeSlug: string;
  title: string;
  contentType: string;
  content: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  taskId: string | null;
};

export type AiWorkspaceSnapshot = {
  employeeSlug: string;
  savedItems: AiWorkspaceSavedItem[];
  activity: AiActivityEntry[];
};
