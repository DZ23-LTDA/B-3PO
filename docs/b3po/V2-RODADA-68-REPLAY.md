# GOAL V2 — RODADA 68: O REPLAY — A ASSINATURA PROVA ORIGEM, NÃO FRESCOR

**Data**: 05/11/2026 · **§19** · o vetor que a r67 nomeou

---

## O BURACO

> Um `X-Hub-Signature-256` **válido de ontem continua válido hoje**: o HMAC não carrega tempo, e o corpo é o mesmo.
>
> **Quem capturar uma entrega legítima pode reenviá-la** — e a mensagem entra no CRM de novo, **como se o cliente tivesse falado outra vez**.

---

## A DECISÃO QUE IMPORTA — e ela **não** é "janela curta"

A Meta **reentrega** quando não recebe `200`:

```
1ª tentativa → 1 min → 5 min → 30 min → 1 h → 6 h → 24 h
```

> **Uma janela curta recusaria uma reentrega legítima — e a mensagem do cliente sumiria.**

**Então 10 minutos**, e a razão está escrita:

| Tentativa | Cabe na janela? |
|---|---|
| 1ª · 1 min · 5 min | ✅ **sim** |
| 30 min · 1 h · 6 h · 24 h | ❌ **não** |

> **10 minutos cobrem as que acontecem com o serviço no ar.** As seguintes só acontecem quando ele **esteve fora** — e aí a escolha é entre **perder a mensagem** e **aceitar uma possibilidade de replay**.
>
> **Perder mensagem de cliente é pior**, e o código diz isso.

---

## A SEGUNDA DECISÃO — só o **passado** é recusado

```ts
if (diferenca > janelaMs) return { error: 'fora_da_janela', fresh: false }
// sem checar o futuro
```

> **Um `entry.time` no futuro é relógio dessincronizado** — recusar faria **o webhook parar de funcionar por um desvio de NTP**, que não é um ataque.

---

## A TERCEIRA — sem `entry.time`, **recusa**

```ts
if (typeof entryTimeSegundos !== 'number' || ...) return { error: 'sem_tempo', fresh: false }
```

> **Inventar "está fresco" seria aceitar sem verificar** — e a função existe exatamente para não fazer isso.

---

## A PROVA — 9 testes

| Teste | O que trava |
|---|---|
| mensagem de agora · há 5 minutos | passa |
| **reentrega de 5 min (a 3ª da Meta) passa** | **não perde mensagem de cliente** |
| **relógio adiantado NÃO é recusado** | é NTP, não ataque |
| **mensagem de ONTEM** | **o replay que a assinatura sozinha não pega** |
| um segundo além da janela | a borda |
| **`undefined`, `string`, `0`, `NaN`** | sem tempo, **não há como provar** |
| a janela é de 10 minutos | o número, com a razão ao lado |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **+43** |
| Testes novos | **9** |
| Testes de WhatsApp | **59 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE O REPLAY ESTÁ

| Camada | Estado |
|---|---|
| **1. Regra** | ✅ **r68** |
| 2. **Ligação no ingest** | ❌ **falta** |

> **A função existe e o `ingestMetaWebhook` não a chama.** É a mesma forma da r63: **a regra está pronta e o chamador não existe**.

**E ela é mais perigosa aqui**: ligar a janela **pode recusar entregas legítimas** — então a ligação precisa ser feita **com o teste do caminho real**, não só da função.

---

## PRÓXIMA RODADA

**Ligar `checarFrescor` no `ingestMetaWebhook`** — e provar, com um payload real, que:
- mensagem fresca **entra**
- mensagem de ontem **não entra**

> **68 rodadas.** O replay deixou de ser um item da lista do §19 e passou a ser **uma função com 9 testes** — e a decisão que a define é **qual erro é pior**: aceitar um replay, ou perder a mensagem de um cliente.
