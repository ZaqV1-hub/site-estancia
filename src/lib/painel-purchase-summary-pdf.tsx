/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PainelPurchaseDetail } from "@/lib/painel-compras";

const styles = StyleSheet.create({
  page: { paddingTop: 25, paddingHorizontal: 27, paddingBottom: 60, fontFamily: "Helvetica", color: "#17351f", fontSize: 8 },
  header: { flexDirection: "row", alignItems: "center", borderBottom: "2 solid #2b8c46", paddingBottom: 10, marginBottom: 12 },
  logo: { width: 105, height: 58, objectFit: "contain" },
  titleSlot: { flexGrow: 1, flexShrink: 1, paddingHorizontal: 12, alignItems: "center" },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 7, color: "#56664f", marginTop: 5, textAlign: "center" },
  orderBox: { width: 102, flexShrink: 0, border: "1 solid #b7c9b2", borderRadius: 4, textAlign: "center" },
  orderPart: { padding: 6 },
  orderDivider: { borderTop: "1 solid #dbe7d7" },
  orderLabel: { fontSize: 6, fontWeight: "bold" },
  orderValue: { marginTop: 3, fontSize: 10, fontWeight: "bold" },
  section: { marginBottom: 9 },
  sectionTitle: { backgroundColor: "#245b32", color: "#ffffff", fontSize: 8, fontWeight: "bold", paddingVertical: 5, paddingHorizontal: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  row: { flexDirection: "row" },
  cell: { border: "1 solid #dbe7d7", padding: 7, justifyContent: "center" },
  label: { color: "#56664f", fontSize: 6, marginBottom: 3 },
  value: { fontSize: 8, fontWeight: "bold" },
  paid: { color: "#277144" },
  pending: { color: "#916016" },
  cancelled: { color: "#9a402c" },
  unknown: { color: "#657068" },
  totalCell: { backgroundColor: "#245b32", color: "#ffffff" },
  totalValue: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#245b32" },
  tableHeading: { fontSize: 6, fontWeight: "bold", color: "#ffffff" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #dbe7d7" },
  tableCell: { paddingVertical: 7, paddingHorizontal: 5, borderRight: "1 solid #dbe7d7", justifyContent: "center", fontSize: 7 },
  secondary: { fontSize: 6, marginTop: 3 },
  voucherCard: { border: "1 solid #b7c9b2", borderRadius: 4, padding: 9, marginTop: 6 },
  voucherTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  voucherCode: { width: "72%", paddingRight: 12, fontWeight: "bold" },
  voucherStatus: { width: "28%", textAlign: "right", fontWeight: "bold" },
  voucherMeta: { flexDirection: "row", marginTop: 7 },
  voucherField: { paddingRight: 10 },
  available: { backgroundColor: "#f5faf3", color: "#277144" },
  used: { backgroundColor: "#f0f1f2", borderColor: "#d0d4d8", color: "#657068" },
  invalid: { backgroundColor: "#fff3ef", borderColor: "#e5c8bc", color: "#9a402c" },
  unavailable: { backgroundColor: "#f6f5f1", borderColor: "#d9d5ca", color: "#756b50" },
  totalBar: { flexDirection: "row", justifyContent: "space-between", border: "1 solid #c7d6c1", borderRadius: 4, backgroundColor: "#eef3ea", padding: 8, marginTop: 7, fontWeight: "bold" },
  usedNotice: { border: "1 solid #d0d4d8", borderRadius: 4, backgroundColor: "#f0f1f2", padding: 12, marginTop: 4 },
  usedTitle: { color: "#657068", fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  usedText: { color: "#4d5750", fontSize: 8, marginBottom: 5 },
  footer: { position: "absolute", left: 27, right: 27, bottom: 20, borderTop: "1 solid #dbe7d7", paddingTop: 6, color: "#56664f", textAlign: "center", fontSize: 6 },
});

function Summary({ detail }: { detail: PainelPurchaseDetail }) {
  const logo = `data:image/png;base64,${readFileSync(resolve(process.cwd(), "public/brand/estancia-logo-dark.png")).toString("base64")}`;
  const hasSchoolVoucher = detail.vouchers.some((voucher) =>
    voucher.voucherType.toLowerCase() === "escol" || Boolean(voucher.schoolName || voucher.studentName || voucher.className || voucher.periodName),
  );
  const usedCount = detail.vouchers.filter((voucher) => voucher.used === "s").length;

  return (
    <Document title={`Comprovante de compra de ingressos - Pedido ${detail.purchaseId}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.titleSlot}>
            <Text style={styles.title}>Comprovante de compra de ingressos</Text>
            <Text style={styles.subtitle}>Registro da compra e utilização</Text>
          </View>
          <View style={styles.orderBox}>
            <View style={styles.orderPart}><Text style={styles.orderLabel}>Nº DO PEDIDO</Text><Text style={styles.orderValue}>{detail.purchaseId}</Text></View>
            <View style={[styles.orderPart, styles.orderDivider]}><Text style={styles.orderLabel}>DATA DA COMPRA</Text><Text style={styles.orderValue}>{detail.purchaseDate || "Não informada"}</Text></View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>DADOS DA COMPRA / RESERVA</Text>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "28%" }]}><Text style={styles.label}>Data da compra</Text><Text style={styles.value}>{detail.purchaseDate || "Não informada"}</Text></View>
            <View style={[styles.cell, { width: "34%" }]}><Text style={styles.label}>Tipo</Text><Text style={styles.value}>{detail.typeLabel}</Text></View>
            <View style={[styles.cell, { width: "38%" }]}><Text style={styles.label}>Status</Text><Text style={[styles.value, detail.status === "conc" ? styles.paid : detail.status === "canc" ? styles.cancelled : detail.status === "pend" ? styles.pending : styles.unknown]}>{detail.statusLabel}</Text></View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>DADOS DO CLIENTE</Text>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "70%" }]}><Text style={styles.label}>Cliente</Text><Text style={styles.value}>{detail.userName || "Nome não informado"}</Text></View>
            <View style={[styles.cell, { width: "30%" }]}><Text style={styles.label}>CPF</Text><Text style={styles.value}>{detail.cpf || "Não informado"}</Text></View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>PAGAMENTO</Text>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "22%" }]}><Text style={styles.label}>Status / processadora</Text><Text style={styles.value}>{detail.paymentLabel}</Text></View>
            <View style={[styles.cell, { width: "24%" }]}><Text style={styles.label}>Forma de pagamento</Text><Text style={styles.value}>{detail.paymentMethodLabel}</Text></View>
            <View style={[styles.cell, { width: "20%" }]}><Text style={styles.label}>Data do pagamento</Text><Text style={styles.value}>{detail.paymentDate || "Não informada"}</Text></View>
            <View style={[styles.cell, { width: "13%" }]}><Text style={styles.label}>Hora</Text><Text style={styles.value}>{detail.paymentTime || "-"}</Text></View>
            <View style={[styles.cell, styles.totalCell, { width: "21%" }]}><Text style={[styles.label, { color: "#dbe7d7" }]}>VALOR TOTAL</Text><Text style={styles.totalValue}>R$ {detail.totalValue}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "70%" }]}><Text style={styles.label}>ID do pagamento</Text><Text style={styles.value}>{detail.gatewayPaymentId || "Não informado"}</Text></View>
            <View style={[styles.cell, { width: "30%" }]}><Text style={styles.label}>Status na processadora</Text><Text style={styles.value}>{detail.gatewayStatusLabel || "Não informado"}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} minPresenceAhead={70}>VOUCHERS (INGRESSOS E ADICIONAIS)</Text>
          {detail.vouchers.length > 0 && !hasSchoolVoucher ? (
            <View style={styles.tableHeader} minPresenceAhead={50}>
              {([["ID", "8%"], ["CÓDIGO", "15%"], ["VISITA / VALIDADE", "24%"], ["ITEM", "25%"], ["VALOR", "12%"], ["STATUS", "16%"]] as const).map(([label, width]) => (
                <View key={label} style={[styles.tableCell, { width }]}><Text style={styles.tableHeading}>{label}</Text></View>
              ))}
            </View>
          ) : null}
          {detail.vouchers.map((voucher) => {
            const used = voucher.used === "s";
            const invalid = voucher.used === "inv";
            const available = detail.status === "conc" && voucher.used === "n";
            const statusStyle = used ? styles.used : invalid ? styles.invalid : available ? styles.available : styles.unavailable;
            const statusLabel = used ? "USADO" : invalid ? "INVÁLIDO" : available ? "NÃO USADO" : detail.status === "pend" ? "AGUARDANDO CONFIRMAÇÃO" : "INDISPONÍVEL";
            const visit = <View><Text>{voucher.visitDate || "Não informada"}</Text>{voucher.validUntil ? <Text style={styles.secondary}>Válido até {voucher.validUntil}</Text> : null}{voucher.originalDate ? <Text style={styles.secondary}>Reagendado de {voucher.originalDate}</Text> : null}</View>;
            const useDate = used ? <Text style={styles.secondary}>Utilizado em {voucher.usedDate || "data não informada"} às {voucher.usedTime || "horário não informado"}</Text> : null;

            return hasSchoolVoucher ? (
              <View key={voucher.voucherId} style={[styles.voucherCard, statusStyle]} wrap={false}>
                <View style={styles.voucherTop}>
                  <Text style={styles.voucherCode}>Voucher #{voucher.voucherId} - {voucher.voucherNumber || "Sem código"}</Text>
                  <Text style={styles.voucherStatus}>{statusLabel}</Text>
                </View>
                <View style={styles.row}>
                  <View style={[styles.voucherField, { width: "32%" }]}><Text style={styles.label}>VISITA / VALIDADE</Text>{visit}</View>
                  <View style={[styles.voucherField, { width: "48%" }]}><Text style={styles.label}>ITEM</Text><Text style={styles.value}>{voucher.voucherTypeLabel}</Text></View>
                  <View style={{ width: "20%" }}><Text style={styles.label}>VALOR</Text><Text style={styles.value}>R$ {voucher.unitValue}</Text></View>
                </View>
                <View style={styles.voucherMeta}>
                  <View style={[styles.voucherField, { width: "50%" }]}><Text style={styles.label}>ESCOLA</Text><Text style={styles.value}>{voucher.schoolName || "Não informada"}</Text></View>
                  <View style={{ width: "50%" }}><Text style={styles.label}>ALUNO</Text><Text style={styles.value}>{voucher.studentName || "Não informado"}</Text></View>
                </View>
                <View style={styles.voucherMeta}>
                  <View style={[styles.voucherField, { width: "50%" }]}><Text style={styles.label}>TURMA</Text><Text style={styles.value}>{voucher.className || "Não informada"}</Text></View>
                  <View style={{ width: "50%" }}><Text style={styles.label}>PERÍODO</Text><Text style={styles.value}>{voucher.periodName || "Não informado"}</Text></View>
                </View>
                {useDate}
              </View>
            ) : (
              <View key={voucher.voucherId} style={[styles.tableRow, statusStyle]} wrap={false}>
                <View style={[styles.tableCell, { width: "8%" }]}><Text>{voucher.voucherId}</Text></View>
                <View style={[styles.tableCell, { width: "15%" }]}><Text>{voucher.voucherNumber || "Sem código"}</Text></View>
                <View style={[styles.tableCell, { width: "24%" }]}>{visit}</View>
                <View style={[styles.tableCell, { width: "25%" }]}><Text>{voucher.voucherTypeLabel}</Text></View>
                <View style={[styles.tableCell, { width: "12%" }]}><Text>R$ {voucher.unitValue}</Text></View>
                <View style={[styles.tableCell, { width: "16%" }]}><Text style={{ fontWeight: "bold" }}>{statusLabel}</Text>{useDate}</View>
              </View>
            );
          })}
          {!detail.vouchers.length ? <Text style={styles.cell}>Nenhum voucher vinculado a esta compra.</Text> : null}
          <View style={styles.totalBar} wrap={false}><Text>Quantidade de ingressos e adicionais: {detail.vouchers.length}</Text><Text>Valor total: R$ {detail.totalValue}</Text></View>
        </View>

        {usedCount > 0 ? (
          <View style={styles.usedNotice} wrap={false}>
            <Text style={styles.usedTitle}>{usedCount === detail.vouchers.length ? "INGRESSOS JÁ UTILIZADOS" : "INGRESSOS UTILIZADOS"}</Text>
            <Text style={styles.usedText}>{usedCount === detail.vouchers.length ? "Todos os ingressos desta compra já foram utilizados." : `${usedCount} de ${detail.vouchers.length} ingressos desta compra já foram utilizados.`}</Text>
            <Text style={styles.usedText}>Os ingressos marcados como utilizados não poderão ser utilizados novamente.</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Estância Parque Ecológico das Águas. Comprovante de registro da compra e utilização dos ingressos.</Text>
          <Text>Não substitui documento fiscal.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderPainelPurchaseSummaryPdf(detail: PainelPurchaseDetail) {
  return renderToBuffer(<Summary detail={detail} />);
}
