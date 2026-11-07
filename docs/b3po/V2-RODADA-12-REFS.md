# GOAL V2 — RODADA 12: O CONTRATO DAS REFERÊNCIAS CRUZADAS

**Data**: 05/11/2026 · **Fase 3 — fontes de verdade**

---

## O QUE ESTAVA ACONTECENDO

Oito call sites montavam `ref` à mão:

```ts
sales-store.ts:241        `venda:${sale.id}:${item.product_sku}`
finance-store.ts:247      `venda:${sale.id}`
sales-commission.ts:62    `venda:${sale.id}:comissao`
sales-return.ts:84        `venda:${sale.id}:devolucao:${item.product_sku}`
after-sales-store.ts:91   `venda:${saleId}:${kind}`
purchases-store.ts:217    `compra:${order.id}:${item.product_sku}`
inventory-count.ts:117    `inventario:${inventarioId}:${ajuste.product_sku}`
agent-tools-catalog.ts:150 `'venda:' + saleId`
```

**Cada um estava certo.** O problema é que **a única coisa que os ligava era a memória de quem escreveu.**

## A FRAGILIDADE REAL

`after-sales-store.ts:152`:

```ts
const comFollowUp = new Set(doTenant.map(f => f.ref.split(':')[1] ?? ''))
```

**O id por posição.** Se alguém mudasse `venda:<id>:<kind>` para `venda:<kind>:<id>`, o vínculo quebraria **sem nenhum erro de tipo** — porque `ref` é `string` em todos os domínios.

> **Nenhum teste pegaria isso.** O teste testaria o formato novo contra si mesmo.

---

## A CORREÇÃO — `refs.ts`

### Formatos com nome

```ts
refVenda(id)                     → venda:v1
refVendaItem(id, sku)            → venda:v1:SKU-A
refVendaComissao(id)             → venda:v1:comissao
refVendaDevolucao(id)            → venda:v1:devolucao
refVendaDevolucaoItem(id, sku)   → venda:v1:devolucao:SKU-A
refVendaFollowUp(id, kind)       → venda:v1:satisfacao
refCompra(id)                    → compra:c1
refCompraItem(id, sku)           → compra:c1:SKU-B
refInventario(id, sku)           → inventario:i1:SKU-C
```

### Leitura por prefixo, não por índice

```ts
idDaVenda('venda:v1:devolucao:SKU-A')   // 'v1'
idDaVenda('compra:c1')                  // null  ← recusa outro domínio
parseRef('pedido:p1')                   // null  ← recusa versão desconhecida
```

**Ref desconhecida devolve `null` em vez de lixo**: um ref de versão futura não pode virar id por acidente — **ligaria registros que não têm relação**.

### Os call sites agora chamam função

**11 substituições** em 10 arquivos. Nenhuma concatenação de `ref` sobrou.

---

## A PROVA — 12 testes

### Os que mais importam

**"as variantes da mesma venda NÃO colidem"** — monta as 6 variantes de `v1` e verifica `new Set(refs).size === refs.length`. **Se duas gerassem a mesma string, uma sobrescreveria a outra na deduplicação** — e o estoque deixaria de lançar a saída porque o financeiro já tinha usado a chave.

**"idDaVenda ignora o que vem depois do id"** — testa as 4 variantes. É a substituição direta do `split(':')[1]`, e o teste **declara** que o formato interno não importa.

**"ref desconhecida devolve null em vez de lixo"** — `pedido:p1`, `venda`, `venda:`, `''`. **Recusar é o comportamento correto.**

**"ida e volta"** — para cada id, escreve e lê de volta. Garante que o contrato é simétrico.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Call sites de `ref` convertidos | **11** em 10 arquivos |
| Funções de construção | **9** |
| Funções de leitura | **3** (`parseRef`, `idDaVenda`, `idDaCompra`) |
| Testes novos | **12** |
| Regressão (7 domínios que usam `ref`) | **280 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE ESTA RODADA **NÃO** RESOLVEU — e está dito

**`ref` é chave de idempotência, não integridade referencial.**

O banco é **um arquivo JSON por domínio**, e **não há transação entre eles**. Isso está documentado em `purchases-store.ts:7`:

> *"(`compra:<id>:<sku>`). Dois arquivos JSON não têm transação entre si"*

**Consequência real**: uma venda pode gravar em `sales.json` e falhar em `finance.json` — e o `ref` **não desfaz** a primeira. O que ele garante é **não duplicar na retentativa**, não **atomicidade**.

**Isso não foi corrigido e não é corrigível sem mudar o modelo de dados.** O que esta rodada fez foi tornar **o contrato explícito** — o que é o pré-requisito para qualquer trabalho transacional futuro.

---

## A SÉRIE DA FASE 3

| Rodada | O que a auditoria encontrou |
|---|---|
| r10 | `crm/src` não é um CRM — é uma biblioteca mal nomeada, e o CI mentia sobre cobertura |
| r11 | `crm-conversations` gravava **fora** de `b3po/` — backup do produto perderia as conversas |
| r12 | o `ref` era **convenção sem contrato** — 8 formatos mantidos pela memória |

**Três rodadas, três coisas que nenhum teste existente pegaria.**

---

## PRÓXIMA RODADA

Fase 3 fecha. O item 4 da ordem é **os problemas de inicialização e atualização do Desktop** — e o candidato óbvio é o defeito documentado na r248: **recuperação de lock que trava ~41 s no Windows** antes de recusar.

É o **único defeito de produto** entre as 40 falhas de teste classificadas na r250.
