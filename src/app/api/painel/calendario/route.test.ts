import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),panel:vi.fn(),month:vi.fn(),day:vi.fn(),save:vi.fn(),revalidate:vi.fn()}));
vi.mock("@/lib/ops-auth",()=>({authenticateOperationsRequest:mocks.auth}));
vi.mock("@/lib/painel-api-auth",()=>({requirePainelApiAccess:mocks.panel}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
vi.mock("@/lib/operational-calendar",async(importOriginal)=>({...await importOriginal<typeof import("@/lib/operational-calendar")>(),getCalendarMonth:mocks.month,getCalendarDay:mocks.day,saveCalendarDate:mocks.save}));
import { GET,POST } from "./route";
describe("calendário exige sessão e identidade do operador",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockReturnValue({ok:true});mocks.panel.mockResolvedValue({ok:true,session:{actorName:"Operador real",actorCpf:"123"}});});
  it("bloqueia sem autenticação antes de consultar dados",async()=>{
    mocks.auth.mockReturnValue({ok:false,response:new Response(null,{status:401})});
    expect((await GET(new Request("http://localhost/api/painel/calendario"))).status).toBe(401);
    expect(mocks.month).not.toHaveBeenCalled();
  });
  it("retorna o mês solicitado e sem cache público",async()=>{
    mocks.month.mockResolvedValue({days:[]});
    const response=await GET(new Request("http://localhost/api/painel/calendario?month=11&year=2026"));
    expect(response.status).toBe(200);expect(mocks.month).toHaveBeenCalledWith(11,2026);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("não aceita ator forjado e exige permissão de escrita",async()=>{
    const input={date:"2026-11-01",status:"abe",validity:"day",passportIds:["adulto"],addonIds:[],actor:{name:"Forjado",cpf:"999"}};
    mocks.save.mockResolvedValue({agendaId:8,date:input.date});
    expect((await POST(new Request("http://localhost/api/painel/calendario",{method:"POST",body:JSON.stringify(input)}))).status).toBe(200);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request),{requiredPermission:"ops.purchases"});
    expect(mocks.save).toHaveBeenCalledWith(input,{name:"Operador real",cpf:"123"});
  });
  it("JSON inválido não executa gravação",async()=>{
    expect((await POST(new Request("http://localhost/api/painel/calendario",{method:"POST",body:"{"}))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("eventos devem passar pelo fluxo de Site, sem vínculos forjados",async()=>{
    expect((await POST(new Request("http://localhost/api/painel/calendario",{method:"POST",body:JSON.stringify({type:"event",eventId:"missing",eventTitle:"Phantom"})}))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
