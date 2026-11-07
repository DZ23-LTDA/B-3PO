# GOAL V2 — RODADA 134: A MONTAGEM — E O CAMPO QUE O CRM NÃO TINHA

**Data**: 05/11/2026 · **§17** · a 5ª ligação, provada

---

## O QUE A r133 DEIXOU PARA TRÁS

> *"Esta rodada entrega a REGRA, não a ligação."*

**A r134 liga — e descobre duas coisas que a decisão pura não podia ver.**

---

## DESCOBERTA 1 — `normalizeContact` **exige `name`** e o `upsert` faz **merge**

> Se a venda mandasse `name` vazio, ela **apagaria** o nome que o CRM tinha. Se mandasse um nome novo, **sobrescreveria**.
>
> **Nenhum dos dois é o que a r133 decidiu.**

**Solução — `inputDoContato`:**

| Situação | Nome |
|---|---|
| contato **existe** | **mantém o dele** — a venda não corrige cadastro |
| contato **novo** | **`Cliente da venda 0009`** — derivado do telefone |

> **Um nome inventado seria pior**: alguém o tomaria por confirmado.

---

## DESCOBERTA 2 — o `CrmContact` **não tinha onde guardar a compra**

O tipo terminava em `tenant_id` / `updated_at`. **Não havia `last_purchase_*`, e a r133 os produzia sem destino.**

**Foi adicionado ao schema:**

```ts
last_purchase_at: null | number
last_purchase_cents: null | number
last_sale_id: null | string
```

### Por que **no contato**, e não numa tabela de ligação

> **O CRM é a ficha de quem o cliente é**, e *"quando comprou por último e quanto"* é o fato que **quem atende precisa ver sem navegar**.
>
> **Guardar só o id da venda obrigaria uma segunda leitura** para responder a pergunta mais comum do balcão.

### E `null` **não é** `0`

> **`null` é "nunca comprou"** — não "não sei". Um contato criado à mão tem `null`, e a tela pode dizer isso **em vez de mostrar `0`**, que seria **uma compra de zero real**.

### E o histórico completo **não fica aqui**

> `last_*` é **o último**, e o resto está no `sales-store`. **Duplicar a lista de vendas no contato faria duas fontes para o mesmo fato.**

---

## O FLUXO — 7 testes, com o store **real**

| Teste | O que prova |
|---|---|
| **a primeira venda cria o contato** | o cliente que compra **aparece no CRM** |
| **o contato diz de onde veio** | `Cliente da venda 0009` |
| **a compra fica registrada** | `last_purchase_at`, `_cents`, `_sale_id` |
| **o CRM tinha "Maria (vizinho)" e a venda não reescreve** | **a decisão da r133, agora provada** |
| **e mesmo assim registra a compra** | o nome é preservado **sem perder o fato** |
| **duas compras ≠ dois contatos** | a chave `(phone, tenant_id)` funciona |
| **venda sem telefone não cria nada** | **um contato sem chave ninguém acha** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes novos | **7** |
| **Regressão CRM + vendas** | **269 verdes** |
| Campos adicionados ao schema | **3** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17 provadas** | **5** |

---

## A LIÇÃO — e é sobre o que a função pura não vê

> **A r133 testou a decisão em isolamento e ela estava certa. Ao encostar no store real, duas coisas apareceram: o `name` obrigatório e o campo que não existia.**
>
> **A função pura prova a REGRA; só o fluxo prova que ela CABE no produto** — a mesma lição da r101, e a razão de o fluxo existir.

---

## O §17 — AS 5 LIGAÇÕES

| Fluxo | Desde |
|---|---|
| Compras | r45 |
| Venda | r61 |
| Orquestração | r101 |
| Atendimento | r103 |
| **Venda → CRM** | ✅ **r134** |

---

## PRÓXIMA RODADA

**A montagem no `erp-ipc`** — hoje a ligação existe como **função + fluxo de teste**, e **não está no caminho de produção**. É exatamente o buraco da r109, e ele **não se fecha sozinho**.

> **134 rodadas.** A decisão pura estava certa e **não cabia**: o `name` obrigatório e o campo ausente apareceram **só ao encostar no store**. **Duas descobertas que nenhum teste de unidade teria feito.**
