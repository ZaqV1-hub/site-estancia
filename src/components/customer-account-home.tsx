import Link from "next/link";
import { IngressoShell } from "@/components/ingresso-shell";
import type { CustomerAccountSnapshot } from "@/lib/user-repository";

type CustomerAccountHomeProps = {
  snapshot: CustomerAccountSnapshot;
};

function valueOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatAddress(snapshot: CustomerAccountSnapshot) {
  const parts = [
    snapshot.profile.address,
    snapshot.profile.district,
    snapshot.profile.cityName,
    snapshot.profile.uf,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (snapshot.profile.number?.trim()) {
    parts.push(snapshot.profile.number.trim());
  }

  return parts.length > 0 ? parts.join(" - ") : "-";
}

export function CustomerAccountHome({ snapshot }: CustomerAccountHomeProps) {
  return (
    <IngressoShell active="account" user={snapshot.profile}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-6">
        <section className="mt-6 rounded-[28px] border border-[#d6e5ef] bg-white p-6 text-left shadow-[0_16px_38px_rgba(17,66,97,0.09)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="legacy-rounded text-[30px] leading-tight text-[#1d5b80]">
              Meus Dados
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/minha-conta/editar"
                className="legacy-rounded inline-flex rounded-full border border-[#c8d9e5] px-4 py-2 text-[14px] text-[#285878] hover:bg-[#f3f9fd]"
              >
                Alterar meus dados
              </Link>
              <Link
                href="/minha-conta/alterar-senha"
                className="legacy-rounded inline-flex rounded-full border border-[#c8d9e5] px-4 py-2 text-[14px] text-[#285878] hover:bg-[#f3f9fd]"
              >
                Alterar senha
              </Link>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[22px] border border-[#dce8f0]">
            <table className="w-full border-collapse">
              <tbody className="text-left text-[15px] text-[#3f5c72]">
                <tr className="border-b border-[#e7eff5]">
                  <td className="w-1/2 px-5 py-4 align-top">
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      Nome
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {snapshot.profile.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      E-mail
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {snapshot.profile.email ? (
                        <a
                          href={`mailto:${snapshot.profile.email}`}
                          className="text-[#1d5b80] underline underline-offset-2"
                        >
                          {snapshot.profile.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  </td>
                </tr>
                <tr className="border-b border-[#e7eff5]">
                  <td className="px-5 py-4 align-top">
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      Endereco Completo
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {formatAddress(snapshot)}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      CEP
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {valueOrDash(snapshot.profile.cep)}
                    </p>
                  </td>
                </tr>
                <tr className="border-b border-[#e7eff5]">
                  <td className="px-5 py-4 align-top">
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      Telefone
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {valueOrDash(snapshot.profile.phone)}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      Celular
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {valueOrDash(snapshot.profile.mobile)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 align-top" colSpan={2}>
                    <p className="legacy-rounded text-[12px] uppercase tracking-[0.16em] text-[#7a91a4]">
                      Tipo de usuario
                    </p>
                    <p className="mt-2 text-[17px] text-[#204e6b]">
                      {snapshot.userType}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {snapshot.agreements.length > 0 ? (
          <section className="mt-6 rounded-[28px] border border-[#d6e5ef] bg-white p-6 text-left shadow-[0_16px_38px_rgba(17,66,97,0.09)]">
            <h3 className="legacy-rounded text-[24px] text-[#1d5b80]">
              Lista de convenios
            </h3>
            <div className="mt-4 overflow-hidden rounded-[22px] border border-[#dce8f0]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f6fbff]">
                    <th className="px-5 py-3 text-left text-[13px] font-normal uppercase tracking-[0.16em] text-[#7590a5]">
                      Convenio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.agreements.map((agreement) => (
                    <tr
                      key={agreement.id}
                      className="border-t border-[#e7eff5] text-[16px] text-[#204e6b]"
                    >
                      <td className="px-5 py-4">{agreement.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </IngressoShell>
  );
}
