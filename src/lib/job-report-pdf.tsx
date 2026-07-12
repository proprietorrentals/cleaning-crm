import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type ReportPhoto = {
  id: string;
  photo_url: string;
  notes: string | null;
  created_at: string;
};

type ReportEmployee = {
  id: string;
  name: string;
};

type ChecklistItem = {
  label: string;
  done: boolean;
};

type ReportClockRow = {
  employeeName: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number;
};

type JobCompletionReportPDFProps = {
  companyName: string;
  companyLogoUrl: string | null;
  customer: {
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  job: {
    id: string;
    date: string;
    status: string;
    notes: string | null;
    signatureStatus: string | null;
    signatureReason: string | null;
    signatureNotes: string | null;
  };
  employees: ReportEmployee[];
  clockRows: ReportClockRow[];
  totalHours: number;
  totalMileage: number;
  beforePhotos: ReportPhoto[];
  afterPhotos: ReportPhoto[];
  signaturePhotoUrl: string | null;
  aiSummary: string;
  checklist: ChecklistItem[];
  generatedAtIso: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0ea5e9",
    paddingBottom: 10,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 86,
    height: 40,
    objectFit: "contain",
  },
  logoFallbackWrap: {
    alignItems: "flex-end",
  },
  logoFallbackBrand: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0369a1",
  },
  logoFallbackCompany: {
    marginTop: 2,
    fontSize: 9,
    color: "#475569",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 2,
    color: "#475569",
    fontSize: 9,
  },
  section: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    color: "#0369a1",
  },
  label: {
    color: "#475569",
    width: "42%",
  },
  value: {
    width: "58%",
    textAlign: "right",
  },
  listItem: {
    marginBottom: 3,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
  },
  clockTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  colEmployee: { width: "30%" },
  colClock: { width: "24%" },
  colHours: { width: "22%", textAlign: "right" },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoWrap: {
    width: "48%",
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 110,
    objectFit: "cover",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  photoCaption: {
    marginTop: 2,
    color: "#475569",
    fontSize: 8,
  },
  signature: {
    width: "100%",
    height: 90,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    padding: 8,
    lineHeight: 1.45,
  },
  footer: {
    marginTop: 10,
    textAlign: "center",
    color: "#64748b",
    fontSize: 8,
  },
});

function fmtDateTime(iso: string | null) {
  if (!iso) return "-";
  const dt = new Date(iso);
  return dt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(isoDate: string) {
  const dt = new Date(`${isoDate}T00:00:00`);
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function safeText(value: string | null | undefined, fallback = "-") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function renderPhotoSection(title: string, photos: ReportPhoto[]) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {photos.length === 0 ? (
        <Text>No photos available.</Text>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoWrap}>
              <Image style={styles.photo} src={photo.photo_url} />
              <Text style={styles.photoCaption}>{fmtDateTime(photo.created_at)}</Text>
              {photo.notes ? <Text style={styles.photoCaption}>{photo.notes}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function JobCompletionReportPDF(props: JobCompletionReportPDFProps) {
  const {
    companyName,
    companyLogoUrl,
    customer,
    job,
    employees,
    clockRows,
    totalHours,
    totalMileage,
    beforePhotos,
    afterPhotos,
    signaturePhotoUrl,
    aiSummary,
    checklist,
    generatedAtIso,
  } = props;

  const signatureLabel =
    job.signatureStatus === "signed" || signaturePhotoUrl
      ? "Customer signature captured"
      : `Customer unavailable${job.signatureReason ? `: ${job.signatureReason}` : ""}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.title}>Job Completion Report</Text>
              <Text style={styles.subtitle}>Generated: {fmtDateTime(generatedAtIso)}</Text>
            </View>
            {companyLogoUrl ? (
              <Image style={styles.logo} src={companyLogoUrl} />
            ) : (
              <View style={styles.logoFallbackWrap}>
                <Text style={styles.logoFallbackBrand}>ServiceOS</Text>
                <Text style={styles.logoFallbackCompany}>{safeText(companyName)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.rowBetween}><Text style={styles.label}>Company</Text><Text style={styles.value}>{safeText(companyName)}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Job ID</Text><Text style={styles.value}>{job.id}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Job Date</Text><Text style={styles.value}>{fmtDate(job.date)}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Status</Text><Text style={styles.value}>{job.status}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Customer</Text><Text style={styles.value}>{safeText(customer.companyName)}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Contact</Text><Text style={styles.value}>{safeText(customer.contactName)}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Email</Text><Text style={styles.value}>{safeText(customer.email)}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Phone</Text><Text style={styles.value}>{safeText(customer.phone)}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>Property Address</Text><Text style={styles.value}>{safeText(customer.address)}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employees</Text>
          {employees.length === 0 ? (
            <Text>No employees were recorded for this job.</Text>
          ) : (
            <View style={styles.chipRow}>
              {employees.map((employee) => (
                <Text style={styles.chip} key={employee.id}>{employee.name}</Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time & Mileage</Text>
          {clockRows.length === 0 ? (
            <Text>No clock entries found for this job.</Text>
          ) : (
            <>
              <View style={styles.clockTableHeader}>
                <Text style={styles.colEmployee}>Employee</Text>
                <Text style={styles.colClock}>Clock In</Text>
                <Text style={styles.colClock}>Clock Out</Text>
                <Text style={styles.colHours}>Hours</Text>
              </View>
              {clockRows.map((row) => (
                <View key={`${row.employeeName}-${row.clockIn ?? "na"}`} style={styles.rowBetween}>
                  <Text style={styles.colEmployee}>{row.employeeName}</Text>
                  <Text style={styles.colClock}>{fmtDateTime(row.clockIn)}</Text>
                  <Text style={styles.colClock}>{fmtDateTime(row.clockOut)}</Text>
                  <Text style={styles.colHours}>{row.totalHours.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}
          <View style={{ marginTop: 6 }}>
            <View style={styles.rowBetween}><Text style={styles.label}>Total Hours</Text><Text style={styles.value}>{totalHours.toFixed(2)}</Text></View>
            <View style={styles.rowBetween}><Text style={styles.label}>Mileage</Text><Text style={styles.value}>{totalMileage.toFixed(2)} mi</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {checklist.map((item) => (
            <Text key={item.label} style={styles.listItem}>{item.done ? "[x]" : "[ ]"} {item.label}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Generated Cleaning Summary</Text>
          <View style={styles.summaryBox}>
            <Text>{aiSummary}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Notes</Text>
          <Text>{safeText(job.notes, "No employee notes were provided.")}</Text>
          {job.signatureNotes ? <Text style={{ marginTop: 4 }}>Signature notes: {job.signatureNotes}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Signature</Text>
          <Text style={{ marginBottom: 6 }}>{signatureLabel}</Text>
          {signaturePhotoUrl ? <Image style={styles.signature} src={signaturePhotoUrl} /> : <Text>{signatureLabel}</Text>}
        </View>

        {renderPhotoSection("Before Photos", beforePhotos)}
        {renderPhotoSection("After Photos", afterPhotos)}

        <Text style={styles.footer}>ServiceOS · Job report generated automatically</Text>
      </Page>
    </Document>
  );
}
