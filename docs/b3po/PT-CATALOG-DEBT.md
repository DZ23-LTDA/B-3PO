# Dívida do catálogo pt-BR — diagnóstico

Documento de trabalho: o que está pendente no `apps/desktop/src/i18n/pt.ts` e **por quê**, com a evidência que
já levantei. Serve para a próxima tentativa não repetir a investigação.

## Estado atual (medido)

- **106/106 rótulos** e **49/49 descrições** do catálogo de campos (`FIELD_LABELS` / `FIELD_DESCRIPTIONS`).
- Inglês residual nas 13 telas de Configurações: **5 linhas**.

| Tela | Texto | Caminho no catálogo inglês | Situação |
|---|---|---|---|
| Provedores | `Sign in with a subscription — no API key to copy…` | `quickEntry.providers.intro` | bloqueado |
| Cobrança | `Connect your Nous account` | `quickEntry.billing.state.notice.loggedOut.title` | bloqueado |
| Cobrança | `Sign in with your Nous account to see your balance…` | `…loggedOut.message` | bloqueado |
| Sobre | `No Python interpreter is available…` | — | vem do schema do backend |
| Avançado | `When Hermes updates itself from the app…` | — | vem do schema do backend |

As duas últimas **não são tradução**: são descrições servidas pelo schema do backend. Provei em duas rodadas
(`terminal.backend` e `memory.provider`) que sobrescrever `fieldDescriptions` **não** funciona — exige i18n no
backend ou um mapa no frontend.

## O bloqueio das três primeiras (o que eu já descobri)

1. As três vivem, no inglês, dentro de um bloco `quickEntry` que meu rastreio por indentação resolve como
   **topo do arquivo** (`en.ts` L1292).
2. Mas `types.ts` declara `quickEntry` **apenas dentro de `settings`** (L1083), e um segundo
   `settings.quickEntryWindow` que eu adicionei (L604).
3. Adicionar `quickEntry: { providers … }` no topo do `pt.ts` reprova em `TS2353`: *"'quickEntry' does not exist
   in type …"* — a interface `Translations` não tem essa chave no topo.
4. Adicionar `providers` **dentro** de `settings.quickEntry` também reprova, com a lista fechada de chaves daquele
   objeto (`enabledTitle`, `enabledDesc`, …) — ou seja, o tipo lá é o do **painel**, sem `providers`.

Ou seja: **o catálogo inglês e o tipo discordam**. O `en.ts` consegue ter `quickEntry.providers` porque o bloco
real de `quickEntry` em `en.ts` está em outro ponto do que o meu rastreio indica, ou porque `Translations` tem
alguma forma de folga que não localizei. Descobrir isso exige uma passada cuidadosa em `en.ts` + `types.ts` (e
possivelmente no teste `pt.test.ts`, que fixa a lista de seções do override).

## O que NÃO fazer

- Não renomear `quickEntry` para "resolver" — quebra as chaves que o app lê hoje.
- Não duplicar os textos em `en.ts` só para o `pt` poder sobrescrever: criaria cópia que ninguém lê, e o
  `pt-coverage` existe justamente para impedir chave que não é consumida.
- Não fazer cirurgia de aninhamento no fim de uma rodada: o arquivo está verde (94 arquivos / 732 testes) e o
  ganho são 3 strings.

## Como atacar

1. Abrir `en.ts` na altura do `quickEntry` e conferir **quem é o pai real** (contar chaves, não confiar no recuo).
2. Comparar com `types.ts` (`Translations['quickEntry']` vs `Translations['settings']['quickEntry']`).
3. Se o tipo estiver incompleto, completar o tipo primeiro (é o contrato), depois traduzir.
4. Regenerar `overlay-gaps.json` com `OVERLAY_GAPS_UPDATE=1` e atualizar a lista de seções do `pt.test.ts`.
5. Conferir na tela de Provedores por CDP (`b3po-shot-settings.mjs`) — não só no teste.
