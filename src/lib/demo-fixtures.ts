export type DemoCompanyProfile = {
  name: string;
  owner: string;
  serviceArea: string;
  phone: string;
  email: string;
  plan: string;
  teamSize: number;
  activeCustomers: number;
  monthlyRevenue: number;
  jobsThisMonth: number;
  completionRate: number;
};

export type DemoMetric = {
  labelKey: string;
  value: string;
};

export type DemoRevenuePoint = {
  monthKey: string;
  revenue: number;
};

export type DemoUpcomingJob = {
  customer: string;
  timeKey: string;
  serviceKey: string;
  assignedTo: string[];
  status: "scheduled" | "confirmed" | "completed";
  value: number;
};

export type DemoCustomerRecord = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  serviceKey: string;
  frequencyKey?: string;
  status: "active" | "prospect";
  monthlyValue?: number;
  estimatedMonthlyValue?: number;
};

export type DemoEmployeeProfile = {
  name: string;
  roleKey: string;
  jobsToday: number;
  hoursThisWeek: number;
  completionScore: number;
};

export type DemoChecklistItem = {
  id: string;
  labelKey: string;
  defaultChecked: boolean;
};

export const demoCompany: DemoCompanyProfile = {
  name: "BrightLine Commercial Cleaning",
  owner: "Jasmine Carter",
  serviceArea: "Gary, Indiana",
  phone: "(219) 555-0147",
  email: "hello@brightline-demo.com",
  plan: "Founder Partner",
  teamSize: 6,
  activeCustomers: 24,
  monthlyRevenue: 18460,
  jobsThisMonth: 37,
  completionRate: 96,
};

export const demoAdminMetrics: DemoMetric[] = [
  { labelKey: "public.demoMetricMonthlyRevenue", value: "$18,460" },
  { labelKey: "public.demoMetricOutstandingInvoices", value: "$2,375" },
  { labelKey: "public.demoMetricJobsThisWeek", value: "12" },
  { labelKey: "public.demoMetricNewQuoteRequests", value: "4" },
  { labelKey: "public.demoMetricActiveCustomers", value: "24" },
  { labelKey: "public.demoMetricActiveEmployees", value: "6" },
  { labelKey: "public.demoMetricCompletionRate", value: "96%" },
];

export const demoRevenueHistory: DemoRevenuePoint[] = [
  { monthKey: "public.demoMonthJanuary", revenue: 10850 },
  { monthKey: "public.demoMonthFebruary", revenue: 12200 },
  { monthKey: "public.demoMonthMarch", revenue: 13650 },
  { monthKey: "public.demoMonthApril", revenue: 14900 },
  { monthKey: "public.demoMonthMay", revenue: 16750 },
  { monthKey: "public.demoMonthJune", revenue: 18460 },
];

export const demoUpcomingJobs: DemoUpcomingJob[] = [
  {
    customer: "Lakeside Medical Center",
    timeKey: "public.demoTimeToday6",
    serviceKey: "public.demoServiceMedicalOffice",
    assignedTo: ["Marcus Reed", "Elena Torres"],
    status: "scheduled",
    value: 485,
  },
  {
    customer: "Harbor Point Law Group",
    timeKey: "public.demoTimeTomorrow7",
    serviceKey: "public.demoServiceRecurringOffice",
    assignedTo: ["Danielle Brooks"],
    status: "confirmed",
    value: 275,
  },
  {
    customer: "Steel City Logistics",
    timeKey: "public.demoTimeWednesday530",
    serviceKey: "public.demoServiceWarehouseOffice",
    assignedTo: ["Marcus Reed", "Andre Wilson"],
    status: "scheduled",
    value: 650,
  },
  {
    customer: "Genesis Learning Academy",
    timeKey: "public.demoTimeThursday430",
    serviceKey: "public.demoServiceSchoolCleaning",
    assignedTo: ["Elena Torres", "Danielle Brooks"],
    status: "scheduled",
    value: 825,
  },
];

export const demoRecentActivityKeys = [
  "public.demoActivityPaidInv1048",
  "public.demoActivityMarcusCompleted",
  "public.demoActivityHarborApproved",
  "public.demoActivityNewNorthshoreRequest",
  "public.demoActivityPhotosGenesis",
];

export const demoCustomers: DemoCustomerRecord[] = [
  {
    name: "Lakeside Medical Center",
    contact: "Angela Morris",
    email: "angela@lakesidemedical-demo.com",
    phone: "(219) 555-0101",
    serviceKey: "public.demoServiceMedicalOffice",
    frequencyKey: "public.demoFrequencyFiveNights",
    status: "active",
    monthlyValue: 3880,
  },
  {
    name: "Harbor Point Law Group",
    contact: "David Price",
    email: "david@harborpoint-demo.com",
    phone: "(219) 555-0102",
    serviceKey: "public.demoServiceOfficeCleaning",
    frequencyKey: "public.demoFrequencyTwicePerWeek",
    status: "active",
    monthlyValue: 2200,
  },
  {
    name: "Steel City Logistics",
    contact: "Nicole Bennett",
    email: "nicole@steelcity-demo.com",
    phone: "(219) 555-0103",
    serviceKey: "public.demoServiceOfficeBreakroom",
    frequencyKey: "public.demoFrequencyThreeTimesPerWeek",
    status: "active",
    monthlyValue: 3450,
  },
  {
    name: "Genesis Learning Academy",
    contact: "Renee Thompson",
    email: "renee@genesislearning-demo.com",
    phone: "(219) 555-0104",
    serviceKey: "public.demoServiceSchoolCleaning",
    frequencyKey: "public.demoFrequencyFiveTimesPerWeek",
    status: "active",
    monthlyValue: 4100,
  },
  {
    name: "Northshore Dental",
    contact: "Michael Grant",
    email: "michael@northshoredental-demo.com",
    phone: "(219) 555-0105",
    serviceKey: "public.demoServiceDentalOffice",
    status: "prospect",
    estimatedMonthlyValue: 1850,
  },
];

