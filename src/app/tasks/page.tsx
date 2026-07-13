"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { useI18n } from "@/components/i18n-provider";
import { useLocaleFormat } from "@/lib/i18n/format";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  assigned_employee_id: string;
  job_id: string | null;
  created_by: string;
  due_at: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  completion_photo_required: boolean;
  completion_photo_url: string | null;
  employee_notes: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

type EmployeeRow = {
  id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  role: string;
};

type JobRow = {
  id: string;
  customer_id: string;
  status: string;
  scheduled_date: string;
};

type CustomerRow = {
  id: string;
  company_name: string;
};

type NotificationRow = {
  id: string;
  task_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type: "task_assigned" | "task_completed";
};

type ContextState = {
  userId: string;
  tenantId: string;
  employeeId: string | null;
  canManage: boolean;
  roleLabel: string;
};

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Customers", href: "/customers" },
  { label: "Quotes", href: "/quotes" },
  { label: "Jobs", href: "/jobs" },
  { label: "Employees", href: "/employees" },
  { label: "Invoices", href: "/invoices" },
  { label: "Schedule", href: "/schedule" },
  { label: "Website Builder", href: "/website-builder" },
  { label: "Operations Center", href: "/operations-center" },
  { label: "Tasks", href: "/tasks", active: true },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

function isSupervisorRole(role: string | null | undefined) {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}

function priorityBadge(priority: TaskRow["priority"]) {
  if (priority === "urgent") return "bg-rose-100 text-rose-700";
  if (priority === "high") return "bg-amber-100 text-amber-700";
  if (priority === "low") return "bg-cyan-100 text-cyan-700";
  return "bg-slate-100 text-slate-700";
}

function statusBadge(status: TaskRow["status"]) {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-slate-200 text-slate-700";
  return "bg-violet-100 text-violet-700";
}

function statusLabel(status: TaskRow["status"], t: (key: string) => string) {
  if (status === "assigned") return t("tasks.assigned");
  if (status === "in_progress") return t("tasks.inProgress");
  if (status === "completed") return t("tasks.completed");
  return t("tasks.cancelled");
}

function priorityLabel(priority: TaskRow["priority"], t: (key: string) => string) {
  if (priority === "urgent") return t("tasks.urgent");
  if (priority === "high") return t("tasks.high");
  if (priority === "low") return t("tasks.low");
  return t("announcements.normal");
}

