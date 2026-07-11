type DemoCustomer = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  building_size: string;
  cleaning_frequency: string;
  created_at: string;
};

type DemoEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  completed_jobs: number;
  active_jobs: number;
  rating: number;
};

type DemoJob = {
  id: string;
  customer_id: string;
  customer_name: string;
  employee_id: string;
  employee_name: string;
  scheduled_date: string;
  scheduled_start_time: string;
  status: "Completed" | "Scheduled";
  estimated_value: number;
  notes: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  signature_url: string | null;
  report_summary: string | null;
  mileage_request_status: "approved" | "pending" | "rejected" | null;
};

type DemoQuote = {
  id: string;
  customer_id: string;
  customer_name: string;
  square_footage: number;
  cleaning_frequency: string;
  extra_services: string[];
  total_estimate: number;
  status: "Approved" | "Pending" | "Sent";
  created_at: string;
};

type DemoInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  job_id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: "Paid" | "Pending" | "Overdue";
  created_at: string;
};

type DemoMileageRequest = {
  id: string;
  employee_id: string;
  employee_name: string;
  job_id: string;
  miles: number;
  status: "approved" | "pending" | "rejected";
  notes: string;
  created_at: string;
};

type DemoRevenuePoint = {
  label: string;
  total: number;
};

type DemoData = {
  companyName: string;
  bannerMessage: string;
  customers: DemoCustomer[];
  employees: DemoEmployee[];
  completedJobs: DemoJob[];
  scheduledJobs: DemoJob[];
  quotes: DemoQuote[];
  invoices: DemoInvoice[];
  mileageRequests: DemoMileageRequest[];
  revenueHistory: DemoRevenuePoint[];
};

const companyRoots = [
  "Atlas",
  "Beacon",
  "Cedar",
  "Summit",
  "Harbor",
  "Northstar",
  "Silverline",
  "Evergreen",
  "Lighthouse",
  "Pioneer",
  "Bluebird",
  "Cornerstone",
  "Parkside",
  "Ridgeview",
  "Skyline",
  "Sunrise",
  "Westfield",
  "Redwood",
  "Oak Harbor",
  "Metro",
];

const companySuffixes = [
  "Offices",
  "Health",
  "Properties",
  "Partners",
  "Logistics",
  "Studios",
  "Group",
  "Holdings",
  "Retail",
  "Center",
];

const firstNames = [
  "Ava",
  "Mia",
  "Noah",
  "Liam",
  "Olivia",
  "Sophia",
  "Ethan",
  "Amelia",
  "Lucas",
  "Zoe",
  "Mason",
  "Nora",
  "Elijah",
  "Harper",
  "Caleb",
  "Layla",
  "Henry",
  "Chloe",
  "Leo",
  "Ella",
];

const lastNames = [
  "Bennett",
  "Carter",
  "Diaz",
  "Edwards",
  "Foster",
  "Garcia",
  "Hayes",
  "Ibrahim",
  "Jones",
  "Kim",
  "Lopez",
  "Mason",
  "Nguyen",
  "Owens",
  "Patel",
  "Reed",
  "Sanchez",
  "Turner",
  "Walker",
  "Young",
];

const serviceLines = [
  "daily office cleaning",
  "post-construction cleanup",
  "restroom sanitation",
  "window cleaning",
  "carpet care",
  "floor maintenance",
  "lobby detailing",
  "nightly janitorial support",
];

const frequencies = ["Daily", "Weekly", "Biweekly", "Monthly"];
const employeeRoles = ["Field Supervisor", "Cleaning Technician", "Route Driver", "Operations Lead"];
const employeeDepartments = ["Operations", "Field Services", "Logistics", "Supervision"];
const extraServices = ["Window Cleaning", "Carpet Shampoo", "Restroom Sanitation", "Floor Waxing"];

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: T[]) {
  return items[Math.floor(random() * items.length)];
}

