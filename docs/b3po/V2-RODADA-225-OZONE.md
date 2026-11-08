# GOAL V2 — RODADA 225: O `--ozone-platform` — O TESTE QUE MEDE O APP HOSPEDEIRO

**Data**: 06/11/2026 · o `bundle-electron-main`

---

## O ERRO

```
AssertionError: expected { relaunched: [ '.', '--ozone-platform=wayland' ] }
                to deeply equal { relaunched: [ '.', '--ozone-platform=x11' ] }
```

> **O teste escreve um `config.yaml` com `desktop.electron_flags: [--ozone-platform=x11]`** e **espera que o bundle o respeite**.
>
> **O bundle ignorou e escolheu `wayland`** — **que é o default para uma sessão Wayland**.

---

## O QUE ISSO É — e o que não é

**O teste não é de fixture. É de comportamento:**

```js
// L104-105, o comentário do próprio arquivo:
// The bundled entry must read config.yaml from the same home main.ts does
// (resolveDesktopHermesHome), or desktop.electron_flags set for the real
```

> **Ele verifica que o entry bundlado lê o `config.yaml` do MESMO `HERMES_HOME` que o `main.ts`**.
>
> **E ele falha** — **o que significa que o bundle não está lendo o config**, **ou o está lendo de outro lugar**.

---

## POR QUE EU NÃO VOU CORRIGIR AQUI

| Fato | Consequência |
|---|---|
| **O código é `scripts/bundle-electron-main.mjs`** — **do app hospedeiro** | **não é do B-3PO** |
| **A falha é de COMPORTAMENTO, não de ambiente** | **um `skipIf` mentiria** |
| **Ela depende de `resolveDesktopHermesHome`** | **mexer nele muda o app inteiro** |

> **As cinco correções desta metade (r199–r221) eram todas de FIXTURE ou de API mal usada.** **Esta é a primeira que é de comportamento** — **e comportamento do hospedeiro, não do produto.**

**Corrigir exigiria decidir ONDE o entry deve ler o config** — **e essa é uma decisão de arquitetura do app hospedeiro, que a ordem do owner não autoriza.**

---

## O QUE FICA REGISTRADO

| Item | Estado |
|---|---|
| `bundle-electron-main` | **3 de 5 falhando** |
| Natureza | **comportamento do app hospedeiro** (`desktop.electron_flags` não lido do `HERMES_HOME`) |
| Ação | **registrar, não tocar** |
| **`run-electron-builder`** | **o irmão — provavelmente a mesma causa** |

> **E é o par que falta medir**: **`run-electron-builder` (5 testes) é o outro lado do mesmo `electron-builder`** — **e os dois provavelmente falham juntos porque compartilham o caminho de configuração**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do arquivo | **5** |
| **Falhando** | **3** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o teste que acusa o produto, não o ambiente

> **Cinco correções seguidas me acostumaram a ver "falha de teste" como "falha de fixture".**
>
> **Esta não é**: **o teste descreve uma garantia do app** — *"o entry lê o config do mesmo home"* — **e a garantia não está sendo cumprida**.
>
> **O honesto é declarar que a garantia está quebrada**, **não marcar o teste como pulado** — **porque o produto que ele mede é este app, e o defeito é real.**

---

## PRÓXIMA RODADA

**`run-electron-builder`** — **para saber se é a mesma causa** — **e depois `desktop-plugin-install` (54) e `ssh-connection` (89)**.

> **225 rodadas.** **O primeiro vermelho que não é de ambiente, e ele não é do B-3PO.** **A ordem do owner termina no produto; este teste começa no hospedeiro.**
