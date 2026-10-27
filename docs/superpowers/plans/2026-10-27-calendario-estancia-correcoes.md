# Correções de produção e fidelidade ao protótipo

Objetivo: resolver os seis achados da auditoria e reproduzir a composição das telas do protótipo, preservando contratos, catálogo e dados vendidos.
Referências: arquivos HTML do usuário em Downloads; auditoria privada `.local/calendar-validation/production-audit.md`; plano original `2026-10-27-calendario-estancia.md`.
Base: `b093b9b`; checkout `develop`, tracking `origin/codex/develop`, sem alterações iniciais. Execução, push develop, promoção main e deploy autorizados expressamente pelo usuário em27/10.

## Regras e decisões
- Protótipo como referência visual direta: menu Agenda/Início primeiro, marca172px, barra60px, conteúdo20px32px, card24px26px, título24px, controles segmentados, mês à esquerda/filtros à direita, células vazias64px, abertas112px.
- Mesmo conteúdo/fluxos, sem copiar dados fictícios nem navegação inferior exclusiva do protótipo. Preservar controles financeiros/ACL existentes e preços reais. Valores divergentes do documento não serão alterados.
- Temas claro/escuro usam exatamente os tokens do protótipo, inclusive contraste. Sem cores literais nas telas ajustadas.
- Desenvolvimento no checkout develop escolhido pelo usuário. Nenhum worktree/hook novo. Coordenador possui Git, CSS global, builds, banco local e porta3002.
- Agentes herdam modelo/autenticação da sessão; sem política autorizada para trocar modelo/provedor. Um escritor por arquivo. Agentes não fazem commit/push/build/deploy nem usam banco/portas.
- Regressões lógicas com teste falhando antes da correção. Ajustes visuais comprovados no navegador comparando viewport/estilos/screenshot, sem testes que espelhem CSS.
- Não disparar pagamentos/SMTP externos. Produção pós-deploy: leitura e navegação, sem alterar compras reais. Fluxo mutável completo validado no banco local isolado.

## T1 — Lista e filtros de compras
Arquivos exclusivos: `src/lib/painel-compras.ts`, `src/components/painel-compras-page.tsx` e testes correspondentes. Preservar demais contratos/exportação e callers de filtros. Adicionar filtros de situação de vouchers (reagendadas/disponíveis/utilizadas), aplicar intervalo de visita por existência de voucher na data (compra mista correta), apresentar origem/pessoas/valor/situação no padrão do protótipo.
- [x] Testes de intervalo/compra mista/situação e lista; reproduzir falha.
- [x] Correção mínima compartilhada e interface coerente; testes afetados verdes.

## T2 — Eventos existentes, edição e modal
Arquivos exclusivos: `src/lib/operational-calendar.ts`, `src/lib/calendar-events.ts`, `src/components/operational-event-editor.tsx`, `src/components/painel-site-manager.tsx` e testes correspondentes. Relacionar evento existente pela data de seu link sem escrever durante leitura; mês e dia usam mesma regra, com evento/laranja/título/texto. Permitir editar evento legado vinculado por URL, sem tomar data de outro evento. Validade editável no modal afeta apenas próximas emissões. Campos/etapas/listagem no padrão do protótipo; preservar fotos e operações de atrações/banner.
- [x] Regressões de evento ligado a agenda padrão, arquivado/conflito, edição e validade; falha antes da correção.
- [x] Compatibilidade sem truncar texto legado; mudanças de limite pedem ação explícita no formulário. Testes verdes.

## T3 — Detalhe B2C da compra
Arquivos exclusivos: `src/components/painel-compra-detail-page.tsx`, `src/components/painel-compra-detail-actions.tsx`, `src/components/painel-compra-history-actions.tsx`, `src/components/calendar-purchase-actions.tsx`, `src/components/calendar-reschedule-dialog.tsx` e testes correspondentes. Reproduzir compra do protótipo: resumo comprador/visita/validade/pessoas/valor/situação, passaportes e adicionais separados, histórico na mesma tela, ações existentes preservadas. Omitir campos escolares somente quando não houver dados escolares. Sem fontes monospace/cores literais; tabelas com largura interna suficiente e rolagem própria. Modal traz resumo de pessoas/valor, e-mail padrão verdadeiro.
- [x] Regressões de dados B2C/escolares/ações/validade, sem remover proteções de vouchers.
- [x] Ajustar estrutura para classes `calendar-*`; comunicar classes novas ao coordenador; testes afetados verdes.

