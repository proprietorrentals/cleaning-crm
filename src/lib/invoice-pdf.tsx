import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Defs, LinearGradient, Stop } from "@react-pdf/renderer";

// Register fonts for better typography
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf" },
    { src: "https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  brandRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  brandMarkWrap: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    color: "#64748b",
    width: "40%",
  },
  value: {
    fontSize: 10,
    color: "#0f172a",
    width: "60%",
    textAlign: "right",
  },
  boldValue: {
    fontSize: 10,
    color: "#0f172a",
    fontWeight: "bold",
    width: "60%",
    textAlign: "right",
  },
  detailsGrid: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 15,
  },
  detailsColumn: {
    width: "50%",
    paddingRight: 20,
  },
  summaryBox: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: "#e2e8f0",
  },
  amountRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
  },
  totalAmount: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  statusPending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusOverdue: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  notes: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 9,
    color: "#64748b",
  },
  footer: {
    marginTop: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
  },
});

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    amount: number;
    due_date: string;
    status: string;
    notes: string;
  };
  customer: {
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    address: string;
  } | undefined;
  job: {
    scheduled_date: string;
    assigned_employee: string | null;
    estimated_value: number;
    notes: string;
  } | undefined;
}

export function InvoicePDF({ invoice, customer, job }: InvoicePDFProps) {
  const statusClass =
    invoice.status === "Paid"
      ? styles.statusPaid
      : invoice.status === "Overdue"
        ? styles.statusOverdue
        : styles.statusPending;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMarkWrap}>
              <Svg viewBox="0 0 256 256" width="44" height="44">
                <Defs>
                  <LinearGradient id="sfBlue" x1="36" y1="40" x2="214" y2="204">
                    <Stop offset="0%" stopColor="#1D4ED8" />
                    <Stop offset="100%" stopColor="#22C1F1" />
                  </LinearGradient>
                </Defs>
                <Path
                  d="M74 54H178L214 82L178 110H92C77.6 110 66 121.6 66 136C66 150.4 77.6 162 92 162H146C160.4 162 172 150.4 172 136C172 121.6 160.4 110 146 110H98"
                  stroke="url(#sfBlue)"
                  strokeWidth="26"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path d="M78 146H42L78 174V146Z" fill="url(#sfBlue)" />
                <Path
                  d="M98 110H146C160.4 110 172 121.6 172 136C172 150.4 160.4 162 146 162H92C77.6 162 66 150.4 66 136C66 121.6 77.6 110 92 110H146"
                  stroke="#FFFFFF"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={{ fontSize: 12, color: "#0b1e3a", fontWeight: "bold" }}>ServiceFlow CRM</Text>
          </View>
          <Text style={styles.title}>INVOICE</Text>
          <Text style={styles.subtitle}>One Plaform. Unlimited Growth</Text>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.boldValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Date:</Text>
            <Text style={styles.value}>{formatDate(new Date().toISOString())}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusBadge, statusClass]}>
              <Text>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Customer & Job Details */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailsColumn}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            <Text style={{ fontSize: 11, marginBottom: 3, fontWeight: "bold", color: "#0f172a" }}>
              {customer?.company_name || "Unknown"}
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>
              Contact: {customer?.contact_name || "N/A"}
            </Text>
            {customer?.address && (
              <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                {customer.address}
              </Text>
            )}
            {customer?.email && (
              <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                {customer.email}
              </Text>
            )}
            {customer?.phone && (
              <Text style={{ fontSize: 10, color: "#64748b" }}>
                {customer.phone}
              </Text>
            )}
          </View>

          <View style={styles.detailsColumn}>
            <Text style={styles.sectionTitle}>JOB DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Service Date:</Text>
              <Text style={styles.value}>{formatDate(job?.scheduled_date || "N/A")}</Text>
            </View>
            {job?.assigned_employee && (
              <View style={styles.row}>
                <Text style={styles.label}>Assigned To:</Text>
                <Text style={styles.value}>{job.assigned_employee}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Service Value:</Text>
              <Text style={styles.boldValue}>{formatCurrency(job?.estimated_value || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Amount Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.amountRow}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>{formatCurrency(invoice.amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.label}>Tax (0%):</Text>
            <Text style={styles.value}>$0.00</Text>
          </View>
          <View style={styles.totalAmount}>
            <Text style={styles.totalLabel}>TOTAL DUE</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.amount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: "bold", marginBottom: 5, color: "#0f172a" }}>
              Notes:
            </Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          <Text>Payment terms: Due by {formatDate(invoice.due_date)}</Text>
          <Text>Generated by ServiceFlow CRM</Text>
        </View>
      </Page>
    </Document>
  );
}
