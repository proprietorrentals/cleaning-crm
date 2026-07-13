"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { useI18n } from "@/components/i18n-provider";
import { useLocaleFormat } from "@/lib/i18n/format";

type EmployeeProfile = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  role: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  assigned_employee_id: string;
  job_id: string | null;
  due_at: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  completion_photo_required: boolean;
  completion_photo_url: string | null;
  employee_notes: string | null;
  completed_at: string | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  task_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

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

export default function EmployeeTasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useI18n();
  const { formatDate } = useLocaleFormat();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<NotificationRow[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewByTaskId, setPhotoPreviewByTaskId] = useState<Record<string, string>>({});

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
      router.replace("/employee-login");
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id,tenant_id,first_name,last_name,role,is_active")
      .eq("auth_user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (employeeError || !employee?.tenant_id) {
      setError(employeeError?.message || "Employee access is not available.");
      setLoading(false);
      return;
    }

    const employeeProfile: EmployeeProfile = {
      id: employee.id,
      tenant_id: employee.tenant_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      role: employee.role,
    };

    setProfile(employeeProfile);

    const [{ data: taskRows, error: tasksError }, { data: notificationsRows, error: notificationsError }] =
      await Promise.all([
        supabase
          .from("tasks")
          .select(
            "id,title,description,assigned_employee_id,job_id,due_at,priority,status,completion_photo_required,completion_photo_url,employee_notes,completed_at,created_at",
          )
          .eq("assigned_employee_id", employeeProfile.id)
          .order("due_at", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("task_notifications")
          .select("id,task_id,message,is_read,created_at")
          .eq("recipient_employee_id", employeeProfile.id)
          .eq("notification_type", "task_assigned")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

    if (tasksError) {
      setError(tasksError.message);
      setLoading(false);
      return;
    }

    if (notificationsError) {
      setError(notificationsError.message);
      setLoading(false);
      return;
    }

    const loadedTasks = (taskRows ?? []) as TaskRow[];
    setTasks(loadedTasks);
    setTaskNotifications((notificationsRows ?? []) as NotificationRow[]);

    if (!selectedTaskId && loadedTasks.length > 0) {
      setSelectedTaskId(loadedTasks[0].id);
      setEmployeeNotes(loadedTasks[0].employee_notes ?? "");
    }

    const nextPreviewMap: Record<string, string> = {};
    for (const task of loadedTasks) {
      if (!task.completion_photo_url) continue;

      if (task.completion_photo_url.startsWith("http")) {
        nextPreviewMap[task.id] = task.completion_photo_url;
        continue;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from("task-files")
        .createSignedUrl(task.completion_photo_url, 60 * 30);

      if (!signedError && signedData?.signedUrl) {
        nextPreviewMap[task.id] = signedData.signedUrl;
      }
    }

    setPhotoPreviewByTaskId(nextPreviewMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (!selectedTask) return;
    setEmployeeNotes(selectedTask.employee_notes ?? "");
    setPhotoFile(null);
  }, [selectedTask?.id]);

  const markNotificationRead = async (notificationId: string) => {
    const { error: updateError } = await supabase
      .from("task_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTaskNotifications((current) => current.filter((item) => item.id !== notificationId));
  };

  const uploadCompletionPhoto = async (task: TaskRow) => {
    if (!profile) return null;
    if (!photoFile) return task.completion_photo_url;

    const cleanedName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.tenant_id}/${task.id}/${Date.now()}-${cleanedName}`;

    setUploading(true);

    const { error: uploadError } = await supabase.storage.from("task-files").upload(path, photoFile, {
      upsert: false,
      contentType: photoFile.type || "application/octet-stream",
    });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return null;
    }

    const { data: signedData } = await supabase.storage.from("task-files").createSignedUrl(path, 60 * 30);
    if (signedData?.signedUrl) {
      setPhotoPreviewByTaskId((current) => ({ ...current, [task.id]: signedData.signedUrl }));
    }

    setUploading(false);
    return path;
  };

  const saveTaskUpdate = async (nextStatus: TaskRow["status"]) => {
    if (!selectedTask) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const photoPath = await uploadCompletionPhoto(selectedTask);
    if (photoPath === null && photoFile) {
      setSaving(false);
      return;
    }

    const needsPhoto = selectedTask.completion_photo_required;
    const effectivePhoto = photoPath || selectedTask.completion_photo_url;

    if (nextStatus === "completed" && needsPhoto && !effectivePhoto) {
      setError(t("tasks.completionPhotoRequired"));
      setSaving(false);
      return;
    }

    const payload: Partial<TaskRow> = {
      status: nextStatus,
      employee_notes: employeeNotes.trim() || null,
      completion_photo_url: effectivePhoto ?? null,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabase.from("tasks").update(payload).eq("id", selectedTask.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(t("tasks.updated"));
    await loadData();
    setSaving(false);
  };

  const now = Date.now();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 pb-8 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <ServiceOSLogo variant="horizontal" size="compact-sidebar" subtitle="Employee Portal" />
              <h1 className="mt-4 text-2xl font-semibold text-slate-900">{t("tasks.titleEmployee")}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Track your assignments, update progress, and complete tasks from the field.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/employee-portal"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/employee-portal/operations-center"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Operations Center
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("tasks.assigned")}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {tasks.filter((task) => task.status === "assigned").length}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("tasks.urgent")}</p>
            <p className="mt-2 text-3xl font-semibold text-rose-700">
              {tasks.filter((task) => task.priority === "urgent" && task.status !== "completed").length}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("tasks.overdue")}</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">
              {
                tasks.filter(
                  (task) =>
                    task.due_at &&
                    new Date(task.due_at).getTime() < now &&
                    task.status !== "completed" &&
                    task.status !== "cancelled",
                ).length
              }
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t("tasks.notifications")}</h2>
            <span className="text-xs text-slate-500">{taskNotifications.length} unread</span>
          </div>

          <div className="mt-3 space-y-2">
            {taskNotifications.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("tasks.noUnreadNotifications")}</p>
            ) : (
              taskNotifications.map((notification) => (
                <div key={notification.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{notification.message}</p>
                    <p className="text-xs text-slate-500">{formatDate(notification.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markNotificationRead(notification.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t("common.save")}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t("tasks.taskList")}</h2>
              <span className="text-xs text-slate-500">{tasks.length} total</span>
            </div>

            <div className="mt-3 space-y-3">
              {loading ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("tasks.loadingEmployee")}</p>
              ) : tasks.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("tasks.assigned")}: 0</p>
              ) : (
                tasks.map((task) => {
                  const overdue =
                    Boolean(task.due_at) &&
                    new Date(task.due_at as string).getTime() < now &&
                    task.status !== "completed" &&
                    task.status !== "cancelled";

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selectedTaskId === task.id
                          ? "border-blue-400 bg-blue-50"
                          : overdue
                            ? "border-rose-300 bg-rose-50/30 hover:bg-rose-50"
                            : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{task.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(task.priority)}`}>
                          {priorityLabel(task.priority, t)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(task.status)}`}>
                          {statusLabel(task.status, t)}
                        </span>
                        {overdue ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">{t("tasks.overdue")}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{task.description}</p>
                      <p className="mt-1 text-xs text-slate-500">Due: {task.due_at ? formatDate(task.due_at, { dateStyle: "medium", timeStyle: "short" }) : t("tasks.noDueDate")}</p>
                    </button>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedTask ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">{t("tasks.taskList")}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(selectedTask.priority)}`}>
                      {priorityLabel(selectedTask.priority, t)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(selectedTask.status)}`}>
                      {statusLabel(selectedTask.status, t)}
                    </span>
                    {selectedTask.completion_photo_required ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{t("tasks.photoRequired")}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedTask.description}</p>
                  <p className="mt-2 text-xs text-slate-500">Due: {selectedTask.due_at ? formatDate(selectedTask.due_at, { dateStyle: "medium", timeStyle: "short" }) : t("tasks.noDueDate")}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Employee notes</label>
                  <textarea
                    value={employeeNotes}
                    onChange={(event) => setEmployeeNotes(event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Add your progress or completion notes"
                    disabled={saving || uploading || selectedTask.status === "cancelled"}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Completion photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    disabled={saving || uploading || selectedTask.status === "cancelled"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                  {photoPreviewByTaskId[selectedTask.id] ? (
                    <a
                      href={photoPreviewByTaskId[selectedTask.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View uploaded completion photo
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => saveTaskUpdate("in_progress")}
                    disabled={saving || uploading || selectedTask.status === "cancelled" || selectedTask.status === "completed"}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("tasks.inProgress")}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveTaskUpdate("completed")}
                    disabled={saving || uploading || selectedTask.status === "cancelled"}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("tasks.completed")}
                  </button>
                </div>
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
