"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FormStatus = "idle" | "submitting" | "error";

const PROPERTY_TYPES = [
  "Office",
  "Medical",
  "Retail",
  "Warehouse",
  "School",
  "Industrial",
  "Mixed Use",
  "Other",
];

const CLEANING_FREQUENCIES = [
  "Daily",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "One-time",
];

const SERVICES = [
  "General janitorial",
  "Deep cleaning",
  "Floor care",
  "Disinfection",
  "Post-construction cleanup",
  "Window cleaning",
  "Other",
];

export function RequestQuoteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatus("submitting");
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/request-quote", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        leadId?: string;
      };

      if (!response.ok || !payload.ok) {
        setStatus("error");
        setErrorMessage(
          payload.error ||
            "We could not submit your request. Please try again.",
        );
        return;
      }

      form.reset();
      router.push(
        `/request-quote/confirmation?lead=${encodeURIComponent(payload.leadId ?? "")}`,
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "A network error occurred while submitting your request.",
      );
    }
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Business name" name="businessName" required />
        <Field label="Contact name" name="contactName" required />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
        />
      </div>

      <div className="space-y-5">
        <Field
          label="Address"
          name="address"
          required
          autoComplete="street-address"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="City"
            name="city"
            required
            autoComplete="address-level2"
          />
          <Field
            label="State"
            name="state"
            required
            autoComplete="address-level1"
            maxLength={50}
          />
          <Field
            label="ZIP Code"
            name="zipCode"
            required
            autoComplete="postal-code"
            maxLength={20}
          />
          <SelectField
            label="Property type"
            name="propertyType"
            required
            options={PROPERTY_TYPES}
            placeholder="Select"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Square footage"
          name="squareFootage"
          type="number"
          min={100}
          step={1}
          required
        />
        <SelectField
          label="Cleaning frequency"
          name="cleaningFrequency"
          required
          options={CLEANING_FREQUENCIES}
          placeholder="Select"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Service requested"
          name="serviceRequested"
          required
          options={SERVICES}
          placeholder="Select"
        />
        <Field
          label="Budget (optional)"
          name="budget"
          placeholder="Example: 2500/month"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Preferred start date"
          name="preferredStartDate"
          type="date"
          required
        />
        <div>
          <label
            htmlFor="photos"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Photo upload
          </label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
          />
          <p className="mt-1 text-xs text-slate-500">
            Optional. Up to 3 images, 5MB each.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          placeholder="Add site details, access restrictions, and any special requests."
        />
      </div>

      {status === "error" && errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center justify-center rounded-xl bg-cyan-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {status === "submitting" ? "Submitting..." : "Submit quote request"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  step?: number;
};

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  placeholder,
  maxLength,
  min,
  step,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        step={step}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
      />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  options: string[];
  placeholder: string;
};

function SelectField({
  label,
  name,
  required,
  options,
  placeholder,
}: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
