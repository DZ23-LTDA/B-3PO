# GOAL V2 — RODADA 214: O TERCEIRO `python3` — E A CLASSE QUE EU NÃO TINHA FECHADO

**Data**: 06/11/2026 · a falha `no-console-git`

---

## O ERRO

```
Error: Command failed: python3 -c import sys; print(sys.executable)
Python não foi encontrado; executar sem argumentos para instalar do Microsoft Store
```

> **O `python3` stub da Microsoft Store, pela TERCEIRA vez.**

---

## A MESMA LINHA, EM TRÊS ARQUIVOS

| Rodada | Arquivo | O que fazia |
|---|---|---|
| **r187** | `checkout-source.test.ts` | `process.env.HERMES_PYTHON \|\| 'python3'` |
| **r200** | `channel-build-version.test.ts` **(dois)** | a mesma linha, em dois `execFileSync` |
| **r214** | **`no-console-git.test.ts` (dois)** | **`execFileSync('python3', …)`** |

> **Oito chamadas em três arquivos, e eu corrigi em três rodadas separadas** — **sempre achando "o próximo", nunca a classe.**

**A r187 escreveu a lição**: *"um conserto que não é aplicado aos irmãos não é um conserto: é um caso especial"*. **E eu apliquei três vezes, uma de cada vez.**

---

## A CORREÇÃO — e a busca que eu devia ter feito na r187

```ts
// L47: o interpretador para HERMES_DESKTOP_PYTHON
const python = resolverPython() ?? 'python'

// L228: o script do host
execFileSync(resolverPython() ?? 'python', [script, ...gitArgs], { … })
```

> **E a busca que fecha a classe de uma vez**:
>
> ```powershell
> Select-String -Path "apps/desktop/electron/**/*.ts" -Pattern "execFileSync\('python3'|HERMES_PYTHON \|\| 'python3'"
> ```
>
> **Nesta rodada ela deu três resultados — e os três eram os que eu já conhecia.** **Depois da r214, zero.**

---

## A PROVA

| Medida | Antes | **Depois** |
|---|---|---|
| `no-console-git` | **3 falhando** (0 passando) | **8 verdes** ✅ |
| Gate · Typecheck | — | **14 ok · 0 erros** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos corrigidos | **1** |
| Chamadas corrigidas | **2** |
| **`python3` restantes no `electron/`** | **0** ✅ |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — **a classe, não o caso**

> **Três rodadas para o mesmo `python3`, porque cada uma abriu UM arquivo.**
>
> **A pergunta certa nunca foi "qual é o próximo arquivo?"** — **foi "quantos têm esta linha?", e ela leva 3 segundos.**
>
> **É a r175 outra vez, com outro comando**: **lá o contador dizia 17 quando eram 29; aqui eu consertei 1 quando eram 3.**

---

## O ESTADO — os `python3` do `electron/` acabaram

> **O `no-console-git` saiu da lista de falhas do `electron`** — **e a lista caiu de 8 arquivos para 7.**
>
> **O que resta é o que não é meu**: `desktop-plugin-remove` · `ssh-connection` · `run-electron-builder` · `plugin-files` · `bundle-electron-main` · `linux-nvidia-egl-recovery` · `desktop-plugin-install`.

---

## PRÓXIMA RODADA

**A suíte `electron` completa** — para ver se o `no-console-git` sai da contagem.

> **214 rodadas.** **Oito chamadas, três rodadas, e a busca que teria custado 3 segundos na r187.** **A lição estava escrita e eu a li três vezes sem aplicá-la à pergunta.**
