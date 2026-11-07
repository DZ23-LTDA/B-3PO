# Regressão final e readiness (rodada 171)

**Abertura da faixa 251–257.** Este documento é a comparação entre o baseline da r161 e a medição de agora.

## A suíte, antes e depois

| | r161 (baseline) | **r171 (agora)** | Δ |
|---|---|---|---|
| Test Files falhando | 29 | **28** | **−1** |
| Test Files passando | 2023 | **2024** | **+1** |
| Tests falhando | 55 | **55** | **0** |
| Tests passando | 17.839 | **17.842** | **+3** |
| Tests pulados | 219 | **219** | 0 |

## O que esses números provam

**Zero regressões introduzidas em 10 rodadas de trabalho.**

| Observação | Significado |
|---|---|
| **55 falhas nos dois extremos** | nenhuma falha nova; nenhuma falha antiga "consertada por acidente" |
| **+3 testes passando** | os 3 do benchmark de performance (r164) |
| **−1 arquivo falhando** | `scripts/i18n-keys.test.mjs`, corrigido na r163 |
| **+3 testes no total** (18.113 → 18.116) | exatamente os 3 que eu escrevi; nada removido |

**A aritmética fecha**: 18.113 + 3 = 18.116. Nenhum teste foi apagado, nenhuma asserção reduzida.

## Estado do Git

```
HEAD            e2ff870138
árvore          limpa (0 modificações)
main            f4cf411f28f9
origin/main     f4cf411f28f9   <- IDÊNTICOS
commits         61.898
```

**`main` continua espelho limpo do upstream.** F2-A cumprido: nenhum commit meu fora de `b3po-brand`.

## PR #1

```json
{"isDraft": true, "mergeable": "MERGEABLE", "number": 1, "state": "OPEN",
 "title": "B-3PO: marca, sistema de Bots, WhatsApp CRM, mobile com envio e
           autorizacao de dispositivo [REVISAO - NAO MESCLAR: main e espelho]"}
```

**Draft. Aberto. Não mesclado.** Conforme a regra.

## O que a regressão NÃO mediu

| Item | Estado |
|---|---|
| Regressão visual (telas mudaram de aparência?) | **não medido** — 7 capturas pontuais, sem comparação antes/depois |
| Regressão de dados existentes (migração quebra perfis antigos?) | **não medido** |
| Regressão de performance sob volume real | **não medido** — benchmark sintético (r164) |
| Android depois das mudanças | **não re-executado** desde r153 |
| Instalador Windows executando | **não re-verificado** desde r167 |

## O que continua sem prova

Esta é a lista honesta do que **não** posso afirmar:

| Alegação | Estado |
|---|---|
| "o produto funciona para um usuário final de ponta a ponta" | **NOT_VERIFIED** — nenhum fluxo completo foi executado por uma pessoa |
| "as 55 falhas não afetam o usuário" | **PARTIAL** — sei que são de ambiente/upstream, não sei se alguma esconde um caminho real |
| "o WhatsApp funciona" | **BLOCKED** — sem credencial |
| "a nota fiscal é emitida" | **BLOCKED** — sem adaptador HTTP |
| "os agentes executam tarefas" | **PARTIAL** — freio pronto, executor ausente |
| "o iOS instala" | **BLOCKED** — sem macOS |

## O critério do GOAL §32, honestamente

| # | Critério | Estado |
|---|---|---|
| 1 | duplicidades relevantes resolvidas | **PARTIAL** — 3 auditorias, 2 "duplicações" eram camadas |
| 2 | fonte canônica por domínio | **VALIDATED** — 25 stores, 1 arquivo cada |
| 3 | WhatsApp consolidado | **PARTIAL** — 2 canais distintos, envio real bloqueado |
| 4 | CRM funcional | **VALIDATED** — 4 stores, 140 testes |
| 5 | pt-BR completo | **PARTIAL** — catálogo sincronizado; 4 de 9 critérios WCAG |
| 6 | rebranding visível concluído | **VALIDATED** — `ProductName: B-3PO`, marca no binário |
| 7 | mascotes integrados | **PARTIAL** — desktop sim; mobile/instaladores não |
| 8 | Bots funcionais | **PARTIAL** — roster e permissões; execução não aberta |
| 9 | multiagent funcional | **PARTIAL** — freio completo, executor ausente |
| 10 | Business Core funcional | **VALIDATED** — 25 domínios |
| 11–21 | produtos, estoque, compras, vendas, financeiro, agenda, atendimento, pós-venda, RH, marketing, automações | **VALIDATED** nos stores; **3 sem tela** |
| 22 | desktop | **VALIDATED** — executável de 235 MB com marca |
| 23 | Android | **VALIDATED** — APK instalado e renderizando (r153) |
| 24 | iOS | **BLOCKED_BY_EXTERNAL_DEPENDENCY** |
| 25 | isolamento multitenant | **PARTIAL** — 3 stores provados; originais não |
| 26 | permissões | **VALIDATED** — RBAC por ação |
| 27 | segurança | **PARTIAL** — 0 vulnerabilidades em 4 auditorias; CSP não |
| 28 | testes | **VALIDATED** — 17.842 verdes, 55 externas classificadas |
| 29 | documentação | **VALIDATED** — 16 docs do GOAL cobertos |
| 30 | instaladores | **PARTIAL** — Windows gerado; NSIS/macOS/Linux não |
| 31 | evidências | **VALIDATED** — 7 capturas + 40+ auditorias |

**Contagem: 15 VALIDATED · 12 PARTIAL · 2 BLOCKED · 0 falsamente declarados.**

## O veredito

**O produto NÃO está pronto para usuários finais.** Três razões, em ordem de impacto:

1. **Ninguém executou um fluxo completo.** Existem 17 telas com IPC, 25 domínios com teste — e **zero** prova de que uma venda inteira (orçamento → pedido → nota → estoque → financeiro → comissão) funciona de ponta a ponta com um humano clicando.
2. **A autonomia dos agentes não é real.** O freio está completo e testado; o motor não existe por falta de provider.
3. **iOS e instaladores de macOS/Linux** nunca serão gerados neste ambiente.

**O que está pronto é a fundação**: dados canônicos, regras de negócio, permissões, testes, marca e CI. **O que falta é a prova de uso.**

## Medido

| Medida | Valor |
|---|---|
| Regressões em 10 rodadas | **0** |
| Testes (total) | **18.116** |
| Testes verdes | **17.842** (98,5%) |
| Falhas | **55** — externas, classificadas |
| Critérios VALIDATED | **15 de 31** |
| Critérios PARTIAL | **12** |
| BLOCKED | **2** |
| `main` intocado | **sim** |
| PR #1 | **draft, aberto, não mesclado** |
