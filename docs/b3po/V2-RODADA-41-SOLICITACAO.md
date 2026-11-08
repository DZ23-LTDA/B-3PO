# GOAL V2 — RODADA 41: A SOLICITAÇÃO — A ÚLTIMA ETAPA DO §26

**Data**: 05/11/2026 · **§14 — Compras** · etapa 1 de 10

---

## O §14 MANDA VERIFICAR ANTES DE CRIAR

> *"Antes de criar ou alterar tabela/arquivo/entidade: **localizar equivalentes atuais**; validar fonte de verdade; mapear relações e consumidores."*

**Feito antes de escrever uma linha:**

| Termo | Resultado |
|---|---|
| `solicita` | só `agent-approval-store` (tipo `SolicitacaoAprovacao`) |
| `requisic` | só erro de MCP |
| `demanda` · `purchase_request` · `PurchaseRequest` · `pedido_compra` · `intencao` | **ausentes** |

**Confirmado: não existe.** E o que existe **não serve**:

> `agent-approval-store` modela *"este agente pode executar esta ação neste domínio?"* — **autorização de agente**. A pergunta da solicitação é outra: *"alguém precisa desta mercadoria?"*.
>
> **Consolidar as duas faria uma decisão de negócio aparecer como decisão de permissão** — e o inverso.

---

## O QUE FOI CONSTRUÍDO

`purchases-solicitacao.ts` + `solicitacoes` no `purchases.json`.

```ts
SolicitacaoCompra {
  id, tenant_id, solicitante
  product_sku, quantity_milli
  motivo: string           ← obrigatório
  status: 'aberta' | 'atendida' | 'cancelada'
  created_at, updated_at
}
```

### Três decisões de modelo

| Decisão | Por quê |
|---|---|
| **No mesmo `purchases.json`** | um 28º arquivo para uma entidade do mesmo domínio **criaria uma segunda transação para manter consistente** |
| **Aditivo** | `solicitacoes` ausente vira `[]`. **Nenhum campo existente muda de forma** — não há migração a escrever, e voltar atrás é remover a lista |
| **`motivo` obrigatório** | a solicitação inteira existe para registrar **por quê**. Aceitar vazio produziria **uma linha que parece informação e não é** |

### Duas decisões de comportamento

**O solicitante do payload é ignorado.**

> Aceitar o solicitante do payload deixaria alguém **pedir em nome de outro**, e a trilha mentiria. Vem do resolvedor no processo principal.

**O status do payload é ignorado.**

> **Uma solicitação que nasce `atendida` não pediu nada.**

---

## AS TRANSIÇÕES — e por que não voltam

```
aberta → atendida     quando vira pedido
aberta → cancelada    quando ninguém vai comprar
atendida → (nada)     reabrir faria a mesma necessidade pedir DUAS vezes
cancelada → (nada)    reabrir apagaria o cancelamento, que é um FATO
```

> **Um estado que pode ser desfeito sem rastro não é estado, é intenção.**

---

## A PROVA — 15 testes

| Teste | O que trava |
|---|---|
| cria `aberta` com o solicitante **do contexto** | o payload não decide quem pede |
| **solicitante do payload é ignorado** | ninguém pede em nome de outro |
| **status do payload é ignorado** | não nasce atendida |
| **motivo em branco é recusado** | é o ponto inteiro da entidade |
| quantidade zero/negativa | pedir zero não é pedir |
| **atendida não volta** | não pede duas vezes |
| **cancelada não volta** | cancelamento é fato |
| mesmo status é no-op | não é erro |
| `quantidadePedida` soma só abertas | atendida não conta de novo |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da entidade | **152** |
| Testes novos | **15** |
| Suíte de compras | **132 verdes** |
| Regressão | **183 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE COMPRAS ESTÁ — §26, 10 etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | **solicitação** | ✅ **r41 (entidade)** |
| 2–10 | cotação · comparação · aprovação · pedido · recebimento · conferência · estoque · financeiro · auditoria | ✅ |

**10 de 10 — no modelo.**

## E o que ainda falta para o §26 aceitar

> *"Não considerar botão, tela, store, teste isolado ou resposta textual como prova de fluxo completo."*

| Lacuna | Estado |
|---|---|
| **Canal** `hermes:purchases:solicitar` | ❌ **não existe** |
| **Tela** de solicitação | ❌ **não existe** |
| Solicitação → pedido (ligação) | ❌ o `status` muda, mas **nada cria o pedido a partir dela** |

> **O modelo está completo; o fluxo não está percorrível.** É a mesma distinção da r25: **capacidade sem porta**.

---

## PRÓXIMA RODADA

**O canal e a tela da solicitação** — para transformar a décima etapa em algo que alguém **atravessa**, não só algo que existe.

E depois a **ligação que falta**: solicitação atendida → pedido criado. Hoje o `status` muda e **nada acontece** — que é a forma mais enganosa de um campo existir.
