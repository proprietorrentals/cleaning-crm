"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";

type EmployeeProfile = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
};

type Job = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  status: string;
};

type Customer = {
  id: string;
  company_name: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  requires_ack: boolean;
  created_at: string;
};

type AnnouncementRead = {
  announcement_id: string;
  read_at: string;
  acknowledged_at: string | null;
};

type MessageThread = {
  id: string;
  title: string;
  thread_type: "job" | "channel";
  job_id: string | null;
  channel_key: string | null;
  channel_scope: string;
  updated_at: string;
  last_message_at: string | null;
};

type Message = {
  id: string;
  thread_id: string;
  sender_employee_id: string | null;
  body: string;
  priority: "normal" | "important" | "urgent";
  attachment_url: string | null;
  attachment_type: "photo" | "file" | null;
  attachment_name: string | null;
  created_at: string;
};

type MessageRead = {
  message_id: string;
  read_at: string;
  acknowledged_at: string | null;
};

type MileageRequest = {
  id: string;
  status: string;
  reviewed_at: string | null;
};

const CHANNEL_DEFINITIONS = [
  { key: "supervisors", title: "Supervisors", scope: "supervisors" },
  { key: "night_shift", title: "Night Shift", scope: "night_shift" },
  { key: "day_shift", title: "Day Shift", scope: "day_shift" },
  { key: "route_teams", title: "Route Teams", scope: "route_teams" },
] as const;

function formatWhen(value: string) {
  return new Date(value).toLocaleString();
}

