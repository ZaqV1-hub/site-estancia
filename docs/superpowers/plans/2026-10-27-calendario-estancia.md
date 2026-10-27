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
- Motivo e operador vêm da sessão autenticada. Remanejamento transacional, primeira data original preservada, histórico e envio de e-mail relatados separadamente. E-mail marcado por padrão, confirmado pelo usuário.
- Sem Graphify existente; investigação direta nos arquivos. Modelos dos agentes herdam a sessão, sem troca de provedor/autenticação.

## Execução e propriedade dos arquivos

### T1 — Base, contratos e ambiente (coordenador)
- [x] Ler documentos e regras; conferir branches, IIS e banco.
- [x] Criar banco local isolado com schema/seed existentes e `.env.local` ignorado.
- [x] Baseline: 236 arquivos, 624 testes; 17 arquivos/22 testes falham antes da implementação.
- [x] Definir `src/lib/operational-calendar-contracts.ts`: CalendarValidity, CalendarRule, CalendarPurchase, CalendarSummary, CalendarDay, CalendarMonth, SaveCalendarDateInput, MoveCalendarInput.
- [x] Preparar funções puras de datas/validade com testes antes da implementação.

### T2 — Persistência, relatório e regras (coordenador)
Arquivos: `src/lib/operational-calendar.ts`, `operational-calendar.test.ts`, `operational-calendar-contracts.ts`, `calendar-validity.ts`, `calendar-validity.test.ts`, `src/app/api/painel/calendario/route.ts`, `docs/sql/2026-10-27-operational-calendar.sql`, `src/lib/painel-agenda-product-availability.ts`.
Interfaces: `getCalendarMonth(month, year)`, `getCalendarDay(date)`, `saveCalendarDate(input, actor)`, `getCalendarRule(date, client?)`.
- [x] Escrever testes falhando: soma de pessoas/adicionais por tipo real, centavos, bilheteria/site, cancelados e compra mista.
- [x] Criar migração aditiva de regra_data e metadados de voucher, sem reescrever compras legadas.
- [x] Salvar dia/evento sem tabela de preço na UI; compatibilidade interna resolve referências legadas e mantém oferta antiga quando não configurada.
- [x] Validar data real futura única, status, IDs de catálogo, pelo menos um passaporte e especial restrito a evento.
- [x] Testar regras e transações com banco local; garantir que compra online/bilheteria consumam a oferta persistida.

### T3 — Interface do calendário e base visual (agente calendário)
Arquivos exclusivos: `src/components/painel-shell.tsx`, `src/app/globals.css`, `src/components/operational-calendar.tsx`, `src/components/operational-day-report.tsx`, `src/components/operational-date-editor.tsx`, `src/components/calendar-product-fields.tsx`, seus testes, páginas protegidas de agenda e home. Não alterar backend, eventos, compras ou tipos compartilhados.
- [x] Portar estrutura Rincão, tokens, Rubik existente, tema escuro, navegação/voltar/gaveta, preservando permissões.
- [x] Calendário mensal como home (bilheteria conserva destino), filtros, valores reais, escolha dia/evento, alternância lista.
- [x] Relatório com indicadores, barras, origem, busca, seleção, validade/oferta e links de compra, integração ao formulário de remanejamento de T5.
- [x] Editor tela cheia com oferta, selecionar todos, status/validade e ligação ao catálogo; nenhum preço/tipo/informação legados.
- [x] Testes de renderização/comportamento e responsividade no navegador local.

### T4 — Eventos (agente eventos)
Arquivos exclusivos: `src/components/painel-site-manager.tsx`, `src/components/operational-event-editor.tsx`, novos arquivos em `src/app/painel/(protected)/site/eventos/`, `src/app/api/painel/calendar-events/route.ts`, `src/lib/calendar-events.ts`, seus testes. Coordenar imports sem editar contratos/backend compartilhados.
- [x] Novo evento em tela cheia de 2 passos; calendário preenche tipo/data; externo termina no primeiro passo.
- [x] Limites 52/220 com contadores, imagem/CTA/página, validação HTTP(S), usar conteúdo/upload existente.
- [x] Data publicada usa `saveCalendarDate`, aparece no site e calendário; edição Site modal com Mais detalhes e resumo da regra.
- [x] Testar validações, criação externa/interna, edição e integridade do vínculo de data.

