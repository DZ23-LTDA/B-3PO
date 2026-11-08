# GOAL V2 — RODADA 151: A 8ª LIGAÇÃO — A NOTA BAIXA CHEGA AO PÓS-VENDA

**Data**: 05/11/2026 · **§17** · *"somente com necessidade comprovada"*

---

## A NECESSIDADE COMPROVADA — medida

| Peça | Estado |
|---|---|
| `Ticket` tem `satisfaction` e `closed_at` | ✅ |
| `FollowUp` tem `kind: 'satisfacao'`, **prazo de 2 dias** | ✅ |
| `after-sales-store` **escreve o ciclo em comentário** | ⚠️ *"venda → entrega → atendimento → pós-venda"* |
| **`service-desk-store` conhece pós-venda** | ❌ **ZERO referências** |

> **O cliente dá nota 1 ou 2, o ticket fecha, e ninguém o procura.**
>
> **O pós-venda existe, tem o tipo certo e o prazo certo — e nunca é criado por causa de uma reclamação.**

---

## A LIÇÃO DAS LIGAÇÕES 5, 6 E 7 — **aplicada antes de escrever**

> **A r134, r141 e r146 descobriram na montagem que o tipo real não tinha os campos. A r147 descobriu que o `upsert` com `null` apagava o campo da outra ligação.**

**Aqui a medição veio primeiro — e achou um campo que existe:**

> **O `FollowUp.sale_at` é a base do prazo, e o ticket tem `closed_at`.**
>
> **Usar `sale_at` com a data do ticket seria mentir sobre o que o prazo significa** — o prazo de `satisfacao` são **2 dias depois do atendimento**, não da venda.

---

## AS TRÊS DECISÕES

### 1. Só satisfação **≤ 2** abre follow-up

| Nota | O que acontece |
|---|---|
| **5** | **nada** — procura-lo é ruído |
| **3** | **nada** — o atendimento já pode ter resolvido |
| **2 e 1** | **follow-up** |

> **E o corte é 2 porque o `service-desk-store` JÁ define que ≤ 2 escala para humano** — **a mesma linha, usada de novo em vez de inventada**.
>
> **Duas regras com cortes diferentes para a mesma pergunta fariam o produto discordar de si mesmo.**

### 2. Sem telefone, não cria

> **Um follow-up sem contato é uma tarefa que ninguém executa.**

### 3. **O `ref` é o TICKET, não a venda** — e isso é a descoberta

> A r146 mostrou que **`ref` é a chave de idempotência**. Usar `venda:<id>` faria **uma reclamação de uma venda que já tem follow-up de recompra COLIDIR com ele — e não criar nada**.
>
> **`ticket:<id>` é a origem certa.**

---

## A NOTA DIZ **por que** o follow-up existe

| Nota | A frase |
|---|---|
| **1** | *"Ligar hoje: alguém insatisfeito que não é procurado **não volta**."* |
| **2** | *"A reclamação foi resolvida **no papel**, não necessariamente na prática."* |

> **Um `satisfacao` sem a nota obriga o atendente a abrir o ticket para descobrir se foi 1 ou 2 — e a diferença muda a abordagem.**

---

## A PROVA — 11 testes

| Grupo | O que trava |
|---|---|
| **só a nota baixa** | 5 e 3 **não abrem** · 1 e 2 abrem · **corte = 2** |
| **o prazo** | `baseEm` é o **`closed_at`**, não a venda · sem data, usa agora |
| **o `ref`** | **`ticket:t1`** — não colide com a recompra |
| **sem telefone** | não cria · **e o telefone vai só com dígitos** |
| **a nota** | 1 e 2 **dizem coisas diferentes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~140** |
| Testes | **11** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **8** (a 8ª em construção) |

---

## O QUE FALTA — e está dito

| Item | Estado |
|---|---|
| **a decisão** | ✅ r151 |
| **a montagem no `service-desk-ipc`** | ❌ **falta** |
| **o fluxo ponta a ponta** | ❌ **falta** |

> **Quarta vez** (r133, r140, r146, r151) — e as **três anteriores foram montadas na rodada seguinte**.

---

## PRÓXIMA RODADA

**A montagem: o `avaliado`/`resolvido` do atendimento cria o follow-up** — com o fluxo provando `nota 1 → follow-up com ref do ticket`.

> **151 rodadas.** A r151 **encontrou o `ref` antes de errar nele**: a origem de um follow-up de satisfação é **o ticket**, não a venda — e usar a venda faria **a reclamação desaparecer** por colisão de chave. **A medição do campo veio antes da escrita, e o campo era o mais perigoso.**
