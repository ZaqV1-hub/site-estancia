import { LumiInputError } from "@/lib/lumi-catalog";
export function schoolForm(input: Record<string, unknown>) {
  let url: URL;
  try { url = new URL(String(input.form_url ?? "")); } catch { throw new LumiInputError("form_url"); }
  const allowed = new URL(process.env.LUMI_SCHOOL_FORM_ORIGIN ?? "https://estancia.ecologicodasaguas.brevia.company");
  if (url.origin !== allowed.origin || url.username || url.password || url.search || url.hash ||
      !/^\/cliente\/escola\/[A-Za-z0-9_.-]{10,1200}$/.test(url.pathname)) throw new LumiInputError("form_url");
  return { ok: true, form_url: url.toString(), flow: "school_parent_form", purchase_created: false,
    instruction: "Envie este formulário do passeio recebido da escola. O responsável preenche seus dados e os alunos com suas turmas; o e-commerce escolar verifica o passeio e calcula os valores por turma. O retorno não confirma disponibilidade, pagamento ou criação de pedido. Não peça dados de cartão nem nome dos alunos pelo chat. Não substitua por Day Use ou agenda genérica." };
}
