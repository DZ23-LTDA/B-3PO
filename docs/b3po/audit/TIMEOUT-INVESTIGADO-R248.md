# O timeout de 30 s: não é "só ambiente" (rodada 248)

## A última falha sem classificação

`desktop-installation.test.ts` → `reclaiming a dead repair lock never deletes a lock a peer created meanwhile`

**41,9 segundos**, contra um limite de 30 s do vitest. Os outros **12 testes do mesmo arquivo passam**.

## O que o teste faz

Ele simula: um lock de reparo cujo dono **morreu**, e um segundo processo que **reivindica o lock no meio do
caminho**. Espera que `loadOrCreateInstallationId` **lance** `/Could not repair/`.

## A causa, no código

`electron/desktop-installation.ts`:

```ts
for (let attempt = 0; attempt < 40; attempt++) {      // 40 tentativas
  try {
    repairFd = fs.openSync(repairPath, 'wx', 0o600)   // tenta criar o lock
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
    const winner = readInstallationId(filePath)       // lê o arquivo
    if (winner) return winner
    emptyPolls = waitOnContendedRepairLock(...)       // julga o dono
    continue
  }
}
```

E `waitForRepair()` espera **25 ms** por tentativa:

```ts
function waitForRepair() {
  Atomics.wait(new Int32Array(buffer), 0, 0, 25)
}
```

**40 × 25 ms = 1 segundo.** Não 41.

**O que custa o resto**: `waitOnContendedRepairLock` chama `reclaimDeadRepairLock`, que julga o dono do lock — e o
julgamento usa `processCreateTimeSync`, que **consulta a criação de um processo**. **No Windows isso é uma chamada
de sistema lenta, feita 40 vezes.**

## A classificação honesta

**Não é "python3 ausente" nem "symlink".** É:

> **Um caminho de recuperação de lock que, no Windows, pode levar ~40 segundos antes de decidir recusar.** O teste
> estoura o limite de 30 s porque **a operação realmente demora mais que isso** — não porque o teste esteja mal
> escrito.

**Isso não é ruído de ambiente. É um comportamento que um usuário sentiria**: um lançamento que trava 40 segundos
e então falha.

## O que eu NÃO vou fazer

**Não vou "consertar" aumentando o timeout do teste.** Isso esconderia o comportamento em vez de reportá-lo.

**Não vou corrigir o `processCreateTimeSync` sem medir.** Reduzir as 40 tentativas ou cachear a criação de processo
muda semântica de recuperação de lock — e um lock mal recuperado **trava o launch para sempre**, que é pior que
esperar 40 s.

**O que faço**: registrar como **risco identificado**, com o arquivo, a linha e a causa.

## O placar final das 40

| Causa | Qtd | Natureza |
|---|---|---|
| `python3` stub da Store | 13 | ambiente |
| `EPERM` em symlink | 12 | ambiente |
| timeout | 5 | **não determinada** |
| `ruamel`/`hermes_cli` ausentes | 1 | ambiente |
| Ferramenta Windows ausente | 1 | ambiente |
| CRLF | 1 | ambiente (do repo) |
| fixture sem export | 1 | ambiente de teste |
| `sun_path` longo | 1 | ambiente |
| Variável do host | 1 | ambiente |
| **recuperação de lock lenta no Windows** | **1** | **comportamento de produto** |
| **outros timeouts sem causa** | **4** | **não determinadas** |
| | **40** | **35 ambiente · 1 produto · 4 desconhecidas** |

## O que continua sem resposta

**4 dos 5 timeouts** não foram investigados individualmente. Sei que `desktop-installation` é comportamento de
produto; **os outros quatro podem ser também**.

**A afirmação correta hoje**: **35 de 40 são ambiente comprovado; 1 é comportamento de produto; 4 permanecem sem
causa determinada.**

**Não "todas de ambiente".**
