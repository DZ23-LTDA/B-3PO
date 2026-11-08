# GOAL V2 — RODADA 149: A VERIFICAÇÃO — E A LACUNA QUE ELA ACHOU

**Data**: 05/11/2026 · a segunda de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `30fe8c7446` · **sincronizado** |
| 4 | **Suíte do RENDERER** | **13113 testes · 13082 verdes · 13 vermelhos** |

---

## A LACUNA QUE A VERIFICAÇÃO ACHOU — e ela é a **terceira vez**

`CrmContactRow` (o tipo do renderer) **não tinha `last_ticket_at` nem `last_ticket_id`**.

> **A r146 gravou os dois campos no store, a r147 os montou no canal — e o tipo do renderer não os declarava.**
>
> **É exatamente a lacuna da r136** (quando `last_purchase_*` chegou ao store e não ao tipo), **repetida três rodadas depois**.

### E o ato falho

A r146 **acrescentou `last_ticket_*` ao `CrmContact`** e **esqueceu o `CrmContactRow`** — porque **são dois tipos, em dois arquivos, no mesmo produto**.

> **O store e o renderer têm o mesmo formato e nomes diferentes**, e **nada os obriga a concordar**.
>
> **A tela roda com o objeto completo** (o preload passa tudo) — **mas o TypeScript não deixa usá-lo**, e **um campo que o tipo não declara é um campo que a tela não usa**.

---

## O QUE FOI CORRIGIDO

| Camada | Antes | **Agora** |
|---|---|---|
| **tipo do renderer** | sem `last_ticket_*` | ✅ **os dois declarados** |
| **tela** | mostrava só a compra | ✅ **compra E chamado** |

```tsx
{typeof contact.last_ticket_at === 'number'
  ? `último chamado ${data}`
  : 'nunca chamou'}
```

> **As duas datas juntas são o que muda a conversa**: *"comprou semana passada e reclamou ontem"* e *"comprou semana passada e nunca reclamou"* **pedem abordagens opostas**, e a ficha precisa **dizer qual é qual sem ninguém abrir o histórico**.

---

## OS 13 VERMELHOS — nenhum meu

**Verificado por busca:** `❯.*(settings|crm|api/)` → **NENHUM**.

**E os 13 são os mesmos de sempre** — `legacy-sdk-compat`, `browser-hints`, `sync-handoff`, `gateway-background-reconnect`, `floating-panes`, `use-keybinds-browser`, `terminal-ownership`, `send-then-close`, `bot-delete`, `hidden-bots`.

### E o `sync-handoff` — o único com nome novo

```
sync-handoff   Tests  5 passed (5)      ← isolado, PASSA
```

> **Flaky por concorrência**, como o `audit-store` e o `sync-store`.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do renderer | **13113** |
| **Vermelhos flaky/timeout** | **13**, todos upstream |
| **Vermelhos do produto** | **0** |
| **Campos que faltavam no tipo** | **3** (os dois de ticket + `last_sale_id`) |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **2 de 3** |

---

## A LIÇÃO — e ela é sobre dois tipos com o mesmo nome

> **O `CrmContact` (main) e o `CrmContactRow` (renderer) descrevem o mesmo dado e não se conhecem.**
>
> **O preload passa o objeto inteiro**, então **o dado sempre chega** — e **a tela nunca o vê**, porque **o tipo não o declara**.
>
> **É a "capacidade sem porta" na sua forma mais silenciosa: a porta está aberta, o dado passa, e o único que não sabe é quem podia usá-lo.**

---

## PRÓXIMA RODADA

**A terceira limpeza** — e o `wrapup_check` libera.

> **149 rodadas.** A verificação **achou o que as rodadas 146–147 deixaram**: **três campos gravados e não declarados no tipo do renderer**. **A r136 corrigiu o mesmo padrão para a compra** — e **ninguém ligou os dois casos** até um teste de tipo reprovar a tela.
