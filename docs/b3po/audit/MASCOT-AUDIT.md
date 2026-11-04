# Mascotes: 20 integrados, auditado antes de construir (rodada 84)

## O que o GOAL pedia

*"Verificar os 20 mascotes oficiais. Garantir cobertura em desktop, Android, iOS, web, instaladores,
onboarding, lista de Bots, conversa, configurações. Cada Bot deve possuir `mascot_id` persistente."*

## O que existe — medido

| Peça | Estado |
|---|---|
| `brand/avatars/manifest.json` | **20 entradas** |
| `src/plugins/hermes-bots/assets/mascots/` | **20 PNGs** (142–163 KB cada) |
| `src/plugins/hermes-bots/mascots.ts` | **20 imports** de URL |
| Consumidores | `avatar-picker`, `bot-row`, `chat-empty`, `create-dialog` |
| `BotFace` | recebe `image` + `name` + `shape` |

Testes: `mascot-grid.test.tsx` + `avatar.test.tsx` — **13 passando**.

**Os mascotes estão integrados no desktop.** O critério não estava pendente por falta de trabalho; estava
pendente por falta de **verificação**.

## O caminho da arte

```
brand/avatars/*.png          fonte da verdade (28 arquivos, 20 no manifest)
  -> assets/mascots/*.png    cópia consumida pelo build
  -> mascots.ts              importa cada PNG como URL
  -> avatar-picker / bot-row / chat-empty / create-dialog
```

## Onde ainda NÃO chega

- **Android/iOS**: `mobile/b3po-app` não foi tocado neste ciclo. Os PNGs existem; o app mobile não os lê.
- **instaladores**: nenhum instalador foi gerado ainda, então não há onde a arte aparecer.
- **web**: sem dashboard publicado.

São lacunas reais, e a primeira é a maior: o mascote é a identidade visual do produto e o app mobile não
a mostra.

## Um débito da rodada 83 que apareceu aqui

O `typecheck renderer` estava **falhando** desde a r83: `src/api/crm-conversations.test.ts` montava
`CrmConversation` sem `tenant_id`. Eu rodei `check-b3po-types --electron` e não o projeto completo.

O gate (`scripts/check`, 14 checagens) **não roda typecheck** — ele passou com o renderer quebrado.
Corrigido nesta rodada; o comando certo é `check-b3po-types` **sem** `--electron`, que cobre os dois.

Lição: "o gate passou" nunca significou "os tipos estão certos". São checagens diferentes e eu vinha
tratando uma como a outra.
