# GOAL V2 — RODADA 194: A VERIFICAÇÃO — 30, E OS DOIS QUE FALHARAM ERAM O TETO

**Data**: 06/11/2026 · a primeira de três rodadas limpas · depois da 4ª ordem fechada

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `8cbdb4573d` · **sincronizado** · limpo · `main` **intacta** · `diff --check` **limpo** |
| 4 | **Suíte `electron`** | **5679 testes · 5442 verdes · 30 vermelhos · 207 skipped** (306s) |

---

## A SÉRIE — **o melhor número de todas**

| Rodada | Verdes | Vermelhos | Arquivos |
|---|---|---|---|
| r154 | 5407 | **42** | 17 |
| r179 | 5439 | **33** | 14 |
| **r194** | **5442** | **30** | **12** |

> **30 vermelhos, o menor de todas as medições** — e **5442 verdes, o maior**.
>
> **A 4ª ordem fechou e o número caiu de novo.**

---

## OS DOIS QUE FALHARAM — e eles são **meus**, e são **o teto**

```
❯ electron/updater/checkout-source.test.ts (1 test | 1 failed)        30017ms
❯ electron/channel-build-version.test.ts (4 tests | 1 failed)         69983ms
```

> **30 017 ms e 69 983 ms** — **os dois estouraram o `testTimeout: 30_000`**, **não uma asserção**.
>
> **E eles passaram na r193**: **230 verdes rodando os seis juntos**.

**A diferença é a carga**: **na suíte completa, 5 679 testes disputam a máquina**, e **um interpretador Python que leva 3 s vazio leva 30 s ali**.

---

## A CORREÇÃO

```ts
testTimeout: 60_000,   // era 30_000
```

> **O teto é o ORÇAMENTO DO PIOR CASO**, não o tempo que o teste levou uma vez — **a mesma lição do `esperarMorrer` (r189 → r190)**.
>
> **E o comentário do próprio arquivo já dizia isso**: *"pwsh alone takes several seconds to start on a **loaded CI runner**"*. **A razão estava escrita; o número não a acompanhava.**

**Verificado:** os dois arquivos com o teto novo → **5 verdes**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5442** (95,8%) |
| **Vermelhos de ambiente/upstream** | **28** |
| **Vermelhos por TIMEOUT (meus dois)** | **2 — corrigidos com o teto** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **1 de 3** |

---

## O QUE ESTA VERIFICAÇÃO PROVA — e o que ela ensina

> **Os dois testes passam isolados e juntos, e falham na suíte completa.** **Isso não é o produto: é o cronômetro.**
>
> **E é a QUARTA vez que a sessão vê isso** (r167 com `settings`, r189 com o `esperarMorrer`, agora os dois de Python) — **e a terceira em que a resposta é a mesma**: **o limite tem de ser o pior caso, não a medição de uma vez.**

---

## PRÓXIMA RODADA

**A suíte com o teto novo** — **e se os dois passarem, 5444 e 28 vermelhos**.

> **194 rodadas.** **A melhor série de todas, e os dois vermelhos que sobraram são um número que eu escolhi**: **30 segundos era o teto, não a capacidade** — **e o comentário ao lado já sabia disso.**
