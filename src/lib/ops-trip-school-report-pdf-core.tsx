/* eslint-disable jsx-a11y/alt-text */

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  OpsTripSchoolReportFilters,
  OpsTripSchoolReportIndicators,
  OpsTripSchoolReportParticipant,
  OpsTripSchoolReportStatusOption,
} from "@/lib/ops-trip-school-report-core";

type PdfTripReport = {
  trip: {
    code: string;
    dateLabel: string;
  };
  filters: OpsTripSchoolReportFilters;
  statusOptions: OpsTripSchoolReportStatusOption[];
  indicators: OpsTripSchoolReportIndicators;
  students: OpsTripSchoolReportParticipant[];
  educators: OpsTripSchoolReportParticipant[];
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: "#f3f7fb",
    color: "#355063",
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    border: "1 solid #0d4872",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#175387",
    paddingHorizontal: 24,
    paddingVertical: 18,
    alignItems: "center",
  },
  logo: {
    width: 152,
    height: 48,
    objectFit: "contain",
    marginBottom: 10,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerMeta: {
    marginTop: 8,
    color: "#d8e9f6",
    fontSize: 10,
  },
  body: {
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    color: "#175387",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "31%",
    border: "1 solid #d7e5ef",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fbfd",
  },
  metricValue: {
    color: "#175387",
    fontSize: 14,
    fontWeight: "bold",
  },
  metricLabel: {
    marginTop: 4,
    color: "#5d7282",
    fontSize: 9,
  },
  table: {
    border: "1 solid #d9e3eb",
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#edf5fa",
    color: "#345062",
    fontWeight: "bold",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTop: "1 solid #e5edf3",
  },
  colVoucher: { width: "14%" },
  colName: { width: "28%" },
  colClass: { width: "22%" },
  colRole: { width: "16%" },
  colValue: { width: "10%", textAlign: "right" },
  colStatus: { width: "10%" },
  emptyState: {
    color: "#5d7282",
  },
});

let logoDataUrlPromise: Promise<string | null> | null = null;

async function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = readFile(
      path.join(process.cwd(), "public", "brand", "rincao-logo.png"),
    )
      .then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`)
      .catch(() => null);
  }

  return logoDataUrlPromise;
}

function ParticipantTable({
  title,
  rows,
  showClass,
}: {
  title: string;
  rows: OpsTripSchoolReportParticipant[];
  showClass: boolean;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyState}>Nenhum registro no filtro atual.</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colVoucher}>Voucher</Text>
            <Text style={styles.colName}>Nome</Text>
            {showClass ? (
              <Text style={styles.colClass}>Turma</Text>
            ) : (
              <Text style={styles.colRole}>Funcao</Text>
            )}
            <Text style={styles.colValue}>Valor</Text>
            <Text style={styles.colStatus}>Status</Text>
          </View>
          {rows.map((row) => (
            <View key={row.voucherId} style={styles.tableRow}>
              <Text style={styles.colVoucher}>{row.voucherNumber}</Text>
              <Text style={styles.colName}>{row.name}</Text>
              {showClass ? (
                <Text style={styles.colClass}>{row.classDisplay || "-"}</Text>
              ) : (
                <Text style={styles.colRole}>{row.role || "-"}</Text>
              )}
              <Text style={styles.colValue}>R$ {row.unitValue}</Text>
              <Text style={styles.colStatus}>{row.purchaseStatusLabel}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ReportDocument({
  report,
  ownerName,
  logoDataUrl,
}: {
  report: PdfTripReport;
  ownerName: string;
  logoDataUrl: string | null;
}) {
  const statusFilter = report.filters.purchaseStatus
    ? report.statusOptions.find((option) => option.value === report.filters.purchaseStatus)
        ?.label ?? report.filters.purchaseStatus
    : "Todos";

  return (
    <Document title={`passeio-escolar-${report.trip.code}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.card}>
          <View style={styles.header}>
            {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
            <Text style={styles.headerTitle}>Relatorio do passeio escolar</Text>
            <Text style={styles.headerMeta}>
              {report.trip.code} • {ownerName} • {report.trip.dateLabel} • Status da
              compra: {statusFilter}
            </Text>
          </View>

          <View style={styles.body}>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{report.indicators.totalCount}</Text>
                <Text style={styles.metricLabel}>Participantes</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{report.indicators.paidCount}</Text>
                <Text style={styles.metricLabel}>Pagos</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{report.indicators.usedCount}</Text>
                <Text style={styles.metricLabel}>Usados</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>R$ {report.indicators.totalValue}</Text>
                <Text style={styles.metricLabel}>Valor total</Text>
              </View>
            </View>

            <ParticipantTable title="Alunos" rows={report.students} showClass />
            <ParticipantTable title="Educadores" rows={report.educators} showClass={false} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderOpsTripSchoolReportPdfBuffer(
  report: PdfTripReport,
  ownerName: string,
) {
  const logoDataUrl = await getLogoDataUrl();

  return renderToBuffer(
    <ReportDocument
      report={report}
      ownerName={ownerName}
      logoDataUrl={logoDataUrl}
    />,
  );
}
