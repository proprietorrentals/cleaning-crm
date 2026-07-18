"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AI_EMPLOYEES } from "@/lib/ai-workforce/employees";

type Scorecard = {
  employeeSlug: string;
  employeeName: string;
  goalsCompleted: number;
  goalsCompletedThisWeek: number;
  tasksCompleted: number;
  tasksCompletedThisWeek: number;
  approvalRate: number;
  averageCompletionHours: number;
  currentWorkload: number;
  weeklyProductivity: number;
  qualityScore: number;
  lastActivity: string | null;
  trend: "up" | "flat" | "down";
};

type AlertItem = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

type TimelineItem = {
  id: string;
  timestamp: string;
  title: string;
  type: string;
};

type CommandCenterData = {
  weekStart: string;
  weekEnd: string;
  metrics: {
    todayTasks: number;
    goalsInProgress: number;
    completedThisWeek: number;
    pendingApprovals: number;
    overdueGoals: number;
    blockedTasks: number;
    highPriorityItems: number;
    workforceHealthScore: number;
    weeklyProductivity: number;
  };
  health: {
    score: number;
    label: string;
    explanation: string;
    factors: {
      goalCompletion: number;
      taskCompletion: number;
      approvalBacklog: number;
      overdueWork: number;
      blockedWork: number;
      employeeActivity: number;
    };
  };
  employeeScorecards: Scorecard[];
  alerts: AlertItem[];
  recommendations: string[];
  timeline: TimelineItem[];
  latestWeeklySummary: {
    id: string;
    summary_markdown: string;
    created_at: string;
  } | null;
  ceoMode: {
    whatHappenedYesterday: string[];
    attentionToday: string[];
    workNext: string;
    whoNeedsHelp: string[];
    aiEmployeesNext: string[];
  };
};

type BriefResponse = {
  sections: {
    executiveSummary: string;
    biggestWins: string[];
    biggestRisks: string[];
    itemsAwaitingApproval: string;
    goalsBehindSchedule: string;
    recommendations: string[];
    topPrioritiesTomorrow: string[];
  };
  markdown: string;
};

type GoalDraft = {
  employeeSlug: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
};