function navLabel(label: string, t: (key: string) => string) {
  if (label === "Dashboard") return t("common.dashboard");
  if (label === "Customers") return t("nav.customers");
  if (label === "Quotes") return t("nav.quotes");
  if (label === "Jobs") return t("nav.jobs");
  if (label === "Employees") return t("nav.employees");
  if (label === "Invoices") return t("nav.invoices");
  if (label === "Schedule") return t("nav.schedule");
  if (label === "Website Builder") return t("nav.websiteBuilder");
  if (label === "Operations Center") return t("nav.operationsCenter");
  if (label === "Tasks") return t("nav.tasks");
  if (label === "Reports") return t("nav.reports");
  if (label === "Settings") return t("common.settings");
  return label;
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function messagePriorityFromTask(priority: TaskRow["priority"]) {
  if (priority === "urgent") return "urgent";
  if (priority === "high") return "important";
  return "normal";
}

export default function AdminTasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useI18n();
  const { formatDate } = useLocaleFormat();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [context, setContext] = useState<ContextState | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, string>>({});
  const [creatorLabelByUserId, setCreatorLabelByUserId] = useState<Record<string, string>>({});
  const [adminNotifications, setAdminNotifications] = useState<NotificationRow[]>([]);

  const [reassignByTaskId, setReassignByTaskId] = useState<Record<string, string>>({});
  const [statusByTaskId, setStatusByTaskId] = useState<Record<string, TaskRow["status"]>>({});

  const [filters, setFilters] = useState({
    employeeId: "",
    status: "",
    priority: "",
    dueDate: "",
    jobId: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_employee_id: "",
    job_id: "",
    due_at: "",
    priority: "normal" as TaskRow["priority"],
    status: "assigned" as TaskRow["status"],
    completion_photo_required: false,
    notes: "",
    post_to_job_conversation: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    if (!session?.user?.id) {
      router.replace("/admin-login");
      return;
    }

    const userId = session.user.id;

    const [{ data: adminRow, error: adminError }, { data: employeeRow, error: employeeError }] = await Promise.all([
      supabase.from("tenant_admins").select("tenant_id").eq("auth_user_id", userId).maybeSingle(),
      supabase
        .from("employees")
        .select("id,tenant_id,role,is_active")
        .eq("auth_user_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (adminError) {
      setError(adminError.message);
      setLoading(false);
      return;
    }

    if (employeeError) {
      setError(employeeError.message);
      setLoading(false);
      return;
    }

    const tenantId = adminRow?.tenant_id ?? employeeRow?.tenant_id ?? null;
    const canManage = Boolean(adminRow) || isSupervisorRole(employeeRow?.role);
    if (!tenantId || !canManage) {
      setError(t("tasks.accessDenied"));
      setLoading(false);
      return;
    }

    const roleLabel = adminRow ? "Tenant Admin" : employeeRow?.role ?? "Supervisor";
    const ctx = {
      userId,
      tenantId,
      employeeId: employeeRow?.id ?? null,
      canManage,
      roleLabel,
    };

    setContext(ctx);

    const [
      tasksResp,
      employeesResp,
      jobsResp,
      customersResp,
      adminRowsResp,
      employeesForCreatorResp,
      notificationsResp,
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id,title,description,assigned_employee_id,job_id,created_by,due_at,priority,status,completion_photo_required,completion_photo_url,employee_notes,notes,completed_at,created_at",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("employees")
        .select("id,auth_user_id,first_name,last_name,role")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
      supabase
        .from("jobs")
        .select("id,customer_id,status,scheduled_date")
        .eq("tenant_id", tenantId)
        .order("scheduled_date", { ascending: false })
        .limit(200),
      supabase.from("customers").select("id,company_name").eq("tenant_id", tenantId),
      supabase.from("tenant_admins").select("auth_user_id,email").eq("tenant_id", tenantId),
      supabase
        .from("employees")
        .select("auth_user_id,first_name,last_name,role")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("task_notifications")
        .select("id,task_id,message,is_read,created_at,notification_type")
        .eq("tenant_id", tenantId)
        .eq("notification_type", "task_completed")
        .eq("recipient_user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const firstError =
      tasksResp.error ||
      employeesResp.error ||
      jobsResp.error ||
      customersResp.error ||
      adminRowsResp.error ||
      employeesForCreatorResp.error ||
      notificationsResp.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const loadedTasks = (tasksResp.data ?? []) as TaskRow[];
    const loadedEmployees = (employeesResp.data ?? []) as EmployeeRow[];
    const loadedJobs = (jobsResp.data ?? []) as JobRow[];
    const loadedNotifications = (notificationsResp.data ?? []) as NotificationRow[];

    setTasks(loadedTasks);
    setEmployees(loadedEmployees);
    setJobs(loadedJobs);
    setAdminNotifications(loadedNotifications);

    setStatusByTaskId(
      loadedTasks.reduce<Record<string, TaskRow["status"]>>((acc, task) => {
        acc[task.id] = task.status;
        return acc;
      }, {}),
    );

    const customerMap = (customersResp.data ?? []).reduce<Record<string, string>>((acc, customer) => {
      acc[customer.id] = customer.company_name;
      return acc;
    }, {});
    setCustomersById(customerMap);

    const creators: Record<string, string> = {};
    for (const admin of adminRowsResp.data ?? []) {
      creators[admin.auth_user_id] = admin.email;
    }
    for (const employee of employeesForCreatorResp.data ?? []) {
      if (employee.auth_user_id) {
        creators[employee.auth_user_id] = `${employee.first_name} ${employee.last_name} (${employee.role})`;
      }
    }
    setCreatorLabelByUserId(creators);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.employeeId && task.assigned_employee_id !== filters.employeeId) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.jobId && (task.job_id ?? "") !== filters.jobId) return false;
      if (filters.dueDate) {
        if (!task.due_at) return false;
        const dueDate = new Date(task.due_at).toISOString().slice(0, 10);
        if (dueDate !== filters.dueDate) return false;
      }
      return true;
    });
  }, [filters, tasks]);

  const employeeLabelById = useMemo(
    () =>
      employees.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = `${employee.first_name} ${employee.last_name}`;
        return acc;
      }, {}),
    [employees],
  );

  const jobLabelById = useMemo(
    () =>
      jobs.reduce<Record<string, string>>((acc, job) => {
        const customer = customersById[job.customer_id] ?? "Customer";
        acc[job.id] = `${customer} · ${job.scheduled_date}`;
        return acc;
      }, {}),
    [customersById, jobs],
  );

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!context) return;
    if (!form.assigned_employee_id) {
      setError(t("tasks.assignedEmployeeRequired"));
      return;
    }

    setSubmitting(true);

    const dueAtIso = fromDatetimeLocalValue(form.due_at);
    const { data: insertedTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        tenant_id: context.tenantId,
        title: form.title.trim(),
        description: form.description.trim(),
        assigned_employee_id: form.assigned_employee_id,
        job_id: form.job_id || null,
        created_by: context.userId,
        due_at: dueAtIso,
        priority: form.priority,
        status: form.status,
        completion_photo_required: form.completion_photo_required,
        notes: form.notes.trim() || null,
      })
      .select("id,title,due_at,job_id,assigned_employee_id,priority")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    if (form.post_to_job_conversation && insertedTask?.job_id) {
      const { data: threadRow, error: threadError } = await supabase
        .from("message_threads")
        .select("id")
        .eq("tenant_id", context.tenantId)
        .eq("thread_type", "job")
        .eq("job_id", insertedTask.job_id)
        .maybeSingle();

      if (threadError) {
        setError(threadError.message);
      } else if (threadRow?.id) {
        const dueLine = insertedTask.due_at ? ` due ${new Date(insertedTask.due_at).toLocaleString()}` : "";
        const assigneeLabel = employeeLabelById[insertedTask.assigned_employee_id] ?? "assigned employee";

        const { error: messageError } = await supabase.from("messages").insert({
          tenant_id: context.tenantId,
          thread_id: threadRow.id,
          sender_user_id: context.userId,
          sender_employee_id: context.employeeId,
          body: `Task assigned: ${insertedTask.title} to ${assigneeLabel}${dueLine}.`,
          priority: messagePriorityFromTask(insertedTask.priority),
        });

        if (messageError) {
          setError(messageError.message);
        }
      }
    }

    setForm({
      title: "",
      description: "",
      assigned_employee_id: "",
      job_id: "",
      due_at: "",
      priority: "normal",
      status: "assigned",
      completion_photo_required: false,
      notes: "",
      post_to_job_conversation: true,
    });

    setSuccess("Task created.");
    await loadData();
    setSubmitting(false);
  };

  const handleReassign = async (taskId: string) => {
    const assignedEmployeeId = reassignByTaskId[taskId];
    if (!assignedEmployeeId) {
      setError("Select an employee for reassignment.");
      return;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ assigned_employee_id: assignedEmployeeId, status: "assigned" })
      .eq("id", taskId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(t("tasks.reassigned"));
    await loadData();
  };

  const handleStatusUpdate = async (taskId: string) => {
    const status = statusByTaskId[taskId];
    if (!status) return;

    const { error: updateError } = await supabase.from("tasks").update({ status }).eq("id", taskId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(t("tasks.statusUpdated"));
    await loadData();
  };

  const handleCancelTask = async (taskId: string) => {
    const { error: updateError } = await supabase.from("tasks").update({ status: "cancelled" }).eq("id", taskId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(t("tasks.taskCancelled"));
    await loadData();
  };

  const markNotificationRead = async (notificationId: string) => {
    const { error: updateError } = await supabase
      .from("task_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setAdminNotifications((current) => current.filter((item) => item.id !== notificationId));
  };

  const now = Date.now();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <ServiceOSLogo variant="horizontal" size="compact-sidebar" />
          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {navLabel(item.label, t)}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-medium text-blue-600">{t("portals.admin")}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{t("tasks.titleAdmin")}</h1>
            <p className="mt-1 text-sm text-slate-500">Assign, track, and close operational tasks across your team.</p>
            {context ? <p className="mt-2 text-xs text-slate-500">Signed in as: {context.roleLabel}</p> : null}
          </header>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">{t("tasks.loadingAdmin")}</p>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Completed Task Notifications</h2>
                  <span className="text-xs text-slate-500">{adminNotifications.length} unread</span>
                </div>

                <div className="mt-3 space-y-2">
                  {adminNotifications.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("tasks.noUnreadCompletionAlerts")}</p>
                  ) : (
                    adminNotifications.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.message}</p>
                          <p className="text-xs text-slate-500">{formatDate(item.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => markNotificationRead(item.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Mark read
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{t("tasks.createTask")}</h2>

                <form className="mt-4 space-y-4" onSubmit={handleCreateTask}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.titleLabel")}</label>
                      <input
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        placeholder="Task title"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.assignedEmployee")}</label>
                      <select
                        value={form.assigned_employee_id}
                        onChange={(event) => setForm((current) => ({ ...current, assigned_employee_id: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        required
                        disabled={submitting}
                      >
                        <option value="">Select employee</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name} ({employee.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.descriptionLabel")}</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      placeholder="Task details"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.relatedJobOptional")}</label>
                      <select
                        value={form.job_id}
                        onChange={(event) => setForm((current) => ({ ...current, job_id: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        disabled={submitting}
                      >
                        <option value="">None</option>
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {jobLabelById[job.id] ?? job.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.dueDateTime")}</label>
                      <input
                        type="datetime-local"
                        value={form.due_at}
                        onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.priorityLabel")}</label>
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, priority: event.target.value as TaskRow["priority"] }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        disabled={submitting}
                      >
                        <option value="low">{t("tasks.low")}</option>
                        <option value="normal">{t("announcements.normal")}</option>
                        <option value="high">{t("tasks.high")}</option>
                        <option value="urgent">{t("tasks.urgent")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.statusLabel")}</label>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, status: event.target.value as TaskRow["status"] }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        disabled={submitting}
                      >
                        <option value="assigned">{t("tasks.assigned")}</option>
                        <option value="in_progress">{t("tasks.inProgress")}</option>
                        <option value="completed">{t("tasks.completed")}</option>
                        <option value="cancelled">{t("tasks.cancelled")}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("tasks.internalNotes")}</label>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      placeholder="Optional notes for managers"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.completion_photo_required}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, completion_photo_required: event.target.checked }))
                        }
                        disabled={submitting}
                      />
                      {t("tasks.photoRequired")}
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.post_to_job_conversation}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, post_to_job_conversation: event.target.checked }))
                        }
                        disabled={submitting || !form.job_id}
                      />
                      Post assignment update to related job conversation
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? t("tasks.createTaskLoading") : t("tasks.createTask")}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{t("tasks.filters")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <select
                    value={filters.employeeId}
                    onChange={(event) => setFilters((current) => ({ ...current, employeeId: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">{t("tasks.allEmployees")}</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">{t("tasks.allStatuses")}</option>
                    <option value="assigned">{t("tasks.assigned")}</option>
                    <option value="in_progress">{t("tasks.inProgress")}</option>
                    <option value="completed">{t("tasks.completed")}</option>
                    <option value="cancelled">{t("tasks.cancelled")}</option>
                  </select>

                  <select
                    value={filters.priority}
                    onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">{t("tasks.allPriorities")}</option>
                    <option value="low">{t("tasks.low")}</option>
                    <option value="normal">{t("announcements.normal")}</option>
                    <option value="high">{t("tasks.high")}</option>
                    <option value="urgent">{t("tasks.urgent")}</option>
                  </select>

                  <input
                    type="date"
                    value={filters.dueDate}
                    onChange={(event) => setFilters((current) => ({ ...current, dueDate: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />

                  <select
                    value={filters.jobId}
                    onChange={(event) => setFilters((current) => ({ ...current, jobId: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">{t("tasks.allJobs")}</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {jobLabelById[job.id] ?? job.id}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{t("tasks.taskList")}</h2>
                  <span className="text-xs text-slate-500">{filteredTasks.length} tasks</span>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredTasks.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("tasks.noTasksMatchFilters")}</p>
                  ) : (
                    filteredTasks.map((task) => {
                      const overdue =
                        Boolean(task.due_at) &&
                        new Date(task.due_at as string).getTime() < now &&
                        task.status !== "completed" &&
                        task.status !== "cancelled";

                      return (
                        <article
                          key={task.id}
                          className={`rounded-2xl border p-4 ${
                            overdue ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{task.title}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(task.priority)}`}>
                              {priorityLabel(task.priority, t)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(task.status)}`}>
                              {statusLabel(task.status, t)}
                            </span>
                            {overdue ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">{t("tasks.overdue")}</span>
                            ) : null}
                            {task.completion_photo_required ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{t("tasks.photoRequired")}</span>
                            ) : null}
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>

                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                            <p>Assigned: {employeeLabelById[task.assigned_employee_id] ?? task.assigned_employee_id}</p>
                            <p>Due: {task.due_at ? formatDate(task.due_at, { dateStyle: "medium", timeStyle: "short" }) : t("tasks.noDueDate")}</p>
                            <p>Related job: {task.job_id ? jobLabelById[task.job_id] ?? task.job_id : t("tasks.none")}</p>
                            <p>Created: {formatDate(task.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                            <p>Created by: {creatorLabelByUserId[task.created_by] ?? task.created_by}</p>
                            <p>Completed at: {task.completed_at ? formatDate(task.completed_at, { dateStyle: "medium", timeStyle: "short" }) : t("jobs.pending")}</p>
                          </div>

                          {task.notes ? <p className="mt-2 text-xs text-slate-600">Manager notes: {task.notes}</p> : null}
                          {task.employee_notes ? <p className="mt-1 text-xs text-slate-600">Employee notes: {task.employee_notes}</p> : null}

                          <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 lg:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">{t("tasks.reassign")}</label>
                              <div className="flex gap-2">
                                <select
                                  value={reassignByTaskId[task.id] ?? ""}
                                  onChange={(event) =>
                                    setReassignByTaskId((current) => ({ ...current, [task.id]: event.target.value }))
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                                >
                                  <option value="">{t("tasks.assignedEmployee")}</option>
                                  {employees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                      {employee.first_name} {employee.last_name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleReassign(task.id)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  {t("tasks.apply")}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">{t("tasks.updateStatus")}</label>
                              <div className="flex gap-2">
                                <select
                                  value={statusByTaskId[task.id] ?? task.status}
                                  onChange={(event) =>
                                    setStatusByTaskId((current) => ({
                                      ...current,
                                      [task.id]: event.target.value as TaskRow["status"],
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                                >
                                  <option value="assigned">{t("tasks.assigned")}</option>
                                  <option value="in_progress">{t("tasks.inProgress")}</option>
                                  <option value="completed">{t("tasks.completed")}</option>
                                  <option value="cancelled">{t("tasks.cancelled")}</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleStatusUpdate(task.id)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  {t("tasks.saveStatus")}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => handleCancelTask(task.id)}
                                disabled={task.status === "cancelled"}
                                className="w-full rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {t("tasks.cancelTask")}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
