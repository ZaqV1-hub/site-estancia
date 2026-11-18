import type { ReactNode } from "react";
import { ValidateTicketsButton } from "@/components/validate-tickets-button";
import styles from "./painel-compra-detail-actions.module.css";

type Props = {
  purchaseId: number;
  validatableTicketIds?: number[];
  children?: ReactNode;
};

export function PainelCompraDetailActions({ purchaseId, validatableTicketIds, children }: Props) {
  return <div className={styles.actions} role="group" aria-label="Ações da compra">
    {children}
    {validatableTicketIds && <ValidateTicketsButton voucherIds={validatableTicketIds} label="Validar todos os ingressos" />}
    <a className="calendar-button-secondary" href={`/painel/bilheteria/compras/${purchaseId}/imprimir`} rel="noreferrer" target="_blank">Imprimir QR-Codes</a>
    <a className="calendar-button" href={`/api/painel/compras/${purchaseId}/resumo`} rel="noreferrer" target="_blank">Gerar Resumo</a>
  </div>;
}
