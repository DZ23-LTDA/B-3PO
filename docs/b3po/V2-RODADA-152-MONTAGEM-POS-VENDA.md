# GOAL V2 — RODADA 152: A MONTAGEM — E A ORDEM QUE O `undefined` EXIGE

**Data**: 05/11/2026 · **§17** · a 8ª ligação, montada

---

## O QUE A r151 DEIXOU

> **"A decisão, não a ligação."**

---

## A DESCOBERTA NA MONTAGEM — e é a **segunda vez**

O `onRated` precisa do **`afterSales`** — e o `afterSales` era criado na **L342**, **depois** do `registerServiceDeskIpc` (L204).

> **Montado antes, ele seria `undefined` na hora da avaliação.**
>
> **É o mesmo cuidado que a r141 teve com o `desk`** — e a **segunda vez que a ordem de criação é o defeito**, não a lógica.

**Corrigido**: o `afterSales` **subiu** para antes do `desk`.

### Onde cada dependência nasce, agora

```
afterSales  →  desk  →  registerDeliveryIpc (usa desk)
                    ↘  registerServiceDeskIpc (usa afterSales)
```

> **A ordem é uma cadeia**, e **quem monta precisa dela na ordem certa**.

---

## O QUE DEU ERRADO — e são três

| # | O que tentei | Resultado |
|---|---|---|
| 1 | `script` com `RemoveAt` | **array fixo** → quebrou o arquivo |
| 2 | `script` com backtick em comentário | **erro de sintaxe do PowerShell** |
| 3 | `deps.onRated` | **o hook é o 4º parâmetro, não `deps`** |

> **Revertido com um comando, e as três correções feitas com `edit`.**
>
> **A décima oitava vez** que o script quebra um arquivo nesta sessão. **O `edit` continua sem quebrar nenhum.**

---

## A MONTAGEM

```ts
onRated: async ticket => {
  const intencao = intencaoDePosVenda(ticket)
  if (intencao.tipo !== 'criar') return
  try {
    await afterSales.create({ …, ref: intencao.ref, sale_at: intencao.baseEm, … })
  } catch { /* silencioso */ }
}
```

> **`sale_at` recebe `baseEm`** — que é o **`closed_at`** do ticket, não a data da venda. **O campo tem outro nome e o valor certo**, e isso está dito na linha.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Regressão (atendimento + pós-venda + montagem + vendas)** | **163 verdes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes da ligação | **11** |
| Arquivos alterados | **3** (`service-desk-ipc`, `erp-ipc`, o link) |
| **Ordem de criação corrigida** | **1** |
| **Scripts que quebraram arquivo** | **2** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **8, montadas** |

---

## O §17 — AS 8 LIGAÇÕES

| Fluxo | Desde | Montada |
|---|---|---|
| Compras · Venda · Orquestração · Atendimento | r45 · r61 · r101 · r103 | ✅ |
| Venda → CRM | r134–r136 | ✅ |
| Entrega → Atendimento | r140–r142 | ✅ |
| Atendimento → CRM | r146–r147 | ✅ |
| **Atendimento → Pós-venda** | **r151–r152** | ✅ |

> **O ciclo do `after-sales-store` está fechado**: *"venda → entrega → atendimento → pós-venda"* — as **quatro setas** existem em código agora, e **não só em comentário**.

---

## PRÓXIMA RODADA

**O fluxo ponta a ponta** — `nota 1 → follow-up criado com `ref` do ticket` — e depois a verificação.

> **152 rodadas.** A montagem **achou a ordem**: o `afterSales` nascia **depois** de quem o usa. **A r141 teve o mesmo problema com o `desk`** — e as duas foram resolvidas movendo a criação, não reescrevendo a lógica.