function formatIndex(value: number) {
  return String(value + 1).padStart(2, "0");
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function isoDate(daysOffset: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

function currency(value: number) {
  return Math.round(value / 10) * 10;
}

function createGraphicDataUri(title: string, subtitle: string, primary: string, secondary: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600" fill="none">
      <defs>
        <linearGradient id="bg" x1="80" y1="40" x2="880" y2="560" gradientUnits="userSpaceOnUse">
          <stop stop-color="${primary}" />
          <stop offset="1" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="960" height="600" rx="48" fill="url(#bg)"/>
      <rect x="64" y="64" width="832" height="472" rx="36" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <circle cx="160" cy="154" r="48" fill="rgba(255,255,255,0.24)"/>
      <rect x="230" y="118" width="310" height="22" rx="11" fill="rgba(255,255,255,0.8)"/>
      <rect x="230" y="154" width="190" height="16" rx="8" fill="rgba(255,255,255,0.54)"/>
      <text x="110" y="330" fill="#FFFFFF" font-size="54" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${title}</text>
      <text x="110" y="384" fill="rgba(255,255,255,0.9)" font-size="28" font-family="Segoe UI, Arial, sans-serif">${subtitle}</text>
      <path d="M110 452C194 402 286 406 376 452C468 498 560 502 650 452C742 402 820 402 850 422" stroke="rgba(255,255,255,0.9)" stroke-width="10" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createSignatureDataUri(name: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="180" viewBox="0 0 520 180" fill="none">
      <rect width="520" height="180" rx="28" fill="#F8FAFC"/>
      <path d="M40 110C88 72 118 136 166 98C194 76 204 78 226 102C246 124 270 126 292 98C314 70 340 68 360 94C380 120 418 124 480 84" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="40" y="142" fill="#0F172A" font-size="22" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${name}</text>
      <text x="40" y="38" fill="#64748B" font-size="16" font-family="Segoe UI, Arial, sans-serif">Customer signature</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildRevenueHistory(invoices: DemoInvoice[]) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      label: date.toLocaleDateString("en-US", { month: "short" }),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      total: 0,
    };
  });

  for (const invoice of invoices) {
    if (invoice.status !== "Paid" || !invoice.payment_date) continue;
    const key = invoice.payment_date.slice(0, 7);
    const entry = months.find((month) => month.key === key);
    if (entry) {
      entry.total += invoice.amount;
    }
  }

  return months.map(({ label, total }) => ({ label, total }));
}