export const demoQuote = {
  id: "EST-1036",
  customer: "Northshore Dental",
  squareFeet: 4800,
  frequencyKey: "public.demoFrequencyThreePerWeek",
  scopeKeys: [
    "public.demoQuoteScopeRestroom",
    "public.demoQuoteScopeWaitingRoom",
    "public.demoQuoteScopeTreatmentFloors",
    "public.demoQuoteScopeBreakroom",
    "public.demoQuoteScopeDeepClean",
  ],
  estimatedMonthlyPrice: 1850,
  status: "awaitingApproval",
};

export const demoEmployee: DemoEmployeeProfile = {
  name: "Marcus Reed",
  roleKey: "public.demoRoleCleaningTech",
  jobsToday: 2,
  hoursThisWeek: 28.5,
  completionScore: 98,
};

export const demoPrimaryJob = {
  customer: "Lakeside Medical Center",
  location: "5400 Lakeshore Drive, Gary, IN",
  time: "6:00 PM-9:00 PM",
  teamMembers: ["Marcus Reed", "Elena Torres"],
  status: "readyToStart",
};

export const demoChecklist: DemoChecklistItem[] = [
  {
    id: "trash",
    labelKey: "public.demoChecklistTrash",
    defaultChecked: true,
  },
  {
    id: "reception",
    labelKey: "public.demoChecklistReception",
    defaultChecked: true,
  },
  {
    id: "restrooms",
    labelKey: "public.demoChecklistRestrooms",
    defaultChecked: true,
  },
  {
    id: "vacuum",
    labelKey: "public.demoChecklistVacuum",
    defaultChecked: true,
  },
  { id: "mop", labelKey: "public.demoChecklistMop", defaultChecked: true },
  {
    id: "touchpoints",
    labelKey: "public.demoChecklistTouchpoints",
    defaultChecked: true,
  },
  {
    id: "breakroom",
    labelKey: "public.demoChecklistBreakroom",
    defaultChecked: true,
  },
  {
    id: "supplies",
    labelKey: "public.demoChecklistSupplies",
    defaultChecked: false,
  },
  { id: "doors", labelKey: "public.demoChecklistDoors", defaultChecked: false },
  {
    id: "photos",
    labelKey: "public.demoChecklistPhotos",
    defaultChecked: true,
  },
];

export const demoBeforePhotos = [
  "/demo-images/before-cleaning.svg",
  "/demo-images/medical-office.svg",
];

export const demoAfterPhotos = [
  "/demo-images/after-cleaning.svg",
  "/demo-images/commercial-office.svg",
  "/demo-images/customer-company.svg",
];

export const demoImageCatalog = {
  beforeCleaning: "/demo-images/before-cleaning.svg",
  afterCleaning: "/demo-images/after-cleaning.svg",
  medicalOffice: "/demo-images/medical-office.svg",
  commercialOffice: "/demo-images/commercial-office.svg",
  employeeProfile: "/demo-images/employee-profile.svg",
  customerCompany: "/demo-images/customer-company.svg",
  demoThumbnail: "/demo-images/demo-thumbnail.svg",
};

export const demoCustomerPortal = {
  user: "Angela Morris",
  company: "Lakeside Medical Center",
  nextServiceKey: "public.demoNextServiceToday6",
  currentJobStatus: "readyToStart",
  approvedQuotes: ["EST-1032", "EST-1036"],
  serviceHistoryKeys: [
    "public.demoServiceHistory1",
    "public.demoServiceHistory2",
    "public.demoServiceHistory3",
  ],
  completionChecklistKeys: [
    "public.demoCompletionChecklist1",
    "public.demoCompletionChecklist2",
    "public.demoCompletionChecklist3",
    "public.demoCompletionChecklist4",
  ],
};

export const demoInvoice = {
  number: "INV-1052",
  serviceKey: "public.demoInvoiceServiceJuly",
  amount: 1940,
  dueDateIso: "2026-07-20",
  status: "due",
};

export const demoTourSteps = [
  {
    titleKey: "public.demoTourStep1Title",
    bodyKey: "public.demoTourStep1Body",
    instructionKey: "public.demoTourStep1Instruction",
  },
  {
    titleKey: "public.demoTourStep2Title",
    bodyKey: "public.demoTourStep2Body",
    instructionKey: "public.demoTourStep2Instruction",
  },
  {
    titleKey: "public.demoTourStep3Title",
    bodyKey: "public.demoTourStep3Body",
    instructionKey: "public.demoTourStep3Instruction",
  },
  {
    titleKey: "public.demoTourStep4Title",
    bodyKey: "public.demoTourStep4Body",
    instructionKey: "public.demoTourStep4Instruction",
  },
  {
    titleKey: "public.demoTourStep5Title",
    bodyKey: "public.demoTourStep5Body",
    instructionKey: "public.demoTourStep5Instruction",
  },
  {
    titleKey: "public.demoTourStep6Title",
    bodyKey: "public.demoTourStep6Body",
    instructionKey: "public.demoTourStep6Instruction",
  },
  {
    titleKey: "public.demoTourStep7Title",
    bodyKey: "public.demoTourStep7Body",
    instructionKey: "public.demoTourStep7Instruction",
  },
  {
    titleKey: "public.demoTourStep8Title",
    bodyKey: "public.demoTourStep8Body",
    instructionKey: "public.demoTourStep8Instruction",
  },
];