## T4 — Composição visual e integração (coordenador)
Arquivos: `src/components/operational-calendar.tsx`, `operational-day-report.tsx`, `operational-date-editor.tsx`, `calendar-product-fields.tsx`, `painel-shell.tsx`, `src/app/globals.css`, respectivos testes; scripts de integração locais.
- [x] Calendário e shell iguais ao protótipo: geometria, ordem, tipografia, filtros, chips, legenda e estados vazios/fechados.
- [x] Relatório: cabeçalho no card, KPIs e divisão de origem juntos, barras com rótulo/valor na linha, regra e lista no padrão; editor e formulário iguais aos desenhos.
- [x] Tokens claros/escuros do protótipo e estilos comuns de tabela/formulário/modal, sem overflow da página.
- [x] Verificar integração entre tarefas; revisão independente somente leitura e resolver achados materiais.

## T5 — Prova e publicação
- [x] Build/types/lint e suíte completa; integrações reais no Postgres local incluindo regressões de legado e filtro; sem SMTP/pagamentos reais.
- [x] Navegador local em1440×1000 e390×844, temas claro/escuro; comparar todas as telas principais com HTML, conferir contraste e largura das tabelas.
- [ ] Backup atual de banco/build da VM, branch limpa, release base conferida. Push `codex/develop`, conferir SHA; promoção `main` sem force; deploy com rollback.
- [ ] Navegador no domínio real: evento01/11 laranja e relatório, lista por data efetivamente filtrada, detalhe escuro legível, modal de validade, calendário e compra fiéis ao protótipo, console/HTTP sem falhas. Encerrar sessão temporária.
- [ ] Registrar evidências e limites reais; não alegar validação mutável em produção se ela só ocorreu localmente.

## Estado / handoff
Implementação integrada; revisões independentes concluídas, incluindo filtros, eventos e revisão final. Achados resolvidos: filtros/valor por data, propriedade do vínculo interno, abertura mobile e classificação única de catálogo no detalhe. Sem pendências materiais de revisão.

Verificado: 791/791 testes unitários, TypeScript, ESLint (0 erros; avisos anteriores de imagens/hooks), build standalone e 15 integrações HTTP/Postgres reais. Evidências privadas: corrections-unit-tests.json, corrections-lint.log, corrections-build.log, corrections-integration.log e relatórios de revisão em .local/calendar-validation/.

Navegador local: criação de day use 01/12 e evento 02/12 em duas etapas; edição de evento para 30 dias; lote 4 vouchers/2 compras para01/12 (R$218), exceção individual de validade e histórico, área do cliente mostrando original/nova/validade, modal e-mail marcado. Testes usam apenas estancia_calendar_local e SMTP desabilitado. Tema escuro: tabela detalhe contraste10,61:1 e cabeçalho12,18:1. Calendário e compra mobile390px sem overflow; relatório corrigido com containing block na rolagem interna (sr-only escapava); reconferido no build final:390px de viewport e390px de documento, rolagem restrita à tabela.

VM reconferida: main b093b9b, serviço Running, build GbzAvwneHQMS7jjyGFu7R, oferta estável preservada. Sem HML Next; HML PHP pertence ao legado. Backup novo de banco completo207093bytes/467entradas, pg_restore --list validado, cópia privada local e C:\Users\Administrator\site-estancia-backups\20261027-corrections\database.dump. Nenhuma migração nova nesta correção. Checkout da VM sem alterações rastreadas; backups antigos não rastreados preservados.

Próxima ação: concluir reconferência CSS compilado, commit/push codex/develop → main, deploy Windows com backup/rollback e auditoria no domínio real. Nenhuma mudança publicada ainda.
