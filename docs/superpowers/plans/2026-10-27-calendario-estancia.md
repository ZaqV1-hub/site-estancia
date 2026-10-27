# Calendário operacional do Estância — plano de implementação

**Objetivo:** executar a especificação e o protótipo HTML fornecidos em 27/10/2026, validando localmente, passando por desenvolvimento e somente depois publicando em produção.
**Arquitetura:** reaproveitar agenda/compra/voucher, catálogo B2C, conteúdo do site, autenticação e auditoria existentes. Persistir regras e remanejamentos em PostgreSQL; preço continua no produto. Componentes do Rincão são referência, preservando negócios e permissões do Estância.
**Stack:** Next.js 16.2.4, React 19, TypeScript, PostgreSQL, Vitest, IIS/Node Windows.
**Referências:** `/Users/juansouza/Downloads/Documento de Especificação.html`, `/Users/juansouza/Downloads/Protótipo Calendário Estância.html`, `/Users/juansouza/new_rincao_site`.

## Restrições e decisões
- Autorizado pelo usuário: planejar, implementar, testar, publicar em desenvolvimento; com verificações aprovadas, publicar produção. Sem nova aprovação rotineira.
- Branch local `develop` em 3cf743d; remoto existente `codex/develop` (70 commits atrás). Publicar primeiro em `codex/develop`, depois `main`, sem force push.
- Produção confirmada: `C:\Sites\AzureIIS\site-estancia`, IIS -> localhost:3001, serviço site-estancia-next. HML PHP encontrado pertence a outro repositório; confirmar se existe HML do Next antes da publicação.
- Testes locais usam apenas `estancia_calendar_local`, localhost:5432; SMTP, ticket API, pagamentos e WhatsApp não são acionados.
- Fonte Rubik, tokens verdes e laranja para eventos; menu 260px/gaveta <1250px; calendário móvel em 2 colunas, sem dias vazios.
- B2C apenas. Nenhum preço por data; catálogo real do banco preservado. Não criar novos produtos, escolas/grupos, auto reagendamento, WhatsApp ou exportação.
- Validades: day (só no dia), 1d, 7d, 30d, 6m. Prazo contado da visita, inclusive; 1d termina no próprio dia; 6m limita o dia ao último dia do mês.
- Alterar oferta só afeta próximas compras; vouchers vendidos mantêm preço/validade. Remover produto de destino gera aviso, não invalida compra já vendida. Usados/cancelados não podem mover.
- Origem do calendário/relatório é a mesma consulta sobre vouchers e data da agenda, sem contagens fictícias. Compra mista entre datas contabiliza vouchers de cada data, sem multiplicar valor da compra.
- Motivo e operador vêm da sessão autenticada. Remanejamento transacional, primeira data original preservada, histórico e envio de e-mail relatados separadamente. E-mail por padrão depende da resposta pendente do usuário.
- Sem Graphify existente; investigação direta nos arquivos. Modelos dos agentes herdam a sessão, sem troca de provedor/autenticação.

## Execução e propriedade dos arquivos

### T1 — Base, contratos e ambiente (coordenador)
- [x] Ler documentos e regras; conferir branches, IIS e banco.
- [x] Criar banco local isolado com schema/seed existentes e `.env.local` ignorado.
- [x] Baseline: 236 arquivos, 624 testes; 17 arquivos/22 testes falham antes da implementação.
- [ ] Definir `src/lib/operational-calendar-contracts.ts`: CalendarValidity, CalendarRule, CalendarPurchase, CalendarSummary, CalendarDay, CalendarMonth, SaveCalendarDateInput, MoveCalendarInput.
- [ ] Preparar funções puras de datas/validade com testes antes da implementação.

### T2 — Persistência, relatório e regras (coordenador)
Arquivos: `src/lib/operational-calendar.ts`, `operational-calendar.test.ts`, `operational-calendar-contracts.ts`, `calendar-validity.ts`, `calendar-validity.test.ts`, `src/app/api/painel/calendario/route.ts`, `docs/sql/2026-10-27-operational-calendar.sql`, `src/lib/painel-agenda-product-availability.ts`.
Interfaces: `getCalendarMonth(month, year)`, `getCalendarDay(date)`, `saveCalendarDate(input, actor)`, `getCalendarRule(date, client?)`.
- [ ] Escrever testes falhando: soma de pessoas/adicionais por tipo real, centavos, bilheteria/site, cancelados e compra mista.
- [ ] Criar migração aditiva de regra_data e metadados de voucher, sem reescrever compras legadas.
- [ ] Salvar dia/evento sem tabela de preço na UI; compatibilidade interna resolve referências legadas e mantém oferta antiga quando não configurada.
- [ ] Validar data real futura única, status, IDs de catálogo, pelo menos um passaporte e especial restrito a evento.
- [ ] Testar regras e transações com banco local; garantir que compra online/bilheteria consumam a oferta persistida.