function priorityChip(priority: "normal" | "important" | "urgent") {
  if (priority === "urgent") return "bg-rose-100 text-rose-700";
  if (priority === "important") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function isSupervisor(role: string) {
  const normalized = role.toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}

export default function OperationsCenterPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, Customer>>({});

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementReads, setAnnouncementReads] = useState<Record<string, AnnouncementRead>>({});

  const [channelThreads, setChannelThreads] = useState<MessageThread[]>([]);
  const [jobThreads, setJobThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageReads, setMessageReads] = useState<Record<string, MessageRead>>({});

  const [notificationCounts, setNotificationCounts] = useState({
    announcements: 0,
    jobMessages: 0,
    assignmentUpdates: 0,
    mileageApprovals: 0,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    body: "",
    priority: "normal" as "normal" | "important" | "urgent",
    requiresAck: false,
  });

  const [threadMode, setThreadMode] = useState<"channel" | "job">("channel");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [messageForm, setMessageForm] = useState({
    body: "",
    priority: "normal" as "normal" | "important" | "urgent",
    attachmentFile: null as File | null,
  });

  const [submitting, setSubmitting] = useState(false);

  const canManage = profile ? isSupervisor(profile.role) : false;

  const selectedThread = [...channelThreads, ...jobThreads].find((thread) => thread.id === selectedThreadId) ?? null;

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setError("Please sign in as an employee to use Operations Center.");
      setLoading(false);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id,tenant_id,first_name,last_name,role,department,is_active")
      .eq("auth_user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (employeeError || !employee?.tenant_id) {
      setError(employeeError?.message || "Employee access not available.");
      setLoading(false);
      return;
    }

    const employeeProfile: EmployeeProfile = {
      id: employee.id,
      tenant_id: employee.tenant_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      role: employee.role,
      department: employee.department,
    };

    setProfile(employeeProfile);

    if (isSupervisor(employeeProfile.role)) {
      const { data: existingChannels } = await supabase
        .from("message_threads")
        .select("id,channel_key")
        .eq("tenant_id", employeeProfile.tenant_id)
        .eq("thread_type", "channel");

      const existingKeys = new Set((existingChannels ?? []).map((thread) => thread.channel_key));
      const missing = CHANNEL_DEFINITIONS.filter((channel) => !existingKeys.has(channel.key));

      if (missing.length > 0) {
        await supabase.from("message_threads").insert(
          missing.map((channel) => ({
            tenant_id: employeeProfile.tenant_id,
            thread_type: "channel",
            title: channel.title,
            channel_key: channel.key,
            channel_scope: channel.scope,
          })),
        );
      }
    }

    const [jobsResp, channelsResp, announcementsResp, mileageResp] = await Promise.all([
      supabase
        .from("jobs")
        .select("id,customer_id,scheduled_date,status")
        .eq("assigned_employee_id", employeeProfile.id)
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("message_threads")
        .select("id,title,thread_type,job_id,channel_key,channel_scope,updated_at,last_message_at")
        .eq("thread_type", "channel")
        .order("title", { ascending: true }),
      supabase
        .from("announcements")
        .select("id,title,body,priority,requires_ack,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("mileage_requests")
        .select("id,status,reviewed_at")
        .eq("employee_id", employeeProfile.id)
        .neq("status", "pending")
        .order("reviewed_at", { ascending: false })
        .limit(20),
    ]);

    if (jobsResp.error || channelsResp.error || announcementsResp.error || mileageResp.error) {
      setError(
        jobsResp.error?.message ||
          channelsResp.error?.message ||
          announcementsResp.error?.message ||
          mileageResp.error?.message ||
          "Failed to load Operations Center data.",
      );
      setLoading(false);
      return;
    }

    const assignedJobs = (jobsResp.data ?? []) as Job[];
    setJobs(assignedJobs);

    const customerIds = [...new Set(assignedJobs.map((job) => job.customer_id))];
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id,company_name")
        .in("id", customerIds);

      const mapped = (customers ?? []).reduce<Record<string, Customer>>((acc, customer) => {
        acc[customer.id] = customer;
        return acc;
      }, {});
      setCustomersById(mapped);
    } else {
      setCustomersById({});
    }

    const channelList = (channelsResp.data ?? []) as MessageThread[];
    setChannelThreads(channelList);

    const jobThreadIds = [...new Set((assignedJobs ?? []).map((job) => job.id))];
    if (jobThreadIds.length > 0) {
      const { data: jobThreadData } = await supabase
        .from("message_threads")
        .select("id,title,thread_type,job_id,channel_key,channel_scope,updated_at,last_message_at")
        .eq("thread_type", "job")
        .in("job_id", jobThreadIds)
        .order("updated_at", { ascending: false });

      setJobThreads((jobThreadData ?? []) as MessageThread[]);
    } else {
      setJobThreads([]);
    }

    const loadedAnnouncements = (announcementsResp.data ?? []) as Announcement[];
    setAnnouncements(loadedAnnouncements);

    const announcementIds = loadedAnnouncements.map((announcement) => announcement.id);
    if (announcementIds.length > 0) {
      const { data: announcementReadRows } = await supabase
        .from("announcement_reads")
        .select("announcement_id,read_at,acknowledged_at")
        .eq("employee_id", employeeProfile.id)
        .in("announcement_id", announcementIds);

      const readsMap = (announcementReadRows ?? []).reduce<Record<string, AnnouncementRead>>((acc, item) => {
        acc[item.announcement_id] = item;
        return acc;
      }, {});
      setAnnouncementReads(readsMap);
      setNotificationCounts((current) => ({
        ...current,
        announcements: loadedAnnouncements.filter((announcement) => !readsMap[announcement.id]).length,
      }));
    } else {
      setAnnouncementReads({});
      setNotificationCounts((current) => ({ ...current, announcements: 0 }));
    }

    const reviewedMileage = (mileageResp.data ?? []) as MileageRequest[];
    setNotificationCounts((current) => ({
      ...current,
      mileageApprovals: reviewedMileage.length,
      assignmentUpdates: assignedJobs.filter((job) => job.status === "Scheduled" || job.status === "In Progress").length,
    }));

    if (!selectedThreadId) {
      const firstChannel = channelList[0]?.id;
      if (firstChannel) {
        setSelectedThreadId(firstChannel);
      }
    }

    setLoading(false);
  };

  const loadThreadMessages = async (threadId: string, employeeId: string) => {
    const { data: messageRows, error: messagesError } = await supabase
      .from("messages")
      .select("id,thread_id,sender_employee_id,body,priority,attachment_url,attachment_type,attachment_name,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (messagesError) {
      setError(messagesError.message);
      return;
    }

    const loadedMessages = (messageRows ?? []) as Message[];
    setMessages(loadedMessages);

    if (loadedMessages.length === 0) {
      setMessageReads({});
      setNotificationCounts((current) => ({ ...current, jobMessages: 0 }));
      return;
    }

    const ids = loadedMessages.map((message) => message.id);
    const { data: readRows } = await supabase
      .from("message_reads")
      .select("message_id,read_at,acknowledged_at")
      .eq("employee_id", employeeId)
      .in("message_id", ids);

    const readsMap = (readRows ?? []).reduce<Record<string, MessageRead>>((acc, row) => {
      acc[row.message_id] = row;
      return acc;
    }, {});

    setMessageReads(readsMap);

    const unreadMessages = loadedMessages.filter((message) => !readsMap[message.id] && message.sender_employee_id !== employeeId);

    if (unreadMessages.length > 0) {
      await supabase.from("message_reads").upsert(
        unreadMessages.map((message) => ({
          tenant_id: profile?.tenant_id,
          message_id: message.id,
          employee_id: employeeId,
          read_at: new Date().toISOString(),
        })),
        { onConflict: "message_id,employee_id" },
      );
    }

    setNotificationCounts((current) => ({
      ...current,
      jobMessages: loadedMessages.filter((message) => !readsMap[message.id]).length,
    }));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile || !selectedThreadId) return;
    loadThreadMessages(selectedThreadId, profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, selectedThreadId]);

  const markAnnouncementRead = async (announcement: Announcement, acknowledge: boolean) => {
    if (!profile) return;

    const nowIso = new Date().toISOString();
    const payload = {
      tenant_id: profile.tenant_id,
      announcement_id: announcement.id,
      employee_id: profile.id,
      read_at: nowIso,
      acknowledged_at: acknowledge ? nowIso : null,
    };

    const { error: readError } = await supabase
      .from("announcement_reads")
      .upsert(payload, { onConflict: "announcement_id,employee_id" });

    if (readError) {
      setError(readError.message);
      return;
    }

    setAnnouncementReads((current) => ({
      ...current,
      [announcement.id]: {
        announcement_id: announcement.id,
        read_at: nowIso,
        acknowledged_at: acknowledge ? nowIso : current[announcement.id]?.acknowledged_at ?? null,
      },
    }));
  };

  const createAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !canManage || !announcementForm.title.trim() || !announcementForm.body.trim()) return;

    setSubmitting(true);
    const { error: insertError } = await supabase.from("announcements").insert({
      tenant_id: profile.tenant_id,
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      priority: announcementForm.priority,
      requires_ack: announcementForm.requiresAck || announcementForm.priority === "urgent",
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setAnnouncementForm({ title: "", body: "", priority: "normal", requiresAck: false });
    await loadAll();
    setSubmitting(false);
  };

  const ensureJobThread = async (jobId: string) => {
    if (!profile) return null;

    const existing = jobThreads.find((thread) => thread.job_id === jobId);
    if (existing) {
      return existing.id;
    }

    const job = jobs.find((entry) => entry.id === jobId);
    const customerName = job ? customersById[job.customer_id]?.company_name ?? "Customer" : "Customer";

    const { data: inserted, error: insertError } = await supabase
      .from("message_threads")
      .insert({
        tenant_id: profile.tenant_id,
        thread_type: "job",
        title: `${customerName} Job Conversation`,
        job_id: jobId,
      })
      .select("id,title,thread_type,job_id,channel_key,channel_scope,updated_at,last_message_at")
      .maybeSingle();

    if (insertError || !inserted) {
      setError(insertError?.message || "Failed to create job thread.");
      return null;
    }

    setJobThreads((current) => [inserted as MessageThread, ...current]);
    return inserted.id;
  };

  const uploadAttachment = async (threadId: string, file: File) => {
    if (!profile) return null;

    const cleanName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_.-]/g, "");
    const path = `${profile.tenant_id}/${threadId}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("operations-center-files")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("operations-center-files").getPublicUrl(path);
    return data.publicUrl;
  };

  const postMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !selectedThreadId || !messageForm.body.trim()) return;

    setSubmitting(true);

    let attachmentUrl: string | null = null;
    let attachmentType: "photo" | "file" | null = null;
    let attachmentName: string | null = null;

    if (messageForm.attachmentFile) {
      const uploaded = await uploadAttachment(selectedThreadId, messageForm.attachmentFile);
      if (!uploaded) {
        setSubmitting(false);
        return;
      }

      attachmentUrl = uploaded;
      attachmentName = messageForm.attachmentFile.name;
      attachmentType = messageForm.attachmentFile.type.startsWith("image/") ? "photo" : "file";
    }

    const { error: messageError } = await supabase.from("messages").insert({
      tenant_id: profile.tenant_id,
      thread_id: selectedThreadId,
      sender_user_id: (await supabase.auth.getUser()).data.user?.id,
      sender_employee_id: profile.id,
      body: messageForm.body.trim(),
      priority: messageForm.priority,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    });

    if (messageError) {
      setError(messageError.message);
      setSubmitting(false);
      return;
    }

    setMessageForm({ body: "", priority: "normal", attachmentFile: null });
    await loadThreadMessages(selectedThreadId, profile.id);
    await loadAll();
    setSubmitting(false);
  };

  const acknowledgeUrgentMessage = async (messageId: string) => {
    if (!profile) return;

    const nowIso = new Date().toISOString();
    const { error: ackError } = await supabase
      .from("message_reads")
      .upsert(
        {
          tenant_id: profile.tenant_id,
          message_id: messageId,
          employee_id: profile.id,
          read_at: nowIso,
          acknowledged_at: nowIso,
        },
        { onConflict: "message_id,employee_id" },
      );

    if (ackError) {
      setError(ackError.message);
      return;
    }

    setMessageReads((current) => ({
      ...current,
      [messageId]: {
        message_id: messageId,
        read_at: nowIso,
        acknowledged_at: nowIso,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading Operations Center...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 pb-8 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <ServiceOSBrand subtitle="Employee Portal" />
              <h1 className="mt-4 text-2xl font-semibold text-slate-900">Operations Center</h1>
              <p className="mt-1 text-sm text-slate-500">
                Operational communication for announcements, job conversations, and team channels.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/employee-portal"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">New announcements</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{notificationCounts.announcements}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unread messages</p>
            <p className="mt-2 text-3xl font-semibold text-blue-700">{notificationCounts.jobMessages}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assignment updates</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{notificationCounts.assignmentUpdates}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mileage approvals</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{notificationCounts.mileageApprovals}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Company Announcements</h2>
              <span className="text-xs text-slate-500">{announcements.length} posts</span>
            </div>

            {canManage ? (
              <form className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" onSubmit={createAnnouncement}>
                <input
                  value={announcementForm.title}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="Announcement title"
                  required
                />
                <textarea
                  value={announcementForm.body}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))}
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="Announcement details"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={announcementForm.priority}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        priority: event.target.value as "normal" | "important" | "urgent",
                        requiresAck: event.target.value === "urgent" ? true : current.requiresAck,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={announcementForm.requiresAck || announcementForm.priority === "urgent"}
                      disabled={announcementForm.priority === "urgent"}
                      onChange={(event) =>
                        setAnnouncementForm((current) => ({ ...current, requiresAck: event.target.checked }))
                      }
                    />
                    Require acknowledgement
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Posting..." : "Post Announcement"}
                </button>
              </form>
            ) : null}

            <div className="mt-4 space-y-3">
              {announcements.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No announcements yet.</p>
              ) : (
                announcements.map((announcement) => {
                  const read = announcementReads[announcement.id];
                  const needsAck = announcement.requires_ack || announcement.priority === "urgent";

                  return (
                    <div key={announcement.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{announcement.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityChip(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                        {needsAck ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Ack required</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{announcement.body}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatWhen(announcement.created_at)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!read ? (
                          <button
                            type="button"
                            onClick={() => markAnnouncementRead(announcement, false)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Mark as read
                          </button>
                        ) : null}
                        {needsAck && !read?.acknowledged_at ? (
                          <button
                            type="button"
                            onClick={() => markAnnouncementRead(announcement, true)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Acknowledge
                          </button>
                        ) : null}
                        {read?.acknowledged_at ? (
                          <span className="text-xs text-emerald-700">Acknowledged</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Job Conversations & Team Channels</h2>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-700">
                <button
                  type="button"
                  onClick={() => setThreadMode("channel")}
                  className={`rounded-lg px-3 py-1.5 ${threadMode === "channel" ? "bg-white text-blue-700 shadow-sm" : ""}`}
                >
                  Team Channels
                </button>
                <button
                  type="button"
                  onClick={() => setThreadMode("job")}
                  className={`rounded-lg px-3 py-1.5 ${threadMode === "job" ? "bg-white text-blue-700 shadow-sm" : ""}`}
                >
                  Job Conversations
                </button>
              </div>
            </div>

            {threadMode === "channel" ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {channelThreads.length === 0 ? (
                  <p className="col-span-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No accessible channels yet.</p>
                ) : (
                  channelThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedThreadId === thread.id
                          ? "border-blue-300 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold">{thread.title}</p>
                      <p className="text-xs text-slate-500">{thread.last_message_at ? `Updated ${formatWhen(thread.last_message_at)}` : "No messages yet"}</p>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <select
                  value={selectedJobId}
                  onChange={async (event) => {
                    const jobId = event.target.value;
                    setSelectedJobId(jobId);
                    if (!jobId) return;
                    const threadId = await ensureJobThread(jobId);
                    if (threadId) {
                      setSelectedThreadId(threadId);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">Select assigned job...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {customersById[job.customer_id]?.company_name ?? "Customer"} ({job.scheduled_date})
                    </option>
                  ))}
                </select>

                {jobThreads.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {jobThreads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selectedThreadId === thread.id
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-semibold">{thread.title}</p>
                        <p className="text-xs text-slate-500">{thread.last_message_at ? `Updated ${formatWhen(thread.last_message_at)}` : "No messages yet"}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{selectedThread?.title || "Select a channel or job conversation"}</p>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {selectedThreadId ? (
                  messages.length === 0 ? (
                    <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-500">No messages yet. Start the conversation.</p>
                  ) : (
                    messages.map((message) => {
                      const read = messageReads[message.id];
                      const urgent = message.priority === "urgent";
                      const needsAck = urgent && !read?.acknowledged_at;

                      return (
                        <div key={message.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityChip(message.priority)}`}>
                              {message.priority}
                            </span>
                            <span className="text-xs text-slate-500">{formatWhen(message.created_at)}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{message.body}</p>
                          {message.attachment_url ? (
                            <div className="mt-2">
                              {message.attachment_type === "photo" ? (
                                <a href={message.attachment_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200">
                                  <img src={message.attachment_url} alt={message.attachment_name || "Attachment"} className="h-36 w-full object-cover" />
                                </a>
                              ) : (
                                <a href={message.attachment_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                  {message.attachment_name || "Download attachment"}
                                </a>
                              )}
                            </div>
                          ) : null}
                          {needsAck ? (
                            <button
                              type="button"
                              onClick={() => acknowledgeUrgentMessage(message.id)}
                              className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Acknowledge urgent message
                            </button>
                          ) : urgent && read?.acknowledged_at ? (
                            <p className="mt-2 text-xs text-emerald-700">Urgent message acknowledged</p>
                          ) : null}
                        </div>
                      );
                    })
                  )
                ) : (
                  <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-500">Choose a thread to view messages.</p>
                )}
              </div>

              <form className="mt-4 space-y-3" onSubmit={postMessage}>
                <textarea
                  value={messageForm.body}
                  onChange={(event) => setMessageForm((current) => ({ ...current, body: event.target.value }))}
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                  placeholder="Type an operational update..."
                  required
                  disabled={!selectedThreadId}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={messageForm.priority}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        priority: event.target.value as "normal" | "important" | "urgent",
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                    disabled={!selectedThreadId}
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={(event) =>
                      setMessageForm((current) => ({ ...current, attachmentFile: event.target.files?.[0] ?? null }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    disabled={!selectedThreadId}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selectedThreadId || submitting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
