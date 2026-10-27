"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PainelCompraDetailActionsProps = {
  purchaseId: number;
  voucherIds: number[];
  actorName: string | null;
  actorCpf: string | null;
  canManageHistory: boolean;
};

async function readErrorPayload(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export function PainelCompraDetailActions({
  purchaseId,
  voucherIds,
  actorName,
  actorCpf,
}: PainelCompraDetailActionsProps) {
  const router = useRouter();
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappSuccess, setWhatsappSuccess] = useState<string | null>(null);

  async function handleSendWhatsapp() {
    setSendingWhatsapp(true);
    setWhatsappError(null);
    setWhatsappSuccess(null);

    try {
      const response = await fetch(
        `/api/painel/bilheteria/purchases/${purchaseId}/whatsapp`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: whatsappPhone,
            voucherIds,
            actor: {
              name: actorName,
              cpf: actorCpf,
            },
          }),
        },
      );

      if (!response.ok) {
        setWhatsappError(
          await readErrorPayload(
            response,
            "Nao foi possivel enviar os ingressos por WhatsApp agora.",
          ),
        );
        return;
      }

      setWhatsappSuccess("Ingressos enviados por WhatsApp com sucesso.");
      setWhatsappOpen(false);
      router.refresh();
    } finally {
      setSendingWhatsapp(false);
    }
  }

  return (
    <>
      <div className="calendar-card">
        <p className="calendar-eyebrow">Ingressos</p><h2>Ações</h2>
        <div className="calendar-purchase-ticket-actions">
          <a
            className="calendar-button-secondary"
            href={`/painel/bilheteria/compras/${purchaseId}/imprimir`}
            rel="noreferrer"
            target="_blank"
          >
            Imprimir QR-Codes
          </a>
          <button
            className="calendar-button"
            disabled={voucherIds.length === 0}
            onClick={() => setWhatsappOpen(true)}
            type="button"
          >
            Enviar por WhatsApp
          </button>
        </div>

        {whatsappSuccess ? (
          <div className="calendar-success">
            {whatsappSuccess}
          </div>
        ) : null}
      </div>

      {whatsappOpen ? (
        <div className="calendar-modal-overlay">
          <div className="calendar-card calendar-whatsapp-dialog">
            <div className="calendar-section-header">
              <h3 id="whatsapp-dialog-title">
                Enviar ingressos por WhatsApp
              </h3>
              <button
                className="calendar-button-secondary"
                onClick={() => setWhatsappOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>
            <label className="calendar-field">
              Telefone com DDD
              <input
                className="calendar-input"
                onChange={(event) => setWhatsappPhone(event.target.value)}
                placeholder="11999999999"
                type="tel"
                value={whatsappPhone}
              />
            </label>
            {whatsappError ? (
              <div className="calendar-error">
                {whatsappError}
              </div>
            ) : null}
            <button
              className="calendar-button"
              disabled={sendingWhatsapp || whatsappPhone.trim() === ""}
              onClick={() => void handleSendWhatsapp()}
              type="button"
            >
              {sendingWhatsapp ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
