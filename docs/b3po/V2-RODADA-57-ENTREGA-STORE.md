# GOAL V2 — RODADA 57: A ENTREGA EM DISCO — E A LIGAÇÃO COM A VENDA

**Data**: 05/11/2026 · **§17 — logística** · rodada 2

---

## O QUE FOI CONSTRUÍDO

`delivery-store.ts` — `entregas.json` em `userData/b3po/`, com fila de escrita e o padrão atômico (r11).

---

## POR QUE UM ARQUIVO PRÓPRIO

> `entregas.json`, ao lado de `sales.json` e `inventory.json`. A entrega **não pertence** a nenhum deles: ela **liga os dois**, e guardá-la dentro de um faria **o outro ter de saber sobre entrega para ler a própria lista**.

**E o §14 proíbe** criar segunda entidade **para o mesmo dado** — um segundo `supplier`, um segundo estoque. **A entrega não existe em lugar nenhum: é entidade nova, não duplicata.**

---

## A LIGAÇÃO QUE A r55 MEDIU FALTAR

```ts
porPedido(orderId) → Entrega | null
```

> É a pergunta que a venda faz: ***"esta venda já saiu?"***
>
> **Sem ela, a venda registra e ninguém sabe se a mercadoria chegou** — que é o estado atual do produto.

---

## QUATRO DECISÕES DE STORE

| Decisão | Por quê |
|---|---|
| **Uma entrega por pedido** (`entrega_ja_existe`) | duas rotas para a mesma venda deixariam *"já saiu?"* **sem resposta** |
| **Entrega malformada é descartada na leitura** | uma linha sem `order_id` **quebraria a ligação com a venda**, e uma quebra na leitura **impediria de ver as outras** |
| **`pendentes()` como método** | a tela pergunta a cada montagem; filtrar em memória funcionaria, mas **esconderia que a pergunta é sobre uma parte da lista** |
| **O `recebedor` vem de quem chama** | no canal, de `actorOf` — **nunca do payload do renderer** |

---

## A PROVA — 15 testes

| Grupo | O que trava |
|---|---|
| **caminho** | `b3po/entregas.json` · corrompido vira vazio · **entrega sem `order_id` é descartada** |
| **criar** | nasce `pendente` · **a mesma venda não ganha duas entregas** · sem destino/pedido recusa |
| **a ligação** | **`porPedido` encontra a entrega daquela venda** · `null` quando não há |
| **transitar** | `pendente→em_rota→entregue` **com comprovante persistido** · **sobrevive a instância nova** |
| | **`entregue` sem comprovante recusado pelo store**, não só pela função |
| **consultas** | `pendentes` traz o que falta sair · ordena por recente · isola por tenant |

> **O teste que importa**: *"sobrevive a uma instância nova"*. A r56 provou a **regra**; este prova que **o disco guarda o resultado dela**. Um store que só funciona na mesma instância é um cache.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do store | **~180** |
| Testes | **31** (16 da regra + 15 do store) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE A LOGÍSTICA ESTÁ

| Camada | Estado |
|---|---|
| 1. Regra | ✅ r56 |
| **2. Store** | ✅ **r57** |
| 3. Canal | ❌ |
| 4. Preload | ❌ |
| 5. Wrapper | ❌ |
| 6. Tela | ❌ |

---

## E O §17 — o vertical

| Etapa da distribuidora de gás | Estado |
|---|---|
| pedido · estoque · financeiro | ✅ |
| **entrega** | ⚠️ **regra + store**, falta a porta |
| comprovante | ✅ persistido |

> **O caminhão agora tem onde estacionar; falta a chave.**

---

## PRÓXIMA RODADA

**O canal** — `hermes:logistica:*` com guarda, e a ligação inversa: ao registrar uma entrega, a venda não muda (a venda **não precisa saber**; quem pergunta é quem lê).

> **57 rodadas.** A logística passou de **ausente** (r54) a **8 camadas de 6 possíveis** — e a que falta é a que o usuário toca.
