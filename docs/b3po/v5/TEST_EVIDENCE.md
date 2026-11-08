---
tipo: evidencia-de-teste
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# TEST_EVIDENCE — as falhas históricas, pelo erro real

> G6 §87: *"Falhas históricas: reproduzir e classificar as 27 falhas desktop; **não aceitar
> automaticamente como inocentes** sem entender impacto."*
>
> Este documento faz o que eu vinha afirmando sem medir: **leu a mensagem de erro de cada falha**.

## 1. O número muda com o método — remedido na r49 com JSON

| Modo | Resultado |
|---|---|
| Suite completa (`--reporter=json`) | **30 failed · 19.076 passed · 229 skipped** (19.335 testes) |
| Dos 19 arquivos com falha, **13 passam isolados** | 30 − 13 = **17 falhas reais** |
| Testes que falham isolados | **17** — exatamente os mesmos de antes |

**O baseline não mudou: 17 falhas reais.** O que mudou foi o número **sob carga** (27 → 30), e a causa é
o próprio crescimento da suite (19.335 testes): mais concorrência, mais flaky.

### O que a r49 encontrou de novo

| Arquivo | Sob carga | Isolado |
|---|---|---|
| `audit-store.test.ts` | 1 falha | **13 passed** |
| `channel-build-version.test.ts` | 1 falha | **4 passed** |
| `desktop-installation.test.ts` | 1 falha | **13 passed** |
| `linux-nvidia-egl-recovery.native.test.ts` | 1 falha | **4 passed** |

**Flaky sob carga, não regressão.** E os 6 de UI que já constavam como flaky: **todos passam isolados**
(7, 6, 5, 8, 1 e 8 testes).

### A única falha que era **minha**

`scripts/i18n-keys.test.mjs` — as 5 chaves `connectorsReadiness` entraram no catálogo na r15 e o snapshot
`locales/_keys.desktop.json` **nunca foi regerado**. O teste falhava desde então, por 33 rodadas, porque
eu rodava `vitest src/i18n/` e não `scripts/i18n-keys.test.mjs`.

**Corrigido em `6cf7743bb4`** — 125 testes de i18n verdes.

> **"Eu rodei o teste de i18n e passou"** era verdade sobre `src/i18n/` e falso sobre o repositório.
> **Escopo do teste não é escopo da mudança.**

## 2. Classificação, erro por erro## 2. Classificação, erro por erro

### Ambiente de empacotamento — não é produto

| Arquivo | Erro medido | Causa |
|---|---|---|
| `side-by-side.windows.test.mjs` | `Cannot find module '...\apps\desktop\vitest'` | o harness importa `vitest` por caminho que não resolve |
| `after-pack-digests.test.mjs` (2) | `Missing packaged app.asar: …\after-pack-digests-*` | exige um app **empacotado** de verdade |
| `commit-bundles.windows.test.mjs` (1) | `ERR_MODULE_NOT_FOUND` em `…\commit-msi*` | idem |
| `run-electron-builder.test.mjs` (1) | `Cannot consume packaging inputs …\build*` | idem |
| `stage-native-deps.test.mjs` (1) | `/desktop packaging continues/` | toolchain **Linux HUD** ausente |

### Dependência externa — não é produto

| Arquivo | Erro medido | Causa |
|---|---|---|
| `ssh-connection.test.ts` (2) | `SSH error connecting to me@box: …` | exige **host SSH real** |
| `payload-sign-cache.test.mjs` (2) | `Get-AuthenticodeSignature → { Status: '', Type: '' }` | exige binário **assinado** (`EXT-1`) |
| `linux-nvidia-egl-recovery.native.test.ts` (1) | — | exige **GPU NVIDIA Linux** |

### 🔴 Retratação: eu vinha chamando as 3 de plugin-install de "EPERM symlink"

**Só 1 é symlink.** As outras **2** são:

```
AssertionError: expected 'reviewed\r\n' to be 'reviewed\n'
```

O teste cria um repositório git e faz checkout; o **`core.autocrlf` da máquina** converte LF em CRLF,
e o arquivo instalado chega com `\r\n`. **É config de git do ambiente, não código** — mas **eu estava
rotulando errado**, e o rótulo escondia a causa real.

| Arquivo | Erro medido | Causa |
|---|---|---|
| `desktop-plugin-install` (1) | `EPERM: operation not permitted, symlink` | privilégio de symlink no Windows |
| `desktop-plugin-install` (2) | `'reviewed\r\n'` vs `'reviewed\n'` | **`core.autocrlf` do git na máquina** |

### 🟡 Um caso que eu **não** classifiquei

| Arquivo | Erro medido |
|---|---|
| `bundle-electron-main.test.mjs` (3) | `expected { relaunched: ['.', '--ozone-platform=x11'] }` · recebido `--ozone-platform=wayland` |

**O que já sei:**

- as funções puras estão **corretas** — 3 testes isolados provam: o parser lê `electron_flags` do YAML,
  `wslgLaunchArgs` respeita o flag explícito, e sem ele escolhe wayland;
- `entry.ts` **já implementa** a precedência: `explicitOzonePlatform(electronFlags)` vence a detecção;
- o resolvedor de home devolve `env.HERMES_HOME` **antes** de qualquer `directoryExists`;
- `os.homedir()` não falha com env restrito.

**O que não sei**: por que o **entry empacotado** não enxerga o config que o teste escreve.

**Fica como `NOT_CLASSIFIED`** — não vou inventar uma causa. O que muda é: **não é "mais um erro de
empacotamento"**, é uma divergência entre o caminho puro (correto) e o caminho do bundle.

### Falhas só sob carga (10) — não reproduzem isoladas

