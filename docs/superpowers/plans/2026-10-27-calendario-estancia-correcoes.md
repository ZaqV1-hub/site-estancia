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
- [x] Backup atual de banco/build da VM, branch limpa, release base conferida. Push `codex/develop`, conferir SHA; promoção `main` sem force; deploy com rollback.
- [x] Navegador no domínio real: evento01/11 laranja e relatório, lista por data efetivamente filtrada, detalhe escuro legível, modal de validade, calendário e compra fiéis ao protótipo, console/HTTP sem falhas. Encerrar sessão temporária.
- [x] Registrar evidências e limites reais; não alegar validação mutável em produção se ela só ocorreu localmente.

## Estado / handoff
Implementação integrada; revisões independentes concluídas, incluindo filtros, eventos e revisão final. Achados resolvidos: filtros/valor por data, propriedade do vínculo interno, abertura mobile e classificação única de catálogo no detalhe. Sem pendências materiais de revisão.

Verificado: 791/791 testes unitários, TypeScript, ESLint (0 erros; avisos anteriores de imagens/hooks), build standalone e 15 integrações HTTP/Postgres reais. Evidências privadas: corrections-unit-tests.json, corrections-lint.log, corrections-build.log, corrections-integration.log e relatórios de revisão em .local/calendar-validation/.

Navegador local: criação de day use 01/12 e evento 02/12 em duas etapas; edição de evento para 30 dias; lote 4 vouchers/2 compras para01/12 (R$218), exceção individual de validade e histórico, área do cliente mostrando original/nova/validade, modal e-mail marcado. Testes usam apenas estancia_calendar_local e SMTP desabilitado. Tema escuro: tabela detalhe contraste10,61:1 e cabeçalho12,18:1. Calendário e compra mobile390px sem overflow; relatório corrigido com containing block na rolagem interna (sr-only escapava); reconferido no build final:390px de viewport e390px de documento, rolagem restrita à tabela.

VM reconferida: main b093b9b, serviço Running, build GbzAvwneHQMS7jjyGFu7R, oferta estável preservada. Sem HML Next; HML PHP pertence ao legado. Backup novo de banco completo207093bytes/467entradas, pg_restore --list validado, cópia privada local e C:\Users\Administrator\site-estancia-backups\20261027-corrections\database.dump. Nenhuma migração nova nesta correção. Checkout da VM sem alterações rastreadas; backups antigos não rastreados preservados.

Execução concluída. Código final c5b8586 publicado passando por codex/develop e main; checkout local voltou para develop. Registro final abaixo.


## Publicação e conferência no domínio
- Release funcional9ef8966 passou por codex/develop e main, ambas conferidas no remoto; VM atualizada sem force. Build Windows5YZOlXX9zE5WpZPK1KdD7, serviço Running, health200, oferta estável preservada. Build anterior preservado em .next-deploy-backup-20261027161344.
- Smoke real:14 respostas verificadas, APIs protegidas401 sem sessão; calendário e relatório de01/11 reconhecem evento/título e6meses legados. Lista por visita retorna3compras/13pessoas/R$779,00, batendo com o relatório; PDF autenticado válido.
- Navegador HTTPS: calendário/evento/report/lista/detalhe/Site, desktop1440 e mobile390, claro/escuro, sem erros de console; detalhe com5colunas B2C e tabelas legíveis. Modal preserva resumo legado e oferece validade editável, sem enviar POST real.
- Ajuste final identificado na barra de origem100%: style SSR comprimido sem espaço não correspondia ao seletor de padding0; incluir ambas as serializações e verificar largura0 no build local antes de republicar. Nenhuma regra de negócio alterada.
- Pendência externa ao escopo visual/fluxos: npm audit --omit=dev apontou9alertas (1crítico,5altos,3moderados) nas versões preexistentes, incluindo Next16.2.4 em Windows. Aviso confirmado: https://github.com/advisories/GHSA-p293-qw3h-jr36. Atualização de dependências exige ciclo separado; não foi executada nem alegada nesta entrega.


## Encerramento verificado
- Código final: c5b8586e716c1e38591a3556039a77ee802dbf0f. Build produção Lv1d_BPqlHjUP8435-xQF, serviço Running e health200. Rollback imediato de build em C:\Sites\AzureIIS\site-estancia\.next-deploy-backup-20261027162146 (versão9ef8966); backup anterior à correção em .next-deploy-backup-20261027161344. Banco e oferta privados preservados.
- Ajuste0% comprovado no CSS compilado: largura0px para segmento sem vendas, inclusive estilo SSR width:0%. Em produção01/11: segmentos1062/0px desktop e324/0px mobile; documento1440/390px corresponde ao viewport, sem rolagem horizontal da página.
- Após build final: domínio real com evento/report/lista/detalhe legível; console sem erros/avisos na amostra. Sessão temporária do navegador encerrada e API protegida401 conferida. Autenticação de produção via sessão assinada curta de gestor ativo, sem reset de senha; login por CPF/senha não retestado. Login local por credenciais testado.
- Não houve mutação de compras/vouchers/eventos reais, nem pagamentos/SMTP externos. Gravações e fluxo completo foram validados exclusivamente na base local. Não há HML Next utilizável. Preços/faixas reais foram mantidos.
- Evidências privadas: corrections-final-production-deploy.log, corrections-final-production-smoke.json, corrections-local-evidence.json e relatórios de revisão em .local/calendar-validation. Local continua em http://localhost:3002/painel com runtime standalone (PID63202 na conclusão).
- Ocorrência local durante gravação do relatório: ENOSPC. Removido somente .next/dev667MB gerado nesta tarefa, com servidor de desenvolvimento parado; runtime standalone, fontes, dados e backups preservados. Espaço livre recuperado925MiB. Não foi realizada limpeza geral do Mac.
- Pendência residual real: dependências anteriores com alertas de segurança, principalmente Next16.2.4 no Windows (CVE-2026-75604); permanece fora desta alteração de layout e fluxos, sem alegar remediação.


