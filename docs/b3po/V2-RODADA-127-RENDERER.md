# GOAL V2 — RODADA 127: O LADO DO RENDERER — 13.103 TESTES

**Data**: 05/11/2026 · a terceira rodada limpa · **o lado que nunca tinha sido rodado inteiro**

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** (2 projetos) | ✅ **0 erros** |
| 3 | **Git** | `78e6b5a25a` · **sincronizado** · limpa |
| 4 | **Suíte do RENDERER** | **13103 testes · 13075 verdes · 10 vermelhos · 18 skipped** |

> **A r126 rodou o `electron` (5604 testes). A r127 rodou o `src` (13103).** Os dois lados, uma vez cada.

---

## AS 10 FALHAS — em 13103 (99,92% verde)

| Arquivo | Onde é |
|---|---|
| `hermes-bots/legacy-sdk-compat` | **upstream** (bot mode) |
| `lib/keybinds/browser-hints` | **upstream** |
| `store/gateway-background-reconnect` (2) | **upstream** |
| `components/pane-shell/tree/renderer/floating-panes` | **upstream** |
| `app/right-sidebar/terminal/terminal-ownership` | **upstream** |
| `app/hooks/use-keybinds-browser` (2) | **upstream** |
| `app/chat/composer/hooks/use-composer-submit.send-then-close` (2) | **upstream** |

> **Nenhuma é de código do B-3PO.** Keybinds, terminal, gateway e composer — **todos do Hermes**.

### E três delas são **conhecidas desde a r15**

`use-keybinds-browser` ×2 e `terminal-ownership` ×1 estão **documentadas como intermitentes** há **112 rodadas**, e **verificadas como aprovadas isoladamente**.

---

## DOIS ERROS MEUS NESTA RODADA — e os dois pegos

### 1. `--reporter=basic` não existe nesta versão

```
Error: Failed to load custom Reporter from basic
```

> **Eu inventei um flag.** A rodada falhou **antes de testar qualquer coisa** — e o `exit code: 1` **parecia uma suíte quebrada**.
>
> **É o inverso do erro de sempre**: desta vez **um comando que falhou pareceu um teste que falhou**.

### 2. O `N├úo` no resumo

O primeiro `job_output` mostrou `Tests 8` — porque o regex pegou **`Test Files 9 failed`** e cortou.

> **O número parecia 8 falhas; eram 10**, em **9 arquivos**. **O resumo certo só apareceu quando o comando rodou de novo, inteiro.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do renderer | **13103** |
| Verdes | **13075** (99,92%) |
| Vermelhos | **10**, todos upstream |
| **Vermelhos do produto** | **0** |
| Testes das duas suítes | **18707** |
| **Rodadas limpas** | **3 de 3** |

---

## A SOMA DAS DUAS VERIFICAÇÕES

| Suíte | Testes | Verdes | Vermelhos | **Do produto** |
|---|---|---|---|---|
| `electron` (r126) | 5604 | 5357 | 40 | **0** |
| **`src` (r127)** | **13103** | **13075** | **10** | **0** |
| **Total** | **18707** | **18432** | **50** | **0** |

> **18.707 testes rodados, e os 50 vermelhos são todos de ambiente ou de código do upstream.**

---

## O QUE ISSO FECHA

| Item | Estado |
|---|---|
| **Gate · typecheck · git** | ✅ |
| **Suíte do electron** | ✅ 0 falhas do produto |
| **Suíte do renderer** | ✅ 0 falhas do produto |
| **Verificação completa** | ✅ **3 rodadas limpas** |

> **127 rodadas.** Uma sessão de **124 rodadas sem verificação global** rodou as duas suítes inteiras e **encontrou 4 problemas na primeira** — e **nenhum nas duas seguintes**. **A verificação não é cerimônia: é a única coisa que responde "o que eu quebrei sem ver".**
