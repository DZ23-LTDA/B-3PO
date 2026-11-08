# GOAL V2 — RODADA 165: A ORIGEM DO LANÇAMENTO — O FINANCEIRO VOLTA A SABER DE ONDE VEM

**Data**: 05/11/2026 · **§17** · a varredura continua

---

## A MEDIÇÃO

O `FinanceEntry` **carrega `ref` desde sempre**:

```ts
/** Chave de idempotência do emissor (ex.: `venda:<id>`). Vazio = sem deduplicação. */
ref: string
```

**E a tabela mostrava:** tipo · valor · vencimento · parte · status.

> **O `ref` nunca era renderizado.** **O financeiro é o setor que menos sabe o que aconteceu nos outros** — e o `ref` é **a única ponte de volta**.

---

## O QUE FOI FEITO

| Origem | O que a tabela mostra |
|---|---|
| `venda:<id>` | **venda** |
| `compra:<id>` | **compra** |
| `ticket:<id>` | **ticket** |
| **vazio** | **manual** |

> **Mostra o PREFIXO, não o id**: *"venda"* diz o que a pessoa precisa; *"venda:tk_1793..."* **não**.
>
> **Um `ref` vazio aparece como "manual"** — **ausência declarada, não célula em branco**: a mesma disciplina do `null` que não é `0` (r134) e do `—` que não é `R$ 0,00` (r136).

---

## A LIÇÃO — a **quarta** da mesma família

| Rodada | O que a tela não contava | O que estava gravado |
|---|---|---|
| **r161** | o **canal** do ticket | `channel` |
| **r162** | o **ticket** que a recusa abriu | a ligação |
| **r164** | a **automação** que o zero disparou | `stockRanOut` |
| **r165** | **a origem** do lançamento | **`ref`** |

> **As quatro são a mesma coisa**: **um campo que existe, um significado que importa, e uma tela que não o mostra.**
>
> **E as quatro foram achadas pela mesma pergunta**: *"o que o operador vê?"* — **depois** de *"o dado está gravado?"*.

---

## O QUE DEU ERRADO — e a terceira vez

| # | O que tentei | Resultado |
|---|---|---|
| 1 | `script` com `RemoveAt` | **array fixo** → quebrou o arquivo |
| 2 | **revertido**, e refeito com `edit` | ✅ |

> **A vigésima primeira vez** que um script quebra um arquivo nesta sessão. **O `edit` nunca quebrou nenhum.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Telas alteradas | **1** (`/finance`) |
| Testes (finance + finance-store) | **49 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A VARREDURA — O QUE AINDA FALTA

| Tela | O que pode faltar |
|---|---|
| `/sales` | o follow-up e o chamado que a venda pode gerar |
| `/agenda` | o serviço do catálogo que a agenda referencia |

> **A r163 fechou `/compras`. A r164, `/stock`. A r165, `/finance`. Sobraram duas.**

---

## PRÓXIMA RODADA

**`/agenda`** — o agendamento **referencia o serviço do catálogo** (`linkService`, r103) e a tela **mostra o nome sem dizer de onde veio nem quanto custa**.

> **165 rodadas.** **Quatro telas, quatro campos gravados, quatro silêncios.** **A mesma pergunta, quatro vezes — e a resposta é sempre a mesma: o dado estava lá, e ninguém perguntou se ele chegava à tela.**
