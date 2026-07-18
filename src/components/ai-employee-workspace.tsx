"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AiEmployeeDefinition } from "@/lib/ai-workforce/employees";
import type {
  AiActivityEntry,
  AiWorkspaceSavedItem,
  ApprovalStatus,
} from "@/lib/ai-workforce/workspace-types";

type WorkspaceTab = "chat" | "goals" | "tasks" | "saved" | "activity";

type ContextField = {
  key: string;
  label: string;
  placeholder: string;
};

type WorkspaceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  approvalStatus?: ApprovalStatus;
  createdAt: string;
  title?: string;
};

type ScriptSection = {
  id: string;
  title: string;
  content: string;
};

type AiGenerateResponse = {
  content: string;
  provider: string;
  model: string;
  isMock: boolean;
  savedContentId: string;
  taskId: string | null;
  status: ApprovalStatus;
  createdAt: string;
  title: string;
};

type SnapshotResponse = {
  employeeSlug: string;
  savedItems: AiWorkspaceSavedItem[];
  activity: AiActivityEntry[];
};

type GoalItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "not_started" | "in_progress" | "blocked" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  successMetric: string;
  notes: string;
  progressPercent: number;
  completedAt: string | null;
  latestProgressUpdate: string;
  lastProgressUpdatedAt: string | null;
  relatedTaskCompletedCount: number;
  relatedTaskTotalCount: number;
  suggestedCompletion: boolean;
  progressHistory: GoalProgressHistoryItem[];
  updatedAt: string;
};

type GoalProgressHistoryItem = {
  id: string;
  goalId: string;
  status: GoalItem["status"];
  progressPercent: number;
  workCompleted: string;
  blockerNotes: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
};

type AssignmentItem = {
  id: string;
  goalId: string | null;
  title: string;
  dueDate: string;
  status:
    | "assigned"
    | "in_progress"
    | "awaiting_approval"
    | "approved"
    | "rejected"
    | "completed"
    | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  instructions: string;
  approvalRequired: boolean;
};

type AssignmentAction =
  | "start"
  | "submit"
  | "approve"
  | "reject"
  | "complete"
  | "reassign";

type GoalProgressionPayload = {
  goalId: string;
  progressPercent: number;
  completedTaskCount: number;
  totalTaskCount: number;
  status: GoalItem["status"];
  suggestedCompletion: boolean;
  updated: boolean;
};

type GoalDraft = {
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  successMetric: string;
};

type GoalProgressDraft = {
  status: GoalItem["status"];
  progressPercent: number;
  workCompleted: string;
  blockerNotes: string;
  nextAction: string;
};

type GoalEditDraft = {
  title: string;
  description: string;
  dueDate: string;
  priority: GoalItem["priority"];
  successMetric: string;
  notes: string;
};

type TaskDraft = {
  title: string;
  instructions: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
};

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "goals", label: "Goals" },
  { id: "tasks", label: "Tasks" },
  { id: "saved", label: "Saved Content" },
  { id: "activity", label: "Activity" },
];

function badgeClassName(status: ApprovalStatus) {
  if (status === "draft") return "bg-slate-800 text-slate-200";
  if (status === "awaiting_approval") return "bg-amber-950 text-amber-300";
  if (status === "approved") return "bg-emerald-950 text-emerald-300";
  if (status === "rejected") return "bg-rose-950 text-rose-300";
  return "bg-cyan-950 text-cyan-300";
}

function badgeLabel(status: ApprovalStatus) {
  if (status === "draft") return "Draft";
  if (status === "awaiting_approval") return "Awaiting Approval";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Completed";
}

function goalStatusLabel(status: GoalItem["status"]) {
  if (status === "not_started") return "Not Started";
  if (status === "in_progress") return "In Progress";
  if (status === "blocked") return "Blocked";
  return "Completed";
}

function assignmentStatusLabel(status: AssignmentItem["status"]) {
  if (status === "assigned") return "Assigned";
  if (status === "in_progress") return "In Progress";
  if (status === "awaiting_approval") return "Awaiting Approval";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "blocked") return "Blocked";
  return "Completed";
}

function timestampLabel(iso: string) {
  return new Date(iso).toLocaleString();
}

function metadataLabel(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "Not provided";
}

function activityLabel(action: AiActivityEntry["action"]) {
  if (action === "generated") return "Generated draft";
  if (action === "saved_as_draft") return "Saved as draft";
  if (action === "submitted_for_approval") return "Submitted for approval";
  if (action === "approved") return "Approved";
  if (action === "rejected") return "Rejected";
  return "Completed";
}

function upsertSavedItem(
  items: AiWorkspaceSavedItem[],
  nextItem: AiWorkspaceSavedItem,
) {
  const withoutItem = items.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...withoutItem].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
}

