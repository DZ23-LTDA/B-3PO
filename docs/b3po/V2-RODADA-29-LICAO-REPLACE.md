# GOAL V2 — RODADA 29: A VALIDAÇÃO QUE EU NÃO CONSEGUI FAZER — E POR QUÊ

**Data**: 05/11/2026 · **§14 — Compras**
**Resultado: código revertido ao estado do commit `f26da427bb`. Nenhuma mudança.**

---

## O QUE EU IA FAZER

A r28 registrou a lacuna: *"a tela não valida que o id do aprovador existe. Digitar `chefe` quando não há ninguém com esse id faz o limite **nunca aprovar**."*

O plano era: `definirLimite` recebe `deps.atores`, valida os ids contra o `actors-store`, e recusa com `aprovador_inexistente` nomeando **qual** id falhou.

**O desenho está certo.** A execução, não.

---

## O QUE ACONTECEU

Usei `Replace` do PowerShell para inserir o código em `purchases-ipc.ts`. O resultado:

| Momento | Linhas do arquivo |
|---|---|
| Antes | **375** |
| Depois do primeiro `Replace` | **576** |
| Depois do segundo | **387** — com o bloco **duplicado 10 vezes** |

**O `edit` recusou**: *"old_string matched 10 times"*. Foi o `edit` que revelou a duplicação — o typecheck tinha passado **0 erros** no segundo estado, porque 10 cópias sintaticamente válidas do mesmo handler **compilam**.

> **O typecheck não pega duplicação.** Ele pega sintaxe. Um arquivo com 10 handlers idênticos é TypeScript válido — e seria um `ipcMain.handle` registrado 10 vezes no mesmo canal.

---

## O QUE EU FAÇO NO LUGAR

**Revertido.** `git checkout` no arquivo, verificado:

```
purchases-ipc.ts   375 linhas   (= estado do commit f26da427bb)
typecheck          0 erros
gate               14 checks, ok
árvore             limpa
```

**Nenhuma mudança de produto nesta rodada.**

---

## A LIÇÃO — a quarta vez, e a mais cara

| Rodada | O que o `Replace` corrompeu | O que pegou |
|---|---|---|
| r9 | o `\r` comeu o "r" de "revert" | typecheck **antes** do commit |
| r14 | o `\r` quebrou "resolverPython" | typecheck |
| r27 | `\null`, depois `` \`ull\` `` | typecheck (3×) |
| **r29** | **o arquivo inteiro, duplicado 10×** | **typecheck passou; só o `edit` pegou** |

**As três primeiras foram falha de escape. Esta foi pior**: o `Replace` casou **um texto que aparecia em vários lugares** e inseriu o bloco em cada um.

> **A regra que eu devia ter seguido desde a r9**: `Replace` sem âncora única é uma operação **não determinística** sobre um arquivo. O `edit` exige `old_string` **único** — e é exatamente por isso que ele existe.
>
> **O typecheck não substitui a revisão do diff.** Ele valida sintaxe; não valida que o arquivo continua sendo o mesmo arquivo.

---

## O QUE FICA REGISTRADO PARA A PRÓXIMA TENTATIVA

O desenho da validação está pronto e é o mesmo:

```ts
if (deps.atores && pedidos.length > 0) {
  const existentes = new Set(await deps.atores())
  const faltando = pedidos.filter(id => !existentes.has(id))

  if (faltando.length > 0) {
    return { error: 'aprovador_inexistente', motivo: `ator nao encontrado: ${faltando.join(', ')}` }
  }
}
```

**Três decisões já tomadas:**

| Decisão | Por quê |
|---|---|
| `atores` é **opcional** em `PurchasesDeps` | quem monta sem atores continua funcionando; um canal que quebra por dependência ausente é pior que um sem validação |
| a recusa **nomeia o id** | `aprovador_inexistente` sozinho obrigaria a procurar qual dos cinco está errado |
| validar **antes** de gravar | um limite salvo com id inválido nunca aprova, e o erro só aparece na tentativa |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas de código alteradas | **0** (revertido) |
| `purchases-ipc.ts` | **375 linhas** |
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| Árvore | **limpa** |
| Tentativas de `Replace` que corromperam | **2 nesta rodada** |
| O que pegou a corrupção | **o `edit`** (typecheck passou) |

---

## O QUE ISSO MUDA NO MÉTODO

A partir daqui, para **qualquer** edição em arquivo existente:

1. **`edit` com `old_string` único** — ou `write` do arquivo inteiro
2. **Nunca `Replace` do PowerShell em código**
3. **`git diff` antes do typecheck** quando a edição foi por script

> **O typecheck valida que o código compila. Ele não valida que o código é o que eu quis escrever.**

---

## PRÓXIMA RODADA

A mesma validação — agora com `edit`, e o arquivo pode ser conferido linha a linha antes do commit.

E a lição vale para o resto do projeto: **29 rodadas, e a ferramenta que mais me custou tempo não foi o produto — foi o meu jeito de editar.**
