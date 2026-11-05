# GOAL V2 — RODADA 147: A MONTAGEM — E O `null` QUE APAGAVA A COMPRA

**Data**: 05/11/2026 · **§17** · a 7ª ligação, montada e provada

---

## DUAS DESCOBERTAS NA MONTAGEM

### 1. O `ticketOpened` não carregava o telefone **nem a data**

```ts
ticketOpened: (ticket: { id, tenant_id, number, priority }) => Promise<void>
```

> **O `Ticket` TEM `contact_phone` e `opened_at`** — o **resumo não os levava**, e por isso **o consumidor não podia ligar o chamado a ninguém**.
>
> **É a mesma correção da r135** no evento da venda: **o fato existia, o aviso não o carregava.**

**Corrigido**: os dois campos entraram no resumo **e no emit**.

### 2. **`upsert` com `null` apagava a compra** — e é um achado de verdade

O teste *"a compra anterior continua lá"* falhou:

```
expected null to be 15000
```

**O mecanismo:**

```
normalizeContact  →  preenche `last_purchase_cents: null` quando o campo não vem
upsert            →  { ...existente, ...contato }
resultado         →  o null do contato VENCE o 15000 do existente
```

> **O `merge` do `upsert` protege o que o contato TEM — mas o `normalizeContact` transforma "não veio" em "é null", e o null sobrescreve.**
>
> **A venda (r134) e o atendimento (r147) escrevem campos diferentes no mesmo contato** — e **sem repassar o que já existe, a segunda escrita apaga a primeira**.

**Corrigido**: a ligação **repassa `last_purchase_*` e o `name`** do existente.

---

## A MONTAGEM

```ts
ticketOpened: async ticket => {
  await dispatchQuietly(dispatch, { … })          // o que já existia

  try {
    const intencao = intencaoParaContato({ … })
    if (intencao.tipo === 'registrar') {
      const existente = (await crmContacts.list(...)).find(…)
      await crmContacts.upsert({ …patch, …existente, name: existente?.name || …, phone … })
    }
  } catch { /* silencioso */ }
}
```

> **`catch` que não propaga**: o CRM falhar **não pode desfazer um ticket aberto**. **O atendimento é o fato, a ficha é a consequência.**

---

## A PROVA — 6 testes de fluxo + 10 da decisão

| Teste do fluxo | O que prova |
|---|---|
| **quem reclama aparece na ficha** | a ligação |
| **`Cliente do atendimento`** | o nome derivado |
| **o chamado fica registrado** | `last_ticket_at` e `_id` |
| **o nome confirmado NÃO é sobrescrito** | "Maria (vizinho)" sobrevive |
| **a compra anterior CONTINUA lá** | **o achado do `null`** |
| **dois chamados ≠ dois contatos** | a chave `(phone, tenant_id)` |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes da ligação | **16** (10 + 6) |
| **Regressão (atendimento + CRM + montagem + logística)** | **262 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **7, montadas** |

---

## A LIÇÃO — e ela é sobre o `merge`

> **`{ ...existente, ...novo }` parece suficiente, e não é** — porque **o `novo` passou por um normalizador que preenche o ausente com `null`**.
>
> **Um merge só preserva o que o outro lado não toca. Se o normalizador "ajuda" preenchendo, ele apaga.**

**É a quinta descoberta que só a montagem revela** (r134, r141, r142, r147 ×2) — e **a primeira que ameaça dado de outra ligação**.

---

## O §17 — AS 7 LIGAÇÕES

| Fluxo | Desde | Montada |
|---|---|---|
| Compras · Venda · Orquestração · Atendimento | r45 · r61 · r101 · r103 | ✅ |
| Venda → CRM | r134–r136 | ✅ |
| Entrega → Atendimento | r140–r142 | ✅ |
| **Atendimento → CRM** | **r147** | ✅ |

> **O CRM agora recebe as duas pontas**: quem **compra** e quem **reclama** — e **nenhuma apaga a outra**.

---

## PRÓXIMA RODADA

**A verificação** — as rodadas 146–147 mexeram em **schema do CRM** (2 campos) e **dois canais**. A última completa foi a r145.

> **147 rodadas.** A montagem **achou dois defeitos**: um **aviso que não carregava o fato** e um **`null` que apagava a compra da outra ligação**. **O segundo é o primeiro que ameaça dado escrito por outra rodada** — e **só um teste que atravessa as duas ligações o pegaria**.
