# GOAL V2 — RODADA 94: EU ESTAVA ERRADO — O CRM NÃO ESTAVA ÓRFÃO

**Data**: 05/11/2026 · **§6 / §13** · corrigindo a r93

---

## O QUE A r93 ESCREVEU

> *"`/crm` está **órfão**: a rota existe, a view existe, e o menu não tem entrada para ela."*

**É falso. E o teste sabia.**

---

## COMO O ERRO APARECEU

A r94 tentou adicionar `/crm` ao `b3po-nav`. **O teste recusou:**

```
× nao repete um item que o menu do nucleo ja tem
  AssertionError: /crm ja vem do menu do nucleo
```

**E o comentário do teste (`plugin.test.ts:99`) diz a história inteira:**

> *"A captura da **r97** mostrou «CRM» **duas vezes**: o **menu do núcleo** (junto de Capabilities, Artefatos e Tarefas agendadas) **já contribui com `/crm`**, e o plugin contribu[ía também]... **e o usuário foi quem viu — não o teste**."*

> **A duplicata existiu, o usuário viu, e a r97 removeu do plugin.** O CRM **nunca esteve órfão** — está no **menu do núcleo**.

---

## O ERRO DE MÉTODO — e é o mesmo da r64

| Rodada | O que eu olhei | O que concluí |
|---|---|---|
| **r64** | o **teste** do fluxo | *"ninguém confirma o pagamento"* (existia) |
| **r93** | **um** arquivo de menu (`b3po-nav`) | *"`/crm` é órfão"* (está no núcleo) |

> **O mapa da r93 leu só `b3po-nav` e concluiu sobre o menu inteiro.**
>
> **O produto tem DOIS menus** — o do núcleo e o do plugin — e eu tratei como um.

---

## O QUE FOI FEITO

| Ação | Resultado |
|---|---|
| Adicionar `/crm` ao `b3po-nav` | ❌ **recusado pelo teste**, revertido |
| `B3PO-INFORMATION-ARCHITECTURE.md` | ✅ **corrigido** com a verdade medida e o erro nomeado |

> **O documento agora diz o que aconteceu**, em vez de esconder a correção: um mapa errado **é pior que nenhum**, e a correção **faz parte do entregável**.

---

## O QUE **CONTINUA** VERDADEIRO DO MAPA DA r93

| Achado | Estado |
|---|---|
| **`/agents` duplica `/agentes`** | ✅ **confirmado** — `/agentes` (2 arquivos) está no menu; `/agents` (1 arquivo) não |
| **`/messaging` × `/atendimento`** | ✅ **confirmado** — assimétrico |
| **`/cron` é cron do runtime** | ✅ mantido distinto, **e o menu não o mostra** |
| 12 rotas fora do menu do produto | ✅ |
| 7 grupos, `Empresa` ≠ configuração | ✅ |

**Três dos quatro achados resistiram. O quarto estava errado, e está corrigido.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Adições revertidas | **1** |
| Documentos corrigidos | **1** |
| Testes de menu | **13 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## PRÓXIMA RODADA

**`/agents` × `/agentes`** — o achado que **resistiu**. Duas telas para a mesma coisa, uma no menu e uma fora.

> **94 rodadas.** A rodada não entregou código novo — entregou **uma correção**: o mapa que eu escrevi ontem estava errado em um ponto, **o teste já sabia**, e o documento agora **conta a correção** em vez de manter a versão bonita.
