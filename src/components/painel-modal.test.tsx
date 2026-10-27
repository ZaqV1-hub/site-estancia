import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PainelModal } from "./painel-modal";
it("uses a native labeled modal dialog and an accessible close button",()=>{
  const html=renderToStaticMarkup(<PainelModal title="Editar evento" open onClose={vi.fn()}><p>Conteúdo</p></PainelModal>);
  expect(html).toContain("<dialog");
  expect(html).toContain("aria-labelledby=");
  expect(html).toContain('aria-label="Fechar janela"');
});