`gateway-background-reconnect` (2) · `browser-hints` (1) · `floating-panes` (1) ·
`terminal-ownership` (1) · `use-keybinds-browser` (2) · `use-composer-submit` (1) ·
e as 2 de `bundle-electron-main` que aparecem na suíte completa mas não isoladas.

**Nenhuma dessas foi declarada "inocente"**: isoladas, passam; sob carga, falham por tempo. O
instrumento é que muda.

## 3. O que este documento corrige

| Eu dizia | A medição diz |
|---|---|
| "27 falhas, todas de empacotamento/ambiente" | **17** isoladas; 10 são de carga |
| "3 de plugin-install são EPERM de symlink" | **1** é symlink; **2** são `core.autocrlf` |
| "as 27 são históricas e conhecidas" | **3** (`bundle-electron-main`) **não estão classificadas** |

## 4. Como reproduzir

```bash
cd apps/desktop
npx vitest run \
  scripts/side-by-side.windows.test.mjs scripts/stage-native-deps.test.mjs \
  electron/ssh-connection.test.ts scripts/run-electron-builder.test.mjs \
  scripts/bundle-electron-main.test.mjs scripts/commit-bundles.windows.test.mjs \
  scripts/after-pack-digests.test.mjs scripts/payload-sign-cache.test.mjs \
  electron/linux-nvidia-egl-recovery.native.test.ts electron/desktop-plugin-install.test.ts \
  src/store/gateway-background-reconnect.test.ts src/lib/keybinds/browser-hints.test.tsx \
  src/components/pane-shell/tree/renderer/floating-panes.test.tsx \
  src/app/right-sidebar/terminal/terminal-ownership.test.ts \
  src/app/hooks/use-keybinds-browser.test.tsx \
  src/app/chat/composer/hooks/use-composer-submit.send-then-close.test.tsx
```

Ambiente: Windows 11, Node do ambiente do projeto, sem `HERMES_HOME` especial.
Resultado medido: **17 failed · 206 passed · 6 skipped**.

## 5. `bundle-electron-main` (3) — **CLASSIFICADO na r20: ambiente, não produto**

### O sintoma

```
expected { relaunched: ['.', '--ozone-platform=x11'] }
received --ozone-platform=wayland
```

### Como foi descoberto

A r19 tentou instrumentar o preload e falhou (dois falsos achados por truncamento e por patch em
import estático). A r20 instrumentou **dentro de `configuredElectronFlags`**, no fonte — que é o que o
teste empacota. A primeira linha já mostrou tudo:

```
[dbg] FALHOU lendo config em
  /Users/lmpra/AppData/Local/Temp/vitest-Okz7t2/hermes-electron-entry-mc7dVx/C:\Users\lmpra\AppData\Local\Temp\vitest-Okz7t2\hermes-electron-entry-mc7dVx\home-uVUo20
  ENOENT
```

### A causa

O `home` chega **mutilado**: um prefixo POSIX colado na frente de um caminho **Windows**.

O resolvedor escolhe a biblioteca de caminho pela plataforma:

```js
const paths = platform === 'win32' ? path.win32 : path.posix
```

E o teste faz o processo filho **fingir Linux**:

```js
Object.defineProperty(process, 'platform', { value: 'linux' })
```

Com `platform='linux'`, `path.posix.resolve('C:\Users\…')` trata `C:` como **segmento relativo** e
prefixa o cwd (`/Users/lmpra/…`) — em vez de devolver o caminho absoluto do Windows.

**O produto está correto**: numa máquina Linux real, `HOME` é POSIX e `path.posix` resolve certo.
**O teste mente sobre a plataforma mantendo caminhos do Windows.**

### É a própria regra do repositório, violada pelo teste

> *"host-specific behaviour is tested on that host with `@pytest.mark.platforms(...)`, **never by faking
> `sys.platform`**"* — AGENTS.md

Estes 3 testes fazem exatamente o que a regra proíbe: fingem `process.platform` para exercitar
comportamento de Linux sobre um sistema de arquivos Windows.

### O que fica

| Item | Estado |
|---|---|
| As funções puras (`wslgLaunchArgs`, parser) | **corretas** — 3 testes isolados provam |
| O `entry.ts` | **correto** — implementa a precedência |
| O teste | **não roda em Windows** — falso vermelho permanente |
| Defeito de produto | **nenhum** |

**Correção proposta** (não aplicada — afeta CI): marcar os 3 como Linux-only, como a regra manda. Não
apliquei porque *desabilitar teste* exige decisão de quem cuida do CI, e porque a alternativa correta
é o teste usar um `home` **POSIX** quando finge POSIX.

## 6. O que **foi** confirmado depois da primeira versão deste documento

**`core.autocrlf` desta máquina: `true`** (medido com `git config --get core.autocrlf`).

Isso fecha a causa das 2 falhas de `desktop-plugin-install`: o teste cria um repositório git e faz
checkout; com `autocrlf=true` o arquivo sai com `\r\n` e a asserção espera `\n`.

E, isolado, `desktop-plugin-install` mostra **3 falhas** — as 2 de CRLF **e** a de `EPERM` de symlink.
**Nenhuma das três é defeito de código**: uma é config de git, uma é privilégio do Windows.

## 7. O placar honesto

| Categoria | Nº | É defeito de produto? |
|---|---:|---|
| Empacotamento ausente (asar/ZIP/build) | 6 | não |
| Dependência externa (SSH, certificado, GPU Linux) | 5 | não |
| Config do git na máquina (`autocrlf`) | 2 | não |
| Privilégio do Windows (symlink) | 1 | não |
| Teste que finge Linux sobre caminhos Windows | 3 | não |
| Só sob carga | 10 | não |

**Nenhuma das 27 é defeito de produto comprovado. Mas 3 não estão classificadas, e eu não as chamo de
inocentes.**
