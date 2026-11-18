# Integração da Estância com a Lumi

Os endpoints POST `/api/lumi/agenda`, `/catalog`, `/quote`, `/purchase` e `/status`
recebem o contrato HTTP da Lumi com `tenant_id`, `conversation_id`, `role`,
`arguments` e `context`. Exigem uma chave privada exclusiva. Os papéis permitidos
são cliente, gestor e atendente. Pedidos e cotações são isolados pela empresa e
conversa. O corpo da requisição tem limite de 32 KiB.

A ativação exige `LUMI_COMMERCE_ENABLED=true`, `LUMI_COMMERCE_SECRET`,
`LUMI_TENANT_ID`, `LUMI_COMMERCE_DATABASE_NAME` e `LUMI_CHECKOUT_BASE_URL`.
O banco configurado deve corresponder exatamente ao nome aprovado. A compra
usa os mesmos produtos, disponibilidade, regras, preços e integração Cielo do site.
O iniciador `run_next.cmd` usa `node --env-file=.env.local` para carregar o arquivo
privado com suporte a valores entre aspas. Alterações nesse arquivo exigem
reiniciar apenas o serviço do site e validar novamente o acesso autenticado.

Antes de ativar, faça backup do banco e aplique `scripts/lumi-commerce-schema.sql`.
A migração acrescenta duas colunas e uma tabela, preservando dados e sequências.
O vínculo do pedido Lumi é gravado na transação da compra e seus vouchers.
Após falha de resultado incerto, consulte o estado antes de repetir. Um pedido
no estado `creating` sem vínculo exige análise operacional.

O comprador fornece CPF, nome e telefone. Contas existentes são preservadas.
Um comprador novo recebe cadastro incompleto com senha aleatória desconhecida.
O endereço `/lumi/checkout/TOKEN` permite pagar somente o pedido vinculado,
sem criar sessão de usuário. As APIs de pagamento validam o token, a validade
e o identificador do pedido. A confirmação utiliza a reconciliação Cielo existente.

Para retornar, desative as ferramentas do tenant e `LUMI_COMMERCE_ENABLED`.
Preserve a versão com o checkout para pedidos ainda pendentes. Remover a
integração não desfaz pedidos nem pagamentos existentes. Uma atualização do
site exige conferir o build ativo e o ambiente antes de validar o contrato.
