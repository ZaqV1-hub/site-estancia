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
import type { PainelCodIndicaReportData } from "@/lib/painel-cod-indica";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#333333",
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 18,
    borderBottom: "1 solid #0f4f7c",
    paddingBottom: 12,
  },
  logo: {
    width: 150,
    height: 54,
    objectFit: "contain",
    marginBottom: 10,
  },
  title: {
    color: "#0f4f7c",
    fontSize: 18,
    fontWeight: "bold",
  },
  meta: {
    marginTop: 6,
    color: "#4f6472",
    fontSize: 10,
  },
  totalBox: {
    border: "1 solid #c9d8e3",
    padding: 10,
    marginBottom: 14,
  },
  totalLabel: {
    color: "#6a7d8a",
    fontSize: 9,
    textTransform: "uppercase",
  },
  totalValue: {
    marginTop: 4,
    color: "#0f4f7c",
    fontSize: 16,
    fontWeight: "bold",
  },
  table: {
    border: "1 solid #d7d7d7",
  },
  row: {
    flexDirection: "row",
  },
  headerRow: {
    backgroundColor: "#5f84a3",
    color: "#ffffff",
    fontWeight: "bold",
  },
  cell: {
    borderRight: "1 solid #d7d7d7",
    borderBottom: "1 solid #d7d7d7",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  colPurchase: { width: "10%" },
  colBuyer: { width: "22%" },
  colCpf: { width: "14%" },
  colDate: { width: "14%" },
  colValue: { width: "12%", textAlign: "right" },
  colDiscount: { width: "12%", textAlign: "right" },
  colCashback: { width: "12%", textAlign: "right" },
  colType: { width: "14%" },
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

function ReportDocument({
  report,
  logoDataUrl,
}: {
  report: PainelCodIndicaReportData;
  logoDataUrl: string | null;
}) {
  return (
    <Document title={`cod-indica-${report.codigo}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
          <Text style={styles.title}>Relatorio de cashback - Cod Indica</Text>
          <Text style={styles.meta}>
            Codigo {report.codigo} • {report.representante} • Periodo {report.dateFromLabel} ate{" "}
            {report.dateToLabel}
          </Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Cashback total do periodo</Text>
          <Text style={styles.totalValue}>R$ {report.totalCashbackLabel}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.colPurchase]}>Compra</Text>
            <Text style={[styles.cell, styles.colBuyer]}>Titular</Text>
            <Text style={[styles.cell, styles.colCpf]}>CPF</Text>
            <Text style={[styles.cell, styles.colDate]}>Data pagto.</Text>
            <Text style={[styles.cell, styles.colValue]}>Valor</Text>
            <Text style={[styles.cell, styles.colDiscount]}>Desconto</Text>
            <Text style={[styles.cell, styles.colCashback]}>Cashback</Text>
            <Text style={[styles.cell, styles.colType]}>Tipo</Text>
          </View>
          {report.rows.map((row) => (
            <View key={row.purchaseId} style={styles.row}>
              <Text style={[styles.cell, styles.colPurchase]}>{row.purchaseId}</Text>
              <Text style={[styles.cell, styles.colBuyer]}>{row.buyerName}</Text>
              <Text style={[styles.cell, styles.colCpf]}>{row.cpfLabel}</Text>
              <Text style={[styles.cell, styles.colDate]}>{row.paymentDateLabel}</Text>
              <Text style={[styles.cell, styles.colValue]}>R$ {row.totalValueLabel}</Text>
              <Text style={[styles.cell, styles.colDiscount]}>R$ {row.discountValueLabel}</Text>
              <Text style={[styles.cell, styles.colCashback]}>R$ {row.cashbackValueLabel}</Text>
              <Text style={[styles.cell, styles.colType]}>{row.cashbackTypeLabel}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderPainelCodIndicaReportPdfBuffer(
  report: PainelCodIndicaReportData,
) {
  const logoDataUrl = await getLogoDataUrl();
  return renderToBuffer(<ReportDocument logoDataUrl={logoDataUrl} report={report} />);
}