type TaskDraft = {
  employeeSlug: string;
  title: string;
  instructions: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function tsLabel(iso: string | null) {
  if (!iso) return "No activity";
  return new Date(iso).toLocaleString();
}

function trendBadge(trend: Scorecard["trend"]) {
  if (trend === "up") return "text-emerald-300";
  if (trend === "down") return "text-rose-300";
  return "text-slate-300";
}

export function CeoCommandCenter() {
  const activeEmployees = useMemo(
    () => AI_EMPLOYEES.filter((entry) => entry.status === "active"),
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [showGoalComposer, setShowGoalComposer] = useState(false);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    employeeSlug: activeEmployees[0]?.slug ?? "sales-manager",
    title: "",
    description: "",
    dueDate: todayIso(),
    priority: "medium",
  });

  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    employeeSlug: activeEmployees[0]?.slug ?? "sales-manager",
    title: "",
    instructions: "",
    dueDate: todayIso(),
    priority: "medium",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/command-center",
      );
      const body = (await response.json().catch(() => null)) as
        | ({ success: true } & CommandCenterData)
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setError(
          body && "message" in body
            ? body.message
            : "Unable to load command center.",
        );
        return;
      }

      setData(body);
    } catch {
      setError("Unable to load command center.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdated = () => {
      void load();
    };
    window.addEventListener("ai-workforce-goals-updated", onUpdated);
    return () => {
      window.removeEventListener("ai-workforce-goals-updated", onUpdated);
    };
  }, [load]);

  const emitUpdated = () => {
    window.dispatchEvent(new Event("ai-workforce-goals-updated"));
  };

  const createGoal = async () => {
    if (!goalDraft.title.trim()) return;

    const response = await fetch(
      "/api/super-admin/ai-workforce/management/goals",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalDraft),
      },
    );

    const body = (await response.json().catch(() => null)) as
      | { success: true }
      | { success: false; message: string }
      | null;

    if (!response.ok || !body || !body.success) {
      setActionMessage(
        body && "message" in body ? body.message : "Unable to create goal.",
      );
      return;
    }

    setActionMessage("Goal created.");
    setGoalDraft((current) => ({
      ...current,
      title: "",
      description: "",
      dueDate: todayIso(),
    }));
    setShowGoalComposer(false);
    emitUpdated();
  };

  const createTask = async () => {
    if (!taskDraft.title.trim()) return;

    const response = await fetch(
      "/api/super-admin/ai-workforce/management/tasks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskDraft),
      },
    );

    const body = (await response.json().catch(() => null)) as
      | { success: true }
      | { success: false; message: string }
      | null;

    if (!response.ok || !body || !body.success) {
      setActionMessage(
        body && "message" in body ? body.message : "Unable to assign task.",
      );
      return;
    }

    setActionMessage("Task assigned.");
    setTaskDraft((current) => ({
      ...current,
      title: "",
      instructions: "",
      dueDate: todayIso(),
    }));
    setShowTaskComposer(false);
    emitUpdated();
  };

  const generateBrief = async () => {
    setBriefLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/command-center",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true; brief: BriefResponse }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setActionMessage(
          body && "message" in body
            ? body.message
            : "Unable to generate executive brief.",
        );
        return;
      }

      setBrief(body.brief);
    } finally {
      setBriefLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const metrics = data?.metrics;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
            ServiceOS executive
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            CEO Command Center
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Real-time executive visibility across AI workforce execution.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowGoalComposer((current) => !current)}
              className="rounded-lg border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40"
            >
              Create Goal
            </button>
            <button
              type="button"
              onClick={() => setShowTaskComposer((current) => !current)}
              className="rounded-lg border border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/30"
            >
              Assign Task
            </button>
            <button
              type="button"
              onClick={() => void generateBrief()}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              {briefLoading ? "Generating..." : "Generate Executive Brief"}
            </button>
            <button
              type="button"
              onClick={() => scrollTo("attention-center")}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              View Pending Approvals
            </button>
            <button
              type="button"
              onClick={() => scrollTo("company-health")}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              View Overdue Goals
            </button>
            <button
              type="button"
              onClick={() => scrollTo("weekly-summary")}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              View Weekly Summary
            </button>
          </div>

          {actionMessage ? (
            <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
              {actionMessage}
            </p>
          ) : null}

          {showGoalComposer ? (
            <div className="mt-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:grid-cols-2">
              <select
                value={goalDraft.employeeSlug}
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    employeeSlug: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {activeEmployees.map((employee) => (
                  <option key={employee.slug} value={employee.slug}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <input
                value={goalDraft.title}
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Goal title"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={goalDraft.description}
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Goal description"
                rows={2}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white sm:col-span-2"
              />
              <input
                type="date"
                value={goalDraft.dueDate}
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <select
                value={goalDraft.priority}
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    priority: event.target.value as GoalDraft["priority"],
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                type="button"
                onClick={() => void createGoal()}
                className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Save Goal
              </button>
            </div>
          ) : null}

          {showTaskComposer ? (
            <div className="mt-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:grid-cols-2">
              <select
                value={taskDraft.employeeSlug}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    employeeSlug: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {activeEmployees.map((employee) => (
                  <option key={employee.slug} value={employee.slug}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <input
                value={taskDraft.title}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Task title"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={taskDraft.instructions}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    instructions: event.target.value,
                  }))
                }
                placeholder="Task instructions"
                rows={2}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white sm:col-span-2"
              />
              <input
                type="date"
                value={taskDraft.dueDate}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <select
                value={taskDraft.priority}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    priority: event.target.value as TaskDraft["priority"],
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                type="button"
                onClick={() => void createTask()}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Save Task
              </button>
            </div>
          ) : null}
        </header>

        {loading ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            Loading command center...
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {!loading && data && metrics ? (
          <>
            <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["Today's Tasks", metrics.todayTasks],
                ["Goals In Progress", metrics.goalsInProgress],
                ["Completed This Week", metrics.completedThisWeek],
                ["Pending Approvals", metrics.pendingApprovals],
                ["Overdue Goals", metrics.overdueGoals],
                ["Blocked Tasks", metrics.blockedTasks],
                ["High Priority Items", metrics.highPriorityItems],
                ["AI Workforce Health Score", metrics.workforceHealthScore],
                ["Weekly Productivity %", `${metrics.weeklyProductivity}%`],
              ].map((entry) => (
                <article
                  key={entry[0]}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {entry[0]}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-cyan-300">
                    {entry[1]}
                  </p>
                </article>
              ))}
            </section>

            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">AI Executive Brief</h2>
                <button
                  type="button"
                  onClick={() => void generateBrief()}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  {briefLoading ? "Generating..." : "Generate Executive Brief"}
                </button>
              </div>

              {brief ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3 md:col-span-2">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Executive Summary
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {brief.sections.executiveSummary}
                    </p>
                  </article>
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Biggest Wins
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {brief.sections.biggestWins.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Biggest Risks
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {brief.sections.biggestRisks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Items Awaiting Approval
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {brief.sections.itemsAwaitingApproval}
                    </p>
                  </article>
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Goals Behind Schedule
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {brief.sections.goalsBehindSchedule}
                    </p>
                  </article>
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Recommendations
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {brief.sections.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h3 className="text-sm font-semibold text-cyan-300">
                      Top Priorities Tomorrow
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {brief.sections.topPrioritiesTomorrow.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Generate a brief to summarize Sales, Marketing, Lead Research,
                  Operations, Customer Success, and Voice Representative
                  activity.
                </p>
              )}
            </section>

            <section className="mb-6" id="scorecards">
              <h2 className="mb-3 text-lg font-semibold">
                Employee Scorecards
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.employeeScorecards.map((card) => (
                  <article
                    key={card.employeeSlug}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        {card.employeeName}
                      </h3>
                      <Link
                        href={`/super-admin/ai-workforce/${card.employeeSlug}`}
                        className="text-xs text-cyan-300 hover:text-cyan-200"
                      >
                        Open
                      </Link>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-slate-300">
                      <p>Goals Completed (All Time): {card.goalsCompleted}</p>
                      <p>
                        Goals Completed This Week: {card.goalsCompletedThisWeek}
                      </p>
                      <p>Tasks Completed (All Time): {card.tasksCompleted}</p>
                      <p>
                        Tasks Completed This Week: {card.tasksCompletedThisWeek}
                      </p>
                      <p>Approval Rate: {card.approvalRate}%</p>
                      <p>
                        Average Completion Time: {card.averageCompletionHours}h
                      </p>
                      <p>Current Workload: {card.currentWorkload}</p>
                      <p>Weekly Productivity: {card.weeklyProductivity}%</p>
                      <p>Quality Score: {card.qualityScore}</p>
                      <p>Last Activity: {tsLabel(card.lastActivity)}</p>
                      <p className={trendBadge(card.trend)}>
                        Trend:{" "}
                        {card.trend === "up"
                          ? "Up"
                          : card.trend === "down"
                            ? "Down"
                            : "Flat"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              id="company-health"
            >
              <h2 className="text-lg font-semibold">Company Health</h2>
              <p className="mt-2 text-sm text-slate-400">
                {data.health.explanation}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-cyan-950 px-3 py-1 text-sm font-semibold text-cyan-300">
                  {data.health.label}
                </span>
                <span className="text-2xl font-bold text-cyan-300">
                  {data.health.score}/100
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-300">
                <p>Goal completion: {data.health.factors.goalCompletion}%</p>
                <p>Task completion: {data.health.factors.taskCompletion}%</p>
                <p>Approval backlog: {data.health.factors.approvalBacklog}%</p>
                <p>Overdue work: {data.health.factors.overdueWork}%</p>
                <p>Blocked work: {data.health.factors.blockedWork}%</p>
                <p>
                  Employee activity: {data.health.factors.employeeActivity}%
                </p>
              </div>
            </section>

            <section
              className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              id="attention-center"
            >
              <h2 className="text-lg font-semibold">Attention Center</h2>
              <div className="mt-3 space-y-2">
                {data.alerts.length === 0 ? (
                  <p className="text-sm text-slate-400">No urgent alerts.</p>
                ) : (
                  data.alerts.map((alert) => (
                    <p
                      key={alert.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        alert.severity === "critical"
                          ? "border border-rose-800 bg-rose-950/40 text-rose-300"
                          : alert.severity === "warning"
                            ? "border border-amber-800 bg-amber-950/40 text-amber-300"
                            : "border border-slate-700 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {alert.message}
                    </p>
                  ))
                )}
              </div>
            </section>

            <section
              className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              id="recommendations"
            >
              <h2 className="text-lg font-semibold">AI Recommendations</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {data.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section
              className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              id="timeline"
            >
              <h2 className="text-lg font-semibold">Workforce Timeline</h2>
              <div className="mt-3 space-y-2">
                {data.timeline.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="text-sm text-slate-200">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {tsLabel(item.timestamp)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              id="weekly-summary"
            >
              <h2 className="text-lg font-semibold">Weekly Summary</h2>
              {data.latestWeeklySummary ? (
                <>
                  <p className="mt-2 text-xs text-slate-500">
                    Generated {tsLabel(data.latestWeeklySummary.created_at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {data.latestWeeklySummary.summary_markdown.slice(0, 500)}
                    {data.latestWeeklySummary.summary_markdown.length > 500
                      ? "..."
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  No weekly summary generated yet.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold">CEO Mode</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <h3 className="text-sm font-semibold text-cyan-300">
                    What happened yesterday?
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {data.ceoMode.whatHappenedYesterday.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <h3 className="text-sm font-semibold text-cyan-300">
                    What requires my attention today?
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {data.ceoMode.attentionToday.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <h3 className="text-sm font-semibold text-cyan-300">
                    What should I work on next?
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {data.ceoMode.workNext}
                  </p>
                </article>
                <article className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <h3 className="text-sm font-semibold text-cyan-300">
                    Who needs help?
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {data.ceoMode.whoNeedsHelp.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
              <article className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <h3 className="text-sm font-semibold text-cyan-300">
                  What should AI employees do next?
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {data.ceoMode.aiEmployeesNext.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
