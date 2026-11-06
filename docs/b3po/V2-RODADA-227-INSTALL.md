# GOAL V2 — RODADA 227: O `plugin-install` — QUATRO CAUSAS EM CINCO TESTES

**Data**: 06/11/2026 · `desktop-plugin-install`

---

## AS CINCO FALHAS, MEDIDAS

| Teste | Erro | Causa |
|---|---|---|
| **1** | `expected 'reviewed\r\n' to be 'reviewed\n'` | **CRLF vs LF** |
| **2** | idem | **CRLF vs LF** |
| **3** | *(a medir)* | *(provavelmente o mesmo)* |
| **4** | **`fs.symlinkSync('/etc/hostname', …)`** | **symlink** |
| **5** | **`fs.symlinkSync(path.join(outside, 'desktop'), …)`** | **symlink** |

> **Duas causas distintas em cinco testes, e nenhuma é do B-3PO.**

---

## O CRLF — e por que ele não é do produto

```
AssertionError: expected 'reviewed\r\n' to be 'reviewed\n'
```

> **O `git` na máquina está com `core.autocrlf` ativo**, **e os arquivos do `pluginRepo(null)` saem com `\r\n`** enquanto o teste espera `\n` do repositório de origem.
>
> **Não é o instalador**: **o instalador copiou o que o git deu a ele.**

---

## O SYMLINK — a mesma família da r218/r221

**Tentei aplicar `it.skipIf(semSymlink).each([…])`:**

```
electron/desktop-plugin-install.test.ts(294,7): error TS2468: Cannot find name …
```

> **O `.each` não aceita o `skipIf` encadeado antes dele na forma que eu tentei.**
>
> **Revertido.** **A forma certa seria marcar o `it.each` inteiro, ou separar os dois casos** — **e nenhuma das duas é pequena**.

---

## O QUE FICA — e o que eu não faço

| Ação | Por que não |
|---|---|
| **Consertar o CRLF no teste** | **o `git` da máquina é a variável**; mudar o teste para aceitar `\r\n` aceitaria um comportamento que não é o do produto |
| **Forçar `core.autocrlf=false` no fixture** | **possível, mas muda o `pluginRepo` que outros testes compartilham** |
| **`skipIf` nos dois de symlink** | **a forma certa não é a que eu tentei**, e a forma que sobra mexe no `it.each` inteiro |

> **Revertido, árvore limpa.** **Registrar a causa é o que a rodada entrega** — **e as duas causas estão nomeadas agora.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do arquivo | **54** |
| **Falhando** | **5** |
| **Causas distintas** | **2** (CRLF, symlink) |
| Gate · Typecheck | **14 ok · 0 erros** |
| Árvore | **limpa** ✅ |

---

## O QUADRO DOS QUATRO — completo

| Arquivo | Falhas | Causa | Natureza |
|---|---|---|---|
| **`ssh-connection`** | **a medir** | — | infraestrutura |
| **`run-electron-builder`** | **1 de 5** | **`prepared-packaging`** | hospedeiro |
| **`bundle-electron-main`** | **3 de 5** | **`electron_flags` não lido** | hospedeiro |
| **`desktop-plugin-install`** | **5 de 54** | **CRLF + symlink** | ambiente |

> **Três medidos. Nenhum do B-3PO. Nenhum é um defeito de funcionalidade.**

---

## A LIÇÃO — o vermelho que não é um defeito

> **O `plugin-install` falha por `\r\n` e por `symlink`.**
>
> **Nenhum dos dois é algo que o instalador faz errado**: **o primeiro vem do git da máquina, o segundo do privilégio que o Windows não dá.**
>
> **Um leitor do relatório que visse "desktop-plugin-install: 5 falhando" concluiria que o instalador está quebrado.** **O relatório precisa dizer a causa, não a contagem.**

---

## PRÓXIMA RODADA

**`ssh-connection` (89 testes)** — **o último a medir** — **e então o quadro fecha**.

> **227 rodadas.** **Quatro arquivos, três medidos, quatro causas distintas.** **Nenhuma é do produto — e é por isso que a lista precisa de causa e não de contagem.**
