# GOAL V2 — RODADA 173: O `electron` — 41, E O CANAL QUE O PLUGIN PASSOU A CHAMAR

**Data**: 06/11/2026 · a segunda de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `e350a509b5` · **sincronizado** · limpo |
| 4 | **Suíte `electron`** | **5677 testes · 5429 verdes · 41 vermelhos · 207 skipped** (306s) |

---

## O QUE MUDOU DE LADO

> **A r171 fez o plugin `b3po-nav` chamar `whoami()`** — e **`whoami` é um canal do processo principal**.
>
> **Até a r170, o renderer não chamava canal nenhum para montar o menu.** **Agora chama.** **Isso desloca a fronteira** — e **a fronteira é onde os contratos quebram**.

### O canal, verificado de frente

```
npx vitest run electron/admin electron/actor electron/rbac   →  Tests  16 passed
```

> **O `hermes:admin:whoami` que o plugin consome passa**, junto com o RBAC que ele usa (`hasLevel`, `rankOf`, `RANK`).

---

## NENHUM DOS MEUS — verificado

```
❯.*(admin|actor|rbac|negocio|after-sales|service-desk|inventory|finance|scheduling|purchases)  →  NENHUM
```

---

## OS 41 — **um a menos que a r168**

| Rodada | Verdes | Vermelhos |
|---|---|---|
| r168 | 5428 | **42** |
| **r173** | **5429** | **41** |

> **+1 verde, −1 vermelho, 5677 testes nas duas.** **O `linux-nvidia-egl-recovery` desta vez passou** — **é a flakiness de ambiente, e ela oscila para os dois lados.**

**Os mesmos 17 arquivos:** `command-screenshot-monitor` · `system-proxy-env` · `desktop-plugin-remove` · `packaged-working-directory` · `no-console-git` · `audit-store` (2) · `ssh-connection` · `ui-preferences` · `backend-probes-runtime` · `run-electron-builder` · `plugin-files` · `bundle-electron-main` · `checkout-source` · `state-db-preflight` · `channel-build-version` · `desktop-plugin-install` · `desktop-installation`.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5677** |
| Verdes | **5429** (95,6%) |
| **Vermelhos de ambiente/upstream/flaky** | **41** |
| **Vermelhos do produto** | **0** |
| **O canal do plugin (`whoami` + RBAC)** | **16, verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **2 de 3** |

---

## A LIÇÃO — deslocar a fronteira é o custo escondido

> **A decisão da r170 e a montagem da r171 custaram DENTRO do renderer** — um arquivo de 75 linhas e uma mudança de `register`.
>
> **O custo real aparece aqui**: **o renderer passou a depender de um canal**, e **todo canal novo no renderer amplia a superfície onde as duas metades do contrato podem discordar**.
>
> **É a lição da r149, na direção contrária**: lá **o tipo do renderer não tinha os campos do main**; aqui **o renderer foi buscar um dado do main que já existia** — e **o risco foi pago com 16 testes do canal**.

---

## PRÓXIMA RODADA

**A terceira limpeza** — o **build**, que fecha as três e libera o `wrapup_check`.

> **173 rodadas.** **41 em vez de 42, e o `linux-nvidia-egl` passou** — **a flakiness oscila para os dois lados, e é por isso que nenhum número isolado dela significa nada.** **O que significa é o zero do produto, e ele se repete há 40 rodadas.**