function parseScriptSections(content: string): ScriptSection[] {
  const sections: ScriptSection[] = [];
  let currentTitle = "";
  let currentContent: string[] = [];

  const pushSection = () => {
    const body = currentContent.join("\n").trim();
    if (!currentTitle || !body) return;

    sections.push({
      id: crypto.randomUUID(),
      title: currentTitle,
      content: body,
    });
  };

  for (const line of content.split("\n")) {
    const headingMatch = line.match(/^#{1,3}\s+(.*)$/);
    if (headingMatch) {
      pushSection();
      currentTitle = headingMatch[1].trim();
      currentContent = [];
      continue;
    }

    if (currentTitle) {
      currentContent.push(line);
    }
  }

  pushSection();
  return sections;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emitGoalsUpdatedEvent() {
  window.dispatchEvent(new Event("ai-workforce-goals-updated"));
}

function assignmentStatusForAction(action: AssignmentAction) {
  if (action === "start") return "in_progress";
  if (action === "submit") return "awaiting_approval";
  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  if (action === "complete") return "completed";
  return "assigned";
}

function assignmentActionLabel(action: AssignmentAction) {
  if (action === "start") return "Task started.";
  if (action === "submit") return "Task submitted for approval.";
  if (action === "approve") return "Task approved.";
  if (action === "reject") return "Task rejected.";
  if (action === "complete") return "Task completed.";
  return "Task reassigned.";
}

export function AiEmployeeWorkspace({
  employee,
  quickActions,
  contextFields,
  taskType,
}: {
  employee: AiEmployeeDefinition;
  quickActions: string[];
  contextFields: ContextField[];
  taskType: string;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isMutatingStatus, setIsMutatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [context, setContext] = useState<Record<string, string>>({});
  const [savedItems, setSavedItems] = useState<AiWorkspaceSavedItem[]>([]);
  const [activity, setActivity] = useState<AiActivityEntry[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [isLoadingManagement, setIsLoadingManagement] = useState(true);
  const [showGoalComposer, setShowGoalComposer] = useState(false);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    title: "",
    description: "",
    dueDate: todayIso(),
    priority: "medium",
    successMetric: "",
  });
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: "",
    instructions: "",
    dueDate: todayIso(),
    priority: "medium",
  });
  const [expandedContent, setExpandedContent] = useState<
    Record<string, boolean>
  >({});
  const [activeGoalProgressId, setActiveGoalProgressId] = useState<
    string | null
  >(null);
  const [activeGoalEditId, setActiveGoalEditId] = useState<string | null>(null);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [markingCompleteGoalId, setMarkingCompleteGoalId] = useState<
    string | null
  >(null);
  const [taskMutationById, setTaskMutationById] = useState<
    Record<string, boolean>
  >({});
  const [goalProgressDraft, setGoalProgressDraft] = useState<GoalProgressDraft>(
    {
      status: "not_started",
      progressPercent: 0,
      workCompleted: "",
      blockerNotes: "",
      nextAction: "",
    },
  );
  const [goalEditDraft, setGoalEditDraft] = useState<GoalEditDraft>({
    title: "",
    description: "",
    dueDate: todayIso(),
    priority: "medium",
    successMetric: "",
    notes: "",
  });

  const latestSavedItem = useMemo(() => savedItems[0] ?? null, [savedItems]);

  const latestAssistantMessage = useMemo(() => {
    return messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant");
  }, [messages]);

  const latestAssistantSections = useMemo(() => {
    if (!latestAssistantMessage) return [];
    return parseScriptSections(latestAssistantMessage.content);
  }, [latestAssistantMessage]);

  const loadWorkspace = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoadingWorkspace(true);
      }

      try {
        const response = await fetch(
          `/api/super-admin/ai-workforce/workspace?employeeSlug=${encodeURIComponent(employee.slug)}`,
        );

        const body = (await response.json()) as
          | { success: true; data: SnapshotResponse }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          const message =
            "message" in body
              ? body.message
              : "Unable to load persisted workspace state.";
          setError(message);
          return;
        }

        const snapshot = body.data;
        setSavedItems(snapshot.savedItems);
        setActivity(snapshot.activity);

        setMessages((current) => {
          const userMessages = current.filter(
            (message) => message.role === "user",
          );
          const assistantMessages = snapshot.savedItems
            .slice()
            .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
            .map((item) => ({
              id: item.id,
              role: "assistant" as const,
              content: item.content,
              approvalStatus: item.status,
              createdAt: item.createdAt,
              title: item.title,
            }));

          return [...userMessages, ...assistantMessages];
        });
      } catch {
        setError("Unable to load persisted workspace state.");
      } finally {
        if (showLoading) {
          setIsLoadingWorkspace(false);
        }
      }
    },
    [employee.slug],
  );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const loadManagement = useCallback(async () => {
    setIsLoadingManagement(true);

    try {
      const [goalsResponse, tasksResponse] = await Promise.all([
        fetch(
          `/api/super-admin/ai-workforce/management/goals?employeeSlug=${encodeURIComponent(employee.slug)}`,
        ),
        fetch(
          `/api/super-admin/ai-workforce/management/tasks?employeeSlug=${encodeURIComponent(employee.slug)}`,
        ),
      ]);

      const goalsBody = (await goalsResponse.json().catch(() => null)) as
        | { success: true; goals: GoalItem[] }
        | { success: false; message: string }
        | null;

      const tasksBody = (await tasksResponse.json().catch(() => null)) as
        | { success: true; tasks: AssignmentItem[] }
        | { success: false; message: string }
        | null;

      if (goalsResponse.ok && goalsBody && goalsBody.success) {
        setGoals(goalsBody.goals);
      }

      if (tasksResponse.ok && tasksBody && tasksBody.success) {
        setAssignments(tasksBody.tasks);
      }
    } catch {
      setError("Unable to load management views.");
    } finally {
      setIsLoadingManagement(false);
    }
  }, [employee.slug]);

  useEffect(() => {
    void loadManagement();
  }, [loadManagement]);

  useEffect(() => {
    const onGoalsUpdated = () => {
      void loadManagement();
    };

    window.addEventListener("ai-workforce-goals-updated", onGoalsUpdated);
    return () => {
      window.removeEventListener("ai-workforce-goals-updated", onGoalsUpdated);
    };
  }, [loadManagement]);

  const applyGoalProgression = useCallback(
    (payload: GoalProgressionPayload) => {
      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== payload.goalId) {
            return goal;
          }

          return {
            ...goal,
            status: payload.status,
            progressPercent: payload.progressPercent,
            relatedTaskCompletedCount: payload.completedTaskCount,
            relatedTaskTotalCount: payload.totalTaskCount,
            suggestedCompletion: payload.suggestedCompletion,
            latestProgressUpdate:
              "Progress automatically synced from assignment status changes.",
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [],
  );

  const runAssignmentAction = async (
    assignment: AssignmentItem,
    action: AssignmentAction,
  ) => {
    if (taskMutationById[assignment.id]) {
      return;
    }

    setTaskMutationById((current) => ({ ...current, [assignment.id]: true }));
    setError(null);
    setSuccess(null);

    try {
      const payload: {
        id: string;
        action: AssignmentAction;
        feedback?: string;
      } = {
        id: assignment.id,
        action,
      };

      if (action === "reject") {
        payload.feedback = "Rejected by Super Admin.";
      }

      const response = await fetch(
        "/api/super-admin/ai-workforce/management/tasks/actions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | {
            success: true;
            goalProgression: GoalProgressionPayload | null;
          }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body
            ? body.message
            : "Unable to update assignment.",
        );
        return;
      }

      setAssignments((current) =>
        current.map((item) => {
          if (item.id !== assignment.id) {
            return item;
          }

          return {
            ...item,
            status: assignmentStatusForAction(action),
          };
        }),
      );

      if (body.goalProgression) {
        applyGoalProgression(body.goalProgression);
      }

      setSuccess(assignmentActionLabel(action));
      emitGoalsUpdatedEvent();
    } catch {
      setError("Unable to update assignment.");
    } finally {
      setTaskMutationById((current) => {
        const next = { ...current };
        delete next[assignment.id];
        return next;
      });
    }
  };

  const sendPrompt = async (draftPrompt: string) => {
    const promptValue = draftPrompt.trim();
    if (!promptValue || isSubmitting) return;

    const userMessage: WorkspaceMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: promptValue,
      createdAt: new Date().toISOString(),
    };

    const requestId = crypto.randomUUID();

    setMessages((current) => [...current, userMessage]);
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        employeeSlug: employee.slug,
        prompt: promptValue,
        context,
        taskType,
        requestId,
      };

      const response = await fetch("/api/super-admin/ai-workforce/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json()) as
        | { success: true; data: AiGenerateResponse }
        | { success: false; message: string };

      if (!response.ok || !responseBody.success) {
        const message =
          "message" in responseBody
            ? responseBody.message
            : "Unable to generate content.";
        setError(message);
        return;
      }

      const assistantMessage: WorkspaceMessage = {
        id: responseBody.data.savedContentId,
        role: "assistant",
        content: `${responseBody.data.isMock ? "[DEV MOCK RESPONSE]\n\n" : ""}${responseBody.data.content}`,
        approvalStatus: responseBody.data.status,
        createdAt: responseBody.data.createdAt,
        title: responseBody.data.title,
      };

      setMessages((current) => {
        const withoutCurrent = current.filter(
          (message) => message.id !== assistantMessage.id,
        );
        return [...withoutCurrent, assistantMessage];
      });

      const persistedItem: AiWorkspaceSavedItem = {
        id: responseBody.data.savedContentId,
        employeeSlug: employee.slug,
        title: responseBody.data.title,
        contentType: taskType,
        content: assistantMessage.content,
        status: responseBody.data.status,
        createdAt: responseBody.data.createdAt,
        updatedAt: responseBody.data.createdAt,
        approvedAt: null,
        completedAt: null,
        taskId: responseBody.data.taskId,
      };

      setSavedItems((current) => upsertSavedItem(current, persistedItem));
      setPrompt("");
      setActiveTab("chat");
      setSuccess("Content generated and saved as Draft.");

      // Refresh from server to ensure timestamps/status/task links are authoritative.
      void loadWorkspace(false);
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLatestApproval = async (status: ApprovalStatus) => {
    if (!latestSavedItem || isMutatingStatus) return;

    setIsMutatingStatus(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/workspace/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId: latestSavedItem.id,
            employeeSlug: employee.slug,
            status,
          }),
        },
      );

      const body = (await response.json()) as
        | {
            success: true;
            data: { status: ApprovalStatus; duplicatePrevented: boolean };
          }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        const message =
          "message" in body
            ? body.message
            : "Unable to persist approval status.";
        setError(message);
        return;
      }

      setSuccess(
        body.data.duplicatePrevented
          ? `No change needed. Status is already ${badgeLabel(status)}.`
          : `Status updated to ${badgeLabel(status)}.`,
      );

      await loadWorkspace(false);
    } catch {
      setError("Unable to update status right now.");
    } finally {
      setIsMutatingStatus(false);
    }
  };

  const saveLatestDraft = async () => {
    await updateLatestApproval("draft");
  };

  const copyLatestContent = async () => {
    if (!latestAssistantMessage) return;

    try {
      await navigator.clipboard.writeText(latestAssistantMessage.content);
      setSuccess("Copied latest content to clipboard.");
    } catch {
      setError("Copy failed. Please copy manually.");
    }
  };

  const copySectionContent = async (section: ScriptSection) => {
    try {
      await navigator.clipboard.writeText(
        `${section.title}\n\n${section.content}`,
      );
      setSuccess(`Copied ${section.title}.`);
    } catch {
      setError("Copy failed. Please copy the section manually.");
    }
  };

  const downloadLatestMarkdown = () => {
    if (!latestAssistantMessage) return;

    try {
      const fileName = `${employee.slug}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
      const markdown = `# ${latestAssistantMessage.title ?? `${employee.name} Response`}\n\n${latestAssistantMessage.content}\n`;
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess("Downloaded latest content as Markdown.");
    } catch {
      setError("Markdown download failed. Please copy content manually.");
    }
  };

  const downloadLatestPdf = async () => {
    if (!latestAssistantMessage) return;

    try {
      const { Document, Page, StyleSheet, Text, pdf } = await import(
        "@react-pdf/renderer"
      );

      const styles = StyleSheet.create({
        page: {
          padding: 32,
          fontSize: 11,
          lineHeight: 1.45,
        },
        title: {
          fontSize: 16,
          marginBottom: 12,
        },
        body: {
          fontSize: 11,
          lineHeight: 1.45,
        },
      });

      const title = latestAssistantMessage.title ?? `${employee.name} Response`;
      const contentLines = latestAssistantMessage.content.split("\n");

      const pdfDocument = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{contentLines.join("\n")}</Text>
          </Page>
        </Document>
      );

      const blob = await pdf(pdfDocument).toBlob();
      const fileName = `${employee.slug}-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess("Downloaded latest content as PDF.");
    } catch {
      setError("PDF download failed. Please download Markdown instead.");
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedContent((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const openGoalProgressEditor = (goal: GoalItem) => {
    setActiveGoalEditId(null);
    setActiveGoalProgressId(goal.id);
    setGoalProgressDraft({
      status: goal.status,
      progressPercent: goal.progressPercent,
      workCompleted: "",
      blockerNotes: "",
      nextAction: "",
    });
  };

  const openGoalEditEditor = (goal: GoalItem) => {
    setActiveGoalProgressId(null);
    setActiveGoalEditId(goal.id);
    setGoalEditDraft({
      title: goal.title,
      description: goal.description,
      dueDate: goal.dueDate,
      priority: goal.priority,
      successMetric: goal.successMetric,
      notes: goal.notes,
    });
  };

  const submitGoalProgressUpdate = async (goalId: string) => {
    if (isUpdatingGoal) {
      return;
    }

    setIsUpdatingGoal(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/goals",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: goalId,
            status: goalProgressDraft.status,
            progressPercent: goalProgressDraft.progressPercent,
            workCompleted: goalProgressDraft.workCompleted,
            blockerNotes: goalProgressDraft.blockerNotes,
            nextAction: goalProgressDraft.nextAction,
            recordHistory: true,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body ? body.message : "Unable to update goal.",
        );
        return;
      }

      setActiveGoalProgressId(null);
      setSuccess("Goal progress updated.");
      emitGoalsUpdatedEvent();
    } catch {
      setError("Unable to update goal.");
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  const submitGoalEdit = async (goalId: string) => {
    if (
      isUpdatingGoal ||
      !goalEditDraft.title.trim() ||
      !goalEditDraft.dueDate
    ) {
      return;
    }

    setIsUpdatingGoal(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/goals",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: goalId,
            title: goalEditDraft.title.trim(),
            description: goalEditDraft.description.trim(),
            dueDate: goalEditDraft.dueDate,
            priority: goalEditDraft.priority,
            successMetric: goalEditDraft.successMetric.trim(),
            notes: goalEditDraft.notes.trim(),
            recordHistory: false,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body ? body.message : "Unable to edit goal.",
        );
        return;
      }

      setActiveGoalEditId(null);
      setSuccess("Goal updated.");
      emitGoalsUpdatedEvent();
    } catch {
      setError("Unable to edit goal.");
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  const markGoalComplete = async (goalId: string) => {
    if (markingCompleteGoalId) {
      return;
    }

    setMarkingCompleteGoalId(goalId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/goals",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: goalId,
            markComplete: true,
            workCompleted: "Marked complete by Super Admin.",
            recordHistory: true,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body ? body.message : "Unable to complete goal.",
        );
        return;
      }

      setSuccess("Goal marked complete.");
      emitGoalsUpdatedEvent();
    } catch {
      setError("Unable to complete goal.");
    } finally {
      setMarkingCompleteGoalId(null);
    }
  };

  const createGoal = async () => {
    if (!goalDraft.title.trim() || !goalDraft.dueDate || isCreatingGoal) {
      return;
    }

    setIsCreatingGoal(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/goals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeSlug: employee.slug,
            title: goalDraft.title.trim(),
            description: goalDraft.description.trim(),
            dueDate: goalDraft.dueDate,
            priority: goalDraft.priority,
            successMetric: goalDraft.successMetric.trim(),
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body ? body.message : "Unable to create goal.",
        );
        return;
      }

      setGoalDraft({
        title: "",
        description: "",
        dueDate: todayIso(),
        priority: "medium",
        successMetric: "",
      });
      setShowGoalComposer(false);
      setSuccess("Goal created.");
      emitGoalsUpdatedEvent();
    } catch {
      setError("Unable to create goal.");
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const createTask = async () => {
    if (!taskDraft.title.trim() || !taskDraft.dueDate || isCreatingTask) {
      return;
    }

    setIsCreatingTask(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/tasks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeSlug: employee.slug,
            title: taskDraft.title.trim(),
            instructions: taskDraft.instructions.trim(),
            dueDate: taskDraft.dueDate,
            priority: taskDraft.priority,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body ? body.message : "Unable to create task.",
        );
        return;
      }

      setTaskDraft({
        title: "",
        instructions: "",
        dueDate: todayIso(),
        priority: "medium",
      });
      setShowTaskComposer(false);
      setSuccess("Task assigned.");
      emitGoalsUpdatedEvent();
    } catch {
      setError("Unable to create task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const controlsDisabled = !latestSavedItem || isMutatingStatus || isSubmitting;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                AI Workforce Employee
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                {employee.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">{employee.role}</p>
              <p className="mt-3 max-w-3xl text-sm text-slate-400">
                {employee.mission}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300">
              Status: Active
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-amber-800/70 bg-amber-950/50 px-4 py-3 text-xs text-amber-200">
            AI-generated content is draft assistance only. Human review and
            approval are required before any operational use.
          </div>
        </header>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setPrompt(action)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="mb-3 inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {isLoadingWorkspace ? (
                <p className="mb-3 text-sm text-cyan-300">
                  Loading saved content and approval history...
                </p>
              ) : null}

              {isSubmitting ? (
                <p className="mb-3 text-sm text-cyan-300">
                  Saving generated content...
                </p>
              ) : null}

              {isMutatingStatus ? (
                <p className="mb-3 text-sm text-cyan-300">
                  Persisting approval status...
                </p>
              ) : null}

              {success ? (
                <p className="mb-3 rounded-lg border border-emerald-900 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">
                  {success}
                </p>
              ) : null}

              {error ? (
                <p className="mb-3 rounded-lg border border-rose-900 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
                  Error state: {error}
                </p>
              ) : null}

              {activeTab === "chat" ? (
                <div>
                  <div className="mb-4 max-h-[420px] space-y-3 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3">
                    {messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                        Empty state: Start with a prompt or choose a quick
                        action.
                      </div>
                    ) : (
                      messages.map((message) => (
                        <article
                          key={message.id}
                          className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>
                              {message.role === "user" ? "You" : employee.name}
                            </span>
                            <span>{timestampLabel(message.createdAt)}</span>
                          </div>
                          {message.approvalStatus ? (
                            <span
                              className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClassName(message.approvalStatus)}`}
                            >
                              {badgeLabel(message.approvalStatus)}
                            </span>
                          ) : null}
                          <p className="whitespace-pre-wrap text-sm text-slate-200">
                            {message.content}
                          </p>
                          {message.role === "assistant" &&
                          latestAssistantMessage?.id === message.id &&
                          latestAssistantSections.length > 0 ? (
                            <div className="mt-3 space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                                Script sections
                              </p>
                              {latestAssistantSections.map((section) => (
                                <article
                                  key={section.id}
                                  className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-white">
                                      {section.title}
                                    </h3>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void copySectionContent(section)
                                      }
                                      className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                                    >
                                      Copy section
                                    </button>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                                    {section.content}
                                  </p>
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))
                    )}
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe what you want this AI employee to generate..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void sendPrompt(prompt)}
                      disabled={
                        isSubmitting || isMutatingStatus || !prompt.trim()
                      }
                      className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt("")}
                      disabled={isSubmitting || isMutatingStatus}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-60"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}

              {activeTab === "goals" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Weekly goals
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowGoalComposer((current) => !current)}
                      className="rounded-lg border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40"
                    >
                      + Create Goal
                    </button>
                  </div>

                  {showGoalComposer ? (
                    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <input
                        value={goalDraft.title}
                        onChange={(event) =>
                          setGoalDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Goal title"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
                      />
                      <textarea
                        value={goalDraft.description}
                        onChange={(event) =>
                          setGoalDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Goal description"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
                      />
                      <input
                        value={goalDraft.successMetric}
                        onChange={(event) =>
                          setGoalDraft((current) => ({
                            ...current,
                            successMetric: event.target.value,
                          }))
                        }
                        placeholder="Success metric"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs text-slate-400">
                          Due date
                          <input
                            type="date"
                            value={goalDraft.dueDate}
                            onChange={(event) =>
                              setGoalDraft((current) => ({
                                ...current,
                                dueDate: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Priority
                          <select
                            value={goalDraft.priority}
                            onChange={(event) =>
                              setGoalDraft((current) => ({
                                ...current,
                                priority: event.target
                                  .value as GoalDraft["priority"],
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void createGoal()}
                          disabled={isCreatingGoal || !goalDraft.title.trim()}
                          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                        >
                          {isCreatingGoal ? "Creating..." : "Create Goal"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowGoalComposer(false)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isLoadingManagement ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      Loading weekly goals...
                    </p>
                  ) : goals.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      No goals yet for this employee.
                    </p>
                  ) : (
                    goals.map((goal) => (
                      <article
                        key={goal.id}
                        className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {goal.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {goal.description || "No description provided."}
                            </p>
                          </div>
                          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                            {goalStatusLabel(goal.status)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Progress</span>
                            <span>{goal.progressPercent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full ${
                                goal.status === "completed"
                                  ? "bg-emerald-400"
                                  : goal.status === "blocked"
                                    ? "bg-rose-400"
                                    : "bg-cyan-400"
                              }`}
                              style={{ width: `${goal.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                          <p>Due date: {goal.dueDate}</p>
                          <p>Priority: {goal.priority}</p>
                          <p>
                            Success metric:{" "}
                            {goal.successMetric || "Not provided"}
                          </p>
                          <p>
                            Tasks: {goal.relatedTaskCompletedCount}/
                            {goal.relatedTaskTotalCount} completed
                          </p>
                          <p>Last updated: {timestampLabel(goal.updatedAt)}</p>
                          <p>
                            Latest progress update:{" "}
                            {goal.latestProgressUpdate || "No updates yet"}
                          </p>
                        </div>

                        {goal.completedAt ? (
                          <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
                            Completed on {timestampLabel(goal.completedAt)}
                          </p>
                        ) : null}

                        {goal.suggestedCompletion ? (
                          <p className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
                            All related tasks are complete. Goal completion is
                            suggested, but requires Super Admin confirmation.
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openGoalProgressEditor(goal)}
                            className="rounded-lg border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40"
                          >
                            Update Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => void markGoalComplete(goal.id)}
                            disabled={markingCompleteGoalId === goal.id}
                            className="rounded-lg border border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/40 disabled:opacity-60"
                          >
                            {markingCompleteGoalId === goal.id
                              ? "Marking..."
                              : "Mark Complete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openGoalEditEditor(goal)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                          >
                            Edit Goal
                          </button>
                        </div>

                        {activeGoalProgressId === goal.id ? (
                          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                              Update Progress
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="text-xs text-slate-400">
                                Status
                                <select
                                  value={goalProgressDraft.status}
                                  onChange={(event) =>
                                    setGoalProgressDraft((current) => ({
                                      ...current,
                                      status: event.target
                                        .value as GoalProgressDraft["status"],
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                                >
                                  <option value="not_started">
                                    Not Started
                                  </option>
                                  <option value="in_progress">
                                    In Progress
                                  </option>
                                  <option value="blocked">Blocked</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </label>
                              <label className="text-xs text-slate-400">
                                Progress %
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={goalProgressDraft.progressPercent}
                                  onChange={(event) =>
                                    setGoalProgressDraft((current) => ({
                                      ...current,
                                      progressPercent: Math.max(
                                        0,
                                        Math.min(
                                          100,
                                          Number(event.target.value) || 0,
                                        ),
                                      ),
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                                />
                              </label>
                            </div>
                            <textarea
                              value={goalProgressDraft.workCompleted}
                              onChange={(event) =>
                                setGoalProgressDraft((current) => ({
                                  ...current,
                                  workCompleted: event.target.value,
                                }))
                              }
                              rows={3}
                              placeholder="Work completed / progress update"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <textarea
                              value={goalProgressDraft.blockerNotes}
                              onChange={(event) =>
                                setGoalProgressDraft((current) => ({
                                  ...current,
                                  blockerNotes: event.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Blocker notes"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <textarea
                              value={goalProgressDraft.nextAction}
                              onChange={(event) =>
                                setGoalProgressDraft((current) => ({
                                  ...current,
                                  nextAction: event.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Next action"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void submitGoalProgressUpdate(goal.id)
                                }
                                disabled={isUpdatingGoal}
                                className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                              >
                                {isUpdatingGoal ? "Saving..." : "Save Update"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveGoalProgressId(null)}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {activeGoalEditId === goal.id ? (
                          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                              Edit Goal
                            </p>
                            <input
                              value={goalEditDraft.title}
                              onChange={(event) =>
                                setGoalEditDraft((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="Goal title"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <textarea
                              value={goalEditDraft.description}
                              onChange={(event) =>
                                setGoalEditDraft((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              rows={3}
                              placeholder="Goal description"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <div className="grid gap-2 sm:grid-cols-3">
                              <label className="text-xs text-slate-400">
                                Due date
                                <input
                                  type="date"
                                  value={goalEditDraft.dueDate}
                                  onChange={(event) =>
                                    setGoalEditDraft((current) => ({
                                      ...current,
                                      dueDate: event.target.value,
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                                />
                              </label>
                              <label className="text-xs text-slate-400">
                                Priority
                                <select
                                  value={goalEditDraft.priority}
                                  onChange={(event) =>
                                    setGoalEditDraft((current) => ({
                                      ...current,
                                      priority: event.target
                                        .value as GoalEditDraft["priority"],
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </label>
                              <label className="text-xs text-slate-400">
                                Success metric
                                <input
                                  value={goalEditDraft.successMetric}
                                  onChange={(event) =>
                                    setGoalEditDraft((current) => ({
                                      ...current,
                                      successMetric: event.target.value,
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                                />
                              </label>
                            </div>
                            <textarea
                              value={goalEditDraft.notes}
                              onChange={(event) =>
                                setGoalEditDraft((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Goal notes"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void submitGoalEdit(goal.id)}
                                disabled={
                                  isUpdatingGoal || !goalEditDraft.title.trim()
                                }
                                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
                              >
                                {isUpdatingGoal ? "Saving..." : "Save Goal"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveGoalEditId(null)}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Update History
                          </p>
                          {goal.progressHistory.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">
                              No progress history yet.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {goal.progressHistory.map((entry) => (
                                <article
                                  key={entry.id}
                                  className="rounded-lg border border-slate-800 bg-slate-900 p-2"
                                >
                                  <p className="text-xs text-slate-300">
                                    {timestampLabel(entry.createdAt)} |{" "}
                                    {goalStatusLabel(entry.status)} |{" "}
                                    {entry.progressPercent}%
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Work completed:{" "}
                                    {entry.workCompleted || "Not provided"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Blockers: {entry.blockerNotes || "None"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Next action: {entry.nextAction || "Not set"}
                                  </p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === "tasks" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Assignment queue
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTaskComposer((current) => !current)}
                      className="rounded-lg border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40"
                    >
                      + Create Task
                    </button>
                  </div>

                  {showTaskComposer ? (
                    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <input
                        value={taskDraft.title}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Task title"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
                      />
                      <textarea
                        value={taskDraft.instructions}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            instructions: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Task instructions"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs text-slate-400">
                          Due date
                          <input
                            type="date"
                            value={taskDraft.dueDate}
                            onChange={(event) =>
                              setTaskDraft((current) => ({
                                ...current,
                                dueDate: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Priority
                          <select
                            value={taskDraft.priority}
                            onChange={(event) =>
                              setTaskDraft((current) => ({
                                ...current,
                                priority: event.target
                                  .value as TaskDraft["priority"],
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void createTask()}
                          disabled={isCreatingTask || !taskDraft.title.trim()}
                          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                        >
                          {isCreatingTask ? "Creating..." : "Create Task"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTaskComposer(false)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isLoadingManagement ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      Loading assignments...
                    </p>
                  ) : assignments.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      No assignments yet.
                    </p>
                  ) : (
                    assignments.map((item) => {
                      const isExpanded = Boolean(expandedContent[item.id]);
                      const isMutatingAssignment = Boolean(
                        taskMutationById[item.id],
                      );
                      const canStart = item.status === "assigned";
                      const canSubmit = item.status === "in_progress";
                      const canApprove = item.status === "awaiting_approval";
                      const canReject =
                        item.status === "awaiting_approval" ||
                        item.status === "in_progress" ||
                        item.status === "approved";
                      const canComplete =
                        item.status === "approved" ||
                        (!item.approvalRequired &&
                          (item.status === "in_progress" ||
                            item.status === "assigned"));
                      const canReassign =
                        item.status === "rejected" ||
                        item.status === "completed" ||
                        item.status === "blocked";

                      return (
                        <article
                          key={item.id}
                          className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Due date: {item.dueDate} | Priority:{" "}
                                {item.priority}
                              </p>
                            </div>
                            <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                              {assignmentStatusLabel(item.status)}
                            </span>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                            {isExpanded
                              ? item.instructions
                              : `${item.instructions.slice(0, 220)}...`}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                            >
                              {isExpanded ? "Show less" : "View full content"}
                            </button>

                            {canStart ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void runAssignmentAction(item, "start")
                                }
                                disabled={isMutatingAssignment}
                                className="rounded-lg border border-cyan-800 px-2 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40 disabled:opacity-60"
                              >
                                {isMutatingAssignment ? "Updating..." : "Start"}
                              </button>
                            ) : null}

                            {canSubmit ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void runAssignmentAction(item, "submit")
                                }
                                disabled={isMutatingAssignment}
                                className="rounded-lg border border-amber-800 px-2 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-950/40 disabled:opacity-60"
                              >
                                {isMutatingAssignment
                                  ? "Updating..."
                                  : "Submit for Approval"}
                              </button>
                            ) : null}

                            {canApprove ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void runAssignmentAction(item, "approve")
                                }
                                disabled={isMutatingAssignment}
                                className="rounded-lg border border-emerald-800 px-2 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/40 disabled:opacity-60"
                              >
                                {isMutatingAssignment
                                  ? "Updating..."
                                  : "Approve"}
                              </button>
                            ) : null}

                            {canComplete ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void runAssignmentAction(item, "complete")
                                }
                                disabled={isMutatingAssignment}
                                className="rounded-lg border border-cyan-700 px-2 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40 disabled:opacity-60"
                              >
                                {isMutatingAssignment
                                  ? "Updating..."
                                  : "Complete"}
                              </button>
                            ) : null}

                            {canReject ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void runAssignmentAction(item, "reject")
                                }
                                disabled={isMutatingAssignment}
                                className="rounded-lg border border-rose-800 px-2 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-950/40 disabled:opacity-60"
                              >
                                {isMutatingAssignment
                                  ? "Updating..."
                                  : "Reject"}
                              </button>
                            ) : null}

                            {canReassign ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void runAssignmentAction(item, "reassign")
                                }
                                disabled={isMutatingAssignment}
                                className="rounded-lg border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-60"
                              >
                                {isMutatingAssignment
                                  ? "Updating..."
                                  : "Reopen"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              ) : null}

              {activeTab === "saved" ? (
                <div className="space-y-3">
                  {savedItems.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      No saved content yet.
                    </p>
                  ) : (
                    savedItems.map((item) => {
                      const isExpanded = Boolean(expandedContent[item.id]);
                      return (
                        <article
                          key={item.id}
                          className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                        >
                          <p className="text-xs text-slate-400">
                            Saved {timestampLabel(item.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Updated {timestampLabel(item.updatedAt)}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                            {isExpanded
                              ? item.content
                              : `${item.content.slice(0, 300)}...`}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                            >
                              {isExpanded ? "Show less" : "View full content"}
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              ) : null}

              {activeTab === "activity" ? (
                <div className="space-y-3">
                  {activity.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      No activity yet.
                    </p>
                  ) : (
                    activity.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300"
                      >
                        <p className="font-semibold text-slate-200">
                          {activityLabel(item.action)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Employee: {item.employee}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Status: {badgeLabel(item.resultingStatus)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Related content: {item.title}
                        </p>
                        {item.prospectOrCustomer ||
                        item.company ||
                        item.callType ||
                        item.objective ||
                        item.date ? (
                          <div className="mt-2 grid gap-1 text-xs text-slate-400">
                            <p>
                              Prospect or customer:{" "}
                              {metadataLabel(item.prospectOrCustomer)}
                            </p>
                            <p>Company: {metadataLabel(item.company)}</p>
                            <p>Call type: {metadataLabel(item.callType)}</p>
                            <p>Objective: {metadataLabel(item.objective)}</p>
                            <p>Date: {metadataLabel(item.date)}</p>
                          </div>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-500">
                          Date: {timestampLabel(item.timestamp)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                Context
              </h2>
              <div className="mt-3 space-y-3">
                {contextFields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-xs text-slate-400">
                      {field.label}
                    </span>
                    <input
                      value={context[field.key] ?? ""}
                      onChange={(event) =>
                        setContext((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                Human Approval Controls
              </h2>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => void saveLatestDraft()}
                  disabled={controlsDisabled}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => void updateLatestApproval("awaiting_approval")}
                  disabled={controlsDisabled}
                  className="rounded-lg border border-amber-800 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit for Approval
                </button>
                <button
                  type="button"
                  onClick={() => void updateLatestApproval("approved")}
                  disabled={controlsDisabled}
                  className="rounded-lg border border-emerald-800 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void updateLatestApproval("rejected")}
                  disabled={controlsDisabled}
                  className="rounded-lg border border-rose-800 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => void updateLatestApproval("completed")}
                  disabled={controlsDisabled}
                  className="rounded-lg border border-cyan-800 px-3 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  onClick={() => void copyLatestContent()}
                  disabled={
                    !latestAssistantMessage || isSubmitting || isMutatingStatus
                  }
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy Response
                </button>
                <button
                  type="button"
                  onClick={() => downloadLatestMarkdown()}
                  disabled={
                    !latestAssistantMessage || isSubmitting || isMutatingStatus
                  }
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download Markdown
                </button>
                <button
                  type="button"
                  onClick={() => void downloadLatestPdf()}
                  disabled={
                    !latestAssistantMessage || isSubmitting || isMutatingStatus
                  }
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download PDF
                </button>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
