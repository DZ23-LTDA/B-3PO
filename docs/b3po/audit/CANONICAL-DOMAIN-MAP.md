# Mapa canônico dos domínios — B-3PO

Atualizado na rodada 6/256. **Fonte de verdade = este arquivo + o código que ele aponta.** Se os dois
divergirem, o código manda e este mapa é corrigido.

## Regra

Um domínio, um dono. Nenhum módulo mantém cópia do dado de outro; quem precisa consultar outro domínio
recebe o dado por contrato (função pura ou `ref` compartilhada), nunca por leitura de arquivo alheio.

## Domínios implementados

| Domínio | Arquivo canônico | Persistência | Estado | Testes |
|---|---|---|---|---|
| Catálogo de produtos | `apps/desktop/electron/catalog-store.ts` | `userData/b3po/catalog.json` | **IMPLEMENTED + TESTED + VALIDATED** | 12 |
| Estoque (livro-razão) | `apps/desktop/electron/inventory-store.ts` | `userData/b3po/inventory.json` | **IMPLEMENTED + TESTED + VALIDATED** | 14 |
| Vendas (orçamento/pedido) | `apps/desktop/electron/sales-store.ts` | `userData/b3po/sales.json` | **IMPLEMENTED + TESTED + VALIDATED** | 18 |
| Financeiro (receber/pagar) | `apps/desktop/electron/finance-store.ts` | `userData/b3po/finance.json` | **IMPLEMENTED + TESTED + VALIDATED** | 10 |
| Agenda (recursos/compromissos) | `apps/desktop/electron/scheduling-store.ts` | `userData/b3po/scheduling.json` | **IMPLEMENTED + TESTED + VALIDATED** | 17 |
| Contatos | `apps/desktop/electron/crm-contacts-store.ts` | `userData/b3po/crm-contacts.json` | IMPLEMENTED + TESTED | 6 |
| Conversas | `apps/desktop/electron/crm-conversations-store.ts` | `userData/b3po/crm-conversations.json` | IMPLEMENTED + TESTED | 24 |
| Oportunidades (funil) | `apps/desktop/electron/crm-pipeline-store.ts` | `userData/b3po/crm-pipeline.json` | IMPLEMENTED + TESTED | 10 |
| Tarefas | `apps/desktop/electron/crm-tasks-store.ts` | `userData/b3po/crm-tasks.json` | IMPLEMENTED + TESTED | 11 |

**Nenhum destes tem tela ainda, exceto o CRM (contatos, funil, tarefas), o catálogo de produtos e o
estoque.** Vendas, financeiro e agenda têm store e testes no processo principal, mas ainda não têm UI.
Chamar de "pronto" antes disso seria o que o GOAL proíbe.

**Lição das rodadas 8 e 9, aplicada em definitivo:** uma tela nova exige **três** registros, não um —
`<Route>` em `surfaces.tsx`, entrada em `APP_ROUTES` (`src/app/routes.ts`) e a constante de rota. Faltar
o segundo faz o roteador cair no catch-all e voltar para a conversa nova **sem erro visível**. O
estoque já nasceu com os três.

## Evidência de validação (rodada 9)

O catálogo é o primeiro domínio do Business Core validado no app real, não só em teste:

- a tela `/products` renderizou no binário construído a partir do `dist`;
- cadastro pela UI gravou `{"name":"Café 500g","sku":"CAF-500","price_cents":2490,"cost_cents":1000,"category":"Bebidas","unit":"un","tenant_id":"local"}` em `catalog.json`;
- o preço apareceu como `R$ 24,90` e a unidade como `unidade` (pt-BR);
- repetir o mesmo SKU mostrou **"Já existe um produto com este SKU."** na tela — o erro do processo principal chegou ao usuário.

**O que a validação revelou e os testes não pegaram:** a rota `/products` não existia para o app.
Registrar a `<Route>` em `surfaces.tsx` não basta — é preciso declarar o caminho em `APP_ROUTES`
(`src/app/routes.ts`). Sem isso o roteador cai no catch-all e volta para a conversa nova, sem erro
visível: `#/crm` mantinha o hash e `#/products` voltava para `#/`. Typecheck, testes de componente e
teste de build passaram os três com a rota quebrada. Só o binário mostrou.

### Estoque (rodada 11)

Ciclo operacional completo executado na UI do app real, `userData` isolado:

| Passo | Resultado observado |
|---|---|
| cadastro do produto em `/products` | `Café 500g (CAF-500)` disponível no seletor de estoque |
| `#/stock` | tela renderiza com seletor, movimento, quantidade e motivo |
| **entrada 10** | saldo `10 unidade`; histórico `Entrada · CAF-500 · 10 · compra inicial` |
| **saída 3** | saldo `7 unidade`; histórico `Saída · CAF-500 · 3` |
| **saída 100** | recusada: *"Não há saldo suficiente para esta saída."* |
| estado no processo principal | `{"balances":{"CAF-500":7000}}` |
| movimentações gravadas | `[["entrada",10000,"compra inicial"],["saida",3000,""]]` — a saída recusada **não** foi gravada |

O saldo de 7 é derivado das duas movimentações, não de um campo gravado. O erro chegou ao usuário como
texto, não como exceção ou lista vazia. Capturas: `stock-01-inicial.png`, `stock-02-saldo-sete.png`,
`stock-03-saldo-insuficiente.png` em `docs/b3po-preview/` (fora do repositório).

### Vendas (rodada 13) — e um bug encontrado pela validação

Ciclo comercial completo na UI do app real:

