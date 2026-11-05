# GOAL V2 — RODADA 87: A TELA DE TRABALHOS — O §12 COMPLETO

**Data**: 05/11/2026 · **§12** · os três tipos de trabalho chegam à tela

---

## AS SEIS CAMADAS

| Camada | Desde |
|---|---|
| 1. Regra · 2. Store · 3. Canal | r83–r85 |
| 4. Preload · 5. Wrapper · **6. Tela** | r86 · **r87** |

**E os 7 registros** — rota, `AppView`, `AppRouteId`, `APP_ROUTES`, `lazy`, `<Route>`, **menu**.

> **Menu foi de 20 para 21.**

---

## AS DECISÕES DA TELA

### A faxina é um **botão**, não um efeito

> *"Abrir esta tela **não descarta nada**. O botão «limpar vencidos» diz **quantos** quer sair antes de agir — e **a ação é do dono, não da tela**."*

E ela **conta o que fez**:

```
"Nada venceu."  |  "3 trabalho(s) vencido(s) descartado(s)."
```

### A seção dos vencidos tem **borda de aviso**

> *"`{n} trabalho(s) venceram. **Eles não contam mais como trabalho.**"`*
>
> **Vencer não é falha** — é o sinal de que **alguém precisa decidir se ainda faz sentido**.

### O formulário de entrega é **por trabalho**, não em lote

> Entregar é **um ato por item** — e o item precisa dizer **onde** e **o que é**. Em lote, o "onde" seria o mesmo para todos, que é exatamente o que não pode ser.

### Os entregues ficam visíveis, com o caminho

```
{pedido} · {resumo} (docs/pesquisa.md)
```

> **O caminho em `mono`**: é o que a pessoa vai abrir.

### `prazoLabel` diz a situação, não a data

> **"vence em 12 dias"** · **"vence hoje"** · **"venceu"** — e a data completa aparece em `pedido em`.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| Nav (13) · IPC (9) · Regra+store (42) | **64 verdes** |
| Menu | **20 → 21**, teste atualizado |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da tela | **~280** |
| Registros | **7** |

---

## O §12 — **COMPLETO, COM CAMADAS**

| Tipo | Camadas |
|---|---|
| **Organização permanente** | ⚠️ **1 de 6** (regra r81) |
| **Projeto** | ✅ **6 de 6** (r76–r80) |
| **Trabalho pontual** | ✅ **6 de 6** (r83–r87) |

### E os 4 componentes

Organization Builder ✅ · Project Builder ✅ · Agent Factory ✅ · Task Orchestrator ✅

---

## PRÓXIMA RODADA

A **organização permanente** é o único dos três tipos com **1 de 6 camadas**. O próximo trabalho é levá-la ao resto — e a primeira pergunta é se `companies-store` já serve de store, ou se o desenho da r81 precisa do seu.

> **87 rodadas.** O §12 define três tipos de trabalho. **Dois estão completos em seis camadas** — e o terceiro, o mais novo, já nasceu com a regra que o distingue: **ele admite que vai acabar**.
