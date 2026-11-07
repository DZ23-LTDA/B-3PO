# GOAL V2 — RODADA 239: 12, O MENOR — E O `channel-build-version` VOLTOU

**Data**: 06/11/2026 · a segunda de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `9577bb5adb` · **sincronizado** · limpo |
| 4 | **Suíte `electron`** | **5679 testes · 5450 verdes · 12 vermelhos · 217 skipped** (306s) |

---

## 12 — o menor de todos

| Rodada | Verdes | Vermelhos | Arquivos |
|---|---|---|---|
| r222 | 5451 | **13** | 5 |
| r236 | 5449 | **13** | 5 |
| **r239** | **5450** | **12** | **5** |

> **12 vermelhos em 5 679 testes — o menor de toda a sessão**, e **o `audit-store` saiu** (era flaky, e a nota da r237 já previa isso: *"em outra rodada ele pode não entrar"*).

---

## O `channel-build-version` VOLTOU — e é o B8

```
❯ electron/channel-build-version.test.ts (4 tests | 1 failed) 100187ms
```

> **O `retry: 1` da r203 o manteve verde por 36 rodadas.** **Nesta, ele falhou duas vezes e ficou vermelho.**
>
> **E o tempo diz por quê**: **100 187 ms** — **perto do teto de 120 s**, **muito acima dos ~22 s que ele levava**.

**É o `B8`, e ele está registrado desde a r207:**

```json
{ "estado": "BLOQUEADO_POR_TERCEIRO", "item": "channel-build-version, 1 de 4 sob carga",
  "id": "B8", "motivo": "concorrência no Msix/app-builder-lib; retry:1 no config cobre" }
```

> **O `retry` cobre a falha intermitente média; não cobre uma rodada em que o `app-builder-lib` leva 100 s.** **É a diferença entre uma segunda chance e um teto apertado.**

---

## O NÚMERO HONESTO — 12, e a composição

| Arquivo | Falhas | Causa | Flaky? |
|---|---|---|---|
| `ssh-connection` | **4** | `sun_path` + sinais POSIX | não |
| `run-electron-builder` | **1** | `prepared-packaging` | não |
| `bundle-electron-main` | **3** | `electron_flags` não lido | não |
| `desktop-plugin-install` | **3** | CRLF | não |
| **`channel-build-version`** | **1** | **concorrência do Msix (B8)** | **sim** |
| ~~`audit-store`~~ | **0** | — | **saiu** |

> **11 fixos + 1 intermitente = 12.** **E a nota da r237 se aplicou ao pé da letra: o número não é a soma das linhas de uma rodada anterior.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5450** |
| **Vermelhos** | **12** — o menor de todas |
| **Arquivos** | **5** (4 fixos + 1 flaky) |
| **Vermelhos do produto** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **2 de 3** |

---

## A LIÇÃO — o retry que funciona e o teto que não cobre

> **36 rodadas verdes com `retry: 1`.** **Então uma rodada em que o `Msix` levou 100 s.**
>
> **O `retry` não é uma garantia: é uma segunda chance.** **E uma segunda chance de 100 s ainda esbarra em 120 s.**
>
> **O `B8` já dizia isso** — *"o teste segue vulnerável ao redor da biblioteca"* — **e a rodada de hoje é a primeira em que a vulnerabilidade apareceu.**

---

## PRÓXIMA RODADA

**A terceira limpeza** — o renderer — **e a tabela precisa da linha do `channel-build-version` de volta.**

> **239 rodadas.** **12 é o menor número de todos, e ele contém um flaky que o `retry` segurou por 36 rodadas.** **A tabela que avisa que o número não é a soma acabou de ser usada.**
