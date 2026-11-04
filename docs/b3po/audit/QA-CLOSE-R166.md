# Faixa 226–240 — testes, performance e UX (fechamento)

**Rodada 166 de 256.**

## O que a faixa entregou

| R | Entrega | Resultado |
|---|---|---|
| 161 | baseline da suíte completa | **17.839 ✓ / 55 ✗**; **1 teste vazio de 22 rodadas** removido |
| 162 | classificação das falhas | **6 classes**; **0 falhas minhas** provado por cruzamento |
| 163 | verificação da única pendente | **1 era minha** — **457 chaves** de catálogo |
| 164 | performance dos stores | **linear**; 8 ms a 5.000 registros |
| 165 | acessibilidade em 7 telas | **0 campos sem nome, 0 imgs sem alt, 0 saltos** |

## O que a faixa encontrou

**Três defeitos reais, todos meus ou do registro:**

| # | Defeito | Como apareceu |
|---|---|---|
| 1 | `hr-vacation.ts.test.ts` com **0 bytes**, commitado | a suíte completa listou o arquivo |
| 2 | **457 chaves** de locale faltando no catálogo derivado | o teste `i18n-keys` dizia o comando |
| 3 | painel de aprovações nomeado igual a outro conceito | auditoria das duas aprovações (r150) |

## O que a faixa provou NÃO ser problema

| Suspeita | Veredito |
|---|---|
| "as 60 falhas são regressão do B-3PO" | **falso** — zero interseção com os 49 arquivos que toquei |
| "são flaky" | **falso** — falham isoladamente também |
| "ler arquivo JSON inteiro não escala" | **falso até 5.000 registros** (8 ms) |
| "metade do ERP não tem `h1`" | **falso** — eu naveguei para rotas inexistentes |

**Quatro suspeitas, quatro medições, quatro negações.** Três delas eram **minhas**.

## O padrão da faixa, em uma frase

> **Duas de cinco rodadas começaram com uma medição errada minha** (161: o arquivo vazio; 165: a rota errada).
>
> A ferramenta de medição foi **mais frágil que o produto medido**.

## Onde eu errei, e o que cada erro custou

| R | Erro | Custo se não tivesse verificado |
|---|---|---|
| 161 | eu nunca tinha rodado a suíte inteira | **55 falhas desconhecidas** por 22 rodadas |
| 162 | classifiquei 5 classes como externas | — (estava certo) |
| 163 | pulei `npm run i18n:keys` ao adicionar chaves | **457 chaves** de tradução faltando |
| 164 | escrevi o teste via PowerShell (crases) | arquivo corrompido — **9ª vez** |
| 165 | naveguei para `/vendas` em vez de `/sales` | **3 telas falsamente reprovadas** |

## O que continua aberto

| Item | Estado |
|---|---|
| 60 falhas da suíte | `PRE_EXISTING` / `ENVIRONMENT` — **não consertadas por decisão** (upstream) |
| Contraste de cor (WCAG 1.4.3) | `NOT_MEASURED` |
| Navegação por teclado / foco | `NOT_MEASURED` |
| Leitor de tela real | `NOT_TESTED` |
| Zoom 200% / reflow | `NOT_TESTED` |
| Botão sem `aria-label` no shell | **registrado**, 1 ocorrência, 7 telas |
| E2E de UI automatizado | `NOT_IMPLEMENTED` — 6 capturas manuais, zero teste de tela |

## A regra da faixa, para as próximas

**Medir o conjunto, não a parte.** Foi medir o conjunto que revelou o arquivo vazio (161) e a rota errada (165). As duas coisas eram invisíveis em testes específicos.

**E: quando a medição contradiz o código, suspeitar da medição primeiro.** Foi a lição da r133, repetida na r165 — e ela só vale se for aplicada na hora, não depois.

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 5 |
| Testes executados | **18.113** |
| Testes escritos | **3** (benchmark) |
| Defeitos reais corrigidos | **2** (arquivo vazio, 457 chaves) |
| Suspeitas derrubadas por medição | **4** |
| **Medições minhas que estavam erradas** | **2** |
| Critérios WCAG medidos | **4 de 9** |
| Linhas de produto alteradas | **1** (o catálogo derivado) |
