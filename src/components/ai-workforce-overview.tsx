import Link from "next/link";
import { AI_EMPLOYEES } from "@/lib/ai-workforce/employees";

const SUMMARY_CARD_CLASS =
  "rounded-2xl border border-slate-800 bg-slate-900 p-5";

export function AiWorkforceOverview() {
  const activeEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "active",
  );
  const comingSoonEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "coming_soon",
  );

  const summaryCards = [
    {
      label: "Active Employees",
      value: activeEmployees.length.toString(),
      detail:
        "Sales Manager, Marketing Manager, Lead Researcher, Operations Manager, Customer Success Manager, and Voice Representative are operational.",
    },
    {
      label: "Tasks Awaiting Approval",
      value: "0",
      detail: "All AI output requires human review before use.",
    },
    {
      label: "Completed Tasks",
      value: "0",
      detail: "Completion is tracked after human decision and execution.",
    },
    {
      label: "Total AI Activity",
      value: activeEmployees
        .reduce((sum, employee) => sum + (employee.activityCount ?? 0), 0)
        .toString(),
      detail: "Phase 1 starts with controlled internal usage.",
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
          Phase 1 coverage: {activeEmployees.length} active employees,{" "}
          {comingSoonEmployees.length} planned employees.
        </p>
      </div>
    </main>
  );
}
