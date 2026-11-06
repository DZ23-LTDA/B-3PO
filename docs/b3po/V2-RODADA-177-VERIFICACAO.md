# GOAL V2 — RODADA 177: A VERIFICAÇÃO — O QUE A GUARDA PROVA, E O QUE AINDA NÃO

**Data**: 06/11/2026 · a primeira de três rodadas limpas · depois da r176 (a guarda)

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `b09797f52c` · **sincronizado** · limpo · `main` **intacta** · `diff --check` **limpo** |
| 4 | **Os testes do canal agendador** | ✅ **120 verdes** |

```
npx vitest run electron/scheduling-catalog electron/scheduling electron/permission   →  Tests  120 passed
```

---

## O QUE A GUARDA **PROVA** — e o que ela não prova

**A r176 pôs `exigirAtor(deps.actorOf, 'execute', 'scheduling', …)` em volta do handler.**

> **Os 120 testes provam que o canal continua funcionando COM um ator que pode.**
>
> **Nenhum deles prova que um ator que NÃO pode é recusado.**

**Medido:**

```
Select-String scheduling-catalog-ipc.test.ts -Pattern "sem_permissao"   →  nada
```

> **A guarda está montada e o caminho feliz está coberto.** **O caminho negado não tem teste próprio.**

### E isso é o que a r177 **não** fez

**Tentei acrescentar o teste de negação** (passando um ator `READ` e esperando `sem_permissao`) — **a edição por script corrompeu o arquivo** (`$k += 2` pulou as linhas erradas da assinatura), **e eu reverti**.

> **O arquivo voltou ao estado da r176, com 120 testes verdes.**
>
> **A negação fica para a próxima — com `edit`, que nesta sessão nunca quebrou nada.**

---

## POR QUE ISSO IMPORTA — e não é formalidade

> **`exigirAtor` é um helper que OUTROS 29 arquivos já usam** (r175). **O helper é testado em `permission`** — que passa.
>
> **O que falta não é a guarda, é o `actorOf` chegando ao helper naquele canal.** **Um `actorOf` que devolvesse `null` por engano faria o canal recusar tudo** — e **nenhum dos 120 testes veria**, porque todos passam um ator que pode.
>
> **É a mesma classe da r149**: **o dado que existe e não chega** — aqui, **o ator que existe e não é exercitado no caminho negado**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Testes do canal agendador** | **120** |
| **Testes de NEGAÇÃO no canal** | **0** ❌ |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **1 de 3** |

> **Estou declarando nesta rodada o que ela NÃO cobriu.** **Um "0" na coluna de negação é a informação mais útil deste documento** — e **ele não vai sumir daqui até ser corrigido**.

---

## PRÓXIMA RODADA

**O teste de negação** — `ator READ → sem_permissao` — e depois **a verificação completa**.

> **177 rodadas.** **A guarda está montada e o caminho feliz passa.** **O caminho negado não tem teste** — e **a honestidade de escrever "0" onde o número é zero vale mais que um relatório sem coluna.**
