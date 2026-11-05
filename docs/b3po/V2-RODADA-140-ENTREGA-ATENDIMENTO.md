# GOAL V2 — RODADA 140: A 6ª LIGAÇÃO — ENTREGA RECUSADA VIRA TICKET

**Data**: 05/11/2026 · **§17** · *"somente com necessidade comprovada"*

---

## A NECESSIDADE COMPROVADA — medida

| Peça | Estado |
|---|---|
| `ENTREGA_STATUS = ['pendente','em_rota','entregue','recusada']` | ✅ existe |
| `delivery-store` / `delivery-ipc` | **0 referências a ticket** |
| `service-desk-store` | **0 referências a entrega** (só um comentário) |

> **O cliente recusa o bujão na porta — e ninguém abre um ticket.**
>
> **A entrega fica `recusada` e o atendimento não sabe que houve um problema**; na segunda tentativa, **o mesmo endereço, a mesma recusa**.

### E o próprio `service-desk-store` já dizia o ciclo

> *"Fecha o ciclo comercial: **venda → entrega → suporte → pós-venda**."*
>
> **A seta `entrega → suporte` era a que faltava.**

---

## AS TRÊS DECISÕES

### 1. Só `recusada` abre ticket

> `pendente`, `em_rota` e `entregue` são **o caminho normal** — e `entregue` é **o sucesso**.
>
> **Um ticket para cada transição encheria a fila de ruído.**

### 2. A prioridade vem do **valor**, não do gosto

| Total | Prioridade |
|---|---|
| < R$ 500 | **baixa** |
| ≥ R$ 500 | **alta** |
| ≥ R$ 2.000 | **urgente** |
| ausente | **média** |

> **Uma recusa de R$ 20 e uma de R$ 2.000 não têm a mesma urgência** — e **a fila precisa saber a diferença sem que alguém a digite**.
>
> **Valor ausente vira média**: nem **baixa por acaso**, nem **urgente por medo**.

### 3. O ticket **não culpa ninguém**

> O assunto é **o FATO** (`Entrega recusada`) e a descrição **diz o que fazer**.
>
> **"O motorista errou" fecharia a investigação antes de ela começar.**

---

## A PROVA — 11 testes

| Grupo | O que trava |
|---|---|
| **só a recusa** | pendente/em_rota/entregue **não abrem** |
| **a mesma recusa duas vezes** | **não abre dois tickets** — o segundo faria a fila crescer sem que nada acontecesse |
| **a prioridade** | os três cortes · **ausente = média** |
| **a descrição** | com motivo, **repete e manda confirmar** · sem motivo, **manda ligar** |
| **o assunto** | `Entrega recusada`, **não um julgamento** |
| **sem telefone** | o ticket nasce **solto**, e o campo **diz isso** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~150** |
| Testes | **11** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **6** (a 6ª em construção) |

---

## O QUE FALTA — e está dito

| Item | Estado |
|---|---|
| **a decisão** | ✅ r140 |
| **a montagem no `delivery-ipc`** | ❌ **falta** |
| **o fluxo ponta a ponta** | ❌ **falta** |

> **Mesma honestidade da r133**: **a regra, não a ligação**. A r141 monta, como a r135 fez.

---

## PRÓXIMA RODADA

**A montagem: `delivery-ipc` chama `intencaoDeAtendimento` e abre o ticket no `service-desk-store`** — com o fluxo provando `em_rota → recusada → ticket aberto`.

> **140 rodadas.** O `service-desk-store` **escreveu o ciclo** (`venda → entrega → suporte → pós-venda`) e **a seta do meio nunca existiu**. **A documentação descrevia uma ligação que o código não tinha** — e é o tipo de lacuna que só uma medição de referências encontra.