### T3 — Interface do calendário e base visual (agente calendário)
Arquivos exclusivos: `src/components/painel-shell.tsx`, `src/app/globals.css`, `src/components/operational-calendar.tsx`, `src/components/operational-day-report.tsx`, `src/components/operational-date-editor.tsx`, `src/components/calendar-product-fields.tsx`, seus testes, páginas protegidas de agenda e home. Não alterar backend, eventos, compras ou tipos compartilhados.
- [ ] Portar estrutura Rincão, tokens, Rubik existente, tema escuro, navegação/voltar/gaveta, preservando permissões.
- [ ] Calendário mensal como home (bilheteria conserva destino), filtros, valores reais, escolha dia/evento, alternância lista.
- [ ] Relatório com indicadores, barras, origem, busca, seleção, validade/oferta e links de compra, integração ao formulário de remanejamento de T5.
- [ ] Editor tela cheia com oferta, selecionar todos, status/validade e ligação ao catálogo; nenhum preço/tipo/informação legados.
- [ ] Testes de renderização/comportamento e responsividade no navegador local.

### T4 — Eventos (agente eventos)
Arquivos exclusivos: `src/components/painel-site-manager.tsx`, `src/components/operational-event-editor.tsx`, novos arquivos em `src/app/painel/(protected)/site/eventos/`, `src/app/api/painel/calendar-events/route.ts`, `src/lib/calendar-events.ts`, seus testes. Coordenar imports sem editar contratos/backend compartilhados.
- [ ] Novo evento em tela cheia de 2 passos; calendário preenche tipo/data; externo termina no primeiro passo.
- [ ] Limites 52/220 com contadores, imagem/CTA/página, validação HTTP(S), usar conteúdo/upload existente.
- [ ] Data publicada usa `saveCalendarDate`, aparece no site e calendário; edição Site modal com Mais detalhes e resumo da regra.
- [ ] Testar validações, criação externa/interna, edição e integridade do vínculo de data.

### T5 — Remanejamento, validade e compra/cliente (agente vouchers)
Arquivos exclusivos: `src/lib/calendar-reschedule.ts`, `src/components/calendar-reschedule-dialog.tsx`, `src/app/api/painel/calendario/remanejar/route.ts`, `src/lib/voucher-contracts.ts`, `src/lib/voucher-repository.ts`, `src/lib/purchase-repository.ts`, `src/lib/ops-box-office-sales.ts`, `src/lib/ops-voucher-validation.ts`, `src/components/customer-vouchers-page.tsx`, `src/components/painel-compra-vouchers-page.tsx`, suas rotas auxiliares/testes e novos módulos de e-mail. Não alterar contratos/backend calendário ou CSS compartilhado.
- [ ] Portar resumo de notas/compra do Rincão após identificar implementação concreta.
- [ ] Seleção de compras ou voucher individual: destino futuro aberto, manter/seguir/definir validade, motivo, aviso de produtos incompatíveis.
- [ ] Transação com bloqueio, auditoria, primeira data original preservada e sem modificar preço/valor/situação de compra.
- [ ] E-mail usando transporte existente, fora da transação, falhas explícitas sem duplicar remanejamento; não enviar durante testes.
- [ ] Aplicar validade de data em novas emissões, impedir uso vencido e exibir cliente/compra com datas reais e histórico.
- [ ] Testes falhando primeiro para atomicidade, usados/cancelados, validade, segurança e projeções.

