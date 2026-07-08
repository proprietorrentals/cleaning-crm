"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  hire_date: string;
  status: string;
  auth_user_id: string | null;
  is_active: boolean;
  notes: string;
  created_at: string;
};

type EmployeeFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  hire_date: string;
  status: string;
  auth_user_id: string;
  is_active: boolean;
  notes: string;
};

const emptyForm: EmployeeFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  hire_date: "",
  status: "Active",
  auth_user_id: "",
  is_active: true,
  notes: "",
};

export default function EmployeesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setEmployees(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [supabase]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return employees;
    }

    return employees.filter((employee) =>
      [employee.first_name, employee.last_name, employee.email, employee.role]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [employees, search]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role.trim(),
      department: form.department.trim(),
      hire_date: form.hire_date,
      status: form.is_active ? form.status : "Inactive",
      auth_user_id: form.auth_user_id.trim() || null,
      is_active: form.is_active,
      notes: form.notes.trim(),
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.role) {
      setMessage("First name, last name, email, and role are required.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("employees").insert(payload);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchEmployees();
    setMessage(editingId ? "Employee updated successfully." : "Employee added successfully.");
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
      hire_date: employee.hire_date,
      status: employee.status,
      auth_user_id: employee.auth_user_id ?? "",
      is_active: employee.is_active,
      notes: employee.notes,
    });
    setMessage("Editing employee record.");
  };

  const handleToggleActive = async (employee: Employee, nextActive: boolean) => {
    const payload = {
      is_active: nextActive,
      status: nextActive
        ? employee.status === "Inactive"
          ? "Active"
          : employee.status
        : "Inactive",
    };

    const { error } = await supabase.from("employees").update(payload).eq("id", employee.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(nextActive ? "Employee reactivated." : "Employee deactivated.");
    await fetchEmployees();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Team management</p>
            <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none sm:w-56"
                placeholder="Search employees"
                aria-label="Search employees"
              />
            </label>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Employee roster</h2>
                <p className="text-sm text-slate-500">{filteredEmployees.length} matching records</p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading employees...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No employees found.</div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{employee.role}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        <span className={employee.is_active ? "text-emerald-700" : "text-rose-700"}>
                          {employee.is_active ? "Active portal access" : "Deactivated"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{employee.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{employee.phone}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Auth user: {employee.auth_user_id ?? "Not linked"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(employee)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(employee, !employee.is_active)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          employee.is_active
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {employee.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit employee" : "Add employee"}</h2>
                <p className="text-sm text-slate-500">
                  {editingId ? "Update the employee profile below." : "Create a new team member entry."}
                </p>
              </div>
              {editingId ? (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-blue-600">
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">First name</label>
                  <input
                    value={form.first_name}
                    onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Mina"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Last name</label>
                  <input
                    value={form.last_name}
                    onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Patel"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="mina@company.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="(555) 111-2222"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
                  <input
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Supervisor"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Department</label>
                  <input
                    value={form.department}
                    onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Operations"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Hire date</label>
                  <input
                    type="date"
                    value={form.hire_date}
                    onChange={(event) => setForm((current) => ({ ...current, hire_date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value,
                        is_active: event.target.value === "Inactive" ? false : current.is_active,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Auth User ID (optional)</label>
                  <input
                    value={form.auth_user_id}
                    onChange={(event) => setForm((current) => ({ ...current, auth_user_id: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Supabase auth.users UUID"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Portal Access</label>
                  <select
                    value={form.is_active ? "enabled" : "disabled"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.value === "enabled",
                        status: event.target.value === "enabled" && current.status === "Inactive" ? "Active" : current.status,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Availability, certifications, or special notes"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add employee"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
