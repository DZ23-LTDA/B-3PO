# GOAL V2 — RODADA 56: A ENTREGA — O CAMINHÃO QUE FALTAVA

**Data**: 05/11/2026 · **§17 — primeiro vertical** · rodada 1 da logística

---

## O QUE A r55 MEDIU

> **8 de 9 domínios existem. Logística não.**
>
> E o candidato a vertical que o GOAL nomeia — **distribuidora de gás** — é, antes de tudo, uma operação de **entrega**.
>
> *"O produto tem o pedido e o dinheiro — e não tem o caminhão."*

---

## O QUE FOI CONSTRUÍDO — e por que é pequeno

`delivery.ts` — **o mínimo que uma entrega precisa**:

```
existe · tem destino · tem quem levou · tem comprovante
```

### O que ele **não** tem, de propósito

| Não tem | Por quê |
|---|---|
| rota calculada / otimização / mapa | **uma distribuidora pequena conhece os caminhos** |
| janela de entrega / agendamento | o cliente liga e pergunta |
| rastreamento em tempo real | ninguém pediu |
| frete por distância | idem |

> **Nenhum foi pedido pelo fluxo, e cada um é uma semana de trabalho que pode nunca ser usada.**
>
> « O §17 diz *"não modelar 16 domínios completos no vácuo"* — então este módulo é **o oposto do vácuo**: é o que **o vertical comprovou faltar**.

---

## AS DECISÕES DE MODELO

### O `order_id` é obrigatório

> **Uma entrega sem pedido é uma viagem sem motivo.** E é por este campo que **a venda sabe que saiu** — a ligação que a r55 mediu faltar.

### `entregue` exige comprovante

```ts
if (!recebedor) return { error: 'comprovante_obrigatorio' }
```

> **Uma entrega sem quem recebeu é uma afirmação sem prova** — e é exatamente o que uma distribuidora precisa poder mostrar **quando o cliente diz que não recebeu**.

### `pendente → entregue` é recusado

> Pularia o *"saiu com a mercadoria"*. Se a entrega é imediata (retirada no balcão), o caminho é `em_rota` e `entregue` **no mesmo minuto** — e o modelo não inventa um campo `tipo` para o que ninguém pediu ainda.

### `em_rota` sem entregador é recusado

> **Uma rota sem responsável não tem a quem perguntar.**

### `entregue` e `recusada` são finais

> **Reabrir uma entregue faria a mesma mercadoria sair duas vezes; reabrir uma recusada apagaria o fato de o cliente ter dito não.**

---

## A PROVA — 16 testes

| Grupo | O que trava |
|---|---|
| **normalizar** | nasce `pendente`; **status do payload é ignorado**; sem pedido ou destino não há entrega |
| **transições** | `pendente→em_rota` com entregador · `em_rota→entregue` com comprovante |
| | **`entregue` sem comprovante recusado** · **`pendente→entregue` recusado** · **`em_rota` sem entregador recusado** |
| **estados finais** | `entregue` **não volta** · `recusada` **não volta** |
| **consultas** | a fila tem só `pendente`/`em_rota` · resumo em português |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do módulo | **~160** |
| Testes | **16** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE A LOGÍSTICA ESTÁ

| Camada | Estado |
|---|---|
| 1. Regra | ✅ **r56** |
| 2. Store | ❌ |
| 3. Canal | ❌ |
| 4. Preload | ❌ |
| 5. Wrapper | ❌ |
| 6. Tela | ❌ |

> **A regra é a parte que mais importa e a que mais envelhece se errada.** As outras cinco são ligação e apresentação — e agora **há o que ligar**.

---

## E O §17 — o vertical

| Etapa da distribuidora de gás | Estado |
|---|---|
| pedido | ✅ `sales-store` |
| estoque (botijão) | ✅ `inventory-store` |
| financeiro | ✅ `finance-store` |
| **entrega** | ⚠️ **regra existe (r56)**, falta a porta |
| **comprovante** | ✅ na regra |

> **O caminhão existe; falta a chave.**

---

## PRÓXIMA RODADA

**O store da entrega** — mesma estrutura de `purchases.json`, fila de escrita, e o vínculo que faz a venda saber que saiu.

> **56 rodadas.** A logística deixou de ser **um domínio ausente** e passou a ser **uma regra que recusa o que não deve ser aceito** — que é o mais difícil de acertar e o mais caro de mudar depois.