### T6 — Integração, revisão e publicação (coordenador + revisão independente)
- [ ] Conferir diffs de cada tarefa e testes; integrar tipos/rotas/componentes.
- [ ] Rodar testes afetados, suíte completa comparada ao baseline, lint, TypeScript e build.
- [ ] Abrir local com login de teste; validar desktop/celular, calendário/dia/criação/edição/evento/mover/cliente; confirmar totais origem/destino e histórico em banco local.
- [ ] Revisão independente somente leitura sobre revisão exata, resolver achados materiais e repetir verificações afetadas.
- [ ] Reconfirmar IIS/serviços/workflows e existência de HML Next, sem confundir legado PHP.
- [ ] Commit e push para `codex/develop`. Se HML existir, implantar/testar nele; caso contrário concluir toda prova local antes de produção.
- [ ] Promover a `main` sem force; preservar checkout/arquivos não versionados da VM e backup de banco/build. Executar migração aditiva e deploy com rollback.
- [ ] Smoke test produção sem criar compras, enviar mensagens ou alterar dados reais de clientes; conferir commit/runtime/HTTP/login/agenda.
- [ ] Registrar evidências, limites, rollback e pendências reais neste plano; acompanhamento na primeira semana requer uso real, não será simulado.

## Handoff e estado
Implementação T2–T5 integrada. 704/704 testes passaram às12:59, 8 cenários integração HTTP/banco reais locais passaram (inclui título52), TypeScript/lint sem erros. Em andamento: correções da revisão independente. T2:5achados corrigidos (escritorlegado validado, APIeventoseparada, ACL, título52, arredondamento gratuito). UI events corrige statuslot, loopACL, darklegado, modalnativo, texto/arquivo evento. vouchers corrige editar validade mantendo visita atual e campos no PDFcliente. Local: processo dev sessão 25386 porta3002. Usuário confirmou e-mail marcado por padrão. Baseline JSON /tmp/estancia-baseline.json e log /tmp/estancia-baseline-output.log. Nenhum arquivo de produção alterado. Nenhum push/deploy realizado. Recursos: banco local `estancia_calendar_local`; servidor local previsto porta 3002; `.next` e Git exclusivos do coordenador. Testes unitários dos agentes não fazem build nem usam banco/portas compartilhados.

## Evidências de conclusão local — 27/10/2026
- 721/721 testes passaram, incluindo regressões da revisão; relatório `.local/calendar-validation/unit-tests.json` (não versionado).
- Build de produção Next16.2.4 e TypeScript passaram; 129 páginas estáticas geradas e rotas dinâmicas compiladas; `.local/calendar-validation/build.log`.
- ESLint passou sem erros. Avisos restantes de `<img>`/hook preexistentes e previews de upload, sem novas dependências.
- 10 cenários HTTP/PostgreSQL passaram também contra runtime standalone compilado: sessão, datas válidas/duplicadas, título52/eventos internos/externos/URL segura, mesmos totais calendário/dia, lote/aviso/auditoria, operação repetida/usado sem parcial, validade individual na visita atual fechada, área do cliente e PDF real.
- Navegador: desktop1440 e celular390, claro/escuro; calendário móvel2colunas, vazios ocultos, página sem scroll horizontal. Corrigido min-width de grid legado que expandia tabela além da página; tabela continua com scroll próprio.
- Modal de evento tem nome/foco/escape nativos. Relatório exibe conteúdo de página e não aponta edição para evento arquivado.
- Duas revisões independentes cobriram backend, UI e vouchers; todos os achados materiais foram corrigidos e reavaliados no escopo dos ajustes.
- Sem HML Next: IIS/serviços/pastas confirmados; sites HML existentes são PHP de outro repo. Nenhum workflow GitHubActions neste repo.
- Backup completo produção criado antes da mudança, validado via pg_restore numa base local descartável e copiado para `C:\Users\Administrator\site-estancia-backups\20261027-calendar\database.dump`. Restaurar banco não é necessário para rollback de código: migração é aditiva.
- Oferta legada encontrada apenas em `.next/standalone/.data/painel-agenda-products.json` na VM. No deploy será copiada para `.data/` da raiz antes de trocar build, preservando o arquivo original e backup. Código passa a respeitar ESTANCIA_SITE_STORAGE_ROOT para essa leitura.
- SMTP externo e pagamento real não acionados nos testes. Fila e falhas de e-mail verificadas sem simular envio. Catálogo de produção preservado (15produtos), exemplos do documento não substituíram produtos/preços.

## Publicação — em andamento
Próxima ação: commit/push em codex/develop, conferir SHA remoto, promover mesmo commit para main sem force e executar migração/deploy Windows com build anterior preservado. Depois smoke HTTP e leitura autenticada usando sessão temporária somente dentro da VM, sem gravar compras/vouchers reais.
