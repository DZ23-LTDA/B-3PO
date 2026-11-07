# GOAL V2 — RODADA 176: A GUARDA QUE FALTAVA — O ÚLTIMO CANAL DE PRODUTO ABERTO

**Data**: 06/11/2026 · **2ª ordem do owner** · a lacuna fechada

---

## O QUE FOI FECHADO

```ts
// ANTES — qualquer chamador agenda
ipcMain.handle('hermes:scheduling:bookFromCatalog', async (_e, payload) => { … })

// DEPOIS — r176
exigirAtor(deps.actorOf, 'execute', 'scheduling', async () => { … })
```

> **`execute` e `scheduling`** — **os mesmos que o `hermes:scheduling:book` já usa**.
>
> **Um canal aditivo com guarda mais fraca que o original seria um buraco aberto ao lado de uma porta trancada** — **e era exatamente isso que este era.**

---

## O CUSTO — **três call sites, não um**

| Onde | O que faltava |
|---|---|
| **`erp-ipc.ts`** | `actorOf: () => actorOf()` na chamada |
| **`scheduling-catalog-ipc.test.ts`** | o `actorOf` no `deps` |
| **`permission-coverage-ratchet.test.ts`** | **a lista de dívida** e **o número** |

> **O typecheck pegou os dois primeiros** e **o ratchet pegou o terceiro** — **com duas mensagens diferentes**:
>
> ```
> a lista nao mente: todo nome listado realmente nao tem guarda
> expected [ …(15) ] to have a length of 17 but got 16
> ```
>
> **O ratchet é um teste de DÍVIDA, e ele se recusa a aceitar que a dívida diminua sem que a lista diminua.** **Foi ele que confirmou que a guarda funcionou.**

---

## A SEGUNDA ORDEM — O NÚMERO VERDADEIRO

| Medida | Antes (r175) | **Agora (r176)** |
|---|---|---|
| **Arquivos `-ipc.ts` que consultam a guarda** | **29** | **30** |
| **Dívida congelada** | 17 | **16** |
| **Sem guarda E do produto** | **1** | **0** ✅ |

> **A conta fecha**: **30 + 16 = 46.** **E nenhum dos 16 restantes é do produto.**

---

## OS 16 QUE RESTAM

`agent` · `challenge-window` · `clipboard` · `erp` · `fs` · `git` · `hud` · `lookup` · `mcp-oauth-callback` · `notification` · `pet-overlay` · `plugin-files` · `spellcheck-dictionary` · `startup-latency` · `terminal` · `ui-preferences`.

> **15 são do upstream** (fs, git, terminal, clipboard, notificação, HUD, plugins, i18n).
>
> **1 é o `erp-ipc`** — **o compositor**: ele **não lê nem escreve**, ele **registra os outros 25**, e **cada um destes tem a própria guarda**.

---

## A PROVA — 131 verdes

```
scheduling · erp-mounting · ipc-invariants · permission   →  Tests  131 passed
```

| O que cada um prova |
|---|
| **`scheduling`** | o canal agendador funciona, e agora **com o ator** |
| **`erp-mounting`** | **os 53 registros continuam chamados** — a montagem não quebrou |
| **`ipc-invariants`** | nenhum canal duplicado |
| **`permission`** | **o ratchet: 16 de 46, e a lista não mente** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos alterados | **4** |
| **Call sites que precisaram do ator** | **2** |
| **O ratchet que confirmou** | **1** |
| Testes | **131 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **2ª ordem — canais do produto sem guarda** | **0** ✅ |

---

## A LIÇÃO — o teste que guarda a dívida é o que prova o pagamento

> **O `permission-coverage-ratchet` não é um teste de comportamento**: ele **congela uma lista** e **recusa que ela cresça**.
>
> **Mas ele também recusa que a dívida diminua sem que a lista diminua** — **e é isso que o torna útil como prova**.
>
> **Um teste que só verifica "não piorou" não mostra progresso. Este verifica "não piorou E não mente sobre o que resta"** — **e a segunda metade foi o que confirmou a r176.**

---

## AS SETE ORDENS — O ESTADO

| # | Ordem | Estado |
|---|---|---|
| **1** | Proteger e reconciliar o estado | ✅ r1–r40 |
| **2** | **As lacunas de autorização IPC** | ✅ **r60–r176 — 0 do produto** |
| **3** | O CRM órfão e as fontes de verdade | ✅ r133–r149 |
| **4** | Inicialização e atualização | ⚠️ **B5** |
| **5** | Navegação contextual | ✅ **r174** |
| **6** | Sofia | ✅ r100–r132 |
| **7** | Orquestrador e negócios | ✅ **r174, 8 ligações + o ciclo** |

> **A 2ª ordem está fechada.** **Ela levou 116 rodadas** — **e a última lacuna estava escondida atrás de um contador errado (r175)**.

---

## PRÓXIMA RODADA

**A verificação** — as rodadas 175–176 mexeram na guarda e no ratchet, **o teste que congela a dívida**.

> **176 rodadas.** **O canal que a r175 descobriu sem guarda está fechado** — e **quem confirmou foi o teste que guarda a lista da dívida**, **recusando que ela diminuísse sozinha**. **A dívida do produto em autorização IPC é zero.**
