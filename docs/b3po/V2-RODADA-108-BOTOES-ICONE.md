# GOAL V2 — RODADA 108: OS BOTÕES DE ÍCONE — 1 DE 3 ERA REAL

**Data**: 05/11/2026 · **P8** · o último item que `grep` resolve

---

## A MEDIÇÃO DA r107 DIZIA 3

**Verificando um por um:**

| Arquivo | O que o botão tem | Veredito |
|---|---|---|
| `chat/composer/status-stack/coding-row.tsx` | **só `<Codicon>`** | ❌ **REAL** |
| `right-sidebar/files/remote-picker.tsx` | `<Codicon>` **+ `<span>{name}</span>`** | ✅ **tem texto** |
| `settings/keybind-settings.tsx` | `<Codicon>` **+ `{k.resetAll}`** | ✅ **tem texto** |

> **1 de 3 era real.** O regex da r107 olhou **o primeiro filho** e não viu **o irmão de texto** ao lado.

**É o terceiro erro de métrica seguido** — e todos do mesmo tipo: **contar sem verificar o que se está contando**.

---

## O QUE FOI CORRIGIDO

```tsx
<button aria-label="Abrir o painel de revisão" ...>
  <Codicon name="git-branch" />
</button>
```

> **Um ícone de ramo de git sozinho não diz nada a quem não vê** — e este botão **abre o painel de revisão**, que é uma ação.

---

## O QUE DEU ERRADO NO CAMINHO — e está registrado

**A primeira tentativa quebrou o arquivo**: usei um replace com `\n` literal, e o TypeScript acusou **11 erros** de sintaxe.

> **Revertido com `git checkout` em um comando.** A segunda tentativa, **por índice de linha**, funcionou.

**É a décima vez nesta sessão** que uma edição por script corrompe um arquivo — e a terceira em que **o typecheck pega em segundos e o revert custa um comando**.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Testes de `src/app/chat`** | **1598 verdes** |
| Arquivo corrompido | **1** (revertido) |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Botões auditados | **3** |
| **Reais** | **1** |
| **Falsos positivos** | **2** |
| Tentativas quebradas | **1** |

---

## O P8 — **FECHADO, COM RESSALVAS**

| Item | Estado |
|---|---|
| Acessibilidade (4 vetores) | ✅ **r104 + r107 + r108** |
| Backups | ✅ r105 |
| i18n | ✅ r106 (96% real) |
| Performance | ✅ tests no trunk |
| **Foco, tabulação, contraste** | ❌ **exigem o app aberto** |

> **Tudo o que `grep` resolve está feito.** O que falta **não é código** — é **abrir o app e olhar**.

---

## PRÓXIMA RODADA

O **`wrapup_check`** — o GOAL diz que a entrega só termina quando **três rodadas de verificação completa** não acharem nada, e a sessão tem **108 rodadas de trabalho** sem nunca ter passado por ele.

> **108 rodadas.** A rodada fechou o **P8** com **1 correção e 2 falsos positivos** — e os três erros de métrica seguidos (r106, r107, r108) têm a mesma causa: **eu conto sem verificar o que estou contando**, que é o mesmo erro da r104 com os `aria-label` no lugar errado.
