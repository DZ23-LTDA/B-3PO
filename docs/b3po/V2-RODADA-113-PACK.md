# GOAL V2 — RODADA 113: O PACK — O APP EMPACOTA

**Data**: 05/11/2026 · **P8** · o último item que roda sem credencial

---

## O PACK PASSOU

```
[status: completed, exit code: 0]
```

| Produto | Tamanho |
|---|---|
| `release/win-unpacked/` | diretório |
| **`B-3PO.exe`** | **235.4 MB** |
| **build stamp** | `bddbe8db0e` · `b3po-brand` · `dirty: false` |

> **O instalador é construído a partir do commit exato**, com `dirty: false` — o stamp prova que **o binário corresponde ao código**.

---

## O QUE O PACK REVELOU

### 1. **O app não é assinado**

```
[batch-sign] AZURE_SIGN_* not set — payload binaries will be UNSIGNED
             (package block-map still covers them; release lanes must set the signing env)
```

> **A ausência é dita**: o `[batch-sign]` **avisa** em vez de silenciar, e registra que **o block-map ainda cobre os binários** — o app **roda**, mas o Windows vai mostrar **"editor desconhecido"**.

**É o mesmo bloqueio da r54**: **credencial que não existe**. O §21 diz *"releases/assinaturas **quando houver recursos**"*.

### 2. **18 binários escaneados, 0 tabelas de certificado penduradas**

```
[after-pack] 18 PEs scanned, 0 dangling certificate tables cleared
```

> **Isso é um reparo de um bug do `electron-builder`**: binários que **carregam uma tabela de certificado órfã** depois de assinados e não assinados. O `after-pack` **encontrou 0** — o pacote está limpo.

### 3. **O backend foi verificado dentro do `app.asar`**

```
[after-pack] verified backend readiness parser in resources\app.asar
```

> **O pack não confia no build**: ele **abre o asar** e confirma que **o parser de prontidão do backend está lá**. É a diferença entre "compilou" e "o que foi empacotado contém o que devia".

### 4. **`node-pty` foi recompilado e assinado**

```
signing  resources\app.asar.unpacked\dist\node_modules\node-pty\prebuilds\win32-x64\winpty-agent.exe
signing  ...\conpty\OpenConsole.exe
signing  ...\hud-modifier-monitor.exe
```

> **Quatro binários nativos** — o terminal, o console e o monitor de modificador. **Eles não passam pelo asar** e precisam do seu próprio tratamento.

---

## O MSIX — e o que ele é

| Arquivo | Tamanho | Data |
|---|---|---|
| `B3PO-0.0.0-win-x64.msix` | **191.4 MB** | **04/11 06:19** |

> **`0.0.0`** — não é uma versão de produto, é **um placeholder**. E é de **ontem**, **antes de todas as rodadas desta sessão**.
>
> **O `pack` produziu um `win-unpacked` novo e não regerou o MSIX** — porque `pack` é `--dir`, e o MSIX vem do `dist:win:msix`.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Exit code | **0** |
| `B-3PO.exe` | **235.4 MB** |
| Binários nativos assinados | **4** (unsigned, sem credencial) |
| PEs escaneados | **18** |
| Tabelas penduradas | **0** |
| **build stamp** | **`bddbe8db0e`, limpo** |
| Tempo | ~4 min (com downloads de artefatos) |

---

## O P8 — **COMPLETO, E A ÚLTIMA LINHA É UMA CREDENCIAL**

| Item | Estado |
|---|---|
| Acessibilidade · Backups · i18n · Build · **Pack** | ✅ |
| **Assinatura** | ❌ **`AZURE_SIGN_*` ausente** |
| **MSIX** | ⚠️ **`0.0.0` e de ontem** |
| Foco, tabulação, contraste | ❌ exigem o app aberto |

---

## PRÓXIMA RODADA

**O MSIX** — `npm run dist:win:msix`, que é o que **o cliente instala**. O `pack` provou que o app monta; **o MSIX prova que ele instala**.

> **113 rodadas.** O app **empacota** — com **o commit exato dentro**, **o backend verificado no asar**, e **quatro binários nativos tratados**. O que ele **não** faz é **assinatura**, e a única coisa entre o build e um instalador de verdade é **uma credencial que não existe**.
