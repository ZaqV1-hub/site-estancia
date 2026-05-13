import { getIngressoDbPool } from "@/lib/ingresso-db";

type PainelHomeEmailErrorRow = {
  filaerro: string | number | null;
};

export type PainelHomeUrlItem = {
  url: string;
  accessCount: number;
};

export type PainelHomePageData = {
  emailErrorCount: number;
  urls: PainelHomeUrlItem[];
};

export async function loadPainelHomePageData(): Promise<PainelHomePageData> {
  const pool = getIngressoDbPool();
  const emailResult = await pool.query<PainelHomeEmailErrorRow>(
    `
      SELECT count(*) AS filaerro
      FROM email
      WHERE stemail = 'nov'
        AND erros > 0
    `,
  );

  return {
    emailErrorCount: Number(emailResult.rows[0]?.filaerro ?? 0),
    urls: [],
  };
}
