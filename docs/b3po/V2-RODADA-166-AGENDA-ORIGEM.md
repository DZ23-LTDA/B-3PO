# GOAL V2 — RODADA 166: A ORIGEM DO AGENDAMENTO — E A VARREURA QUE FECHOU

**Data**: 05/11/2026 · **§17** · a quinta da família

---

## A MEDIÇÃO

O `Appointment` carrega **`ref`** desde a r103:

```ts
/** Chave de idempotência do emissor (ex.: `pedido:<id>`). Vazio = sem deduplicação. */
ref: string
```

**E a tabela mostrava:** data · hora · recurso · serviço · status.

> **O `ref` nunca era renderizado.** **A agenda é o lugar onde se descobre POR QUE aquele horário está ocupado** — e a origem era o único dado que faltava.

### E uma hipótese que a medição derrubou

**Eu ia acrescentar o preço** — *"a tela mostra o serviço e não quanto custa"*.

**O `Appointment` não tem `price_cents`** — e **não deve ter**: o `ref` aponta para o **pedido**, e **o preço mora na venda**.

> **Persistir o preço aqui faria duas fontes para o mesmo número** — e a segunda envelheceria. **A origem resolve o que o preço prometia**: com `pedido:<id>`, o valor está a um clique.

---

## O QUE FOI FEITO

| Origem | O que a tabela mostra |
|---|---|
| `pedido:<id>` | **pedido** |
| **vazio** | **manual** |

> **Mesma regra da r165 no financeiro**: **o prefixo, não o id**; **ausência declarada, não célula em branco**.

---

## A FAMÍLIA — **cinco telas, cinco campos, cinco silêncios**

| Rodada | Tela | O que estava gravado e não aparecia |
|---|---|---|
| **r161** | `/atendimento` | o **`channel`** do ticket |
| **r162** | `/entregas` | o **ticket** que a recusa abriu |
| **r164** | `/stock` | o **`stockRanOut`** do zero |
| **r165** | `/finance` | o **`ref`** do lançamento |
| **r166** | `/agenda` | o **`ref`** do agendamento |

> **Cinco telas, cinco campos, cinco silêncios.** **E os cinco foram achados pela mesma pergunta**: *"o que o operador vê?"* — **depois** de *"o dado está gravado?"*.

---

## A VARREDURA — **FECHADA**

| Tela | Estado |
|---|---|
| `/compras` · `/stock` · `/finance` · `/agenda` · `/atendimento` · `/entregas` | ✅ |
| `/settings` (CRM) | ✅ r136 · r149 |
| `/posvenda` | ✅ (o `notes` da r151) |

> **Sete telas auditadas.** **A varredura que a r161 começou está completa.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Telas alteradas | **1** (`/agenda`) |
| Testes (agenda + scheduling) | **96 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Telas auditadas na varredura** | **7** |

---

## A LIÇÃO — e ela é sobre **a hipótese que caiu**

> **Eu ia acrescentar o preço.** A medição mostrou que **o campo não existe** — e **que não deve existir**.
>
> **A correção certa não era "mostrar o preço": era "mostrar de onde vem"**, porque **o preço já tem um lugar** e **o que faltava era o caminho até ele**.
>
> **É a diferença entre adicionar um dado e revelar uma ligação** — e **a segunda não cria uma segunda verdade**.

---

## PRÓXIMA RODADA

**A verificação** — as rodadas 161–166 tocaram **seis telas** e **nenhum store**. A última completa foi a r160.

> **166 rodadas.** A varredura **começou com uma porta sem placa** (r161) e **terminou com cinco**. **Nenhuma das cinco era um bug**: todas eram **um campo gravado, um significado que importa, e uma tela que não perguntava**.
