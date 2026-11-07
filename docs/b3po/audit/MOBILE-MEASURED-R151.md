# Mobile — medido, não suposto (rodada 151)

**A r150 olhou a árvore de arquivos. Esta rodada executa.**

## O que a execução deu

```
npx vitest run        Test Files  19 passed | 1 skipped (20)
                      Tests       169 passed | 8 skipped (177)

npx tsc --noEmit      exit 0
```

**20 arquivos de teste, 169 testes verdes, zero falhas, typecheck limpo.**

Isso muda o registro da r150: o mobile não é "a confirmar". É **código com cobertura real**.

## O que os 169 testes cobrem

Pelo nome e pelo conteúdo dos arquivos em `src/api/`:

| Área | Arquivo |
|---|---|
| aprovação de comando | `approval.test.ts`, `approval-socket.test.ts` |
| transporte WebSocket | `ws-transport.integration.test.ts` |
| JSON-RPC | `gateway-rpc.test.ts` |
| sessão | `session-guard.test.ts`, `gateway.test.ts` |
| retry | `retry.test.ts` |
| cliente REST | `rest-client.live.test.ts` |
| roteamento | `router.test.ts` |

8 testes marcados como *skipped* pelos próprios arquivos — não removidos por mim.

## O que isso NÃO prova

| Alegação | Veredito |
|---|---|
| "o código mobile compila" | **provado** (tsc exit 0) |
| "o código mobile tem 169 contratos verdes" | **provado** |
| "o app roda num Android" | **não provado** — nenhum APK foi construído aqui |
| "o app roda num iPhone" | **não provado** — sem macOS |
| "login/logout funcionam" | **não provado** — teste unitário não abre a tela |
| "notificações chegam" | **não provado** |
| "reconexão funciona" | **parcialmente** — `retry` e `ws-transport` têm teste; o comportamento em rede real não |

**A distinção que importa:** verde em teste unitário **não é** o mesmo que tela aberta. Foi a lição das r96, r99, r119 e r127 — e vale para o mobile também, porque nenhuma captura de tela mobile existe neste projeto.

## Dependências externas declaradas

| Item | Falta | Impacto |
|---|---|---|
| APK debug | Android SDK + JDK | `build:android:debug` existe no `package.json`; nunca executado aqui |
| APK release / AAB | **keystore** | o GOAL proíbe que eu gere keystore — é credencial do proprietário |
| iOS / IPA | Mac + Xcode | `BLOCKED_BY_EXTERNAL_DEPENDENCY` |

O script `build:android:release` está escrito. Rodá-lo sem keystore falharia na assinatura — e é por isso que **não foi rodado**.

## O que a faixa 191–210 tem agora, medido

| Item | Estado |
|---|---|
| Desktop Windows | `VALIDATED` — 8 capturas de tela em uso real |
| `mobile/b3po-app` | `TESTED` — 169 testes, typecheck limpo |
| Mobile em dispositivo | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (APK/keystore/Xcode) |
| Desktop macOS/Linux | `NOT_VERIFIABLE` (sem hardware) |
