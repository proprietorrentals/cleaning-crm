"use client";

import { useMemo, useState } from "react";
import type {
  AiEmployeeDefinition,
  AiEmployeeSlug,
} from "@/lib/ai-workforce/employees";

type WorkspaceTab = "chat" | "tasks" | "saved" | "activity";
type ApprovalStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "completed";

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
};

type AiGenerateResponse = {
  content: string;
  provider: string;
  model: string;
  isMock: boolean;
};

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "chat", label: "Chat" },
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

function timestampLabel(iso: string) {
  return new Date(iso).toLocaleString();
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
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [context, setContext] = useState<Record<string, string>>({});
  const [savedContent, setSavedContent] = useState<WorkspaceMessage[]>([]);

  const latestAssistantMessage = useMemo(() => {
    return messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant");
  }, [messages]);

  const activity = useMemo(() => {
    return messages
      .slice()
      .reverse()
      .map((message) => ({
        id: message.id,
        text:
          message.role === "assistant"
            ? `Generated ${employee.name} draft (${message.approvalStatus ? badgeLabel(message.approvalStatus) : "Draft"})`
            : "Submitted prompt",
        createdAt: message.createdAt,
      }));
  }, [employee.name, messages]);

  const sendPrompt = async (draftPrompt: string) => {
    const promptValue = draftPrompt.trim();
    if (!promptValue) return;

    const userMessage: WorkspaceMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: promptValue,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        employeeSlug: employee.slug,
        prompt: promptValue,
        context,
        taskType,
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
        id: crypto.randomUUID(),
        role: "assistant",
        content: `${responseBody.data.isMock ? "[DEV MOCK RESPONSE]\n\n" : ""}${responseBody.data.content}`,
        approvalStatus: "draft",
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
      setPrompt("");
      setActiveTab("chat");
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLatestApproval = (status: ApprovalStatus) => {
    if (!latestAssistantMessage) return;

    setMessages((current) =>
      current.map((message) => {
        if (message.id !== latestAssistantMessage.id) return message;
        return { ...message, approvalStatus: status };
      }),
    );
  };

  const saveLatestDraft = () => {
    if (!latestAssistantMessage) return;

    setSavedContent((current) => {
      if (current.some((item) => item.id === latestAssistantMessage.id))
        return current;
      return [latestAssistantMessage, ...current];
    });

    updateLatestApproval("draft");
  };

  const copyLatestContent = async () => {
    if (!latestAssistantMessage) return;

    try {
      await navigator.clipboard.writeText(latestAssistantMessage.content);
    } catch {
      setError("Copy failed. Please copy manually.");
    }
  };

  const effectiveSlug: AiEmployeeSlug = employee.slug;

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
                        </article>
                      ))
                    )}
                  </div>

                  {isSubmitting ? (
                    <p className="mb-3 text-sm text-cyan-300">
                      Loading state: Generating response...
                    </p>
                  ) : null}

                  {error ? (
                    <p className="mb-3 rounded-lg border border-rose-900 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
                      Error state: {error}
                    </p>
                  ) : null}

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
                      disabled={isSubmitting || !prompt.trim()}
                      className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt("")}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}

              {activeTab === "tasks" ? (
                <div className="space-y-3">
                  {latestAssistantMessage ? (
                    <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                      <p className="text-sm font-semibold text-white">
                        {employee.name} generated task
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Employee: {effectiveSlug}
                      </p>
                      <p className="mt-3 text-sm text-slate-300">
                        {latestAssistantMessage.content.slice(0, 220)}...
                      </p>
                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClassName(latestAssistantMessage.approvalStatus ?? "draft")}`}
                        >
                          {badgeLabel(
                            latestAssistantMessage.approvalStatus ?? "draft",
                          )}
                        </span>
                      </div>
                    </article>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      No tasks yet. Generate content in Chat first.
                    </p>
                  )}
                </div>
              ) : null}

              {activeTab === "saved" ? (
                <div className="space-y-3">
                  {savedContent.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                      No saved content yet.
                    </p>
                  ) : (
                    savedContent.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                      >
                        <p className="text-xs text-slate-400">
                          Saved {timestampLabel(item.createdAt)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                          {item.content}
                        </p>
                      </article>
                    ))
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
                        <p>{item.text}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {timestampLabel(item.createdAt)}
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
                  onClick={saveLatestDraft}
                  disabled={!latestAssistantMessage}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => updateLatestApproval("awaiting_approval")}
                  disabled={!latestAssistantMessage}
                  className="rounded-lg border border-amber-800 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit for Approval
                </button>
                <button
                  type="button"
                  onClick={() => updateLatestApproval("approved")}
                  disabled={!latestAssistantMessage}
                  className="rounded-lg border border-emerald-800 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => updateLatestApproval("rejected")}
                  disabled={!latestAssistantMessage}
                  className="rounded-lg border border-rose-800 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => updateLatestApproval("completed")}
                  disabled={!latestAssistantMessage}
                  className="rounded-lg border border-cyan-800 px-3 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  onClick={() => void copyLatestContent()}
                  disabled={!latestAssistantMessage}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy Content
                </button>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
