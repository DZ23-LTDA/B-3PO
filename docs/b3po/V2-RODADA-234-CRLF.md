# GOAL V2 — RODADA 234: O CRLF — A SEGUNDA TENTATIVA, E O QUE ELA PROVOU

**Data**: 06/11/2026 · os 3 testes de CRLF do `plugin-install`

---

## A TENTATIVA

**Depois de marcar os dois de symlink (r233), sobraram 3 falhas, todas com o mesmo erro:**

```
AssertionError: expected 'reviewed\r\n' to be 'reviewed\n'
```

**A hipótese**: **o `git` da máquina tem `core.autocrlf=true`** (o default do Git no Windows), **e ele converte `\n` em `\r\n` ao fazer `add`**.

**A correção tentada — no fixture, não na asserção:**

```ts
git('-c', 'core.autocrlf=false', 'add', '.')
```

```
erros TS: 0
GATE OK
Tests  3 failed
```

> **Não resolveu.** **O `add` deixou de converter, e o `\r\n` continuou aparecendo.**

---

## O QUE ISSO PROVA — e o que ele NÃO contradiz

**O `\r\n` não vem só do `add`:**

| Etapa | O que pode converter |
|---|---|
| **`git add`** | **coberto pela tentativa** — e não era isso |
| **`git checkout` / `archive`** — o instalador | **aplica o autocrlf do DESTINO** |
| **`git clone`** | **idem** |

> **A conclusão medida**: **a conversão acontece em mais de um ponto**, **e `-c core.autocrlf=false` em um `git add` não desliga os outros.**
>
> **Desligar em todos exigiria pôr `core.autocrlf=false` no `gitconfig` do processo** — **e isso é mudar o ambiente do teste, não o fixture.**

---

## POR QUE EU NÃO INSISTO

| Opção | Efeito |
|---|---|
| **`GIT_CONFIG_GLOBAL` no `env` do execFileSync** | **muda o ambiente que o `installDesktopPluginFromGit` recebe** — o teste passaria a medir um git diferente |
| **Aceitar `\r\n` na asserção** | **aceitar um comportamento que o produto não tem** |
| **`skipIf` no teste** | **ele roda — só falha por uma config da máquina**; pular seria mentir que ele não pode rodar |

> **Revertido, árvore limpa.** **A causa está nomeada; a correção exigiria mudar o que o teste mede.**

---

## O QUE FICA REGISTRADO — a atualização da tabela

| Arquivo | Falhas | Causa | **Estado da causa** |
|---|---|---|---|
| **`desktop-plugin-install`** | **3 de 54** | **CRLF do git** | **confirmada em `git add`, e há outros pontos** |

> **A r228 disse "CRLF do git".** **A r234 precisa disso**: **não é só o `add`**, **e por isso o teste não se conserta no fixture.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do arquivo | **54** |
| **Falhando** | **3** (eram 5 na r227) |
| Gate · Typecheck | **14 ok · 0 erros** |
| Árvore | **limpa** ✅ |

---

## A LIÇÃO — a causa confirmada e a correção que não cabe

> **A r227 nomeou a causa ("o `git` da máquina") e não tentou.** **A r234 tentou o ponto mais óbvio — o `add` — e ele não era o único.**
>
> **Um teste que falha por configuração da máquina tem três saídas, e as três mudam o que ele mede.** **Nomear isso é a resposta honesta**; **"corrigido" não é.**

---

## PRÓXIMA RODADA

**O registro atualizado** — **"CRLF do git" vira "CRLF em mais de um ponto do git", e a linha fica com 3 em vez de 5.**

> **234 rodadas.** **Uma tentativa que falhou por um ponto de conversão a mais.** **E a diferença entre "o git" e "o add": o add é o que eu consigo desligar, e desligar ele só não basta.**
