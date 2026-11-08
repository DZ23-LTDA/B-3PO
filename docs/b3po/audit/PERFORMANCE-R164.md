# Performance dos stores com volume (rodada 164)

## O desenho que se estava medindo

Cada store de domínio **lê o arquivo JSON inteiro** a cada operação e **regrava o arquivo inteiro** a cada
escrita. É simples e correto — e o custo cresce com o número de registros.

A pergunta do produto: **em que volume isso deixa de ser confortável?**

## Os números

| Operação | 100 | 1.000 | 5.000 |
|---|---|---|---|
| `listar()` | **0,7 ms** | **1,3 ms** | **3,5 ms** |
| `iniciar()` (escrita) | **1,7 ms** | **3,2 ms** | **8,0 ms** |

Crescimento **linear**. Sem joelho, sem explosão.

## O que isso significa

**5000 registros: 8 ms para escrever.** Um usuário percebe acima de ~100 ms. O desenho aguenta **mais de uma
ordem de grandeza** acima do que se mediu aqui antes de incomodar.

O caso realista de uma empresa pequena — algumas centenas de execuções, vendas ou lançamentos por mês — fica
na faixa de **1 a 2 ms**.

## O que eu NÃO vou fazer

**Não vou migrar para banco relacional.** Seria a conclusão reflexa ("ler arquivo inteiro não escala"), e a
medição diz que **escala para o que o produto tem hoje**:

- um SQLite traria migração de schema, concorrência, transações e um segundo formato de verdade;
- o GOAL proíbe criar "banco paralelo";
- e **8 ms a 5.000 registros** não é o problema que um usuário tem.

**A medição evitou trabalho.** Isso conta tanto quanto encontrar um gargalo.

## Onde o desenho VAI doer, e está declarado

| Cenário | Consequência |
|---|---|
| 50.000+ registros num arquivo | ~80 ms por escrita — perceptível a cada clique |
| Dois processos escrevendo o mesmo arquivo | o último `rename` vence; um perde a escrita |
| Arquivo grande em disco | leitura completa a cada abertura de tela |

**Nenhum dos três acontece hoje**, e o segundo é impedido pelo modelo de uma instalação = uma empresa (r92).

## O que este teste é, e o que não é

**É** um instrumento: imprime a ordem de grandeza para que uma regressão de 10× apareça como número.

**Não é** um gate. Não falha por lentidão — um limite fixo em CI vira teste flaky, e o projeto já rejeita esse
formato. O único limite que ele impõe é **catastrófico** (5000 registros em menos de 1 s), que pegaria uma
leitura quadrática acidental.

## Um defeito do meu próprio ferramental nesta rodada

A primeira versão do arquivo foi escrita via PowerShell e chegou **corrompida**: o shell interpretou crases e
`${...}` dentro da string e produziu caracteres de controle. O `vitest` recusou com `PARSE_ERROR`.

**Reescrito com a ferramenta de arquivo, sem shell.** É a nona vez que isso acontece nesta sessão — está
registrado no histórico de erros, e a regra que funciona é: **texto com crase, `${}` ou acento nunca passa por
PowerShell.**

## Medido

| Medida | Valor |
|---|---|
| Ordens de grandeza medidas | 3 (100 / 1.000 / 5.000) |
| Operações medidas | 2 (leitura, escrita) |
| Crescimento | **linear** |
| Custo a 5.000 registros | **8 ms** (escrita) |
| Migração para banco indicada pela medição | **não** |
| Testes escritos | **3** |
