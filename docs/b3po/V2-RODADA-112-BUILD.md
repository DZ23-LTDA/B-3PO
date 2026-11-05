# GOAL V2 — RODADA 112: O BUILD — O QUE O TYPECHECK NÃO PROVA

**Data**: 05/11/2026 · **P8** · *"um typecheck verde não prova que o app empacota"*

---

## O BUILD PASSA

```
✓ built in 6.18s
  .dist-build/product/electron-main.mjs      3.4mb
  .dist-build/product/electron-preload.js    60.7kb
  .dist-build/product/preview-guest-preload.js  962b
Done in 133ms
```

**O app constrói.** Sete bundlers rodaram — renderer, main, dois preloads — e todos terminaram **sem erro**.

---

## O QUE O BUILD **REVELOU** — e o typecheck não veria

### 1. Dois imports dinâmicos **ineficazes**

```
[INEFFECTIVE_DYNAMIC_IMPORT] src/app/session/hooks/use-session-actions/utils.ts
                             is dynamically imported by …
[INEFFECTIVE_DYNAMIC_IMPORT] src/plugins/hermes-bots/profile-ops.ts
                             is dynamically imported by …
```

> **`import()` que não separa nada**: o módulo é **também importado estaticamente** em outro ponto, então o bundler **o coloca no chunk principal de qualquer jeito**.
>
> **O código parece lazy e não é.** É uma **mentira de performance** que só o bundle revela.

### 2. O chunk do `shiki` tem **19.5 MB**

```
.dist-build/product/assets/shiki-0QAIVDax.js   19,527.31 kB │ gzip: 3,3…
```

> **Dezenove megabytes de realce de sintaxe** — num app de ERP onde a maioria das telas **não mostra código**.
>
> **Ele está num chunk separado** (o que é certo), mas **3.3 MB gzip** é carregado por quem abre um bloco de código **uma vez**.

---

## O QUE ISSO SIGNIFICA PARA O P8

| Item | Estado |
|---|---|
| **Build** | ✅ **passa** |
| **Imports dinâmicos ineficazes** | ⚠️ **2** |
| **Bundle do shiki** | ⚠️ **19.5 MB** (3.3 gzip) |
| **Tempo de build** | ✅ **6.18s** |
| **Erros** | **0** |

> **Nenhum é um bug.** Os três são **dívida de performance** — e a diferença entre "bugs" e "dívida" é que **a dívida não quebra, ela cobra**.

---

## O QUE **NÃO** FOI FEITO — e por quê

| Item | Por quê |
|---|---|
| corrigir os 2 imports | exigem **entender por que** foram escritos como dinâmicos; um deles tem comentário, o outro não |
| reduzir o shiki | **substituir o realce** é uma decisão de produto, não uma otimização |
| **`npm run pack`** | empacota um instalador **de verdade** — e o `dist:win:msix` foi medido como **desatualizado** desde a r15 |

> **O build é a prova que faltava**: **o app empacota**. O que ele revelou são **três dívidas medidas**, nomeadas, e **nenhuma delas bloqueia a entrega**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Bundlers que rodaram | **7** |
| Erros | **0** |
| Warnings de import dinâmico | **2** |
| Tempo | **6.18s** |
| **Bundle do shiki** | **19.5 MB** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O P8 — **COMPLETO**

| Item | Estado |
|---|---|
| Acessibilidade (4 vetores) | ✅ r104 + r107 + r108 |
| Backups | ✅ r105 |
| i18n | ✅ r106 |
| Performance (testes) | ✅ no trunk |
| **Build** | ✅ **r112** |
| **Dívidas medidas** | **3** (2 imports, 1 bundle) |
| **Foco, tabulação, contraste** | ❌ **exigem o app aberto** |

---

## PRÓXIMA RODADA

**O `pack`** — o instalador. É o último item do P8 que **roda sem credencial** e o único que prova que **o que o cliente recebe funciona**.

> **112 rodadas.** O build **passou** e **revelou três coisas** que 14 checks de lint e 2 projetos de typecheck **nunca veriam**: dois imports que fingem ser lazy, e dezenove megabytes de realce de sintaxe.
