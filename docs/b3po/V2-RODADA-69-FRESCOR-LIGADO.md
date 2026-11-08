# GOAL V2 — RODADA 69: O FRESCOR LIGADO — E O QUE A LIGAÇÃO REVELOU

**Data**: 05/11/2026 · **§19** · fecha o replay

---

## O QUE FOI LIGADO

`parseMetaWebhook` agora verifica o `timestamp` de **cada mensagem**:

```ts
if (!(Number.isFinite(segundos) && segundos > 0) || now - sentAt > JANELA_REPLAY_MS) {
  ignored += 1
  continue
}
```

### Por que **por mensagem**, e não por payload

> Um payload pode trazer **várias** mensagens, com tempos diferentes. Recusar o payload inteiro por uma velha **perderia as frescas** — e a Meta agrupa.

### A idempotência **já cobria** a reentrega do mesmo payload

```ts
if (atual && atual.messages.some(m => m.external_id === nova.external_id)) { duplicadas += 1 }
```

> **`wamid` é a chave.** O que ela **não** cobria é um **payload novo carregando uma mensagem antiga** — e é exatamente isso que a janela pega.
>
> **As duas defesas são complementares, não redundantes.**

---

## O QUE A LIGAÇÃO REVELOU

**4 arquivos de teste quebraram**, todos com `timestamp: '1793772076'` — **um instante fixo**.

> **Eles passavam porque nada verificava o tempo.** Com a verificação, a mensagem de "2026-11-02" virou **replay**.

**Corrigidos**: `crm-meta-webhook-map`, `crm-whatsapp-endpoint`, `crm-whatsapp-ingest`, `crm-whatsapp-listener` — agora usam `Date.now()`.

### E um teste mudou de **significado**

```
 ANTES: 'timestamp ausente usa "agora" em vez de 1970'
 DEPOIS: 'timestamp ausente é IGNORADA'
```

> **O comportamento mudou de propósito**: aceitar sem tempo é **acreditar sem verificar**. O teste antigo **documentava a tolerância**; o novo **documenta a recusa**.

---

## A DEPURAÇÃO — e o que eu fiz errado nela

Perdi tempo achando que os testes eram **flaky** (passavam isolados, falhavam em conjunto).

**A causa era simples**: `crm-whatsapp-listener.test.ts` também tinha o timestamp fixo, e **é ele quem monta o endpoint** que os outros exercitam.

> **A lição**: *"passa isolado, falha junto"* **não é flakiness** — é **estado compartilhado**. E o estado aqui era **o relógio do payload**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos de teste corrigidos | **4** |
| Testes de CRM | **173 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE O REPLAY ESTÁ

| Camada | Estado |
|---|---|
| 1. Regra (`checarFrescor`) | ✅ r68 |
| **2. Ligação (`parseMetaWebhook`)** | ✅ **r69** |

> **A regra e a ligação estão juntas** — e a ligação **mudou o comportamento do produto**, que é o que uma ligação de segurança deve fazer.

---

## O QUE **AINDA** FALTA NO §19

| Item | Estado |
|---|---|
| **Rate limiting** | ❌ **não existe** em nenhum canal IPC |
| XSS no renderer | ❌ não auditado |
| `npm audit` | ❌ não rodado |
| **SSRF** em `web_fetch` | ⚠️ fora do ERP, **não medido** |

> **Rate limiting é o mais concreto**: um renderer comprometido pode chamar `faturar` **mil vezes** — e cada uma mexe em estoque e financeiro.

---

## PRÓXIMA RODADA

**Rate limiting no canal de faturamento** — com a pergunta que o §19 não responde: **qual é o limite?**

> **69 rodadas.** O replay saiu da lista do §19 e virou **código que recusa** — e a recusa **quebrou 4 arquivos de teste**, o que é a prova de que ela **está no caminho**.
