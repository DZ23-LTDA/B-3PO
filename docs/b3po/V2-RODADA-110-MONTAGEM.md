# GOAL V2 — RODADA 110: A MONTAGEM — E O BUG QUE A r109 NÃO CONSERTOU

**Data**: 05/11/2026 · **o teste que impediria o cenário da r109**

---

## O QUE A r109 **DIZIA** TER CONSERTADO

> *"Corrigido: as três montagens entraram no `erp-ipc`."*

**Elas não entraram. Só os imports.**

**E o `inventory-ipc.test.ts` passou mesmo assim** — porque ele verifica **os canais que existem**, e **os meus três não existiam**. O teste estava certo; **eu li a aprovação dele como prova de que a montagem tinha funcionado**.

> **É o erro da r104 de novo**: o teste passou, logo eu concluí que o trabalho estava feito. **O teste não testava o que eu achava que testava.**

---

## O TESTE QUE FALTAVA — `erp-mounting.test.ts`

| Verificação | O que impede |
|---|---|
| **todo `registerXxxIpc` exportado é CHAMADO** | **módulo morto com aparência de pronto** |
| são **53** registers | um register novo que ninguém revisou |
| **os três da r109 estão montados** | o cenário exato, nomeado |
| o de estoque também | o teste de onde o bug apareceu |

> **A pergunta é "alguém chama?", não "onde"**: canal de infraestrutura (git, fs, terminal, janela) é montado no `main.ts`, e isso é correto.

---

## AS TRÊS MONTAGENS — agora de verdade

```ts
registerOrganizationIpc(ipcMain, { actorOf, store: new OrganizationStore(..., { exists: … }) })
registerProjectIpc(ipcMain, { actorOf, store: new ProjectStore(...) })
registerWorkItemIpc(ipcMain, { actorOf, store: new WorkItemStore(...) })
```

> **Os cinco testes verdes da r109 não provaram nada** — e o teste novo **falhou na primeira execução**, apontando os três pelo nome.

---

## O QUE DEU ERRADO NO CAMINHO — de novo

**A primeira tentativa** usou `RemoveAt` num array de tamanho fixo, **duplicou o `registerSalesIpc`** e o TypeScript acusou **6 erros**.

**Revertido com um comando**, e a segunda tentativa **com `edit`** funcionou.

> **É a décima primeira vez** nesta sessão. **O `edit` nunca quebrou um arquivo; o script já quebrou onze.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Registers no produto | **53** |
| Testes do `erp-mounting` | **4** |
| Regressão | **29 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| Tentativas quebradas | **1** |

---

## A LIÇÃO — e ela é sobre prova

> **Um teste que passa não é prova de que o trabalho está feito.** Ele é prova de que **o que ele verifica** está certo.
>
> **A r109 tinha cinco testes verdes e três telas mortas** — porque **nenhum deles perguntava se a montagem existia**.

---

## PRÓXIMA RODADA

**Rodar a suíte inteira de novo** — para ver se as 41 falhas mudaram com as montagens, e para **procurar o próximo "verde enganoso"**.

> **110 rodadas.** A r109 disse que consertou; **a r110 descobriu que não** — e criou **o teste que teria pegado**.
