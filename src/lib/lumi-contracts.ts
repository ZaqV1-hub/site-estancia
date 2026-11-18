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
    "description": "Consultar passaportes e adicionais ativos no catálogo atual do sistema da Estância, com preços, descrições e product_id. Quando souber a data, informe visit_date para filtrar os produtos disponíveis nesse dia. Consulte antes de propor ou cotar produtos; não reutilize os preços e nomes do material antigo. Respeite as condições e faixas etárias descritas em cada produto. Não cria compra. Depois que o cliente escolher a data e os passaportes, consulte os adicionais desse dia e ofereça os disponíveis antes da cotação final. Respeite recusas e não acrescente produtos sem consentimento.",
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
    "description": "Calcular internamente a compra de passaportes e adicionais escolhidos para uma data. Use os product_id reais do catálogo e as quantidades informadas. Precisa de pelo menos um passaporte. Não precisa de CPF nem autorização adicional para fazer o cálculo da compra solicitada. Depois, apresente total e colete apenas dados faltantes, sem oferecer cotação como uma etapa extra. Inclua os adicionais expressamente aceitos na mesma cotação e recalcule o total.",
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
    "description": "Preparar o pedido escolhido após cotação, com nome completo e CPF válido do comprador. Quando faltar telefone no histórico, tente com phone=null: o servidor usa o número do WhatsApp. Peça telefone com DDD somente se retornar dados_invalidos em phone. Retorna o checkout seguro da Lumi com a identidade da Estância. Envie o link exatamente como retornado. Não peça cartão no chat nem confirme pagamento sem consultar o pedido.",
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
          "maxLength": 20,
          "description": "Envie null quando ausente no histórico. O servidor usa o canal WhatsApp. Só solicite se a ferramenta rejeitar phone como required."
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
  },
  {
    "name": "preparar_formulario_escolar",
    "path": "/api/lumi/school-form",
    "roles": [
      "cliente",
      "gestor",
      "atendente"
    ],
    "description": "Retornar o formulário seguro do e-commerce escolar da Estância a partir do link de passeio enviado pela escola e apresentado pelo responsável. Não cria pedido nem inventa link. No formulário, o responsável informa comprador, alunos e turmas; o sistema escolar calcula os valores por turma e valida data e disponibilidade. Não usar catálogo Day Use para escolares. Para organizar um novo passeio, siga a orientação de atendimento de grupos.",
    "parameters": {
      "type": "object",
      "properties": {
        "form_url": {
          "type": "string",
          "maxLength": 1500,
          "description": "Link de compra escolar enviado pela escola, informado pelo cliente."
        }
      },
      "required": [
        "form_url"
      ],
      "additionalProperties": false
    }
  }
];
