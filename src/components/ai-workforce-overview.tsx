"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export function AiWorkforceOverview() {
  const [metrics, setMetrics] = useState<AiDashboardMetrics | null>(null);
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const activeEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "active",
  );
  const comingSoonEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "coming_soon",
  );

  const weekStart = useMemo(() => startOfWeekIso(), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [metricsRes, goalsRes, tasksRes, handoffsRes] = await Promise.all(
          [
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
          ],
        );

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

        if (cancelled) return;

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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

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