## Complemento solicitado — compras no padrão do Rincão

Usuário confirmou a apresentação Day use/Escolar conforme o Rincão: tela de detalhes mantém a estrutura atual; só o PDF alterna tabela compacta e cartões escolares. Demais itens: cores dos status da compra separadas da situação dos vouchers, botão Vouchers por data de visita reaproveitando consulta existente e intervalo da visita, linha cinza de voucher utilizado e Gerar Resumo nas ações. Identidade verde, regras de validade, reagendamentos e restrições de edição preservados.

Base7f2fd44; desenvolvimento no checkout develop escolhido pelo usuário. Referência de código local new_rincao_site cfda28c, sem alterações nesse repo. Coordenador possui UI/CSS/contrato studentName/scripts/banco/build/portas/Git; workerPDF possui só gerador+testePDF; revisão independente somente leitura concluída. Nenhuma nova dependência da aplicação nem migração. Ferramenta de renderização PyMuPDF isolada em .local/pdf-tools.

- [x] Regressões antes da implementação:4falhas esperadas de botão, status, aluno e voucher usado; depois53testes focados verdes.
- [x] Implementar UI/consulta/dados escolares/PDF e revisão independente.
- [x] Suíte801testes verdes e ESLint0erros/7avisos anteriores. Integração calendário15cenários passou; integração adicional5PDFs autenticados/HTML/status/consulta/exportação passou.
- [x] Paginação e tipagem corrigidas. Rodapé sem lineHeight herdado; teste binário exige texto desenhado em todas as páginas. HTTP real/PyMuPDF confirmou paginação, aviso fiscal e limites em5PDFs (1/2/5páginas).
- [x] Build standalone e reconferência visual/semântica: claro/escuro1440/390, tabela/cinzas/cores, intervalo de visita, escolares com24vouchers/múltiplas páginas e validade/original/uso/invalidado.
- [x] Passar pelo fluxo já autorizado develop → main → VM, com backup atualizado, health e reconferência no domínio; sem mutações ou envios reais.

Estado: revisões concluídas, incluindo recheck do rodapé final. Suíte801/801, ESLint0erros/7avisos anteriores, TypeScript e build aprovados. Runtime standalone porta3002 sessão33669;15integrações calendário e5PDFs/HTML/status/consulta aprovados também no build compilado. Navegador1440/390 claro/escuro: status, cinza sem ações no usado, intervalo preservado, filtros mobile primeiro, exportação200, documento sem overflow. Backup fresco207091bytes/467entradas validado/cópia privada em C:\Users\Administrator\site-estancia-backups\20261027-rincao-purchases\database.dump. Sem migração/dependências novas. Próxima ação: pushdevelop, promovermain, deployVM e leitura no domínio.


### Publicação do complemento concluída
- Release funcional a116f52403248ed05607b02d681ab83337b03c76 passou por codex/develop e main, SHA remoto conferido. VM com serviço Running, build SYJPV2U4BLfhFJ-4gkm4g, health200 e oferta estável preservada. Rollback em C:\Sites\AzureIIS\site-estancia\.next-deploy-backup-20261027170500. Backup de banco privado fresco validado antes do deploy.
- Build local/Windows e tipos passaram;801/801testes; ESLint0erros/7avisos preexistentes;15integrações calendário e5casos reais HTTP/PDF no build compilado. Revisão independente sem pendências. Nenhuma migração ou dependência da aplicação adicionada.
- Domínio HTTPS conferido em1440×1000/claro e390×844/escuro: financeiro verde/amarelo, consulta por visita preserva ambos extremos, vouchers usados cinza sem botões, Gerar Resumo200/PDF, exportaçãoXLS200 e largura do documento igual viewport. Sem erros/avisos de console nas telas conferidas.
- Smoke produção20respostas verificadas: calendário/evento01/11 e lista consistente3compras/13pessoas/R$779; resumo real compras100 e92, com paginação/aviso fiscal/limites conferidos viaPyMuPDF e imagem. Compra92 usada mostra cinza e aviso de ingressos utilizados. Nenhum voucher escolar existe em produção; Escolar foi validado apenas na base local (4e24vouchers;2e5páginas), sem semear dados reais.
- Login local CPF/senha testado. Navegação de produção por sessão assinada temporária de gestor ativo; login CPF/senha não retestado. Sessão encerrada/cookie removido e API401 confirmada. Sem alterar compras/vouchers/eventos reais nem enviar pagamentos/SMTP/WhatsApp externos.
- Evidências privadas: rincao-unit-tests.json, rincao-build.log, rincao-lint.log, rincao-calendar-regression.log, rincao-integration.log, rincao-production-deploy.log, rincao-production-smoke.json e relatórios de revisão em.local/calendar-validation. Runtime local standalone segue porta3002, sessão33669.
- Risco preexistente permanece: Next16.2.4 no Windows com alerta crítico CVE-2026-75604, sem atualização de framework neste complemento. Não existe HML Next utilizável; publicação seguiu testes locais → develop → main → produção.
