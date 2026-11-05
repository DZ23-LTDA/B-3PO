# GOAL V2 — RODADA 63: A RESERVA EM DISCO — E "NUNCA HOUVE" ≠ "VENCEU"

**Data**: 05/11/2026 · **§26** · rodada 2 da reserva

---

## O QUE FOI CONSTRUÍDO

`reservation-store.ts` — `reservas.json`, com fila de escrita e o padrão atômico.

---

## O BUG QUE O TESTE ENCONTROU — e ele é conceitual

Escrevi `confirmarDaVenda` assim:

```ts
const indice = estado.reservas.findIndex(r => r.sale_id === saleId && reservaAtiva(r, agora))
if (indice < 0) return null
```

**O teste "reserva VENCIDA não é confirmada" falhou** — devolvia `null` em vez de `prazo_vencido`.

**O filtro por `reservaAtiva` escondia a diferença entre:**

| Situação | O que é |
|---|---|
| **nunca houve reserva** | `null` — **e é sucesso**: o balcão vende sem reservar |
| **houve e venceu** | `prazo_vencido` — **um fato que alguém precisa saber** |

> **As duas produziriam o mesmo silêncio.** Uma venda que chegou atrasada diria *"tudo certo"* — e o produto teria sido liberado para outro cliente.
>
> **Corrigido**: procura por `sale_id` **sem filtrar**, e deixa `mudarReserva` decidir.

**É o mesmo erro da r59**: um filtro que responde a pergunta errada.

---

## AS DECISÕES DO STORE

### `confirmarDaVenda` **não falha quando não há reserva**

> *"Nem toda venda reserva: o balcão vende e entrega no mesmo minuto. Uma função que exigisse reserva obrigaria toda venda direta a criar uma antes — **cerimônia sem propósito**."*
>
> **`null` aqui é sucesso**, não ausência de resposta.

### O store **não libera vencidas sozinho**

> *"Um store que se auto-limpa em `read` esconderia a escrita — e quem depurasse um produto travado **não encontraria o que aconteceu**."*
>
> `vencidas()` **encontra**; mudar de estado é **ação de alguém**.

### Uma reserva ativa por venda

> **Duas deixariam "quanto esta venda prometeu" sem resposta**, e a mesma mercadoria **contaria duas vezes** no disponível.

### Reserva **sem `expires_at`** é descartada na leitura

> **Travaria um produto para sempre** — o oposto do que a reserva existe para fazer.

---

## A PROVA — 18 testes novos (45 no total)

| Grupo | O que trava |
|---|---|
| **caminho** | `b3po/reservas.json` · corrompido vira vazio · **sem `expires_at` é descartada** |
| **criar** | ativa com prazo padrão · **a mesma venda não ganha duas** |
| **reservado** | soma as ativas · **vencida não conta** · `ativas()` e `vencidas()` separam |
| **a ligação** | **`confirmarDaVenda` marca a daquela venda** · **sem reserva devolve `null`** |
| | **vencida devolve `prazo_vencido`** · **sobrevive a instância nova** |
| **o que não faz** | **não libera vencidas sozinho** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do store | **~230** |
| Testes da reserva | **45** (27 regra + 18 store) |
| Regressão | **310 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE A RESERVA ESTÁ

| Camada | Estado |
|---|---|
| 1. Regra · **2. Store** | ✅ r62 · ✅ **r63** |
| 3–6. Canal · Preload · Wrapper · Tela | ❌ |

---

## O QUE **AINDA** FALTA — e é a ligação que dá sentido

> **`faturar` ainda não chama `confirmarDaVenda`.**

O store sabe consumir a reserva; **a venda não o chama**. Hoje:

```
reserva criada → (ninguém fatura usando a reserva) → reserva vence
```

> **A reserva existe e não muda a venda.** É o padrão da r2 — **capacidade sem ligação** — na sua forma mais sutil: o store está pronto e **o chamador não existe**.

---

## PRÓXIMA RODADA

**Ligar `faturar` à reserva** — `sales-ipc` recebe o `ReservationStore` opcional e confirma na hora do faturamento.

> **63 rodadas.** A reserva tem regra e disco. O que falta é **o momento em que ela importa**: a venda que a consome.
