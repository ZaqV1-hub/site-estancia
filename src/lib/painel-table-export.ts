import { renderReportDocument, reportTable } from "@/lib/report-document";
import ExcelJS from "exceljs";

export async function exportPainelTable(rows: string[][], title: string, filename: string, format: string | null) {
  if (format === "pdf") {
    const [heading,...details]=title.split(" · ");
    const school=filename.match(/^passeio-(\d+)-(\d+)$/);
    const backHref=school?`/painel/agenda/escolares/${school[1]}/${school[2]}`:filename.includes("vouchers")||filename.includes("ingressos")?"/painel/compras/vouchers":"/painel/compras";
    const body=`<section class="card"><div class="section-head"><h2>Registros do relatório</h2><span class="count">${Math.max(0,rows.length-1)} registros</span></div>${reportTable(rows[0]??[],rows.slice(1))}</section>`;
    return new Response(renderReportDocument({title:heading,subtitle:details.join(" · "),body,backHref}),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório", {views:[{state:"frozen",ySplit:1}]});
  const headers = rows[0] ?? ["Resultado"];
  const numeric = headers.map(name => /^(valor|pessoas|adicionais)/i.test(name));
  const values = rows.slice(1).map(row => row.map((value, index) => {
    if (!numeric[index] || !/^[\d.,]+$/.test(value)) return value;
    const parsed = Number(value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value);
    return Number.isFinite(parsed) ? parsed : value;
  }));
  sheet.addTable({name:"Relatorio",ref:"A1",headerRow:true,style:{theme:"TableStyleMedium4",showRowStripes:true},columns:headers.map(name=>({name,filterButton:true})),rows:values});
  headers.forEach((name, index) => { if (/^valor/i.test(name)) sheet.getColumn(index + 1).numFmt = '"R$" #,##0.00'; });
  sheet.columns.forEach((column,index)=>{column.width=Math.min(48,Math.max(14,...rows.slice(0,500).map(r=>(r[index]??'').length+2)));});
  return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {headers:{"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":`attachment; filename="${filename}.xlsx"`,"cache-control":"no-store"}});
}
