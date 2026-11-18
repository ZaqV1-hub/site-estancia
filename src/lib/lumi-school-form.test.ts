import { describe,it,expect } from "vitest";
import { schoolForm } from "./lumi-school-form";
describe("school parent form",()=>{
 it("returns only the received school form, without creating a purchase or setting a price",()=>{
  const url="https://estancia.ecologicodasaguas.brevia.company/cliente/escola/example_test_token";
  expect(schoolForm({form_url:url})).toMatchObject({form_url:url,purchase_created:false});
 });
 it("rejects external sites, credentials, alternate paths and injected query strings",()=>{
  for(const url of ["https://evil.example/cliente/escola/example_test_token","https://user@estancia.ecologicodasaguas.brevia.company/cliente/escola/example_test_token","https://estancia.ecologicodasaguas.brevia.company/painel","https://estancia.ecologicodasaguas.brevia.company/cliente/escola/example_test_token?price=1"])
    expect(()=>schoolForm({form_url:url})).toThrow();
 });
});