### T5 — Remanejamento, validade e compra/cliente (agente vouchers)
Arquivos exclusivos: `src/lib/calendar-reschedule.ts`, `src/components/calendar-reschedule-dialog.tsx`, `src/app/api/painel/calendario/remanejar/route.ts`, `src/lib/voucher-contracts.ts`, `src/lib/voucher-repository.ts`, `src/lib/purchase-repository.ts`, `src/lib/ops-box-office-sales.ts`, `src/lib/ops-voucher-validation.ts`, `src/components/customer-vouchers-page.tsx`, `src/components/painel-compra-vouchers-page.tsx`, suas rotas auxiliares/testes e novos módulos de e-mail. Não alterar contratos/backend calendário ou CSS compartilhado.
- [x] Portar resumo de notas/compra do Rincão após identificar implementação concreta.
- [x] Seleção de compras ou voucher individual: destino futuro aberto, manter/seguir/definir validade, motivo, aviso de produtos incompatíveis.
- [x] Transação com bloqueio, auditoria, primeira data original preservada e sem modificar preço/valor/situação de compra.
- [x] E-mail usando transporte existente, fora da transação, falhas explícitas sem duplicar remanejamento; não enviar durante testes.
- [x] Aplicar validade de data em novas emissões, impedir uso vencido e exibir cliente/compra com datas reais e histórico.
- [x] Testes falhando primeiro para atomicidade, usados/cancelados, validade, segurança e projeções.

### T6 — Integração, revisão e publicação (coordenador + revisão independente)
- [x] Conferir diffs de cada tarefa e testes; integrar tipos/rotas/componentes.
- [x] Rodar testes afetados, suíte completa comparada ao baseline, lint, TypeScript e build.
- [x] Abrir local com login de teste; validar desktop/celular, calendário/dia/criação/edição/evento/mover/cliente; confirmar totais origem/destino e histórico em banco local.
- [x] Revisão independente somente leitura sobre revisão exata, resolver achados materiais e repetir verificações afetadas.
- [x] Reconfirmar IIS/serviços/workflows e existência de HML Next, sem confundir legado PHP.
- [x] Commit e push para `codex/develop`. Se HML existir, implantar/testar nele; caso contrário concluir toda prova local antes de produção.
- [x] Promover a `main` sem force; preservar checkout/arquivos não versionados da VM e backup de banco/build. Executar migração aditiva e deploy com rollback.
- [x] Smoke test produção sem criar compras, enviar mensagens ou alterar dados reais de clientes; conferir commit/runtime/HTTP/login/agenda.
- [x] Registrar evidências, limites, rollback e pendências reais neste plano; acompanhamento na primeira semana requer uso real, não será simulado.

## Handoff e estado
Concluído: implementação, revisões, validação local, passagem por `codex/develop`, promoção para `main`, migração e deploy na VM. Release de código `db95e26b172cc5820b5cb21fd6ffe6a3f2acab29`, build Windows `GbzAvwneHQMS7jjyGFu7R`, serviço `site-estancia-next` Running. Smoke de produção aprovado, somente leitura; nenhuma compra real ou mensagem criada. Nenhum agente editando. Ambiente local standalone disponível em http://127.0.0.1:3002, com banco isolado `estancia_calendar_local`. Sem pendência de implementação; uso real/SMTP/pagamentos externos permanecem fora dos testes executados.

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

## Publicação concluída — 27/10/2026
- Release `db95e26b172cc5820b5cb21fd6ffe6a3f2acab29` enviado primeiro para `codex/develop`; remoto conferido antes de promover o mesmo commit a `main`, sem force. Checkout local voltou para `develop`.
- Checkout da VM atualizado por fast-forward a partir de `3cf743d311a5779e7d8b59226ac8e60ab89336f9`; alterações locais rastreadas não existiam e diretórios antigos não versionados foram preservados.
- Migração concluída: tabelas de regras/histórico presentes e título da agenda ampliado de 50 para 52, sem reduzir colunas maiores. Oferta legada copiada para `.data/painel-agenda-products.json` estável e para o backup privado.
- `npm ci`, build de produção no Windows, cópia de assets e reinício do serviço concluídos. Build `GbzAvwneHQMS7jjyGFu7R`; `site-estancia-next` Running. Log privado `.local/calendar-validation/production-deploy.log`.
- Smoke HTTP local na VM: início, robots, login, agenda pública 200; calendário sem sessão 401; sessão temporária de gestor mantida somente na memória da VM abriu calendário/API/relatório com 200; `/painel` redirecionou para `/painel/agenda`; resumo mensal/dia idênticos para uma data existente. Nenhum token/CPF/cliente registrado no relatório.
- Domínio HTTPS externo: início, robots, login e API pública 200. Evidências privadas `production-smoke.log` e `production-public.json`.
- Rollback de build disponível em `C:\Sites\AzureIIS\site-estancia\.next-deploy-backup-20261027131638`: parar `site-estancia-next`, preservar o build atual, restaurar esse diretório como `.next` e reiniciar o serviço. Migração aditiva permite manter as novas tabelas em rollback de código. Backup de banco validado em `C:\Users\Administrator\site-estancia-backups\20261027-calendar\database.dump`.
- Não houve HML Next utilizável; testes completos foram locais antes da produção. Não foram disparados pagamentos ou e-mails reais; a configuração SMTP e a primeira operação real seguem sujeitos à infraestrutura externa. Acompanhamento da primeira semana exige uso real e não foi simulado nem agendado.
