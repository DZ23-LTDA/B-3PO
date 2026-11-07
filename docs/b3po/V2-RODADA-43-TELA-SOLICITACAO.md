# GOAL V2 — RODADA 43: A FILA DE SOLICITAÇÕES TEM TELA

**Data**: 05/11/2026 · **§14 — Compras** · etapa 1 completa

---

## O QUE FOI CONSTRUÍDO

```
Solicitações de compra                              3 abertas
O que falta comprar, e por quê. Uma solicitação atendida não volta —
reabrir faria a mesma necessidade pedir duas vezes.

[ Produto ▾ ] [ Quantidade ] [ Por que (obrigatório) ]
[ Pedir ]

A-001 · 30 un — acabou no depósito e há venda marcada   [Atender] [Cancelar]
B-002 · 10 un — reposição mensal                        [Atender] [Cancelar]
```

---

## CINCO DECISÕES DE TELA

| Decisão | Por quê |
|---|---|
| **"Por que" é obrigatório e o placeholder explica** | `ex.: acabou no depósito e há venda marcada` **mostra o nível de detalhe esperado** — um campo vazio com rótulo "motivo" convida a "x" |
| **Só as abertas na lista** | atendida e cancelada **não precisam de ação**; mostrá-las faria a fila crescer até ninguém olhar |
| **Contador "N abertas" no cabeçalho** | é a informação que se quer de relance |
| **Produto vem de `products`** | SKU digitado à mão **erraria o produto em silêncio** |
| **Atender e Cancelar lado a lado** | as duas ações são **a decisão sobre a mesma linha**; esconder uma atrás de um menu faria a outra parecer a única opção |

---

## O ERRO DE EDIÇÃO — e por que ele custou pouco

Escrevi um script que inseriu `listarSolicitacoes()` **no lugar errado** e **comeu o `= await Promise.all([`** do destructuring.

O typecheck apontou **7 erros na mesma região**, em 3 segundos. Corrigido com **dois `edit`**.

> **É a sexta edição por script que corrompe um arquivo nesta sessão** — e a diferença é sempre a mesma: **o typecheck rodou imediatamente**, e o custo foi **minutos**, não um commit quebrado.

---

## AS CINCO CAMADAS — etapa 1 completa

| Camada | Estado |
|---|---|
| 1. Regra | ✅ r41 |
| 2. Store | ✅ r42 |
| 3. Canal | ✅ r42 |
| 4. Preload | ✅ r42 |
| 5. Wrapper | ✅ **r43** |
| 6. Tela | ✅ **r43** |

> **É a quarta capacidade com o caminho completo** — aprovação, auditoria, conferência, solicitação.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Tela | **531 → 677 linhas** |
| Funções novas no wrapper | **4** |
| Recusas traduzidas | **7** |
| Testes | **139 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE AINDA FALTA — E É O PONTO

> A r41 disse: *"solicitação atendida **não cria pedido**. O status muda e nada acontece."*

**Continua verdade.**

```
Solicitação: A-001 · 30 un · "acabou no depósito"
                        ↓  [Atender]
status = 'atendida'          ← e é só isso
                        ↓
              ??? nada acontece ???

Pedido: alguém digita A-001 · 30 un no formulário de pedido
```

> **A etapa 1 registra uma necessidade e a etapa 5 compra outra coisa, sem que as duas se encontrem.**

---

## O QUE ISSO SIGNIFICA PARA O §26

| | |
|---|---|
| As 10 etapas **existem** | ✅ |
| As 10 etapas **têm porta** | ✅ |
| O fluxo **se percorre** | ⚠️ **em partes** |

> O §26 diz: *"não considerar botão, tela, store ou teste isolado como prova de fluxo completo."*
>
> **Hoje o fluxo está completo PEPÉTUA — cada etapa funciona e uma não alimenta a outra.**

---

## PRÓXIMA RODADA

**A ligação `solicitação atendida → pedido`.**

O desenho que o modelo já permite: `atender` cria um pedido em `rascunho` com o item da solicitação, e o `pedido` guarda `solicitacao_id`. **A aprovação e a cotação continuam no caminho** — a solicitação **inicia** o pedido, não o aprova.

> **É a diferença entre uma fila e um fluxo**: uma fila que nunca vira pedido é **um arquivo de desejos**.
