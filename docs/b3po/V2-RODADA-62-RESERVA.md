# GOAL V2 — RODADA 62: A RESERVA — E A DECISÃO QUE ELA SE RECUSA A TOMAR

**Data**: 05/11/2026 · **§26** · a etapa que a r61 mediu faltar

---

## O QUE A r61 ENCONTROU

> O §26 põe `reserva` entre o pedido e o pagamento. **Não existia** — `faturar` baixa o estoque na hora.
>
> **Dois vendedores podiam faturar o mesmo último botijão**, e o segundo descobria quando o estoque já não tinha.

---

## O QUE UMA RESERVA É — E O QUE ELA NÃO É

**É uma promessa com prazo.** Não é uma baixa: o estoque **continua no depósito e continua contado**.

**Não é um bloqueio eterno.** Toda reserva tem `expires_at`, e uma vencida **não conta como ocupada** — *"senão um pedido abandonado travaria o produto para sempre, e ninguém saberia por quê"*.

---

## A DECISÃO MAIS DIFÍCIL — e a resposta honesta

> *"O que acontece quando o cliente não paga?"*

**A reserva vence. Nada mais.**

| Não faz | Por quê |
|---|---|
| cancelamento automático | **o produto não tem opinião sobre por que o cliente não pagou** |
| e-mail · fila de cobrança | **decisão comercial que não é dela** |
| liberar sozinha | o vencimento **já devolve** o produto à disponibilidade |

> **O que ela faz é devolver o produto e contar quantas venceram** — para alguém olhar.
>
> **É o mesmo padrão da reconciliação da r38: achar, não decidir.**

---

## AS DECISÕES DE MODELO

### `expires_at` é obrigatório

> **Uma reserva sem prazo é um produto bloqueado por tempo indeterminado** — e o produto **não tem como saber se o cliente vai pagar**, então não pode prometer que ele vai.
>
> **Prazo padrão: 30 minutos.** Curto o suficiente para liberar, longo o suficiente para pagar.

### `disponivel` **nunca é negativo**

```ts
return Math.max(0, saldo - reservado(...))
```

> Um saldo já negativo **não vira "disponível negativo"** — vira zero, porque a pergunta é *"posso vender?"*, e a resposta a um estoque inconsistente é **"não"**.

### `podeReservar` **nomeia o livre**

```ts
{ error: 'saldo_insuficiente', livre_milli: 30_000 }
```

> `saldo_insuficiente` sozinho obrigaria quem lê a **calcular quanto sobra** — e o cálculo é **justamente o que esta função existe para fazer**.

### **Confirmar uma vencida é recusado**

```ts
if (novo === 'confirmada' && !reservaAtiva(reserva, agora)) return { error: 'prazo_vencido' }
```

> **É o caso perigoso**: o produto **já está disponível para outro**. Quem chegou atrasado **reserva de novo** — e aí a segunda reserva **encontra o saldo que a primeira liberou, ou não encontra nada**.

---

## A PROVA — 27 testes

| Grupo | O que trava |
|---|---|
| **normalizar** | nasce ativa com prazo · **status do payload é ignorado** · **sem venda, sem reserva** · prazo inválido recusado |
| **quando conta** | ativa conta · **vencida NÃO** · confirmada/liberada não |
| **disponível** | saldo − reservado · outra SKU não desconta · **vencida devolve** · **nunca negativo** |
| **podeReservar** | **a recusa nomeia o livre** · o que outra reserva ocupou não está livre |
| **transições** | ativa→confirmada/liberada · **confirmar vencida RECUSADO** · liberar vencida **permitido** |
| | **confirmada não volta** · **liberada não volta** |
| **vencidas** | só as ativas com prazo passado · o resumo separa *"ocupa"* de *"venceu para liberar"* |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~230** |
| Testes | **27** |
| Regressão (reservation + sales + delivery) | **141 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §26 — VENDA, AGORA

| Etapa | Estado |
|---|---|
| produto · pedido · expedição · entrega · financeiro · auditoria | ✅ |
| **reserva** | ✅ **regra (r62)** |
| canal · pagamento confirmado | ⚠️ parcial |

**6 de 9 completo · 2 parciais · 0 ausente.**

---

## ONDE A RESERVA ESTÁ

| Camada | Estado |
|---|---|
| **1. Regra** | ✅ **r62** |
| 2–6. Store · Canal · Preload · Wrapper · Tela | ❌ |

> **A regra é a parte que mais envelhece** — e a que decide **o que o produto se recusa a fazer**.

---

## PRÓXIMA RODADA

**O store da reserva** — e a ligação que a torna útil: `faturar` **consome a reserva** em vez de criar outra.

> **62 rodadas.** A etapa que faltava existe como **regra** — e ela é deliberadamente **preguiçosa**: vence, devolve e conta. **Não decide pelo dono da distribuidora.**
