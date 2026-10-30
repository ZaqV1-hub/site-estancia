import Link from "next/link";
import { PanelActionIcon } from "./panel-action-icon";
export function ReportPrintButton({date,search="",origin="all"}:{date:string;search?:string;origin?:string}) {
  const query=new URLSearchParams();
  if(search)query.set("search",search);
  if(origin!=="all")query.set("origin",origin);
  return <Link className="calendar-button-secondary calendar-export-button" href={`/api/painel/agenda/${date}/relatorio${query.size?`?${query}`:""}`} target="_blank" rel="noopener noreferrer"><PanelActionIcon kind="export"/>Exportar relatório</Link>;
}
