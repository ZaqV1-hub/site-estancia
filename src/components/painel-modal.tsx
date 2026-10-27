"use client";

import { useEffect, useId, useRef } from "react";

type PainelModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function PainelModal({ title, open, onClose, children }: PainelModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    if (!element.open) element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return <dialog ref={dialog} className="painel-modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="painel-modal-header">
      <h2 id={titleId} className="text-xl font-bold">{title}</h2>
      <button type="button" autoFocus aria-label="Fechar janela" onClick={onClose} className="calendar-icon-button">×</button>
    </header>
    <div className="painel-modal-body">{children}</div>
  </dialog>;
}
