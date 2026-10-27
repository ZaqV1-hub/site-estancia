/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PainelPurchaseDetail } from "@/lib/painel-compras";
const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", color: "#17351f", fontSize: 9 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#2b8c46", paddingBottom: 16, marginBottom: 18 },
  logo: { width: 105, height: 58, objectFit: "contain" },
  title: { fontSize: 17, fontWeight: "bold" },
  section: { marginTop: 14, marginBottom: 7, fontSize: 11, fontWeight: "bold" },
  line: { marginBottom: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dbe7d7", paddingVertical: 8 },
  code: { width: "20%" },
  product: { width: "29%", paddingRight: 7 },
  visit: { width: "30%", paddingRight: 7 },
  value: { width: "21%" },
  heading: { backgroundColor: "#eef3ea", fontWeight: "bold" },
  secondary: { fontSize: 8, marginTop: 3 },
  footer: { marginTop: 22, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#dbe7d7", fontSize: 8 },
});
function Summary({ detail }: { detail: PainelPurchaseDetail }) {
  const logo = `data:image/png;base64,${readFileSync(resolve(process.cwd(), "public/brand/estancia-logo-dark.png")).toString("base64")}`;
  return <Document title={`Resumo da compra ${detail.purchaseId}`}><Page size="A4" style={styles.page}>
    <View style={styles.header}><Image src={logo} style={styles.logo} /><View><Text style={styles.title}>Comprovante de compra</Text><Text style={styles.line}>Pedido {detail.purchaseId} - {detail.purchaseDate || "Data não informada"}</Text></View></View>
    <Text style={styles.section}>Comprador</Text><Text style={styles.line}>{detail.userName || "Nome não informado"}</Text><Text style={styles.line}>CPF: {detail.cpf || "Não informado"}</Text>
    <Text style={styles.section}>Compra e pagamento</Text><Text style={styles.line}>{detail.typeLabel} - {detail.statusLabel}</Text><Text style={styles.line}>{detail.paymentLabel} - {detail.paymentMethodLabel}</Text><Text style={styles.line}>Pagamento: {detail.paymentDate || "Não informado"} {detail.paymentTime || ""}</Text><Text style={styles.line}>Total: R$ {detail.totalValue}</Text>
    <Text style={styles.section}>Passaportes e adicionais ({detail.vouchers.length})</Text>
    <View style={[styles.row, styles.heading]}><Text style={styles.code}>Voucher</Text><Text style={styles.product}>Item</Text><Text style={styles.visit}>Visita / validade</Text><Text style={styles.value}>Valor / situação</Text></View>
    {detail.vouchers.map((voucher) => <View key={voucher.voucherId} style={styles.row} wrap={false}>
      <Text style={styles.code}>{voucher.voucherNumber || String(voucher.voucherId)}</Text>
      <Text style={styles.product}>{voucher.voucherTypeLabel}</Text>
      <View style={styles.visit}><Text>{voucher.visitDate || "Não informada"}</Text>{voucher.validUntil ? <Text style={styles.secondary}>Válido até {voucher.validUntil}</Text> : null}{voucher.originalDate ? <Text style={styles.secondary}>Reagendado de {voucher.originalDate}</Text> : null}</View>
      <View style={styles.value}><Text>R$ {voucher.unitValue}</Text><Text style={styles.secondary}>{voucher.used === "s" ? "Usado" : voucher.used === "inv" ? "Inválido" : "Não usado"}</Text>{voucher.usedDate ? <Text style={styles.secondary}>{voucher.usedDate} {voucher.usedTime || ""}</Text> : null}</View>
    </View>)}
    <Text style={styles.footer}>Estância Parque Ecológico das Águas. Comprovante de registro da compra e utilização dos ingressos. Não substitui documento fiscal.</Text>
  </Page></Document>;
}
export async function renderPainelPurchaseSummaryPdf(detail: PainelPurchaseDetail) { return renderToBuffer(<Summary detail={detail} />); }
