"use client";

import type { ReactNode } from "react";
import { PainelModal } from "@/components/painel-modal";
import styles from "./painel-confirmation-modal.module.css";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  pending: boolean;
  disabled?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function PainelConfirmationModal({ open, title, children, pending, disabled = false, error, onClose, onConfirm }: Props) {
  return <PainelModal open={open} title={title} onClose={() => { if (!pending) onClose(); }}>
    <div className={styles.content} aria-busy={pending}>
      <div className={styles.description}>{children}</div>
      {error && <p className="calendar-error" role="alert">{error}</p>}
      <footer className={styles.actions}>
        <button className="calendar-button-secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button className="calendar-button" type="button" disabled={pending || disabled} onClick={onConfirm}>{pending ? "Validando…" : "Confirmar validação"}</button>
      </footer>
    </div>
  </PainelModal>;
}