| Passo | Resultado |
|---|---|
| entrada de 10 em `/stock` | saldo `10` |
| montar venda `CAF-500 · 3 × R$ 24,90` em `/sales` | estimativa `R$ 74,70` |
| **faturar** | venda `#1 · faturada · R$ 74,70` |
| estoque depois de faturar | **`{"CAF-500":7000}`** — caiu de 10 para 7 |
| venda depois de faturar | `[[1,"faturado",7470]]` |
| tentar faturar 100 | recusado: *"Estoque insuficiente"* |
| estoque/vendas depois da recusa | **inalterados** — 7000 e só a `#1` |

**O bug que só apareceu aqui:** o primeiro faturamento recusou com `saldo_insuficiente` tendo 10 em
estoque. Chamando o IPC direto, `quantity_milli: 1000` era gravado como `1000000`. O `sales-store`
reconvertia milésimos como se fossem unidades — **o mesmo defeito que o teste de fumaça pegou no
estoque na rodada 4, e que eu corrigi só lá.** Os testes de venda passavam porque falavam em
`quantity` (unidades); o caminho em milésimos, que é o que a tela usa, não estava coberto.

Corrigido nos dois campos com o mesmo critério, e agora há teste em `sales-store.test.ts` afirmando
que `quantity_milli: 3000` não vira 3 milhões. **Lição: correção local de um defeito de unidade não é
correção até ser procurada nos outros conversores.**

### Ciclo completo na interface (rodada 15)

Uma única sessão no app real, `userData` isolado, percorrendo os cinco domínios:

| Passo | Interface | Estado no processo principal |
|---|---|---|
| cadastro do produto | `/products` | `catalog.json` com `CAF-500` |
| entrada de 10 | `/stock` | `{"CAF-500":10000}` |
| venda de 3 faturada | `/sales` → `#1 · faturada · R$ 74,70` | `[[1,"faturado",7470]]` |
| baixa automática | `/stock` | `{"CAF-500":7000}` |
| receita gerada | `/finance` → **A receber em aberto R$ 74,70** | `openReceivableCents: 7470` |
| liquidação | `/finance` → **Recebido R$ 74,70** | `paidReceivableCents: 7470`, aberto 0 |

Estado final conferido nos três arquivos: estoque `7000`, venda `#1 faturada 7470`, financeiro
`[["receber",7470,"pago"]]`. Os quatro domínios concordam.

**Observação honesta sobre o vencimento:** a conta a receber nasce com `due_at = agora`, então aparece
como vencida no mesmo instante em que é criada — o indicador "Vencido" mostrou R$ 74,70 antes da
liquidação. É coerente com venda à vista, mas não é uma decisão de produto tomada: é o valor default do
`receivableForSale`. Prazo de pagamento por venda está pendente.

Capturas: `finance-01-receita-aberta.png`, `finance-02-liquidado.png` em `docs/b3po-preview/`.

### Agenda (rodada 17)

| Passo | Resultado observado |
|---|---|
| `/agenda` renderiza | recurso, serviço, data, hora, duração |
| marcar 09:00 cadeira-1 | aparece na lista: `Hoje (1)` |
| marcar 09:30 cadeira-1 | recusado: **"Horário já ocupado: 09:00–10:00 (cadeira-1)"** |
| marcar 09:30 cadeira-2 | aceito — dois compromissos, recursos diferentes |
| estado final | `[["cadeira-1","marcado"],["cadeira-2","marcado"]]` |

A recusa **nomeia** o compromisso que ocupa o horário. Recusar sem dizer qual deixaria o operador
tentando horários no escuro — e o teste unitário prova a regra, não a mensagem.

Capturas: `agenda-01-inicial.png`, `agenda-02-marcado.png`, `agenda-03-conflito.png`.

## Contratos compartilhados

| Contrato | Arquivo | Regra |
|---|---|---|
| Dinheiro em centavos | `apps/desktop/electron/money.ts` | inteiro, nunca float; `cents()` aceita pt-BR e decimal |
| Quantidade em milésimos | `apps/desktop/electron/quantity.ts` | inteiro; cobre grama e mililitro |
| Empresa (tenant) | `apps/desktop/electron/catalog-store.ts` (`DEFAULT_TENANT`) | todo registro carrega `tenant_id` |
| Idempotência | campo `ref` em estoque, financeiro, vendas e agenda | repetir o mesmo lançamento é recusado com `ref_duplicado` |

## Integração entre domínios (por contrato, não por arquivo)

| De → Para | Como |
|---|---|
| Venda faturada → Estoque | `stockMovementsFor(sale)` devolve as saídas; `ref = venda:<id>:<sku>` |
| Venda faturada → Financeiro | `receivableForSale(sale)` devolve a conta a receber; `ref = venda:<id>` |
| Produto → Estoque/Venda | SKU é a chave comercial (`product_sku`) |

Provado em `apps/desktop/electron/erp-smoke.test.ts`, com os stores reais e zero mock.

## Domínios ausentes (9)

Compras/fornecedores · Atendimento/SLA · Pós-venda · RH · Marketing · Empresas/filiais ·
Usuários/permissões (RBAC) · Serviços (catálogo de serviços) · Analytics.

## Dívida registrada

1. `crm-pipeline-store.ts` ainda tem conversor de centavos próprio. Duas implementações existem
   (`money.ts` e a do pipeline). Consolidar quando o terceiro consumidor aparecer — o financeiro já é
   o segundo, então a consolidação é candidata à próxima rodada de limpeza.
2. Nenhum dos stores novos tem IPC nem tela. Sem IPC, nenhum BOT consegue operá-los.
