# GOAL V2 — RODADA 136: O CRM NA TELA — O ÚLTIMO METRO

**Data**: 05/11/2026 · **§17** · a ligação chega ao olho do operador

---

## O QUE A r135 DEIXOU

> *"O dado é gravado e não aparece em lugar nenhum — o mesmo erro da r60 (capacidade sem porta), agora no último metro."*

**A r136 abre a porta.**

---

## A CADEIA MEDIDA — e onde ela parava

| Camada | Estado antes |
|---|---|
| store (`CrmContact` com `last_purchase_*`) | ✅ r134 |
| canal IPC | ✅ **passa o objeto inteiro** |
| **tipo do renderer (`CrmContactRow`)** | ❌ **não declarava os campos** |
| **tela** | ❌ **não mostrava** |

> **Duas camadas de seis.** O dado atravessava o preload **sem que o tipo o conhecesse** — e **um campo que o tipo não declara é um campo que ninguém usa**, mesmo chegando no objeto.

---

## O QUE FOI FEITO

### 1. O tipo

```ts
last_purchase_at?: null | number
last_purchase_cents?: null | number
last_sale_id?: null | string
```

### 2. A tela — e a decisão sobre o "nunca comprou"

```tsx
{typeof contact.last_purchase_at === 'number'
  ? `última compra ${data} · ${formatarReais(contact.last_purchase_cents)}`
  : 'nunca comprou'}
```

> **`null` NÃO é zero**: um contato que nunca comprou **não mostra data nem valor**. Mostrar *"R$ 0,00"* seria dizer que ele **comprou de graça**.

### 3. O `formatarReais` devolve `—` para ausência

> **`—` é a marca de "não há"** que o produto já usa em toda parte — e é diferente de `R$ 0,00`.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Suítes do renderer relacionadas** | **835 verdes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Camadas fechadas | **2** (tipo + tela) |
| Arquivos alterados | **2** |
| Gate · Typecheck · Testes | **14 ok · 0 erros · 835** |

---

## O §17 — A LIGAÇÃO, FECHADA NAS SEIS CAMADAS

| Camada | Onde |
|---|---|
| **regra** | `sales-crm-link` (r133) |
| **store** | `CrmContact.last_purchase_*` (r134) |
| **canal** | `erp-ipc` `onEvent` (r135) |
| **preload** | passa o objeto inteiro |
| **wrapper** | `crm-contacts.ts` (r136) |
| **tela** | `crm-contacts-section.tsx` (r136) |

> **A 5ª ligação do §17 está completa** — e ela atravessa **venda → regra → store → canal → tipo → tela**.

---

## A LIÇÃO — e ela é sobre a sexta camada

> **O preload passava o objeto inteiro desde sempre.** O dado **chegava ao renderer** e **ninguém o via**, porque **o tipo não o declarava**.
>
> **Um `interface` incompleto é uma porta fechada que parece aberta** — o objeto tem o campo, o TypeScript não deixa usá-lo, e a tela mostra o que sobrou.

---

## PRÓXIMA RODADA

**O `wrapup_check`** — as rodadas 133–136 mexeram em **schema, canal e tela**, que é o tipo de mudança que **cobra em outro lugar**. A última verificação completa foi na r127.

> **136 rodadas.** A porta do último metro estava fechada por **uma linha de tipo**, não por código faltando. **O dado chegava e não entrava** — e é a forma mais silenciosa de "capacidade sem porta" que esta sessão encontrou.