function buildDemoData(): DemoData {
  const random = mulberry32(20260710);

  const customers: DemoCustomer[] = Array.from({ length: 40 }, (_, index) => {
    const root = pick(random, companyRoots);
    const suffix = pick(random, companySuffixes);
    const company_name = `${root} ${suffix}`;
    const contact_name = `${pick(random, firstNames)} ${pick(random, lastNames)}`;
    const frequency = pick(random, frequencies);
    const buildingSize = `${14_000 + Math.floor(random() * 62_000)} sq ft`;
    return {
      id: `customer-${formatIndex(index)}`,
      company_name,
      contact_name,
      phone: `(555) ${String(200 + index).padStart(3, "0")}-${String(4000 + index).slice(-4)}`,
      email: `${contact_name.toLowerCase().replace(/\s+/g, ".")}@${root.toLowerCase().replace(/\s+/g, "")}.com`,
      address: `${100 + index} ${pick(random, ["Main St", "Market Ave", "Cedar Blvd", "Ridge Rd", "Harbor Way"])} , Suite ${100 + (index % 9)}`.replace(" ,", ","),
      building_size: buildingSize,
      cleaning_frequency: frequency,
      created_at: daysAgo(120 - index * 2),
    };
  });

  const employees: DemoEmployee[] = Array.from({ length: 12 }, (_, index) => {
    const first = pick(random, firstNames);
    const last = pick(random, lastNames);
    return {
      id: `employee-${formatIndex(index)}`,
      first_name: first,
      last_name: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@serviceosdemo.com`,
      role: employeeRoles[index % employeeRoles.length],
      department: employeeDepartments[index % employeeDepartments.length],
      status: index % 5 === 0 ? "On Leave" : "Active",
      completed_jobs: 0,
      active_jobs: 0,
      rating: Number((4.4 + random() * 0.5).toFixed(1)),
    };
  });

  const completedJobs: DemoJob[] = Array.from({ length: 120 }, (_, index) => {
    const customer = customers[index % customers.length];
    const employee = employees[(index * 3) % employees.length];
    const scheduled_date = isoDate(-(index % 95) - Math.floor(index / 10));
    const estimatedValue = currency(650 + random() * 4500);
    const signatureUrl = createSignatureDataUri(customer.contact_name, index % 2 === 0 ? "#1D4ED8" : "#0F766E");
    const photoPrimary = index % 2 === 0 ? "#1D4ED8" : "#0891B2";
    const photoSecondary = index % 2 === 0 ? "#22C1F1" : "#34D399";
    return {
      id: `job-completed-${formatIndex(index)}`,
      customer_id: customer.id,
      customer_name: customer.company_name,
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      scheduled_date,
      scheduled_start_time: index % 3 === 0 ? "07:30" : index % 3 === 1 ? "08:00" : "09:00",
      status: "Completed",
      estimated_value: estimatedValue,
      notes: `${pick(random, serviceLines)} completed with ${pick(random, ["excellent", "steady", "consistent", "precise"])} quality control.` ,
      before_photo_url: createGraphicDataUri("Before", customer.company_name, photoPrimary, photoSecondary),
      after_photo_url: createGraphicDataUri("After", employee.first_name, photoSecondary, photoPrimary),
      signature_url: signatureUrl,
      report_summary: `${employee.first_name} completed a ${pick(random, ["spotless", "high-touch", "detail-oriented", "priority"])} service pass for ${customer.company_name}.`,
      mileage_request_status: index % 5 === 0 ? "pending" : index % 6 === 0 ? "approved" : null,
    };
  });

  const scheduledJobs: DemoJob[] = Array.from({ length: 25 }, (_, index) => {
    const customer = customers[(index * 2) % customers.length];
    const employee = employees[(index * 5) % employees.length];
    return {
      id: `job-scheduled-${formatIndex(index)}`,
      customer_id: customer.id,
      customer_name: customer.company_name,
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      scheduled_date: daysFromNow(index + 1).slice(0, 10),
      scheduled_start_time: index % 2 === 0 ? "07:00" : "12:30",
      status: "Scheduled",
      estimated_value: currency(600 + random() * 3500),
      notes: `Scheduled maintenance visit for ${customer.company_name}.`,
      before_photo_url: null,
      after_photo_url: null,
      signature_url: null,
      report_summary: null,
      mileage_request_status: null,
    };
  });

  const quotes: DemoQuote[] = customers.map((customer, index) => {
    const squareFootage = 12000 + Math.floor(random() * 48000);
    const cleaningFrequency = customer.cleaning_frequency;
    const estimate = currency(squareFootage * (cleaningFrequency === "Daily" ? 0.13 : cleaningFrequency === "Weekly" ? 0.11 : 0.09));
    return {
      id: `quote-${formatIndex(index)}`,
      customer_id: customer.id,
      customer_name: customer.company_name,
      square_footage: squareFootage,
      cleaning_frequency: cleaningFrequency,
      extra_services: extraServices.filter((_, extraIndex) => (index + extraIndex) % 3 === 0).slice(0, 2),
      total_estimate: estimate,
      status: index % 4 === 0 ? "Approved" : index % 4 === 1 ? "Sent" : "Pending",
      created_at: daysAgo(index * 3),
    };
  });

  const invoices: DemoInvoice[] = completedJobs.map((job, index) => {
    const paymentDate = index < 80 ? daysAgo(2 + (index % 25)) : null;
    const dueDate = index < 100 ? isoDate(-(index % 18)) : isoDate(index % 30 + 3);
    const status: DemoInvoice["status"] = paymentDate ? "Paid" : index % 2 === 0 ? "Pending" : "Overdue";
    return {
      id: `invoice-${formatIndex(index)}`,
      invoice_number: `INV-2026-${String(index + 1).padStart(4, "0")}`,
      customer_id: job.customer_id,
      customer_name: job.customer_name,
      job_id: job.id,
      amount: currency(job.estimated_value * 1.06),
      due_date: dueDate,
      payment_date: paymentDate,
      status,
      created_at: daysAgo(index + 1),
    };
  });

  const mileageRequests: DemoMileageRequest[] = Array.from({ length: 30 }, (_, index) => {
    const job = completedJobs[index * 3];
    const employee = employees[index % employees.length];
    return {
      id: `mileage-${formatIndex(index)}`,
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      job_id: job.id,
      miles: Number((8 + random() * 44).toFixed(1)),
      status: index % 4 === 0 ? "pending" : index % 5 === 0 ? "rejected" : "approved",
      notes: `Round-trip route for ${job.customer_name}`,
      created_at: daysAgo(index + 2),
    };
  });

  const revenueHistory = buildRevenueHistory(invoices);

  return {
    companyName: "ServiceOS Demo Cleaning",
    bannerMessage: "You are viewing the ServiceOS Demo.",
    customers,
    employees: employees.map((employee) => ({
      ...employee,
      completed_jobs: completedJobs.filter((job) => job.employee_id === employee.id).length,
      active_jobs: scheduledJobs.filter((job) => job.employee_id === employee.id).length,
    })),
    completedJobs,
    scheduledJobs,
    quotes,
    invoices,
    mileageRequests,
    revenueHistory,
  };
}

export const exploreDemoData = buildDemoData();
export type { DemoData, DemoCustomer, DemoEmployee, DemoInvoice, DemoJob, DemoMileageRequest, DemoQuote, DemoRevenuePoint };
