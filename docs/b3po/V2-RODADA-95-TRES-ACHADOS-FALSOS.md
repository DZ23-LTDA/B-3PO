# GOAL V2 — RODADA 95: OS TRÊS ACHADOS ERAM FALSOS

**Data**: 05/11/2026 · **§13** · fechando a correção da r93

---

## O QUE A r93 ENTREGOU

Um mapa de rotas com **três "achados"**. A r94 derrubou um. **Esta rodada derrubou os outros dois.**

| # | Achado da r93 | Veredito |
|---|---|---|
| 1 | `/crm` órfão | ❌ **falso** (r94) — está no menu do núcleo |
| 2 | `/agents` duplica `/agentes` | ❌ **falso** (r95) |
| 3 | `/messaging` duplica `/atendimento` | ❌ **falso** (r95) |

**Três de três.**

---

## POR QUE ERAM FALSOS — medido

### `/agents` × `/agentes` — **conceitos diferentes**

| Tela | O que é | Evidência |
|---|---|---|
| `/agentes` (produto) | **agentes departamentais** + aprovações | `AprovacoesPendentes`, 344 linhas |
| `/agents` (upstream) | **subagentes do runtime** | `$subagentsBySession`, `$activeSessionId`, 370 linhas |

> **Um é *"quem cuida de quê na empresa"*; o outro é *"o que o runtime está executando agora"*.**

### `/messaging` × `/atendimento` — **conceitos diferentes**

| Tela | O que é | Tamanho |
|---|---|---|
| `/atendimento` (produto) | a **fila de atendimento** | 1 arquivo |
| `/messaging` (upstream) | **configuração de canais** — Telegram QR, allowlist | 5 arquivos, **2000+ linhas** |

> **Uma é operar o atendimento; a outra é configurar por onde ele chega.**

---

## A LIÇÃO — e ela é sobre método

> **Uma lista de rotas não é um mapa de funções.**
>
> A r93 mediu **os caminhos** e inferiu **os propósitos**. **Um caminho parecido não faz duas telas fazerem a mesma coisa** — e a única forma de saber é **abrir as duas**.

**E é a terceira vez nesta sessão:**

| Rodada | Olhei | Concluí | Era |
|---|---|---|---|
| r64 | o teste | *"ninguém confirma pagamento"* | existia |
| r93 | um menu | *"`/crm` órfão"* | no núcleo |
| **r93** | **nomes de rota** | **3 duplicatas** | **0 duplicatas** |

> **O padrão é sempre o mesmo**: eu olho **uma representação** e concluo sobre **o objeto**.

---

## O QUE FOI FEITO

`B3PO-INFORMATION-ARCHITECTURE.md` foi **reescrito** — e agora **começa pelos erros**:

> *"A r93 nomeou três problemas. A r94 e a r95 foram verificar, um por um, e **nenhum resistiu**."*
>
> *"Um mapa que esconde as próprias correções não é um mapa — **é uma opinião com formatação de tabela**."*

---

## O QUE **É** VERDADEIRO — e agora está medido

| Item | Estado |
|---|---|
| 35 rotas registradas | ✅ |
| **23 no menu do produto** | ✅ |
| **`/messaging`, `/crm`, `/agents`, `/cron` estão no menu do NÚCLEO** | ✅ |
| 7 grupos por fluxo · `Empresa` ≠ configuração · nenhuma rota removida | ✅ r92 |

### Continua faltando

| Item | §13 |
|---|---|
| Seletor de ambiente · menu conforme RBAC · busca global · Modo Engenharia | :447–452 |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Achados falsos derrubados | **3 de 3** |
| Documentos reescritos | **1** |
| Código de produto alterado | **0** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## PRÓXIMA RODADA

**O que **realmente** falta no §13**: **busca global** (:450) — a única das quatro lacunas que **não exige um modo novo nem RBAC dinâmico**.

> **95 rodadas.** Duas rodadas gastas **derrubando um documento errado** — e o resultado não é zero: é **um mapa que agora diz a verdade**, inclusive sobre os três erros do mapa anterior.
