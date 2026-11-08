# GOAL V2 — RODADA 119: O CHANGELOG

**Data**: 05/11/2026 · **§23** · o último dos 7 checkpoints

---

## O QUE FOI CRIADO

`docs/b3po/B3PO-MASTER-CHANGELOG.md` — **69 linhas**, gerado do **`git log`**, não da memória.

> **O `CHANGELOG.md` existente cobre até 02/11.** Ele **continua** a partir dele — e **não o substitui**: §23: *"atualizar, não duplicar"*.

---

## OS NÚMEROS — medidos do git

| Tipo | Commits |
|---|---|
| `feat` | **63** |
| `docs` | **51** |
| `fix` | **29** |
| `test` | **8** |

> **29 `fix`** — quase **um em cada cinco** commits foi conserto.
>
> **E nenhum foi de um bug que o produto tinha antes.** Todos foram **de algo que eu quebrei ou afirmei errado**.

---

## AS NOVE CORREÇÕES — e o padrão

| Rodada | Afirmei | Era |
|---|---|---|
| r64 | *"ninguém confirma pagamento"* | **existia** |
| r93 | *"3 duplicatas de menu"* | **0** |
| r94 | *"o CRM está órfão"* | **no menu do núcleo** |
| r101 | *"a interface é X"* | **era Y** |
| r104 | *"20 atributos de a11y"* | **nos lugares errados** |
| r105 | *"não há teste de backup"* | **458 testes** |
| r106 | *"i18n em 64%"* | **96%** |
| r107 | *"3 botões de ícone"* | **1** |
| r109 | *"as 3 montagens entraram"* | **só os imports** |

> **O padrão é o mesmo em todas: eu olho uma parte e falo do todo.**

---

## O QUE MUDOU NO MÉTODO

| Antes | Depois |
|---|---|
| confiar no teste verde | **o teste prova o que ele verifica, não o todo** |
| contar arquivos | **contar o que importa** (r106) |
| afirmar "não existe" | **procurar o símbolo primeiro** (r65) |
| editar por script | **`edit` com âncora única** — o script quebrou **11 vezes** |

---

## OS 7 CHECKPOINTS DO §23 — **6 de 7**

| Arquivo | Estado |
|---|---|
| `ROADMAP` · `DECISIONS` · `BLOCKERS` · `CHANGELOG` · `TEST-RESULTS` · `CHECKPOINT.json` | ✅ |
| **`B3PO-MASTER-STATE.md`** | ⚠️ **nome diferente** — o conteúdo está em `AUTONOMOUS-EXECUTION-STATE.md` |

> **O §23 diz "localizar equivalentes antes de criar"**: o STATE **existe** com outro nome, e **atualizá-lo** (r117) foi a decisão certa.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **69** |
| Commits medidos | **153** |
| Correções nomeadas | **9** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## PRÓXIMA RODADA

O **STATE com o nome que o §23 espera** — ou a **decisão explícita** de que o equivalente é o canônico, registrada como ADR.

> **119 rodadas.** O CHANGELOG conta **o que aconteceu** — e a parte mais útil dele é a das **nove correções**, porque **um changelog que só lista entregas esconde que 29 dos 153 commits foram consertos de afirmações minhas**.
