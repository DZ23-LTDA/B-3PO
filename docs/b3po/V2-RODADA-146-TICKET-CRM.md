# GOAL V2 — RODADA 146: A 7ª LIGAÇÃO — O TICKET CHEGA AO CRM

**Data**: 05/11/2026 · **§17** · *"somente com necessidade comprovada"*

---

## A NECESSIDADE COMPROVADA — medida

| Peça | Estado |
|---|---|
| `Ticket` **tem** `contact_phone` | ✅ |
| `service-desk-store` / `-ipc` | **0 referências a CRM** |
| `crm-contacts-store` | tem `upsert` com `(phone, tenant_id)` |

> **O cliente reclama, o ticket registra o telefone, e a ficha dele no CRM não mostra que ele reclamou.**
>
> **Quem abre o contato vê a última compra — e não vê que houve três chamados no mês.**

---

## A LIÇÃO DAS LIGAÇÕES ANTERIORES — **aplicada antes de escrever**

> **A r134 e a r141 descobriram na MONTAGEM que o tipo real não tinha os campos que a função pura pedia.**

**Aqui a medição veio primeiro:**

| Campo | O `Ticket` tem? |
|---|---|
| `contact_phone` · `subject` · `priority` · `status` · `satisfaction` · `opened_at` | ✅ |
| **`name`** | ❌ **não tem** |

> **A função pura usa só o que existe.**

---

## AS TRÊS DECISÕES

### 1. Sem telefone, não cria contato

> **Um ticket sem telefone não identifica ninguém**; criar um contato vazio **faria a próxima reclamação do mesmo número cair nele**.

### 2. O CRM **não ganha um nome inventado**

> O `CrmContact` **exige `name`** (a r134 descobriu) e **o ticket não tem nome**.
>
> Então o contato nasce com **`Cliente do atendimento`** — e a tela pode mostrar **que o nome veio daí**, em vez de parecer **confirmado**.
>
> **É a mesma decisão da venda** (`Cliente da venda 0009`), e por isso **as duas normalizam o telefone igual**: se divergissem, **quem reclama primeiro criaria um contato e quem compra depois criaria outro**.

### 3. O CRM aprende **o fato**, não o julgamento

```ts
{ last_ticket_at, last_ticket_id }
```

> **Quando foi o último chamado e qual.** **Uma contagem de reclamações seria uma opinião; a data é um fato.**
>
> **E cada ligação escreve o seu campo**: o atendimento não toca em `last_purchase_*`, a venda não toca em `last_ticket_*`.

---

## O QUE FOI ADICIONADO AO SCHEMA

```ts
last_ticket_at: null | number
last_ticket_id: null | string
```

> **Dois campos no `CrmContact`**, com a mesma disciplina da r134: **`null` é "nunca chamou"**, e o **histórico completo fica no `service-desk-store`**.

---

## A PROVA — 10 testes

| Grupo | O que trava |
|---|---|
| **o telefone** | mesma normalização da venda · **curto demais não é telefone** |
| **o ticket abre contato** | telefone e data · **`Cliente do atendimento`** |
| **o patch** | **exatamente `last_ticket_at` e `last_ticket_id`** · sem `name`, sem `last_purchase_*` |
| **sem telefone** | **não cria nada** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~130** |
| Testes | **10** |
| **Regressão (CRM + venda + atendimento)** | **37 verdes** |
| Campos adicionados ao schema | **2** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **7** (a 7ª em construção) |

---

## O QUE FALTA — e está dito

| Item | Estado |
|---|---|
| **a decisão** | ✅ r146 |
| **a montagem no `service-desk-ipc`** | ❌ **falta** |
| **o fluxo ponta a ponta** | ❌ **falta** |

> **Terceira vez que entrego a regra e digo o que falta** (r133, r140, r146) — e **as duas anteriores foram montadas na rodada seguinte**.

---

## PRÓXIMA RODADA

**A montagem: `service-desk-ipc` chama `intencaoParaContato` e registra o contato** — com o fluxo provando `ticket aberto → contato com last_ticket_at`.

> **146 rodadas.** A r146 **mediu o tipo antes de escrever a função pura** — e **achou que o `Ticket` não tem nome**. **As três decisões vieram dessa medição**, não de uma suposição: **nome derivado, telefone normalizado igual à venda, e o campo é a data, não a contagem**.
