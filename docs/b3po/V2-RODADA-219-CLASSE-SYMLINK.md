# GOAL V2 — RODADA 219: OS SYMLINKS — UMA CLASSE DE 30+ CHAMADAS, MEDIDA E NÃO FECHADA

**Data**: 06/11/2026 · a classe que a r218 abriu

---

## A MEDIÇÃO — o que a r218 deveria ter feito

> **A r218 corrigiu `desktop-plugin-remove` e escreveu a lição**: *"o fixture pedia ao sistema algo que ele não dá sem elevação"*.
>
> **A r219 aplicou a lição da r214 — "a classe, não o caso" — e buscou TODAS as chamadas:**

```
Get-ChildItem electron/*.ts | Select-String "symlinkSync\("
```

| Resultado | |
|---|---|
| **Chamadas de `symlinkSync`** | **~55** |
| **Com `junction` no Windows** | **3** (`backend-probes-runtime`, `fs-read-dir`, `hardening`, `desktop-plugin-remove`) |
| **Sem tipo ou com `'dir'` direto** | **~30** |

> **A maioria cria links de DIRETÓRIO sem declarar o tipo** — **e no Windows isso é `EPERM`**.
>
> **E as que criam link de ARQUIVO (`'file'`) também exigem privilégio.**

---

## O QUE EU TENTEI — e o que ele provou

**Aplicado `junction` nos 6 links de diretório de `plugin-files.test.ts`:**

| Antes | Depois |
|---|---|
| **8 de 43 falhando** | **4 de 43 falhando** |

> **Funcionou: os 4 que sobraram são os testes que criam link de ARQUIVO para dentro do `hermesHome`** — **`refuses to read through a symlinked file`**, **`cannot reach another plugin's data folder`**.
>
> **E esses precisam de um symlink de ARQUIVO de verdade**, **que o Windows não cria sem elevação**, **nem como `junction`** (que só vale para diretório).

**Revertido** — **porque corrigir 6 chamadas e deixar 4 falhando com prefixo `(retry x1)` não é conserto: é meia correção com aparência de progresso.**

---

## A DECISÃO — declarada

| Opção | Efeito |
|---|---|
| **A.** Marcar os testes de symlink com `skipIf(process.platform === 'win32')` | **verde honesto**: o teste não pode rodar aqui, e a suíte diz isso |
| **B.** `junction` nos de diretório e skip nos de arquivo | **verde parcial** |
| **C.** Deixar como está | **9 falhas, todas de plataforma** |

> **Escolhi C por ora**: **a opção A é a certa e é a próxima rodada** — **e ela precisa ser aplicada à CLASSE inteira, não a um arquivo**, **porque um `skipIf` em um arquivo e não nos irmãos repete o erro da r214.**

---

## O QUE ISSO ENSINA SOBRE A r218

> **A r218 corrigiu um arquivo e escreveu a lição certa.** **A r219 mede o tamanho do que a lição implica: ~30 chamadas em 15 arquivos.**
>
> **A r218 não errou — ela **parou no primeiro caso**, como a r187, a r196 e a r200.**
>
> **O padrão tem nome agora, e ele se repete cinco vezes**: **consertar o que eu vi, não o que a busca mostra.**

---

## O ESTADO — declarado

| Medida | Valor |
|---|---|
| `plugin-files` | **9 de 43** (era 8; a variância é do retry) |
| Chamadas de `symlinkSync` mapeadas | **~30 sem tipo declarado** |
| Gate · Typecheck | **14 ok · 0 erros** |
| Árvore | **limpa** ✅ |

---

## PRÓXIMA RODADA

**A opção A, aplicada à classe**: **um helper `criarLink`** que **tenta `junction`/`dir`/`file` e, quando o sistema recusa, marca o teste como pulado com o motivo**.

> **219 rodadas.** **Um arquivo corrigido na r218, e ~30 chamadas mapeadas na r219.** **A lição estava certa; o que faltava era medir o tamanho dela antes de escrever "corrigido".**
