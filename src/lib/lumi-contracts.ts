export const LUMI_CONTRACTS = [
  {
    "name": "consultar_agenda",
    "path": "/api/lumi/agenda",
    "roles": [
      "cliente",
      "gestor",
      "atendente"
    ],
    "description": "Consultar datas públicas e disponibilidade de Day Use no sistema da Estância. Informe início e fim quando souber o período. Não inclui passeios escolares privados, preços ou reservas. Consulte o catálogo para os preços atuais.",
    "parameters": {
      "type": "object",
      "properties": {
        "start_date": {
          "type": [
            "string",
            "null"
          ],
          "format": "date"
        },
        "end_date": {
          "type": [
            "string",
            "null"
          ],
          "format": "date"
        }
      },
      "required": [
        "start_date",
        "end_date"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "consultar_catalogo",
    "path": "/api/lumi/catalog",
    "roles": [
      "cliente",
      "gestor",
      "atendente"
    ],
    "description": "Consultar passaportes e adicionais ativos no catálogo atual do sistema da Estância, com preços, descrições e product_id. Quando souber a data, informe visit_date para filtrar os produtos disponíveis nesse dia. Consulte antes de propor ou cotar produtos; não reutilize os preços e nomes do material antigo. Respeite as condições e faixas etárias descritas em cada produto. Não cria compra.",
    "parameters": {
      "type": "object",
      "properties": {
        "visit_date": {
          "type": [
            "string",
            "null"
          ],
          "format": "date"
        }
      },
      "required": [
        "visit_date"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "cotar_ingressos",
    "path": "/api/lumi/quote",
    "roles": [
      "cliente",
      "gestor",
      "atendente"
    ],
    "description": "Calcular internamente a compra de passaportes e adicionais escolhidos para uma data. Use os product_id reais do catálogo e as quantidades informadas. Precisa de pelo menos um passaporte. Não precisa de CPF nem autorização adicional para fazer o cálculo da compra solicitada. Depois, apresente total e colete apenas dados faltantes, sem oferecer cotação como uma etapa extra.",
    "parameters": {
      "type": "object",
      "properties": {
        "visit_date": {
          "type": "string",
          "format": "date"
        },
        "items": {
          "type": "array",
          "minItems": 1,
          "maxItems": 30,
          "items": {
            "type": "object",
            "properties": {
              "product_id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "quantity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100
              }
            },
            "required": [
              "product_id",
              "quantity"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "visit_date",
        "items"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "criar_compra_ingressos",
    "path": "/api/lumi/purchase",
    "roles": [
      "cliente",
      "gestor",
      "atendente"
    ],
    "description": "Preparar o pedido escolhido após cotação, com nome completo, CPF válido informado pelo comprador e telefone. Somente no WhatsApp o número vem automaticamente; no Instagram e simulador peça o telefone com DDD quando faltar. Se houver dados_invalidos, peça novamente apenas o campo rejeitado. Registra pedido pendente no sistema da Estância e retorna o link de checkout. Envie esse link como retornado, no domínio oficial da Estância. Pagamento acontece na página Cielo, nunca no chat. Não afirme que está pago sem consulta.",
    "parameters": {
      "type": "object",
      "properties": {
        "quote_id": {
          "type": "string",
          "minLength": 43,
          "maxLength": 43
        },
        "name": {
          "type": "string",
          "minLength": 2,
          "maxLength": 120
        },
        "cpf": {
          "type": "string",
          "minLength": 11,
          "maxLength": 14
        },
        "phone": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 20
        },
        "email": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        }
      },
      "required": [
        "quote_id",
        "name",
        "cpf",
        "phone",
        "email"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "consultar_compra_ingressos",
    "path": "/api/lumi/status",
    "roles": [
      "cliente",
      "gestor",
      "atendente"
    ],
    "description": "Consultar o estado do pedido desta conversa e recuperar seu link atual. Só confirme pagamento se o estado for paid. Não consulta pedidos de outras conversas nem por CPF.",
    "parameters": {
      "type": "object",
      "properties": {
        "quote_id": {
          "type": "string",
          "minLength": 43,
          "maxLength": 43
        }
      },
      "required": [
        "quote_id"
      ],
      "additionalProperties": false
    }
  }
];
