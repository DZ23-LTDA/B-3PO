# Faixa 191–210 — desktop e mobile (fechamento)

**Rodada 155 de 256.**

## O que a faixa entregou

| R | Entrega | Evidência |
|---|---|---|
| 150 | auditoria: as duas aprovações **não duplicam** | documento |
| 151 | mobile medido por execução: **169 testes**, typecheck limpo | saída do vitest/tsc |
| 152 | APK **debug** compila, instala, abre — tela branca diagnosticada | captura |
| 153 | APK **release** renderiza em pt-BR, marca B-3PO | captura |
| 154 | pareamento recusa link inválido com causa nomeada | captura |
| **155** | **fechamento** | este documento |

## A virada da faixa: uma premissa reexaminada

A r152 encerrou com *"`assembleRelease` exige keystore"* — **verdadeiro para distribuição, falso para verificação**. O `debug.keystore` que o Gradle cria sozinho na primeira build já estava em `~/.android/`, 2618 bytes. A assinatura injetada por linha de comando (`-Pandroid.injected.signing.*`) produziu um APK release em 13 segundos, **sem editar `build.gradle` e sem gerar credencial**.

> **O bloqueio não era técnico. Era uma conclusão que eu tinha parado de questionar.**

## O que está provado, e como

| Alegação | Estado | Como |
|---|---|---|
| desktop Windows roda e mostra o produto | `VALIDATED` | 10 capturas de tela em uso real |
| mobile compila e tem contratos | `VALIDATED` | 169 testes, tsc exit 0 |
| mobile gera APK debug | `VALIDATED` | `BUILD SUCCESSFUL` |
| mobile gera APK release | `VALIDATED` | 44,2 MB |
| mobile **renderiza** | `VALIDATED` | captura r153 |
| mobile em **português** | `VALIDATED` | captura r153 |
| mobile tem **estado de erro honesto** | `VALIDATED` | captura r154 |
| as duas aprovações não são duplicata | `VALIDATED` | auditoria r150 |
| pareamento bem-sucedido | `NOT_TESTED` | exigiria desktop gerando link |
| desktop macOS / Linux | `NOT_VERIFIABLE` | sem hardware |
| iOS / IPA | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | sem macOS/Xcode |
| APK com chave **do proprietário** | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | e deve continuar |

## O que a faixa NÃO entregou

**Zero linhas de código de produto.** As seis rodadas produziram **auditoria, medição, build e evidência** — nenhuma funcionalidade nova.

Isso foi deliberado: a faixa existe para **verificar** o que as anteriores construíram, e o critério de conclusão do GOAL pede `VALIDATED`, não `IMPLEMENTED`. Cinco critérios saíram de "não provado" para "provado" sem que uma linha de app fosse escrita.

## A lição que custou a r152

O APK debug abriu com *"Unable to load script"*. O impulso é concluir "o app está quebrado". A leitura correta era outra: **faltava o bundle**, e depois de empacotá-lo o erro mudou para *"não alcanço o Metro"* — **um estado mais adiantado, ainda que vermelho**.

> **Um erro que muda de texto é progresso.** Dois sintomas diferentes significam dois problemas resolvidos em sequência, não o mesmo problema persistindo.

## O que a faixa descobriu sobre o próprio processo

| Rodada | O que eu ia afirmar | O que a medição disse |
|---|---|---|
| 150 | "o mobile duplica a aprovação" | **não duplica** — camadas diferentes |
| 151 | "o mobile é parcial" | **169 testes verdes** |
| 152 | "o APK funciona" | abre, mas **tela branca** |
| 153 | "release exige keystore" | **falso** — debug.keystore serve |
| 154 | "o pareamento não foi testado" | o **ramo de erro** é testável, e é |

**Cinco rodadas, cinco correções de rumo — todas vindas de medir em vez de concluir.**

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 6 |
| Testes executados no mobile | **177** (169 verdes, 8 skipped) |
| APKs construídos | 2 (debug 94,5 MB, release 44,2 MB) |
| Capturas de tela mobile | **2** (primeiras do projeto) |
| Telas de desktop verificadas | 10 |
| Critérios que subiram para `VALIDATED` | **5** |
| Linhas de código de produto escritas | **0** |
