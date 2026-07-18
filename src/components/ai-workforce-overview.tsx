"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AI_EMPLOYEES } from "@/lib/ai-workforce/employees";
import type { AiDashboardMetrics } from "@/lib/ai-workforce/management-types";

const SUMMARY_CARD_CLASS =
  "rounded-2xl border border-slate-800 bg-slate-900 p-5";

type GoalSummary = {
  id: string;
  employeeName: string;
  title: string;
  status: string;
  dueDate: string;
};

type TaskSummary = {
  id: string;
  employeeName: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
};

type HandoffSummary = {
  id: string;
  fromEmployeeName: string;
  toEmployeeName: string;
  status: string;
  summary: string;
};

type MetricsResponse = { success: true; metrics: AiDashboardMetrics };
type GoalsResponse = { success: true; goals: GoalSummary[] };
type TasksResponse = { success: true; tasks: TaskSummary[] };
type HandoffsResponse = { success: true; handoffs: HandoffSummary[] };

type GlobalGoalDraft = {
  employeeSlug: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
};

type GlobalTaskDraft = {
  employeeSlug: string;
  title: string;
  instructions: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function startOfWeekIso() {
  const date = new Date();
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AiWorkforceOverview() {
  const [metrics, setMetrics] = useState<AiDashboardMetrics | null>(null);
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [showGoalComposer, setShowGoalComposer] = useState(false);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "active",
  );
  const comingSoonEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "coming_soon",
  );

  const weekStart = useMemo(() => startOfWeekIso(), []);

  const [goalDraft, setGoalDraft] = useState<GlobalGoalDraft>({
    employeeSlug: activeEmployees[0]?.slug ?? "sales-manager",
    title: "",
    description: "",
    dueDate: todayIso(),
    priority: "medium",
  });

  const [taskDraft, setTaskDraft] = useState<GlobalTaskDraft>({
    employeeSlug: activeEmployees[0]?.slug ?? "sales-manager",
    title: "",
    instructions: "",
    dueDate: todayIso(),
    priority: "medium",
  });

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, goalsRes, tasksRes, handoffsRes] = await Promise.all([
        fetch(
          `/api/super-admin/ai-workforce/management/dashboard?weekStart=${weekStart}`,
        ),
        fetch(
          `/api/super-admin/ai-workforce/management/goals?weekStartDate=${weekStart}`,
        ),
        fetch(
          `/api/super-admin/ai-workforce/management/tasks?dueDateStart=${weekStart}`,
        ),
        fetch("/api/super-admin/ai-workforce/management/handoffs"),
      ]);

      const metricsBody = (await metricsRes
        .json()
        .catch(() => null)) as MetricsResponse | null;
      const goalsBody = (await goalsRes
        .json()
        .catch(() => null)) as GoalsResponse | null;
      const tasksBody = (await tasksRes
        .json()
        .catch(() => null)) as TasksResponse | null;
      const handoffsBody = (await handoffsRes
        .json()
        .catch(() => null)) as HandoffsResponse | null;

      if (metricsRes.ok && metricsBody?.success) {
        setMetrics(metricsBody.metrics);
      }

      if (goalsRes.ok && goalsBody?.success) {
        setGoals((goalsBody.goals ?? []).slice(0, 6));
      }

      if (tasksRes.ok && tasksBody?.success) {
        setTasks((tasksBody.tasks ?? []).slice(0, 8));
      }

      if (handoffsRes.ok && handoffsBody?.success) {
        setHandoffs((handoffsBody.handoffs ?? []).slice(0, 6));
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void loadOverviewData();
  }, [loadOverviewData]);

  const createGlobalGoal = async () => {
    if (!goalDraft.title.trim() || !goalDraft.dueDate || isCreatingGoal) {
      return;
    }

    setIsCreatingGoal(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/goals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeSlug: goalDraft.employeeSlug,
            title: goalDraft.title.trim(),
            description: goalDraft.description.trim(),
            dueDate: goalDraft.dueDate,
            priority: goalDraft.priority,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; message: string }
        | null;

      if (!response.ok || !body || !body.success) {
        setActionError(
          body && "message" in body ? body.message : "Unable to create goal.",
        );
        return;
      }

      setGoalDraft((current) => ({
        ...current,
        title: "",
        description: "",
        dueDate: todayIso(),
        priority: "medium",
      }));
      setShowGoalComposer(false);
      setActionSuccess("Goal created.");
      await loadOverviewData();
    } catch {
      setActionError("Unable to create goal.");
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const createGlobalTask = async () => {
    if (!taskDraft.title.trim() || !taskDraft.dueDate || isCreatingTask) {
      return;
    }

    setIsCreatingTask(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(
        "/api/super-admin/ai-workforce/management/tasks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeSlug: taskDraft.employeeSlug,
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
        setActionError(
          body && "message" in body ? body.message : "Unable to assign task.",
        );
        return;
      }

      setTaskDraft((current) => ({
        ...current,
        title: "",
        instructions: "",
        dueDate: todayIso(),
        priority: "medium",
      }));
      setShowTaskComposer(false);
      setActionSuccess("Task assigned.");
      await loadOverviewData();
    } catch {
      setActionError("Unable to assign task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const summaryCards = [
    {
      label: "Active Employees",
      value: (
        metrics?.totalActiveEmployees ?? activeEmployees.length
      ).toString(),
      detail:
        "Sales Manager, Marketing Manager, Lead Researcher, Operations Manager, Customer Success Manager, and Voice Representative are operational.",
    },
    {
      label: "Tasks Awaiting Approval",
      value: (metrics?.awaitingApproval ?? 0).toString(),
      detail: "All AI output requires human review before use.",
    },
    {
      label: "Completed This Week",
      value: (metrics?.completedThisWeek ?? 0).toString(),
      detail: "Completed task count for the current week window.",
    },
    {
      label: "Weekly Completion",
      value: `${metrics?.weeklyCompletionPercentage ?? 0}%`,
      detail: "Completion rate for in-scope assignments this week.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
            ServiceOS internal AI
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            AI Workforce
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Internal AI employees that help operate and grow Service OS. Every
            generated result is a draft and requires human review and approval.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className={SUMMARY_CARD_CLASS}>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-cyan-300">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Weekly Goals In Progress
            </p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {metrics?.goalsInProgress ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Active and blocked goals currently in execution.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Tasks Due This Week
            </p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {metrics?.tasksDueThisWeek ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Includes one-time and recurring assignments.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Overdue Tasks
            </p>
            <p className="mt-2 text-3xl font-bold text-rose-300">
              {metrics?.overdueTasks ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Assigned work that has passed due date and remains open.
            </p>
          </article>
        </section>

        <section className="mb-8 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                Management Actions
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Create goals and assign tasks across all active AI employees.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowGoalComposer((current) => !current)}
                className="rounded-lg border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-950/40"
              >
                + Create Goal
              </button>
              <button
                type="button"
                onClick={() => setShowTaskComposer((current) => !current)}
                className="rounded-lg border border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/30"
              >
                + Assign Task
              </button>
            </div>
          </div>

          {actionSuccess ? (
            <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
              {actionSuccess}
            </p>
          ) : null}

          {actionError ? (
            <p className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
              {actionError}
            </p>
          ) : null}

          {showGoalComposer ? (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                Create Goal
              </h3>
              <label className="text-xs text-slate-400">
                Employee
                <select
                  value={goalDraft.employeeSlug}
                  onChange={(event) =>
                    setGoalDraft((current) => ({
                      ...current,
                      employeeSlug: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  {activeEmployees.map((employee) => (
                    <option key={employee.slug} value={employee.slug}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={goalDraft.title}
                onChange={(event) =>
                  setGoalDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Goal title"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
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
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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
                          .value as GlobalGoalDraft["priority"],
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
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void createGlobalGoal()}
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

          {showTaskComposer ? (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Assign Task
              </h3>
              <label className="text-xs text-slate-400">
                Employee
                <select
                  value={taskDraft.employeeSlug}
                  onChange={(event) =>
                    setTaskDraft((current) => ({
                      ...current,
                      employeeSlug: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  {activeEmployees.map((employee) => (
                    <option key={employee.slug} value={employee.slug}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={taskDraft.title}
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Task title"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
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
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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
                          .value as GlobalTaskDraft["priority"],
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
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void createGlobalTask()}
                  disabled={isCreatingTask || !taskDraft.title.trim()}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {isCreatingTask ? "Assigning..." : "Assign Task"}
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
        </section>

        <section className="mb-8 grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Current Week Goals
            </h2>
            <div className="mt-3 space-y-2">
              {goals.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {loading ? "Loading goals..." : "No goals for this week yet."}
                </p>
              ) : (
                goals.map((goal) => (
                  <article
                    key={goal.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {goal.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {goal.employeeName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {titleCase(goal.status)} | Due {goal.dueDate}
                    </p>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Upcoming Assignments
            </h2>
            <div className="mt-3 space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {loading ? "Loading assignments..." : "No assignments found."}
                </p>
              ) : (
                tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {task.employeeName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {titleCase(task.status)} | {titleCase(task.priority)} |
                      Due {task.dueDate}
                    </p>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Active Handoffs
            </h2>
            <div className="mt-3 space-y-2">
              {handoffs.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {loading ? "Loading handoffs..." : "No handoffs in progress."}
                </p>
              ) : (
                handoffs.map((handoff) => (
                  <article
                    key={handoff.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {handoff.fromEmployeeName} to {handoff.toEmployeeName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {handoff.summary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {titleCase(handoff.status)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AI_EMPLOYEES.map((employee) => {
            const isActive = employee.status === "active";

            return (
              <article
                key={employee.slug}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {employee.name}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-wide text-cyan-300">
                      {employee.role}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-amber-950 text-amber-300"
                    }`}
                  >
                    {isActive ? "Active" : "Coming Soon"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-300">
                  {employee.mission}
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  {employee.responsibilitySummary}
                </p>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                  <span>Activity</span>
                  <span>{employee.activityCount ?? "Pending activation"}</span>
                </div>

                <div className="mt-4">
                  {isActive ? (
                    <Link
                      href={`/super-admin/ai-workforce/${employee.slug}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Open Workspace
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-500"
                    >
                      Open Workspace
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-8 text-xs text-slate-500">
          Phase 2 coverage: {activeEmployees.length} active employees,{" "}
          {comingSoonEmployees.length} planned employees, plus weekly goals,
          recurring tasks, and handoff visibility.
        </p>
      </div>
    </main>
  );
}
