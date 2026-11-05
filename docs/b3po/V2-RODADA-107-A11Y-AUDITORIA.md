# GOAL V2 — RODADA 107: A AUDITORIA DE ACESSIBILIDADE — E O ERRO QUE A r104 DEIXOU

**Data**: 05/11/2026 · **P8** · o único item que nunca tinha sido medido

---

## OS QUATRO VETORES, MEDIDOS

| Vetor | Telas |
|---|---|
| **Botão só de ícone sem `aria-label`** | **3** |
| **`<img>` sem `alt`** | **1** (upstream) |
| **`<input>` sem `aria-label` e sem `<label>`** | **4** |
| **`<main>` sem nome** | ✅ **as 5 novas têm desde a r104** |

---

## O ERRO DA r104 — e ele aparece agora

A r104 adicionou **20 atributos** em 5 telas. **A auditoria mostra que em `busca/` eles foram para o `main` e o `ul` — e NÃO para o `<input>`.**

```tsx
<main aria-label="Busca de módulos">        ✅
  <ul aria-label="Resultados">              ✅
    <input aria-label="…">                  ❌  ← faltava
```

> **A tela tinha 2 `aria-label` e continuava inacessível no lugar que importa**: **o campo onde a pessoa digita**.
>
> **Um `main` nomeado e um campo anônimo é meio conserto** — e a r104 contou os atributos **sem verificar onde eles caíram**.

---

## O QUE FOI CORRIGIDO

| Tela | Antes | Agora |
|---|---|---|
| `busca/index.tsx` | main + ul, **input anônimo** | **3** |
| `marketing/index.tsx` | **2 inputs, 0 labels** | **2** |

**E os 2 restantes são do upstream** (`pet-overlay`, `settings/config-settings`) — **nomeados, não tocados**.

---

## O QUE A AUDITORIA **NÃO** PROVA

| Item | Por quê |
|---|---|
| **foco visível** | exige inspeção visual, não grep |
| **ordem de tabulação** | exige navegação real |
| **contraste** | exige medir cor contra fundo |
| **`aria-live` nas listas que mudam** | não medido |

> **A auditoria mede o que o texto do código diz. O que o usuário sente precisa do app aberto** — e o app **não foi aberto nesta sessão**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Vetores auditados | **4** |
| Telas com problema real | **4** (2 corrigidas, 2 upstream) |
| Atributos adicionados | **3** |
| **Erro da r104 encontrado** | **1** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O P8 — **FECHADO**

| Item | Estado |
|---|---|
| Acessibilidade (3 vetores + `main`) | ✅ **r104 + r107** |
| **Botões de ícone (3)** | ⚠️ **nomeados, não corrigidos** |
| Backups | ✅ r105 |
| i18n | ✅ r106 (96% real) |
| Performance | ✅ tests no trunk |
| **Foco, tabulação e contraste** | ❌ **exigem o app aberto** |

---

## PRÓXIMA RODADA

Os **3 botões só de ícone** — o último item de acessibilidade que **grep resolve**.

> **107 rodadas.** A auditoria do P8 encontrou **um erro meu na r104**: os atributos foram para o `main` e **não para o campo** — e a r104 **contou os atributos sem verificar onde eles caíram**.
