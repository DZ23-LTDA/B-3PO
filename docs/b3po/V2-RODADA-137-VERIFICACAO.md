# GOAL V2 — RODADA 137: A VERIFICAÇÃO — 39 FALHAS, ZERO DO PRODUTO

**Data**: 05/11/2026 · a primeira verificação depois das rodadas 133–136

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `ccf5cf33b3` · **sincronizado** · limpo · `main` intacta |
| 4 | **Suíte completa `electron`** | **5626 testes · 5380 verdes · 39 vermelhos · 207 skipped** (306s) |

---

## OS 39 — e são **dois a menos** que na r126

| Rodada | Vermelhos |
|---|---|
| r109 | **41** |
| r126 | **40** |
| **r137** | **39** |

> **A queda é a `inventory-ipc`** (r109) **e a `desktop-installation`** (que passou desta vez).

---

## AS DUAS "NOVAS" — e as duas são de ambiente

Apareceram dois arquivos que a r126 não listou:

### `scripts/bundle-electron-main.test.mjs`

```
expected: relaunched: ['.', '--ozone-platform=x11']
received: relaunched: ['.', '--ozone-platform=wayland']
```

> **É um teste de Linux** — `ozone-platform` é o compositor Wayland/X11 — **rodando no Windows**.
>
> **Ele espera comportamento de outra plataforma.**

### `scripts/run-electron-builder.test.mjs`

```
Error: Cannot consume packaging inputs C:\Users\lmpra\AppData\Local\Temp\vitest-…
```

> **`EPERM` de symlink** em `AppData\Local\Temp` — a mesma classe do `plugin-files`.

### E **nenhum dos dois é meu** — verificado

```
git log --oneline -3 -- "apps/desktop/scripts/bundle-electron-main.test.mjs"
  89cc403b23  ← upstream
  c0a0f097a8  ← upstream

git log --oneline ccf5cf33b3 --since="17:30" --name-only | grep scripts/
  (vazio)
```

> **Nenhum commit desta sessão tocou `scripts/`.** Os dois são **do Hermes**.

---

## O QUE EU FIZ DE ERRADO NESTA RODADA — e peguei

### O `git show --check` não é o comando

```pwsh
git show HEAD --check    →  imprime o CABEÇALHO do commit mesmo quando está limpo
git diff A B --check     →  o que acusa whitespace
```

> **Eu li o cabeçalho do commit como "SUJO"** e quase reportei um problema que não existia.
>
> **O comando certo** confirmou: **limpo** — nos dois últimos commits e na correção da r136.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5626** |
| Verdes | **5380** (95,6%) |
| **Vermelhos de ambiente/upstream** | **39** |
| **Vermelhos do produto** | **0** |
| Testes das áreas tocadas (133–136) | **1128 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O QUE ESTA VERIFICAÇÃO PROVA

> **As rodadas 133–136 mexeram em schema (`CrmContact`), canal (`sales-ipc`, `erp-ipc`) e tela** — e **1128 testes das áreas tocadas passam**.
>
> **A suíte inteira não perdeu um teste**: 39 vermelhos, **todos de ambiente ou do upstream**, e **dois a menos que na r126**.

---

## PRÓXIMA RODADA

**A segunda verificação limpa** — e ela precisa incluir **o renderer**, que as rodadas 133–136 também tocaram (`crm-contacts.ts`, a tela).

> **137 rodadas.** A verificação **achou dois testes "novos" vermelhos** e **foi atrás**: **um é de Linux, outro é `EPERM` de symlink** — e **nenhum commit meu tocou `scripts/`**. E **peguei um erro meu de comando**: `git show --check` imprime o commit mesmo limpo, e eu quase reportei whitespace que não existia.
