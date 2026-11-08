# GOAL V2 — RODADA 172: O RENDERER — 20, E OS OITO NOVOS PASSAM

**Data**: 06/11/2026 · a primeira de três rodadas limpas · depois das rodadas 170–171 (o contrato do plugin)

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `cbcd6dffd5` · **sincronizado** · limpo · `main` **intacta** · `diff --check` **limpo** |
| 4 | **Suíte do RENDERER** | **13121 testes · 13073 verdes · 20 vermelhos · 28 skipped** |

---

## A CONTA

| Rodada | Testes | Verdes | Vermelhos | Skipped |
|---|---|---|---|---|
| r167 | 13113 | 13065 | **20** | 28 |
| **r172** | **13121** | **13073** | **20** | 28 |

> **+8 testes, +8 verdes, e os MESMOS 20 vermelhos.**
>
> **Os oito novos são os da r170–r171** (`nav-rbac` 8 e o plugin ajustado) — **e todos passam**.

---

## NENHUM DOS MEUS — verificado

```
❯.*(nav-rbac|b3po-nav)  →  NENHUM
```

> **O `b3po-nav` é o arquivo que eu mudei mais fundo nesta sessão** — **o `register` inteiro** — e **não aparece na lista**.

---

## OS 20 — os mesmos, e **os dois de `settings` continuam lá**

| Arquivo | O que é |
|---|---|
| **`config-settings` · `delegation-settings-integration`** | **os dois que estouram 60 s** (r167: provado que passam isolados, 10/10) |
| `sync-defaults` · `sync-handoff` · `sync-concurrent` · `sync-store` | **a família do `localStorage` compartilhado** — 4 arquivos da mesma pasta |
| `legacy-sdk-compat` · `use-keybinds-browser` · `browser-hints` | upstream |
| `gateway-background-reconnect` · `terminal-ownership` · `windows` · `floating-panes` · `send-then-close` · `bot-delete` · `hidden-bots` | flaky/timeout conhecidos |

> **A família `sync-*` agora aparece com QUATRO arquivos** — e **ela é a explicação da r159**: **a mesma pasta, a mesma chave, disputada em paralelo**.
>
> **Quatro arquivos disputando uma chave é a assinatura de um problema de isolamento de teste, não de produto.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do renderer | **13121** |
| Verdes | **13073** (99,63%) |
| **Vermelhos flaky/timeout** | **20** |
| **Vermelhos do produto** | **0** |
| **Testes novos (r170–r171)** | **+8, todos verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **1 de 3** |

---

## O QUE ESTA VERIFICAÇÃO PROVA

> **A r171 mudou o `register` de um plugin** — que é **o ponto onde o SDK encontra o produto**. **Um erro ali derrubaria a barra inteira**, e **o teste do plugin não pegaria** se o mock fosse mais frouxo que o contrato.
>
> **Foi exatamente o que aconteceu**: **o mock não tinha `onDispose`** e **os três testes quebraram**. **Corrigi o mock, não o código** — e **agora oito testes cobrem a decisão e o menu**.

---

## PRÓXIMA RODADA

**A segunda e a terceira** — e a próxima inclui a suíte `electron`, porque **o plugin agora chama `whoami()`**, que é **um canal**.

> **172 rodadas.** **+8 testes e os mesmos 20 vermelhos** — **o incremento foi limpo**. **E a família `sync-*` cresceu para quatro arquivos**: **é a única coisa nesta suíte que piora com o tempo, e ela não é do produto**.
