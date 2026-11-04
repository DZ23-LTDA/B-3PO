# DESKTOP-RELEASE-REPORT — B-3PO (Windows)

## Artefatos

| Arquivo | Tamanho | Observação |
|---|---|---|
| `apps/desktop/release/win-unpacked/B-3PO.exe` | ~235 MB | portátil, abre direto |
| `apps/desktop/release/B3PO-0.0.0-win-x64.msix` | ~191 MB | instalador do Windows |

Hashes oficiais em `ARTIFACT-MANIFEST.md`. Os artefatos foram gerados a partir do commit
`2db0ab4e`; depois disso o código avançou (i18n, mobile), então **é preciso rebuild** para publicar.

## O que foi verificado

- identidade do executável: `ProductName` / `CompanyName` = B-3PO / DZ23 (VersionInfo lido do `.exe`);
- janela abre com título B-3PO e interface em português;
- instalador MSIX gera pacote instalável (não assinado);
- histórico completo em `INSTALLER-TEST-REPORT.md` e `DESKTOP-AUDIT.md`.

## Limitações declaradas

| Item | Estado |
|---|---|
| assinatura de código | 🔒 BLOCKED — exige certificado comercial (CN=DZ23-LTDA) |
| SmartScreen | aviso esperado em app não assinado |
| macOS / Linux | não construídos nesta máquina (macOS exige Mac; Linux sem container no momento) |
| atualização automática | existe no upstream; não validada ponta a ponta com artefato assinado |

## Próximo passo para release

1. rebuild a partir do HEAD atual (`npm run dist:win` em `apps/desktop`);
2. atualizar hashes em `ARTIFACT-MANIFEST.md`;
3. quando o certificado existir, assinar e registrar aqui o resultado real da assinatura.

## Rodada 57 — rebuild do MSIX Windows (e o que ele NÃO prova)

Reconstruí o pacote a partir do commit atual `c33ed497`:

| Campo | Valor |
|---|---|
| arquivo | `apps/desktop/release/B3PO-0.0.0-win-x64.msix` |
| tamanho | 190,94 MB |
| build | 2026-11-03 13:26 |
| sha256 | `d8d88a307c3cd3d0def3a250ca36fc9b903284114ea90ebcbe240fb703d40249` |
| assinatura | **NotSigned** (`Get-AuthenticodeSignature`), builder: "AppX/MSIX package is not signed — Windows Store only build" |

### O que NÃO está provado (e eu não vou fingir que está)

1. **O executável do pacote não roda solto.** `release/win-unpacked/B-3PO.exe` sai imediatamente com
   **código 0**, sem stdout, sem stderr, sem janela, sem processo filho. Rodado duas vezes, com log
   redirecionado: mesmo resultado. Portanto **"instalação verificada" é FALSO** para Windows — o build
   existe, o app não foi validado rodando a partir dele.
2. **NSIS não é alvo admitido.** O passo de preparo do próprio projeto recusa:
   `Argument is not admitted by prepared packaging: nsis; run preparation again`. Windows distribui por
   MSIX, por desenho — não é bug meu, mas também significa que não há instalador clássico para testar.
3. **MSIX sem assinatura não instala** em máquina sem modo desenvolvedor: `Add-AppxPackage` recusaria.

### Como desbloquear

- certificado de assinatura (authenticode) para o MSIX fora da Store, **ou**
- testar a instalação em máquina com Developer Mode e pacote assinado por certificado de teste.

Marcado **BLOCKED_BY_EXTERNAL_DEPENDENCY** (certificado). O artefato gerado é real e o hash é
comprovável; a *instalação* não.

## Rodada 58 — envio de mensagem pelo celular: contrato descoberto, não implementado

Procurei o endpoint REST de envio de mensagem para completar a conversa no mobile. **Não existe**:
nenhuma rota `POST` de sessões/chat recebe prompt (verificado em `hermes_cli/web_routers/*.py`).

O caminho real é o **daemon do gateway**, com ticket de uso único:

```
POST /api/auth/ws-ticket          -> ticket (dashboard_auth/routes.py:573)
WS   /api/ws  subprotocolos        hermes-gateway-v1
                                 + hermes-gateway-ticket.<ticket>
                                    (web_server_boundary.py:157)
```

**Não implementei por adivinhação.** O formato do frame de entrada não está evidente no código que li
(`chat_ws.py` mostra o lado servidor→cliente e o `resume`), e inventar frame seria fabricar resultado.
Próximo passo concreto: ler `gateway_client.py` e o handler do daemon até achar o frame de `input`, com
gravação do tráfego real por `adb logcat` para conferir.

### Armadilha descoberta no rebuild: cache do electron-builder dentro do checkout

O build baixou `7zip-win-x64.tar.gz` e `icons-bundle.tar.gz` para
`.cache/desktop-inputs/packager/builder/…` — **dentro** do checkout. O gate `profile-archives`
(`scripts/ci/check_profile_archive_boundary.py`) recusa **qualquer** `.tar.gz`/`.tgz` na árvore, sem
olhar `.gitignore`, e o gate foi a `FAILED: profile-archives`.

Não é falso positivo: a regra existe para impedir que arquivo gerado entre no contexto de build.
O certo é o cache ficar fora do checkout. Removi `.cache/desktop-inputs` (regenerável) e passei a usar
`%TEMP%\b3po-electron-builder-cache` como cache externo.

**Regra para os próximos builds:**

```powershell
$env:ELECTRON_BUILDER_CACHE = "$env:TEMP\b3po-electron-builder-cache"
npm run dist:win
```

Gate voltou a **14 checks ok**.

## Rodada 66 — CORREÇÃO: o app Windows abre. O "sai com código 0" era o meu ambiente.

### O que eu afirmei errado antes

Em rodadas anteriores registrei que `release/win-unpacked/B-3PO.exe` "sai com código 0 e não valida a
instalação". **Isso estava errado.** A causa era uma variável de ambiente da minha própria sessão:

```
ELECTRON_RUN_AS_NODE=1
```

Com ela, **qualquer** binário Electron se comporta como `node` puro. Foi por isso que:

- `B-3PO.exe --help` imprimiu o *usage* do Node;
- `B-3PO.exe --version` respondeu `v24.22.0` (versão do Node, não do Electron);
- executar sem argumentos terminou com código 0 sem janela.

Cheguei a concluir, nesta mesma rodada, que o exe "era um binário Node e não Electron". **Também estava
errado** — o arquivo tem 235,4 MB, exatamente o tamanho do `node_modules/electron/dist/electron.exe`.
Corrigi o diagnóstico antes de escrever relatório.

### O que acontece de verdade (comprovado)

Sem `ELECTRON_RUN_AS_NODE`:

```
processo raiz vivo: False        (o launcher termina e entrega ao processo principal)
B-3PO     pid 35380   janela "B-3PO"   128 MB
electron  pid 47112   janela "B-3PO"   122 MB
+ 2 processos auxiliares (GPU/utility)
```

Ou seja: **o aplicativo empacotado abre e cria a própria janela**, com árvore de processos correta
(main + renderer + auxiliares). Evidência: `docs/b3po/evidence/desktop-app-window.png`.

### O que ainda falta (bloqueio real, agora bem descrito)

A janela abre no splash e fica em **`CONNECTING ▒`**: o renderer não alcança o backend. No formato
empacotado não há sidecar `hermes` configurado neste ambiente, e o app espera o gateway para sair do
boot. Isso substitui o diagnóstico anterior ("não abre") por um bloqueio concreto e testável:

1. definir no pacote como o app localiza/inicia o runtime (`hermes serve`) — caminho do sidecar;
2. ou aceitar `HERMES_DASHBOARD_URL` + token no primeiro boot;
3. repetir esta captura e exigir a Home renderizada antes de chamar a instalação de validada.

### Regra que tiro disso

Antes de declarar um binário "quebrado", conferir o ambiente do shell
(`Get-ChildItem Env: | Where-Object Name -match 'ELECTRON'`). `ELECTRON_RUN_AS_NODE` e
`ELECTRON_NO_ATTACH_CONSOLE` mudam o comportamento de qualquer app Electron e já me custaram um
diagnóstico falso.

## Rodada 67 — o app empacotado renderiza a tela de setup B-3PO (não é mais CONNECTING sem saída)

Continuando a correção da rodada 66: apontei o app para o checkout com a variável que o próprio main
honra (lida em `resolveHermesBackend`, `apps/desktop/electron/main.ts:4837`):

```
HERMES_DESKTOP_HERMES_ROOT = D:\IA-Workspace\Deepseek\projects\C-3PO BOT
HERMES_HOME                = %TEMP%\b3po-desktop-home
(e sem ELECTRON_RUN_AS_NODE)
```

Resultado: a janela **sai do splash** e mostra a tela de primeiro uso, com identidade própria:

- mascote **B-3PO** no cartão (não é emoji: é o asset do catálogo);
- título **“Set up B-3PO”**;
- texto: “Connect this app to a B-3PO runtime you already run, or install it locally on this computer.”;
- dois caminhos reais: **“Connect to existing B-3PO runtime”** (backend remoto com token de sessão) e
  **“Install B-3PO locally”** (baixa o runtime, cria o ambiente Python e sobe o backend);
- rodapé: “Will install to `…\hermes-agent`” — caminho real, derivado de `HERMES_HOME`.

Evidências: `desktop-app-com-backend.png` (2302×1385) e `desktop-connect-form.png` (1152×1385, mais
legível). Comparar com `desktop-app-window.png` (rodada 66), que mostrava só `CONNECTING ▒`.

### O que NÃO foi validado

O clique nos cartões não foi registrado: `SetForegroundWindow` é recusado nesta sessão, então os cliques
sintéticos (`mouse_event`) e o `SendKeys` não chegam ao renderer com foco real. Portanto:

| Passo | Estado |
|---|---|
| app abre e renderiza | ✅ comprovado |
| tela de setup em B-3PO, com mascote | ✅ comprovado |
| escolher “Connect to existing” e preencher URL + token | ❌ não validado (foco de janela bloqueado aqui) |
| Home com bots reais carregados no app empacotado | ❌ não validado |

Para validar os dois últimos passos, o caminho é: (a) pré-semear a conexão no arquivo de configuração
de userData do app; ou (b) rodar em uma sessão interativa com foco de janela permitido; ou (c) usar
`HERMES_DESKTOP_HERMES_ROOT` com um `hermes` já instalado e deixar o app subir o backend sozinho.
Não vou declarar “instalação validada” sem ver a Home com dados.

## Rodada 68 — A HOME REAL no app empacotado (e o idioma errado, com a causa)

### Home carregada, comprovada

Encontrei no `main` as variáveis que faltavam e o app empacotado virou **cliente remoto** do servidor
que já estava rodando:

```
HERMES_DESKTOP_REMOTE_URL   = http://127.0.0.1:9119
HERMES_DESKTOP_REMOTE_TOKEN = <token da sessão>
HERMES_DESKTOP_USER_DATA_DIR= %TEMP%\b3po-desktop-ud   (perfil limpo)
(sem ELECTRON_RUN_AS_NODE)
```

A janela abre na **Home do produto**, não no setup:

- wordmark **B-3PO** grande no centro;
- sidebar em pt-BR: CONVERSAS / BOTS, “Nova conversa”, “Capacidades”, “Mensageria”, “Artefatos”,
  “Tarefas agendadas”, “Pesquisar conversas…”, FIXADAS;
- **as conversas reais do servidor**: “Processamento de envio de…” (13m), “Testar celular” (23m),
  “Do celular” (48m) — as mesmas sessões que o celular criou nesta e nas rodadas anteriores;
- rodapé: **“Backend ready”**, modelo `Qwen3.5:4B`, `Smart`, `client vgit.e85de13.dirty`.

Evidências: `desktop-home-remoto.png` e `desktop-home-aquecido.png` (2275×1357, capturadas com
`PrintWindow`/`PW_RENDERFULLCONTENT`, porque `SetForegroundWindow` é recusado nesta sessão e o
`CopyFromScreen` pegava outra janela por cima).

### O defeito que a Home expôs: UI em inglês numa máquina pt-BR

Com a sidebar em português, o composer aparecia com **“What's on your mind?”**.

Causa rastreada, não suposta:

1. `pt.ts` **tem** a tradução (`composer.newSessionPlaceholders`, inclusive “No que você está pensando?”)
   e o consumidor é `app/chat/composer/hooks/use-composer-placeholder.ts`.
2. O locale vem de `display.language` do backend (`i18n/context.tsx`, `getConfigDisplayLanguage`).
3. `hermes_cli/config_defaults.py:889` define **`"language": "en"` como default**.
4. `context.tsx` tratava qualquer valor suportado como “escolha do usuário” e retornava antes de
   sondar a máquina — então o **default** ganhava de um Windows pt-BR.

### Correção

`languages.ts` ganhou `resolveInitialLocalePreferringOs`: o default `en` **não conta como escolha**, só
um idioma explícito e diferente do default vence o sistema. `context.tsx` passou a usá-la (e a não
retornar cedo no caso default). Testes em `languages.test.ts` cobrem os quatro casos: default + pt-BR →
pt; escolha explícita (`es`) → es; sem idioma de máquina → mantém; sem nada salvo → segue a máquina.

`npx vitest run src/i18n` → **108 testes passando**; `tsc --noEmit` limpo; gate 14 ok.

**Limite honesto:** a correção está no código-fonte e testada; o `.exe` em `release/win-unpacked` é um
build anterior, então as capturas acima ainda mostram o placeholder em inglês. Refazer o pacote
(`electron-builder`) é o próximo passo para a evidência visual em pt-BR.

## Rodada 69 — pacote novo, servidor novo, e o idioma AINDA em inglês (com o que já eliminei)

### Feito

1. **Pacote reconstruído** a partir do commit atual: `npm run build` + `node scripts/run-electron-builder.mjs
   --win msix`. Saída: `release/B3PO-0.0.0-win-x64.msix` (191 MB, **não assinada** —
   `[batch-sign] AZURE_SIGN_* not set`) e `release/win-unpacked` novo (exe de 14:59).
2. **O servidor que eu usava estava velho.** O log do app mostrou
   `503 {"detail":"Restart required: This process is running code from e85de13b5c but the checkout on disk
   is now 387bc8da2e…"}` em `/api/model/options`. Ou seja: todas as capturas anteriores foram feitas
   contra um backend de 8 commits atrás. Subi o `serve` de novo a partir do checkout: agora
   `/api/health` responde `commit 387bc8da` e `/api/model/options` devolve 200 com providers.
3. Novo `serve` + pacote novo = a Home abre com `client vgit.387bc8d` no rodapé, o que **prova** que o
   renderer embarcado é o desta rodada.

### O que continua errado

O composer segue com placeholder em inglês (“Start with a goal”). Então a correção da rodada 68
(`resolveInitialLocalePreferringOs`) é **necessária mas não suficiente**: o código novo está rodando
(versão no rodapé mudou) e a decisão de locale ainda cai em `en`.

### O que já eliminei, com evidência

| Hipótese | Teste | Resultado |
|---|---|---|
| Electron veria `en-US` | sonda `app.getLocale()` com o Electron do repo | **`pt-BR`**, `getPreferredSystemLanguages() = ["pt-BR"]` |
| Falta de recursos de idioma no pacote | `release/win-unpacked/locales` | tem `pt-BR.pak`, `pt-PT.pak`, `en-US.pak` |
| `pt.ts` sem tradução | grep no locale | tem (`newSessionPlaceholders`, “No que você está pensando?”) |
| Build antigo | rodapé do app | `client vgit.387bc8d` — é o build novo |

### Próximo passo (preciso, não vago)

O `useState` do locale nasce de uma prop: `context.tsx:105` —
`useState<Locale>(() => normalizeLocale(initialLocale))`. Se `initialLocale` chegar `'en'` e o efeito de
config não rodar (por exemplo sem `configClient` em modo remoto), o estado nunca passa pela regra nova.
O caminho é instrumentar uma linha em `context.tsx` registrando `initialLocale`, `saved` e o locale
final no `desktop.log`, rodar uma vez e corrigir no ponto certo — em vez de continuar trocando o lugar
da correção no escuro.

### Registro de higiene

O `run-electron-builder.mjs` aponta o cache para `path.join(source, '.cache/desktop-inputs')`, dentro do
checkout; os `*.tar.gz` do builder derrubam o gate `profile-archives`. Removi 400 MB desse cache e o gate
voltou a **14 checks, ok**. Também apaguei `release/win-unpacked.bak` (431 MB).

## Rodada 70 — provas de que a lógica de idioma está certa, e a suspeita que sobrou

### Testes que passaram a pinar o comportamento (context.test.tsx)

| Teste | Entrada | Espera | Resultado |
|---|---|---|---|
| config salvo em pt | `getConfig → {display:{language:'pt'}}` | locale `pt` | ✅ |
| config `en` + máquina `pt-BR` | `getConfig → 'en'`, `getMachineProfile → 'pt-BR'` | locale `pt` | ✅ |
| config indisponível + máquina `pt-BR` | `getConfig` **rejeita** | locale `pt` | ✅ |

O terceiro caso era um buraco real: o `catch` do load fixava `DEFAULT_LOCALE` (`en`) em **qualquer**
falha de config. Agora ele consulta o perfil da máquina e usa `resolveInitialLocalePreferringOs`; o
inglês ficou como último recurso. `context.test.tsx` está com **22 testes**; `context` + `languages`
= 29 passando; `tsc` limpo; gate 14 ok.

### E o app empacotado? Ainda inglês — mas agora sei onde NÃO é

Pacote reconstruído e aberto de novo (`client vgit.387bc8d` no rodapé). Resultado na tela:

- **em português**: sidebar (CONVERSAS, BOTS, Nova conversa, Capacidades, Mensageria, Artefatos,
  Tarefas agendadas, Pesquisar conversas…, FIXADAS) e o parágrafo do herói;
- **em inglês**: o placeholder do composer (“Ask anything”), o selo “Smart”, “Backend ready”, “IMPORT”.

Isso **não é um locale**: é **mais de um escopo de i18n** na mesma janela. O provider do app
(`main.tsx` → `ProfileI18nProvider` → `I18nProvider scopeKey=…`) resolveu pt; um segundo escopo — o que
desenha composer e statusbar — ficou no default `en`. Minha correção atua no primeiro; o segundo não
passa por ela.

### Próximo passo (medido, não adivinhado)

1. `grep -rn "I18nProvider" src/main.tsx src/app` e listar **cada** mount com seu `scopeKey`;
2. achar o escopo que desenha `app/chat/composer` e `statusbar`;
3. fazer esse escopo herdar o locale do escopo pai (ou passar `initialLocale` explícito) e provar com um
   teste de render que o placeholder sai em pt.

Ferramenta boa para isso: render test com `ProfileI18nProvider` + composer, comparando o placeholder.

### Correção de registro

Na rodada 69 eu disse que o problema era “o app não recebe o config”. A rodada 70 mostra que a lógica do
provider está correta nos três casos; o que falta é o **segundo escopo**. Registro para não repetir o
diagnóstico errado.

## Rodada 71 — o bug do idioma era o PLACEHOLDER congelado (sonda provou), e a statusbar foi traduzida

### A sonda que resolveu

Instrumentei o próprio placeholder para mostrar o locale resolvido:

```
[locale=pt] Give B-3PO a task
```

**O locale estava certo desde a rodada 68.** O texto é que era escolhido **uma vez, no mount**, quando o
locale ainda era `en`; o efeito do hook só re-escolhia ao trocar de **conversa**, nunca ao trocar de
**idioma**. UI em pt com placeholder congelado em inglês.

Correção em `use-composer-placeholder.ts`: guardar o locale anterior e re-escolher o placeholder quando
ele muda. Teste novo (`use-composer-placeholder.test.tsx`) aceita **apenas** os textos de
`pt.composer.newSessionPlaceholders` — falha com o bug.

### Statusbar traduzida

O bloco `shell.statusbar` do `en.ts` não existia no `pt.ts`: a barra inteira saía em inglês. Adicionei
`shell.statusbar` (e `shell.approvalMode`) em pt-BR. O teste `pt.test.ts` pina a lista exata de seções
cobertas — atualizei para incluir `shell` (é guarda, não ruído).

### Estado na tela (pacote reconstruído, `client vgit.387bc8d`)

| Antes | Agora |
|---|---|
| "Ask anything" | **"O que vamos construir?"** |
| "Backend ready" | **"Servidor pronto"** |
| "Smart" | **"Inteligente"** |
| "client vgit…" | **"cliente vgit…"** |
| "Med" | ainda `Med` |
| "Import" (canto) | ainda em inglês |

Evidência: `docs/b3po/evidence/desktop-home-pt-br.png`.

### O que falta (2 rótulos)

`Med` (nível de raciocínio) e o rótulo de importação no canto direito. Mesma natureza do que acabei de
corrigir: ou são chaves sem override em `pt.ts`, ou são valores capturados cedo por outro hook. O método
que funcionou — sonda visível → chave → tradução — é o próximo passo.

Testes: i18n **112 passando** (inclui os 23 de `context` e o novo do placeholder); gate 14 ok.

## Rodada 72 — fechamento do idioma: pt-BR com duas exceções identificadas

Depois da rodada 71 (placeholder re-escolhido + `shell.statusbar` traduzido), a Home ficou assim:

| Elemento | Texto |
|---|---|
| sidebar | CONVERSAS, BOTS, Nova conversa, Capacidades, Mensageria, Artefatos, Tarefas agendadas, Pesquisar conversas…, FIXADAS |
| herói | parágrafo em pt-BR vindo do bot |
| composer | **"O que vamos construir?"** |
| statusbar esquerda | **"Servidor pronto"** |
| statusbar direita | **"Inteligente"**, **"cliente vgit…"** |

### As duas exceções, com a origem de cada uma

1. **"Med"** — não é chave faltando: é o rótulo compacto fixo de `apps/desktop/src/lib/reasoning-effort.ts`
   (`SHORT_LABELS`: Off/Min/Low/**Med**/High/XHigh/Max/Ultra). O próprio arquivo documenta que menus e
   configurações usam `shell.modelOptions` traduzido; o *pill* usa forma curta por espaço. Três letras
   cabem; "Médio" não. Decisão: manter como chrome compacto e registrar a exceção em vez de fingir
   100% traduzido. Se o dono preferir, o caminho é localizar `SHORT_LABELS` e passar o `t` ao pill
   (toca `reasoning-pill.tsx` e o teste que pina 'Med').

2. **"Impra"** — o chip à direita de "Servidor pronto". Não existe em catálogo nenhum (`en.ts`, `pt.ts`,
   plugin): é **dado**, não tradução. Recortei a região da statusbar e ampliei para ler o texto exato
   (evidência abaixo). Fica registrado como item aberto: identificar de qual campo do backend vem.

### Evidência

`docs/b3po/evidence/desktop-home-pt-br.png` — Home com o composer e a statusbar em pt-BR.

## Rodada 73 — o chip "Impra" é DADO, e o manifesto de artefatos foi regenerado com hashes reais

### "Impra" resolvido (como categoria)

Rastreei o item da statusbar que desenha o chip: `use-statusbar-items.tsx`, id `workspace-cwd`:

```tsx
icon: <FolderOpen className="size-3" />,
label: projectName || (currentCwd ? pathLeaf(currentCwd) : undefined),
```

Ou seja: o rótulo é **nome de projeto/pasta do workspace da sessão**, não uma string de catálogo. Por isso
não aparecia em `en.ts`, `pt.ts` nem em plugin. Não é falha de tradução — e não vou "corrigir" um nome de
pasta do usuário.

As sessões do backend reportam `cwd = D:\IA-Workspace\Deepseek\projects\C-3PO BOT`, então o valor
esperado nessa instalação é o nome da pasta. O texto exato do chip ficou registrado em
`docs/b3po/evidence/desktop-statusbar-zoom.png` (recorte 3x).

### Manifesto de artefatos regenerado

`docs/b3po/ARTIFACT-MANIFEST.md` agora traz, para o commit `2679a847e0`, os hashes **calculados nesta
máquina** (não estimados):

| Artefato | Tamanho | SHA-256 |
|---|---|---|
| `B3PO-0.0.0-win-x64.msix` | 190,9 MB | `563eb41f…` |
| `B-3PO.exe` (win-unpacked) | 235,4 MB | `69d2b610…` |
| `app-release.apk` | 44,2 MB | `0bea9daa…` |
| `app-debug.apk` | 93,2 MB | `10db8315…` |
| `app-release.aab` | 19,0 MB | `5b84826f…` |

Com a seção de assinatura declarada: MSIX **não assinado** (`AZURE_SIGN_* not set`, Store-only build),
APK/AAB com **chave de debug**, iOS ausente por bloqueio externo, macOS/Linux não construídos aqui.

### Regressão

`npx vitest run src/app/chat/composer src/app/shell/hooks` → **752 testes passando** (áreas tocadas pelas
mudanças de i18n/placeholder). Gate: 14 ok.

## Rodada 74 — datas seguem o idioma da UI, e as duas falhas de cron foram resolvidas na causa

### Correção de produto: `Intl` não pode usar o locale do sistema

`apps/desktop/src/lib/time.ts` criava os formatadores como `new Intl.RelativeTimeFormat(undefined, …)`.
`undefined` = locale **do sistema** (pt-BR nesta máquina), não o da interface. Consequência real: com a UI
em inglês, as datas saíam em português — "Overdue since: há 5 min" — e vice-versa.

Agora `relativeTime` usa um `RelativeTimeFormat` em cache por locale, alimentado por `setTimeLocale()`, que
o provider de i18n chama quando o idioma resolve (`context.tsx`, junto de `setRuntimeI18nLocale`). O default
segue `DEFAULT_LOCALE` (`en`), então testes e primeira pintura ficam determinísticos.

### As duas falhas "conhecidas" de cron

| Teste | Causa | Correção |
|---|---|---|
| `cron-detail` | o formatador de tempo acima (locale do sistema) | corrigido na raiz — 13 testes da suíte de cron passam |
| `cron-prompt` | o teste roda `sh -c`; **Windows sem shell POSIX** devolve `status: null` | guard `itWithShell` com probe `sh -c 'exit 0'`: roda onde há shell, **pula com razão** onde não há (6 passam, 1 pulado) |

Não mexi no caminho de segurança (`isLegacyDelegatedRoutine` / pause de rotinas legadas) para "fazer o teste
passar": a asserção continua de pé, o ambiente é que não tem `sh`.

### Observação de ambiente

`src/lib/keybinds/browser-hints.test.tsx` estourou 25 s quando rodou junto da suíte inteira e passou sozinho
em 7,85 s. É sensível a carga paralela aqui — registrado para não ser confundido com regressão.

## Rodada 76 — pacote reconstruído no commit atual e manifesto refeito do zero

### Pacote

Rebuild com `npm run build` + `run-electron-builder --win msix` no commit `9f181585`:

- `release/B3PO-0.0.0-win-x64.msix` — 190,9 MB, **não assinado** (Store-only build; `AZURE_SIGN_*` ausente).
- `release/win-unpacked/B-3PO.exe` — 235,4 MB, exe de 15:54.

Aberto como cliente remoto, renderizou de novo a Home em pt-BR: composer **“Descreva o que precisa”**,
statusbar **“Servidor pronto”** e **“Inteligente”**, sidebar em português e as três conversas reais.
Evidência: `docs/b3po/evidence/desktop-home-pt-br.png`.

### Manifesto refeito, não remendado

`ARTIFACT-MANIFEST.md` tinha um bloco **antigo no topo** afirmando `Nome: Hermes.exe (nome de produto ainda
não rebrandado)` e um commit `21595add` — contradizendo o build atual. Manifesto com dado velho engana mais
do que ajuda, então reescrevi o arquivo inteiro com: commit atual, cinco artefatos com **SHA-256 calculado**
aqui, datas de construção, e a seção de assinatura declarada (MSIX não assinado, APK/AAB em chave de debug,
iOS ausente por bloqueio externo, macOS/Linux não construídos).

Também corrigi a formatação da tabela: um `replace` meu tinha comido os backticks de fechamento dos nomes.

## Rodada 75 — seção de dispositivos provada por teste de DOM e pacote reconstruído

### Prova comportamental (o que faltava na rodada 74)

`src/app/settings/paired-devices-section.test.tsx` monta o componente real com `I18nProvider` e exercita:

| Caso | O que verifica |
|---|---|
| lista | rótulo, perfil, “nunca” quando não há último uso, contagem de tickets |
| vazio | o texto explica como adicionar em vez de mostrar lista em branco |
| falha de leitura | mensagem + botão **Atualizar** que recarrega e passa a listar |
| revogação | primeiro clique **não** chama o backend; a confirmação chama `revokePairedDevice('dev-1')` e a linha vira “revogado” |
| já revogado | não oferece botão de revogar |

5 testes verdes. É prova de comportamento no DOM, não snapshot.

### Pacote

`npm run build` + `run-electron-builder --win msix` no commit `b68bd72e`; cache do builder removido (senão o
gate reprova em `profile-archives`); `ARTIFACT-MANIFEST.md` regenerado com hashes novos dos cinco artefatos.

O binário aberto como cliente remoto renderiza a Home em pt-BR com as conversas reais — inclusive as criadas
pelo celular (“Enviar após correções da re…”, “Testing after device allowlist”, “Testar celular”, “Do
celular”). Evidência atualizada: `docs/b3po/evidence/desktop-home-pt-br.png`.

### Ressalva registrada

A captura é da Home, **não** da tela de Configurações → Conexões salvas: não há automação confiável para
clicar dentro da janela Electron nesta sessão (o `SetForegroundWindow` é recusado aqui). A seção está provada
por teste de componente; a captura de tela dela fica pendente e declarada como tal.

## Rodada 82 — artefatos reconstruídos no commit corrente (e um EPERM explicado)

O APK e o MSIX estavam atrás do HEAD: o app Android não tinha a correção de reconexão da aprovação, e o
manifesto atribuía todos os artefatos ao commit novo mesmo quando o binário era de um commit anterior.

Reconstruí **os dois** no commit `7391977387` e gerei o manifesto de novo (5 artefatos, hashes novos).

### O que deu errado no caminho

`electron-builder` falhou com `EPERM: unlink ...\win-unpacked\dxcompiler.dll`: o **B-3PO.exe aberto** segurava
os arquivos do `win-unpacked`. Fechei os processos e repeti — passou. Registro porque é a segunda armadilha de
empacotamento nesta entrega (a outra foi o `.cache` de ~400 MB quebrando o check de profile-archives).

### Nuance honesta do manifesto

O manifesto carrega **uma** coluna "commit" (o HEAD no momento da geração) e uma coluna "Construído" por
artefato. Quando só uma plataforma é reconstruída, o commit do topo não prova que aquele binário é daquele
commit — a data de build é a prova real. Está escrito aqui para o leitor não superinterpretar o cabeçalho.

`assembleDebug` continua produzindo o **mesmo** APK (16:46) porque debug não embute JS: o hash não muda e isso
é esperado, não é esquecimento.

## Rodada 95 — herói da conversa vazia: o robô, não o lettering

Pedido do dono: a tela inicial deve mostrar **o robô no meio**, não só "B-3PO" escrito — e nada deslocado.

O herói vinha de `components/chat/intro.tsx` com `<Wordmark text="B-3PO" />`, que usa `.fit-text`: dimensiona a
letra pela **largura** da coluna. Em janela baixa isso cresce sem limite e passa por cima do compositor — o logo
aparecia sobre o "Say something…" na captura do dono. Era isso o "deslocado".

Agora: chat genérico (persona neutra) mostra a **marca do robô** (`b3po-mark-{dark,light}.png`, tema-aware, via
`BrandMark`) com altura limitada por viewport (`h-[min(15rem,34vh)]`), e o lettering só aparece no chat de um bot,
onde o nome é a identidade. O `aria-label` continua "B-3PO" para leitor de tela.

Movimento: flutuação idle de 6s em CSS (`.b3po-hero-float`), desligada em `prefers-reduced-motion: reduce`.

### O que NÃO foi feito, e por quê

O dono quer o robô se mexendo **como no GIF dele**. Não existe frame do B-3PO no repositório: `public/hermes-frames/`
é o mascote do Hermes (cavaleiro pixel), e `public/b3po-mark-*.png` é um PNG estático. Fazer "animação" com
transformação de imagem estática seria fingir. Falta o arquivo do GIF para extrair os quadros — fica registrado
como dependência do dono, não como feature entregue.

### Piscada dos mascotes (rodada 96)

Os 20 mascotes oficiais são **PNG estático** (`brand/avatars/*.png`): não existe pálpebra para animar, e o rosto
vetorial que pisca de verdade (`t % 1.45 > 1.26` em `avatar.tsx`) só aparece em bot **sem** mascote escolhido.

Solução entregue: ao renderizar a imagem, o componente injeta **uma vez** um `@keyframes` (squash vertical rápido no
fim de um ciclo de 5,5 s) e aplica no `<img>` com atraso derivado do nome — 12 rostos no mesmo ciclo piscariam em
uníssono. `prefers-reduced-motion: reduce` desliga.

**É aproximação, não pálpebra**: piscada fiel exige frames por mascote (ou o GIF do dono, que ainda não está no
repositório). Registrado aqui para não vender como mais do que é.

## Rodada 97 — o herói do chat de bot: o robô, e de verdade desta vez

A rodada 95 mexeu em `components/chat/intro.tsx` — o splash do **rascunho novo**. Só que a tela das capturas do
dono era outra: `plugins/hermes-bots/chat-empty.tsx` (`BotChatEmpty`), que desenhava o rosto pequeno + `.fit-text`
com o nome do bot. Rebuild + captura provaram que minha mudança não aparecia em lugar nenhum: **corrigi o arquivo
errado**.

Agora, no chat de bot:

- **arte do robô da marca** quando o bot não escolheu mascote — antes o padrão determinístico sorteava uma
  **estrela roxa** para o nome "B-3PO";
- o mascote escolhido, quando existe (`rosterMascotSrc`);
- **um** rosto, não dois: o `BotFace` pequeno saiu (squircle + estrela juntos parecia defeito);
- nome do bot em corpo de texto e o "Say something to get started." embaixo;
- altura limitada por viewport, sem encostar no compositor.

Evidência: `docs/b3po/evidence/hero-mascote-dev.png` — app empacotado contra o backend real.

### Pendente aqui

O robô continua **estático** (só a flutuação CSS). Movimento real pede frames — o GIF do dono não está no
repositório. E a arte pode ficar maior: ajusto com nova captura.

## Rodada 98 — sem movimento (decisão do dono) e um CSS quebrado meu

O dono decidiu: **deixar o robô parado**. Removi a flutuação CSS do splash, apaguei a regra morta do
`styles.css` e tirei a piscada do robô grande do chat de bot (piscada continua só nos avatares pequenos do
roster, que é onde ela foi pedida).

### Defeito que eu mesmo criei ao remover

O corte da regra CSS deixou uma **chave de fechamento órfã** no fim de `styles.css`. O `tsc` não olha CSS, então
passou; o `npm run build` falhou com `CssSyntaxError: Missing opening {` e o `electron-builder` **empacotou o
bundle antigo**. Só percebi porque li o log do build: a captura tinha sido feita com o código velho. Corrigido
(balanço 463/463 chaves) e reconstruído — a captura em `docs/b3po/evidence/hero-mascote-dev.png` é do bundle
novo.

### Duas telas, dois heróis, ambos com o robô

- splash do rascunho (`components/chat/intro.tsx`): robô da marca + tagline, estático, altura por viewport;
- chat de bot (`plugins/hermes-bots/chat-empty.tsx`): robô da marca (ou o mascote escolhido) sobre um halo que
  usa `--ui-accent`, nome em corpo de texto.

### WhatsApp duplicado em Configurações

Renomeei os títulos das seções do CRM (`WhatsApp CRM contacts` → `CRM contacts`) nos 10 locales: o canal
WhatsApp é assunto da Mensageria, não do CRM. A duplicata que o dono viu em Configurações ainda precisa de
confirmação de **qual** tela — a seção de contatos só é montada em `/crm`, então a segunda entrada é outra.

## Rodada 100 — artefatos no HEAD 167 e uma captura falsa corrigida

- MSIX reconstruído no commit `2805729d` (191 MB, 19:38:46), manifesto regerado (5 artefatos, 167 commits);
- app empacotado abre contra o backend real — janela `B-3PO` pid 25908, captura em
  `docs/b3po/evidence/desktop-msix-167.png` (105 KB, 2275x1357).

### Erro meu, registrado

Na rodada anterior o script de captura pegou a janela errada e gravou um PNG de **0 KB / 237x39**. Eu commitei
esse arquivo como se fosse evidência e escrevi na mensagem do commit que a captura existia. Não existia: era
lixo. Removi o arquivo e refiz a captura com a janela certa (pid com `MainWindowTitle = 'B-3PO'`). A mensagem do
commit `279fbe59` continua no histórico com a afirmação errada — não reescrevo histórico publicado.

Lição que fica no procedimento: **conferir o tamanho do PNG e o pid da janela antes de commitar evidência**.

## Rodada 102 — marca consolidada: um robô, um tamanho, um fundo

As capturas do dono mostravam o robô em **dois tamanhos**, um com halo CSS e outro sem, e inglês sobrando com o
idioma em português.

### A arte oficial passou a ser a do dono

O GIF que ele mandou chegou aqui como **1 frame** (o anexo vira imagem estática), mas é a arte boa: robô com o
anel de luz embutido, 640×360. Virou `apps/desktop/public/b3po-hero.png`, com queda elíptica de alfa nas bordas
para não virar um retângulo preto sobre o tema claro.

### Um só tratamento, nos dois lugares

- `components/chat/brand-hero.tsx` é a **referência**: largura `min(22rem,58vw)` para a arte da marca,
  `min(9rem,24vh)` para mascote quadrado de bot;
- o splash do rascunho e o chat vazio do bot passam a usar as mesmas classes (o plugin é outro bundle, então
  repete a constante de propósito, com comentário apontando a origem);
- **sem halo CSS** em cima da arte: o anel já está no desenho e dois brilhos parecem erro de montagem;
- `dark:mix-blend-screen` dissolve o fundo preto da arte no tema escuro.

### Inglês que sobrava

O bloco `pt` do plugin de bots tinha **6 strings**; o resto caía no inglês — inclusive "Say something to get
started." no chat de bot. Agora cobre roster, seções, bot, avatar e ações comuns (o catálogo inteiro ainda não).

E o aviso "Canonical groups require an explicit connection" era **mensagem de exceção crua** na interface.
Virou copy traduzida ("Grupos exigem uma conexão e um perfil explícitos."), com genérico para o resto.

Evidência: `docs/b3po/evidence/hero-final.png` (app empacotado, HEAD desta rodada).

### Rodada 102 — medindo o inglês que sobra em Configurações

Captura com o seletor em português (`docs/b3po/evidence/configuracoes-pt.png`):

- **menu lateral: 100% em português** (Modelo, Modelos de fallback, Aparência, Segurança, Memória e contexto…);
- **conteúdo do painel: em inglês** — "Applies to", "Provider", "Model", "Reasoning", "Restart backend", e a
  ajuda do contexto ("Overrides the detected context window…").

Medido: **33 literais de interface em inglês** no módulo `src/app/settings` — 22 são descrições de provedor
(`constants.ts`, ex.: "Anthropic-compatible direct model API") e o resto rótulos de seção usados só como fallback.
As strings do painel (ex.: "Main model context window (override)") **não estão no catálogo**: vêm do catalog de
configuração do backend, em inglês, e o desktop as renderiza cruas.

Plano para fechar isso (rodada seguinte):

1. `settings.providers.<id>.description` no catálogo (pt primeiro, depois os outros locales);
2. uma camada de cópia pt por **id de campo** (`settings.configFields.<id>.label/help`) aplicada onde os campos
   de configuração renderizam — o backend continua sendo a fonte do valor, só a apresentação é traduzida;
3. teste de cobertura: nenhuma chave visível sem pt (mesmo modelo do `overlay-completeness`).

### Rodada 103 — o painel de modelo fala português

Faltava o arquivo de locale: `pt_model_settings.ts` **não existia** (de, es, fr, ja, ru, zh tinham o seu), então todo
o painel Modelo caía no inglês. Criados três arquivos:

- `pt_model_settings.ts` — as 56 chaves do painel (Provider, Model, Reasoning, Defaults, aviso de backend antigo,
  modelos auxiliares, Mistura de agentes, subagentes);
- `pt_aux_tasks.ts` — as 12 tarefas auxiliares (Visão, Compressão, Títulos, Curador…);
- `pt_delegation_routing.ts` — roteamento de subagentes, **override parcial declarado**: cabeçalho, modos, diálogo
  de rota e estados de bloqueio traduzidos; cauda longa (descrições raras) herda o inglês por spread, e está dita
  aqui em vez de disfarçada.

Também entraram `fieldLabels`/`fieldDescriptions` em `pt.ts` (`defineFieldCopy`) para os campos do painel — foi o
que fez "Janela de contexto do modelo principal (substituir)" e a ajuda dela aparecerem em português na captura
`docs/b3po/evidence/configuracoes-pt-2.png`.

### O que o teste pegou

`settings.model.staleAuxBefore` usava `${count}` **três** vezes; o inglês usa duas. Compila, passa no typecheck
(mesma aridade) e renderizaria errado. O `pt-coverage` compara os nomes dentro do template e barrou. Corrigido
para `[count, count, names]`, na mesma ordem.

### O que NÃO consegui verificar

Duas tentativas de abrir Configurações pela janela empacotada (`Ctrl+,` via AppActivate + SendKeys) voltaram na
tela de conversa — a captura `configuracoes-modelo-pt.png` é do chat, não do painel. O painel está verificado por
teste (93 arquivos, 724 testes, incluindo o `pt-coverage`), não por imagem desta vez. Tentar de novo na próxima
rodada com outro caminho de navegação.

### Rodada 104 — boot em português e a medida do que falta

O inglês de Configurações não é "um arquivo": o catálogo é dividido em **famílias** de locale
(`en_boot.ts`, `en_catalog.ts`, `en_clarify.ts`, …). Medi: **26 famílias** têm pelo menos 3 locales e **nenhuma
tem português**. É esse o tamanho real do problema — e é por isso que traduzir "Configurações" por uma lista de
strings nunca ia fechar.

Nesta rodada entrou `pt_boot.ts`: tela de inicialização, mensagens de falha de boot (as seis causas comuns),
login remoto, Nous Cloud fora do ar e a tela de retenção por atualização. Composed via `...ptBoot` no override.

Backlog medido e registrado (ordem de impacto): `boot` (feito), `desktop_commands`, `error_codes`, `error_layers`,
`notices`, `notifications`, `connectors`/`connector_*`, `cron_control`, `catalog`, `first_run`, `onboarding`,
`model_menu`, `session_commands`, `projects`, `memory_layers`, `local_models`, `theme_picker`, `update_channel`,
`gateway_host`, `clarify`, `shared_metrics`, `plugin_preview_access`, `plugin_update`, `preview_web`, `notifications`.

### Sobre a captura que não saiu

Três tentativas de abrir Configurações na janela empacotada (Ctrl+, depois Ctrl+K + "settings") devolveram a tela
de conversa: o teclado sintético (AppActivate + SendKeys) não é confiável aqui. Em vez de insistir, coloquei `pt`
na **matriz de locales** de `model-settings.test.tsx` — o teste agora renderiza o painel em português e exige que
as strings traduzidas apareçam e difiram do inglês (40 testes verdes). Prova por teste, não por imagem; declarado.

### Rodada 105 — três famílias de locale a mais em português

Continuando o backlog medido, entraram **`pt_theme_picker`** (seletor de tema), **`pt_cron_control`** (parar
execução, execuções perdidas) e **`pt_clarify`** (pergunta com opções: escolher, pular, confirmar, progresso).

Descoberta de processo que vale registrar: as famílias **não são todas de topo**. `clarify` e `themePicker` moram
sob `assistant`; `control` mora sob `cron`. Tentei colocar as três em `settings` e o `tsc` barrou com "objeto só
pode declarar propriedades conhecidas" — a checagem de tipos pagou o preço aqui. Agora uso um script que sobe a
indentação do `en.ts` e me dá o caminho completo antes de inserir.

Progresso do backlog: `boot`, `theme_picker`, `cron_control`, `clarify` feitos — **22 de 26 pendentes**
(`desktop_commands`, `error_codes`, `error_layers`, `notices`, `notifications`, `connectors`/`connector_*`,
`catalog`, `first_run`, `onboarding`, `model_menu`, `session_commands`, `projects`, `memory_layers`,
`local_models`, `update_channel`, `gateway_host`, `shared_metrics`, `plugin_preview_access`, `plugin_update`,
`preview_web`).

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes verdes, incluindo `pt-coverage`
(chaves existentes no inglês, aridade de função e placeholders idênticos). Gate 14 ok.

### Rodada 106 — permissões de plugin, cartão de erro e camadas de memória em pt

Três famílias a mais: **`pt_plugin_preview_access`** (consentimento para um plugin rodar scripts no preview,
com aviso de risco e revogação por site), **`pt_error_layers`** (as nove camadas do cartão de erro: login,
créditos, disco, endpoint, gateway, provedor, runtime, streaming) e **`pt_memory_layers`** (provedor ativo,
pronto/precisa configurar/não instalado, camada embutida).

Onde cada uma mora (achado pelo script de caminho): `skills.plugins`, `assistant.thread` e `settings` —
três pais diferentes outra vez. A lista de seções do `pt.test.ts` cresce junto, de propósito: ela é o contrato
de que o override não inventa seção.

Progresso do backlog: **7 de 26** famílias feitas (`boot`, `theme_picker`, `cron_control`, `clarify`,
`plugin_preview_access`, `error_layers`, `memory_layers`); 19 pendentes, com `desktop_commands`, `error_codes`,
`notices`, `notifications` e `catalog` na frente.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 107 — avisos, comandos de barra, canal de atualização e métricas em pt

Cinco famílias nesta rodada: **`pt_notices`** (renderização remota, barra de termos/privacidade, avisos do
compositor, oferta de manter acordado, oferta de conectar apps), **`pt_session_commands`** (/undo, /retry,
/steer, fila), **`pt_desktop_commands`** (/rollback, /agents, /config, /history, /save, /export, /import,
/timestamps), **`pt_update_channel`** (estável x cada commit, aviso de rollback e de build retida) e
**`pt_shared_metrics`** (consentimento de estatísticas — o texto que explica que só contagens vão embora).

`notices` e `sharedMetrics` são spreads de topo; `updateChannel` mora em `settings.about.channel` e as duas
famílias de comandos entram dentro de `promptNotices` — por isso o arquivo `pt_notices` importa
`pt_session_commands` e `pt_desktop_commands`, como o inglês faz.

A lista de seções do `pt.test.ts` passou de 15 para 21 entradas. Isso é o contrato funcionando: cada família nova
tem que ser declarada, senão o teste reprova.

Progresso do backlog: **12 de 26** famílias em pt. Restam `desktop_commands` (feito), `error_codes`, `notifications`,
`catalog`, `first_run`, `onboarding`, `model_menu`, `projects`, `local_models`, `connectors`/`connector_*`,
`gateway_host`, `plugin_update`, `preview_web`.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 108 — seletor de modelo, notificações e atualização de plugin em pt

Três famílias: **`pt_model_menu`** (busca, favoritos, limites por provedor e por modelo, custo por Mtok,
"rodar local · grátis, privado"), **`pt_notifications`** (sete tipos de notificação do sistema, permissão do
navegador com os cinco estados, som de conclusão, silenciar sons) e **`pt_plugin_update`** (pastas liberadas,
consentimento do novo pin, varredura de segurança com veredito de atenção e bloqueio).

Desta vez nenhuma seção nova no topo: `notifications` ficou em `settings`, `plugin_update` somou ao bloco
`skills.plugins` que já existia e `modelMenu` entrou em `shell` — então a lista do `pt.test.ts` não mudou.
O script de caminho confirmou os três pais antes de inserir (`settings`, `skills.plugins`, `shell`).

Progresso do backlog: **15 de 26** famílias em pt. Restam `error_codes`, `catalog`, `first_run`, `onboarding`,
`projects`, `local_models`, `connectors`/`connector_*`, `gateway_host`, `preview_web`, `update_channel` (feito),
`shared_metrics` (feito) — a lista viva está no bloco da rodada 105.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 109 — primeira execução e gateways em pt

**`pt_first_run`** (as sete etapas do assistente: nome, cor, layout, apps, plugins, tour, primeira tarefa; convite
para rodar modelo local; "comandos de barra ficam desligados durante a configuração"; rodar de novo) e
**`pt_gateway_host`** (acesso pela web: iniciar/parar, rede local x URL própria, aviso de que a conexão não é
criptografada, gateway preso por conversa rodando, tempo esgotado).

`firstRun` é chave de topo; o gateway é spread dentro de `settings.gateway`. A lista de seções do `pt.test.ts`
foi para 22 entradas com `firstRun`.

Progresso do backlog: **17 de 26** famílias em pt. Restam `error_codes` (a maior, 82 strings), `catalog`,
`onboarding`, `projects`, `local_models`, `connectors`/`connector_*`, `preview_web`.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 110 — o catálogo de erros em português (a maior família)

**`pt_error_codes`**: os 39 códigos do cartão de erro, com título e corpo próprios — chave de API recusada,
créditos, rate limit (do provedor e acima do provedor), sobrecarga, timeout, stream que caiu, contexto estourado,
payload grande, modelo inexistente, política de privacidade do provedor, filtro de conteúdo, resposta truncada ou
ilegível, sessão ocupada/em outro lugar/somente leitura, pasta da conversa apagada, chave da conversa trocada,
modelo local desligado, disco cheio e os oito códigos do nível gratuito Nous.

O `tsc` pegou duas chaves que eu tinha deixado de fora (`truncated` e `invalid_response`) — elas estavam na parte
do arquivo inglês que não apareceu na primeira leitura. O tipo `Record<..., ErrorCardCopy>` exige todas.

Progresso do backlog: **18 de 26** famílias em pt. Restam `catalog`, `onboarding`, `projects`, `local_models`,
`connectors`/`connector_*`, `preview_web`.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 111 — configuração inicial em pt

**`pt_onboarding`**: a tela que aparece quando ainda não há provedor — título, "rodar modelos localmente",
pitch de cada provedor, os seis cartões de chave de API (Fireworks, OpenRouter, OpenAI, Gemini, xAI, endpoint
local), os três fluxos de login (navegador, código de dispositivo, CLI externo), código de autorização, preço
por Mtok e "Começar".

`connectors` ficou de fora desta rodada: não existe `en_connectors.ts` — essa família está escrita dentro do
`en.ts`, então precisa de outra estratégia de extração. Registrado no backlog.

Progresso do backlog: **19 de 26** famílias em pt. Restam `catalog`, `projects`, `local_models`, `preview_web`,
`connectors`/`connector_card`/`connector_accounts`.

### Falha de build registrada

O primeiro empacotamento desta rodada terminou em erro `TypeError: fetch failed` durante o download do
`electron` — falha transitória de rede, já vista antes. Repetido, o MSIX saiu (191,3 MB, `21:12:25`). Nada foi
commitado antes de o build passar.

### Rodada 112 — preview embutido e projetos em pt

**`pt_preview_web`** (painel de navegador: endereço, voltar/avançar, console, DevTools, reiniciar servidor,
"servidor não encontrado", loopback remoto, MIME de módulo errado, anotar e comentar) e **`pt_projects`**
(seção de projetos da sidebar: criar, renomear, pastas, IDEA.md, cor, mover conversa, worktrees, converter
branch, ordenar/ocultar).

### O erro que eu cometi e como achei

Inserei `projects` no primeiro `sidebar: {` que apareceu — mas esse era o **sidebar de Configurações**
(`title`/`description`/`toggle`), não o da conversa. O `tsc` acusou "objeto só pode declarar propriedades
conhecidas". Pior: ao tentar corrigir, o bloco `projects` inline que já existia continuou lá e o mesmo arquivo
passou a ter a chave duas vezes (`TS1117`). Corrigi localizando o `sidebar` de topo por indentação e trocando o
bloco inline por `projects: ptProjects`. A lição: **nome de chave repetido em níveis diferentes é armadilha** —
o script de caminho devolve o mesmo rótulo para os dois.

Progresso do backlog: **21 de 26** famílias em pt. Restam `catalog`, `local_models` e os três de conectores.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 113 — catálogo de Capacidades em pt

**`pt_catalog`**: a página que mais aparecia em inglês nas minhas capturas. Entraram busca de skills e plugins,
filtros e fontes, ordenação, contagem de resultados, os níveis (Oficial / Verificado / Comunidade), ficha do item
(autor, fonte, categoria, versão, plataformas, ferramentas, hooks, licença, commit revisado), o fluxo de instalação
com aviso de confiança, os destaques e o bloco de modo desenvolvedor.

Progresso do backlog: **22 de 26** famílias em pt. Restam `local_models` e os três de conectores.

Verificação: 93 arquivos / 725 testes verdes (`src/i18n` 112 + `src/app/settings` 613); gate 14 ok; MSIX reconstruído.

### Rodada 114 — modelos locais em pt

**`pt_local_models`** (a maior família restante, 103 chaves): runtime llama.cpp (instalar, atualizar, build e
backend), hardware detectado (GPU, RAM, memória unificada), biblioteca de modelos com recomendação e o motivo dela,
download com pausa/retomada/velocidade/ETA, quickstart de um clique, "tudo na GPU" x "parte na RAM" com as dicas,
carregar/descarregar da memória, ligar/desligar servidor, busca no Hugging Face e arquivo GGUF avulso.

### O que o `tsc` pegou (duas vezes)

1. `resumeFailed` — a chave real é `downloadResumeFailed`; eu tinha lido o nome cortado na borda do buffer.
2. Faltavam `activateFailed`, `activateDoneToast`, `downloadFailed`, `downloadPauseFailed`.

Nenhuma das duas passaria sem o tipo, e as duas seriam tela em inglês em produção. É o mesmo padrão da rodada 110:
**ler arquivo grande em pedaços corta nome de chave**.

Progresso do backlog: **23 de 26** famílias em pt. Restam só os três de conectores — que exigem extrair do `en.ts`
em vez do padrão `en_<família>`.

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 115 — conectores (cartão e contas) em pt

**`pt_connector_card`** (conectar apps na conversa: conectar, adiar, cancelar, reconectar, estados — conectado,
expirado, indisponível, pulado — aviso de que conectar é opcional e só autorizar o que quiser, diretório de apps,
recibo do que foi conectado, "conclua no navegador", fechado após 10 minutos) e **`pt_connector_accounts`**
(contas do conector: adicionar outra, nome da conta com as regras do apelido, renomear, remover, contagem de
contas em desuso e os seis status).

### O teste pegou de novo

`retiredCount` usava `${count}` duas vezes contra uma do inglês (plural por sufixo). Como o `pt-coverage` compara a
lista de placeholders, troquei por uma forma com uma ocorrência só: "`${count}` em desuso". É a mesma armadilha da
rodada 103 — **plural por condicional em pt custa uma segunda interpolação**.

Estado do backlog: **25 de 26** famílias em pt. Falta só **`connectors`**, que não tem `en_connectors.ts` — o texto
inglês está escrito dentro do `en.ts`, então exige extração (as outras traduções existentes, ar/ja/ru/zh-hant, foram
feitas de outra forma).

Verificação: 93 arquivos / 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 116 — página de Conectores em pt (backlog de locales fechado)

**`pt_connectors`** traduz a página inteira — 11 mil bytes de inglês que moravam dentro do `en.ts`, não em um
`en_connectors.ts`. Entraram busca e filtros, os segmentos (Todos / Disponíveis / Conectados / Desligados), o estado
de cada app (card: gerenciado, catálogo, MCP personalizado, plugin; 13 estados; verbos; motivos), a página vazia,
o formulário completo de MCP personalizado (comando, argumentos, variáveis de ambiente, cabeçalhos, tipos STDIO e
HTTP com streaming, autenticação OAuth/Bearer), os diálogos (desconectar, remover, onde roda, regras da organização,
conflito de edição) e a lista de ferramentas com facetas e vocabulário (leitura, escrita, destrutiva, repetível,
externa).

### O que o teste pegou

Quatro funções tinham placeholder a mais que o inglês, todas pelo mesmo motivo — plural por condicional em
português custa uma interpolação extra: `card.fact.toolsOff`, `card.fact.toolsOn`, `tools.conflictBody` e
`tools.footerDirty`. Corrigi **espelhando a expressão do inglês** em vez de reescrevê-la em português.

O `tsc` também pegou uma chave que eu inventei (`onLine`) e oito que faltaram (`retry`, `goneTitle`, `goneBody`,
`remove`, `offTitle`, `offBody`, `needsAuthTitle`, `needsAuthBody`) — porque só tinha lido os primeiros 9 mil
bytes do bloco. Comparei os conjuntos de chaves por script antes de confiar.

**Backlog de locales: 26 de 26 famílias com português.** O que continua fora do idioma agora é copy escrita
direto em componente (não catalogada), que é outro trabalho e está no relatório.

Verificação: `src/i18n` 112 + `src/app/settings` 613 = 725 testes verdes; gate 14 ok; MSIX reconstruído.

### Rodada 117 — o inglês que sobrava fora do catálogo (memória)

Com as 26 famílias de locale traduzidas, o inglês restante é **copy escrita direto no componente**. Varri as telas de
Configurações com um script (texto solto em JSX, `placeholder`, `title`, `aria-label`): 16 ocorrências em 14 arquivos,
e 13 delas eram falso positivo (`Promise`, `NonNullable`, `YYYY` de formato de data).

As três reais, todas em Configurações ▸ Memória:

| Arquivo | Antes | Depois |
|---|---|---|
| `provider-config-modal.tsx` | `Cancel` solto | `t.common.cancel` |
| `memory/connect.tsx` | `Waiting for browser consent…` + `Cancel` | `t.connectors.waiting` + `t.common.cancel` |
| `provider-config-panel.tsx` | `Memory provider settings failed to load: …` + `Retry` | `t.settings.memoryLayers.statusUnavailable` + `t.common.retry` |

Nenhum dos três componentes tinha o hook de i18n: era copy hardcoded de verdade, não catálogo faltando chave.
Precisei adicionar `useI18n()` nos três — e errei a primeira inserção no modal, colocando o hook **dentro do tipo
das props** (`TS1131` na hora). Movido para o corpo do componente.

Verificação: `src/app/settings` + `src/i18n` = 93 arquivos verdes; gate 14 ok; MSIX reconstruído.

### Rodada 118 — cinco textos do plugin de bots saíram do hardcode

Varri o resto do app (fora de Configurações): 53 ocorrências em 31 arquivos, muitas delas nomes de marca
(Nous Portal, OpenRouter) que ficam como estão. Corrigi as do **plugin de bots**, que é a nossa área:

| Onde | Antes | Agora |
|---|---|---|
| `bot-row.tsx` | `Open recent session`, `Open Group Chat` | `b.bot.openRecentSession`, `b.bot.openGroupChat` |
| `group-chat-view.tsx` | `Start gateway group`, `aria-label="Manage group members"` | `b.group.startGatewayGroup`, `b.group.manageMembersAria` |
| `group-chat-view-members.tsx` | `Save members`, `Cancel` | `b.group.saveMembers`, `t.common.cancel` |

Entraram em `en` + `pt` no `i18n.ts` do plugin e no tipo `BotsMessages`.

### O gate reprovou e estava certo

Meu primeiro tiro usou `{b.bot.openRecentSession ?? ''}`. O `??` conta como **branch**: `GroupRow` foi de CC 22
para 23 e `LegacyGroupChatWorkspace` de CC 36 para 37 — as duas violações **bloqueantes** do `code_health`
("só pode descer"). Removi os fallbacks e tornei as chaves obrigatórias no tipo, preenchendo `ja`/`zh`/`zh-hant`
com o texto em inglês (fallback declarado, igual ao que existia antes). Gate voltou a 14 ok, 0 bloqueantes.

Verificação: `src/plugins/hermes-bots` + `src/i18n` = 132 arquivos / 1074 testes (1 skipped); gate 14 ok; MSIX
reconstruído.

### Rodada 119 — reações de mensagem e controles de janela do WSLg em pt

Dois componentes que não tinham `useI18n` nenhum:

- **`wslg-window-controls.tsx`** — os três rótulos de acessibilidade ("Window controls", "Minimize window",
  "Close window"). O primeiro já existia no catálogo (`shell.windowControls`) e o componente simplesmente não o
  usava; os outros dois entraram em `en` + `pt`.
- **`message-reactions.tsx`** — "No emoji found.", "More emoji" e "Reacted by Hermes" viraram
  `assistant.thread.noEmoji` / `.moreEmoji` / `.reactedByHermes`.

O `FullEmojiPicker` é uma **arrow function com retorno implícito** — não dá para pendurar hook nele. Passei as duas
strings como props e o hook ficou no `ReactionPicker`, que é o dono do popover.

### O teste de completude pegou o resto

`overlay-completeness` reprovou: as cinco chaves novas aparecem sem tradução nos overlays dos outros locales.
Regenerei o `overlay-gaps.json` com `OVERLAY_GAPS_UPDATE=1` — o mecanismo documentado — e o reteste voltou verde
(2/2). O arquivo ganhou exatamente 5 entradas, como esperado.

Verificação: `src/i18n` + `src/app/shell` + `src/components/assistant-ui` = 144 arquivos / 1129 testes; gate 14 ok;
`code_health` 0 bloqueantes; MSIX reconstruído.

### Rodada 120 — seção `tools` do plugin de bots em pt + o que NÃO dá para traduzir ainda

Medi a cobertura do catálogo do plugin: **9 seções**, e o `pt` cobria 6. Entrou a seção **`tools`** (24 chaves:
instalar skill, busca na comunidade com "pode levar ~10s", adicionar servidor MCP, "Salvar e testar",
autorizando, precisa configurar, central de skills, filtrar, nenhum servidor MCP).

Restam **`screen`** (57 chaves) e **`cron`** (61) — o próximo par natural.

### Duas coisas que a varredura mostrou e eu NÃO vou fingir que resolvi

1. **Quick Entry** (a janela do atalho global) tem cinco textos em inglês ("Send to", "Current chat",
   "New session", "Target session", "Quick Entry"). Ela é um renderer separado, **sem `I18nProvider` e sem cliente
   de config** — a locale vem de `display.language` pelo backend, que essa janela não tem. Traduzir de verdade
   exige passar a locale pelo bridge do Electron (main + preload + renderer, com teste). Fica no backlog com esse
   motivo escrito, em vez de um `translateNow()` que cairia sempre no inglês.
2. **`find-bar.tsx`** parecia ter "Right sidebar" solto: eram um comentário e um seletor CSS
   (`aside[aria-label="Right sidebar"]`). Falso positivo — não mexi.

Verificação: `src/plugins/hermes-bots` + `src/i18n` = 132 arquivos / 1074 testes (1 skipped); gate 14 ok; MSIX
reconstruído.

### Rodada 121 — tarefas agendadas dos bots em pt (e um tropeço no meio)

**`i18n-cron-pt.ts`**: as 61 chaves de tarefas agendadas do Bot Mode — criar ("uma tarefa recorrente que o bot
executa numa agenda"), instrução, quando rodar, dia do mês, enviar resultados para, continuidade (cada execução vê a
saída da anterior), as oito frequências, as unidades, e as frases prontas ("Roda de segunda a sexta às 09:00"),
além dos estados (concluída / falhou / entrega falhou / bloqueada pela configuração / pausada por segurança).

### O tropeço

1. Primeiro escrevi o bloco direto no `i18n.ts`. O `code_health` barrou: `i18n.ts` do plugin **passou do teto de
   linhas**.
2. Para corrigir, rodei `git checkout -- i18n.ts` — e isso **apagou a tradução recém-feita**, porque ela ainda não
   estava commitada. Refiz.
3. A extração por faixa de linhas pegou trechos errados duas vezes (o fechamento de `en` não era `  },` como nos
   outros locales, então o recorte invadiu o `ja`). Desisti da cirurgia no inglês.
4. Solução que ficou: o **pt** mora em módulo próprio (`i18n-cron-pt.ts`, novo arquivo, dentro do alvo) e o
   `i18n.ts` só referencia `cron: ptCron`. O arquivo encolheu, o `en` não foi tocado, e o `code_health` voltou a
   **0 bloqueantes**.

Lição registrada: não usar `git checkout --` para "consertar" trabalho não commitado.

Verificação: `src/plugins/hermes-bots` + `src/i18n` = 132 arquivos / 1074 testes (1 skipped); gate 14 ok;
`code_health` 0 bloqueantes; MSIX reconstruído.

### Rodada 122 — tela do bot em pt: catálogo do plugin COMPLETO

**`i18n-screen-pt.ts`** fecha a última seção: a tela VNC do bot. 57 chaves — abrir a tela, os três estados de
instalação (host Linux sem suporte, pacotes ausentes com o comando a rodar, instalar no host com sudo), o hero e o
portal ("Ao vivo · bot no controle" / "você está no controle" / "outro espectador"), o aviso de imagem nova do
sandbox (com a explicação de que /root e /workspace ficam na máquina), assumir e devolver o controle (inclusive a
versão forçada para controlar preso por espectador que saiu) e os avisos de HTTPS.

**Cobertura do catálogo do plugin de bots: 9 de 9 seções com português** — era 0 quando comecei a mexer nele.

Mesmo padrão da rodada anterior, de propósito: módulo irmão + `screen: ptScreen` no `i18n.ts`, sem tocar no inglês
e sem estourar o ratchet de linhas.

Verificação: `src/plugins/hermes-bots` + `src/i18n` = 132 arquivos / 1074 testes (1 skipped); gate 14 ok; MSIX
reconstruído.

### Rodada 123 — captura REAL de Configurações em pt (e três textos que ela denunciou)

**A captura que faltava saiu.** O teclado sintético nunca navegou até o painel; a solução foi **CDP**: subi o app
empacotado com `--remote-debugging-port=9222`, conectei no WebSocket do renderer, naveguei por `location.hash =
'#/settings'` e capturei com `Page.captureScreenshot`. Nada de SendKeys, nada de adivinhação — e é repetível:
`docs/b3po/evidence/configuracoes-pt-final.png` (190,8 KB, 2253×1347).

A captura provou o que o proprietário reclamou e provou também o que ainda estava errado **na própria tela**:

| Antes | Depois |
|---|---|
| trilha `Settings › Modelo › Modelo principal` | `Configurações › Modelo › Modelo principal` |
| `Applies to` | `Aplica-se a` |
| `Medium` (esforço de raciocínio) | `Médio` |

Chaves: `commandCenter.settings` (era a trilha — **não** era `settings.nav.keysSettings`, que eu tinha traduzido
primeiro e não mudou nada), `settings.profileScope.appliesTo` e a família nova `shell.modelOptions`
(`pt_model_options.ts`, 19 chaves: esforço mínimo→ultra, velocidade rápida/ultra-rápida, daybreak).

Sobra em inglês nessa tela só o `custom`, que é **id de provider** (dado, não copy).

### Dois erros meus nesta rodada

1. Traduzi `settings.nav.keysSettings` achando que era a trilha. Não era. Descobri perguntando ao app em execução
   (CDP: procurar o elemento com o texto e ler o `className`/pai) em vez de continuar caçando no código.
2. Na lista de seções esperadas do `pt.test.ts` coloquei `commandCenter` **depois** de `common`. A ordem
   alfabética põe `commandCenter` antes (`comman` < `common`). O teste reprovou e estava certo.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok (precisei limpar `.cache`
antes — o `profile-archives` reprova com cache velho); MSIX reconstruído.

### Rodada 124 — varredura das 13 telas de Configurações por CDP (e o mapa do que falta)

Transformei o truque do CDP em ferramenta: um script abre `#/settings`, **clica** em cada item do menu lateral
como um usuário (via `closest('button, a, [role="button"], li')` + `MouseEvent` com bubbles) e devolve a trilha e
todo o texto visível de cada tela. Resultado salvo em `docs/b3po/evidence/settings-sweep-pt.json` (9,7 KB).

**Trilhas corrigidas** (estavam em inglês só na trilha, porque `subpages` no pt era parcial):

| Antes | Depois |
|---|---|
| Notificações › Desktop alerts | Notificações › **Alertas no desktop** |
| Cobrança › Overview | Cobrança › **Visão geral** |
| Sobre › Version & updates | Sobre › **Versão e atualizações** |
| Avançado › Desktop & startup | Avançado › **Desktop e inicialização** |

Também entraram os demais rótulos que faltavam (`keyboardShortcuts`, `hudGesture`, `screenCapture`,
`notificationSounds`, `archivedSessions`, `defaultDirectory`, `vaultCredentials`, `vaultSources`, `uninstall`,
`billingPlans`, `advancedDesktop` e os três `gatewayManagedUpdates*`).

**O que a varredura mostrou que ainda está em inglês** — e está documentado com foto, não escondido:
`docs/b3po/evidence/aparencia-pt-pendente.png` mostra a tela **Aparência › Geral** com a barra lateral inteira em
português e os títulos/descrições de opção em inglês (Intro Splash, Model Pricing, Reopen Last Chat on Launch,
In-App Tips, Guided Tours). É o bloco `settings.appearance` do catálogo, ~110 chaves, ainda sem pt. Também em
inglês: as descrições longas de `settings.advanced.*` (sleep, F12, browser externo, quick entry).

É o próximo alvo natural, e agora é mensurável.

### Tropeços desta rodada

- O `pt.ts` foi quebrado três vezes ao inserir os rótulos: meu casamento de chaves pegou o `subpages` **aninhado**
  (recuo 8/10, não 4/6) e depois faltou a vírgula na última chave. `tsc` acusou na hora, corrigi na sequência.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok (limpei `.cache` de novo —
o `profile-archives` reprova com cache velho, e o script só remove depois do gate: ordem errada da minha parte).

### Rodada 125 — Aparência inteira em português (o maior bloco que faltava)

Traduzi `settings.appearance` — **79 chaves** cobrindo as seis sub-páginas de Aparência: modo de cor, escala da
interface e do texto, exibição de chamadas de ferramenta (Produto/Técnico), esconder diffs e barras da linha do
tempo, densidade da lista de conversas, faixa de abas, ações do app na barra de título, fonte do terminal e da
conversa (com a amostra "Um pequeno jabuti xereta viu dez cegonhas felizes"), translucidez (vidro, tonalidade,
frost, escopo), fundo da conversa, balão de mensagem, direção do texto, splash, preço dos modelos, reações, dicas,
tours, compositor flutuante, navegador de arquivos, corações, incorporações inline, reabrir última conversa, tema e
instalação de tema do VS Code.

Também entrou `settings.search` ("Buscar" na barra do painel) — esse só apareceu na foto.

**Descoberta técnica que destravou tudo**: o override do pt aceita **objeto parcial aninhado**. Eu tinha assumido
que precisava entregar as 79 chaves de uma vez (ou nada); testei com duas chaves, o `tsc` passou, e aí deu para
traduzir o bloco inteiro sem risco de meio-termo. O `pet.*` (mascotes) ficou de fora desta rodada, ainda em inglês.

Verificação: **Aparência › Geral 100% em português** — `docs/b3po/evidence/aparencia-pt-final.png`, capturado do
app empacotado por CDP. Também salvei `docs/b3po/evidence/home-pt.png` (Home em pt, com o mascote e o hero).

**Achado novo na Home**: o agrupamento de datas da barra lateral ainda diz "EARLIER TODAY". Está no backlog.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Tropeço

O `electron-builder` falhou com `EPERM ... unlink B-3PO.exe` porque eu tinha deixado o app aberto para as capturas.
Fechei e refiz — sem estrago, mas o build chegou a sair 1 antes de passar.

### Rodada 126 — mascotes em pt + o "EARLIER TODAY" da barra lateral

Dois blocos que a varredura tinha marcado como pendentes:

- **`sidebar.dateDivider` + `statusDivider` + `markAllRead`**: "MAIS CEDO HOJE" no lugar de "EARLIER TODAY".
  Confirmado no app em execução lendo o DOM (não só no código): `docs/b3po/evidence/home-datas-pt.png`.
  Já com `Ontem`, "Mais cedo esta semana", "Semana passada", "Mais cedo este mês", "Trabalhando"/"Concluído" e
  "Marcar tudo como lido".
- **`appearance.pet.*`** (24 chaves): adotar mascote, tamanho, passear quando ocioso, galeria com busca, 标签 de
  instalado/gerado, renomear, apagar (com o aviso de que não dá para reinstalar), exportar, e as falhas de
  adotar/desinstalar/renomear/exportar.

Verificação: `src/i18n` + `src/app/settings` + `src/app/shell` = 112 arquivos / 908 testes; gate 14 ok; MSIX
reconstruído.

### Tropeço

O primeiro script de inserção montou a chave pai com o dois-pontos junto (`"sidebar:"`), então procurou
`"  sidebar:: {"` e não achou nada. Silencioso do jeito pior: imprimiu "nao encontrado" e eu quase segui adiante.
Corrigi lendo o nome sem o `:`.

### Rodada 127 — Avançado › Desktop e inicialização em pt

Traduzi `settings.config` (**38 chaves**, o bloco que aparece em Avançado › Desktop e inicialização): minimizar
para a bandeja, manter o computador acordado (Desligado/Enquanto trabalha/Sempre) com a explicação de que
"Enquanto trabalha" segura só durante o turno, desativar DevTools do F12, abrir links sempre no navegador externo,
tamanho máximo de prévia/imagem (com o aviso de que valor alto pode travar o app), atalho de gravação de voz,
e os estados vazios/erro ("Nada para configurar", "A configuração falhou ao carregar", "JSON de configuração
inválido").

Mais `settings.quickEntry` (**7 chaves**) — o painel da Entrada rápida, incluindo o motivo de o atalho precisar de
modificador e o aviso de atalho já usado por outro app.

E a linha `updates.nonInteractiveLocalChanges` em `fieldLabels`/`fieldDescriptions` — "Alterações locais em
atualizações pelo app", com a explicação de stash/discard.

Evidência: `docs/b3po/evidence/avancado-pt.png`.

**O que ficou de fora, com motivo**: o seletor dessa última opção ainda mostra **"Stash"** — os valores do enum
(`stash`/`discard`/`ask`) vêm do schema do backend, que o frontend apenas capitaliza. Traduzir isso é mexer no
mapeamento de enum do frontend; fica registrado como pendência em vez de forçar.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Rodada 128 — texto de campos: desktop, agente e terminal em pt

**Medi antes de escrever**: o catálogo de campos tem **145 rótulos + 70 descrições**, e o pt cobria **5 + 5**.
Ou seja, ~205 strings — a maior lacuna restante do painel, e a que explica por que algumas telas ainda misturavam
idioma mesmo com a navegação traduzida.

Nesta rodada entraram os grupos **`desktop`**, **`agent`** e **`terminal`** (rótulos e descrições): descoberta
automática de repositórios e suas pastas, máximo de passos do agente, anexos de imagem, tentativas de API, camada
de serviço, obrigar uso de ferramentas, diretório de trabalho, backend de execução, tempo limite de comando, shell
persistente (com a explicação do SSH), repasse de variáveis e as quatro imagens de contêiner
(Docker/Singularity/Modal/Daytona).

Evidência: `docs/b3po/evidence/terminal-pt.png` (Avançado › Backend do terminal).

**O que NÃO funcionou, e eu removi em vez de deixar sem efeito**: tentei sobrescrever no `fieldDescriptions` a
descrição de `terminal.backend` e `terminal.timeout`. Não pegou — o app continua mostrando "Terminal execution
backend" e o valor numérico sem ajuda. Essas duas vêm do **schema do backend**, não do `FIELD_DESCRIPTIONS` do
frontend. Removi as duas chaves que eu tinha adicionado: código sem efeito é pior que ausência declarada.
Mesma família do "Stash" da rodada anterior: o que vem do schema precisa de outra camada para traduzir.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Rodada 129 — memória, contexto, compressão, voz, aprovações e segurança em pt

Segundo lote de texto de campos (o primeiro foi desktop/agente/terminal). Entraram os grupos
**`memory`**, **`context`**, **`compression`**, **`delegation`**, **`voice`** (incluindo `gptLive`),
**`approvals`**, **`security`** e **`checkpoints`** — rótulos e descrições:

- memória persistente, perfil do usuário, orçamentos, provedor de memória
- motor de contexto
- compactação automática, limite, alvo, mensagens recentes protegidas
- modelo/provedor/limites/esforço dos subagentes
- duração da gravação, ler respostas em voz alta, modo de conversa por voz, voz e persona do GPT-Live (com a
  explicação de que a camada de voz custa US$ 0,05 por minuto)
- modo e tempo limite de aprovação, ocultar segredos, pontos de restauração

Cobertura medida agora: **56 de ~104 rótulos** e **47 de ~64 descrições** (era 5 + 5 no início do dia).
Evidência: `docs/b3po/evidence/memoria-pt.png`.

### O teste pegou uma chave inventada

`pt-coverage` reprovou com seis chaves: eu criei `fieldDescriptions.delegation.*` — esse grupo **não existe** no
`FIELD_DESCRIPTIONS` do inglês (só no de rótulos). Removi inteiro. Era exatamente o tipo de erro que o teste existe
para pegar: tradução bonita de chave que nunca é lida.

### A limitação que agora está provada com experimento

Hipótese: as descrições que vêm do **schema do backend** poderiam ser sobrescritas pelo `fieldDescriptions`.
Testei com `memory.provider` (a tela mostrava "Memory provider plugin"), reconstruí o renderer e conferi no app em
execução: **continua em inglês**. Somado ao teste da rodada anterior (`terminal.backend`), são duas evidências de que
**não é sobrescrevível pelo frontend**. Removi a chave de teste — código sem efeito não fica.

Isso delimita o que resta: o que está em inglês no painel agora é (a) ~48 rótulos e ~17 descrições do catálogo do
frontend, que ainda posso traduzir, e (b) descrições e valores de enum vindos do schema, que exigem outra camada
(i18n no backend ou um mapa no painel) — não é trabalho de tradução.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Rodada 130 — rótulos planos de topo (fuso, ferramentas, leitura de arquivo)

Entraram as chaves planas do `FIELD_LABELS` que ainda faltavam — as que aparecem no topo de painéis, não dentro de
um grupo: **conjuntos de ferramentas ativos**, **fuso horário**, **limite de leitura de arquivo** e **lista de
comandos permitidos**. E as descrições de `timezone` e `fileReadMaxChars`.

### Duas vezes seguida o mesmo erro — e agora virou regra

Nas duas últimas rodadas criei chaves de descrição que **não existem no inglês** (`fieldDescriptions.delegation.*`,
depois `toolsets` e `commandAllowlist`). O teste `pt-coverage` pegou as duas. Boa notícia: o teste funciona. Má
notícia: eu repeti o erro.

**Regra que passo a seguir**: antes de escrever qualquer bloco de descrição, extraio a lista exata de chaves do
`FIELD_DESCRIPTIONS` e testo a interseção — em vez de "traduzir o que faz sentido". O catálogo é a fonte, não a
minha intuição sobre o que deveria existir.

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Rodada 131 — a regra nova funcionou: zero chave inventada

Apliquei a disciplina que prometi na rodada anterior: **parsear os dois lados e comparar conjuntos de chaves** antes
de escrever. O script monta o dicionário pontuado (`tts.xai.voiceId`, `stt.elevenlabs.diarize`, …) do
`FIELD_LABELS`/`FIELD_DESCRIPTIONS` do inglês e do `pt.ts`, e imprime **só o que falta**.

Resultado: **54 rótulos + 16 descrições** traduzidos, e **nenhuma chave inventada** — primeira rodada em três sem
esse erro.

Entrou nesta rodada:

- **`tts`** inteiro (23 chaves): provedor, Edge, OpenAI, ElevenLabs, xAI (voz, idioma, velocidade, tags automáticas,
  latência, taxa de amostragem, bitrate), MiniMax, Mistral, Gemini, NeuTTS, KittenTTS, Piper, DeepInfra
- **`stt`** inteiro (11): fala para texto, repetir transcrições, transcrição ao vivo, modelo local, idioma, e os
  modelos por provedor com separação de falantes e marcação de eventos de áudio
- **`toolOutput`**, **`codeExecution.mode`**, **`browser.allowPrivateUrls`/`autoLocalForPrivateUrls`/`useRealProfile`**,
  **`checkpoints.maxSnapshots`**, **`security.allowPrivateUrls`**, **`approvals.mcpReloadConfirm`**,
  **`auxiliary.compression.timeout`**, **`updates.nonInteractiveLocalChanges`** (rótulo)

### Cobertura medida, agora com número que fecha

**97 de 106 rótulos (91%)** e **48 de 49 descrições (97%)** do catálogo de campos — era **5 + 5** no início.
O que sobra são chaves que o parser não resolve por serem multi-linha no inglês; ficam para a próxima.

Evidência: `docs/b3po/evidence/voz-pt.png` (Voz › Conversa por voz, com o aviso de custo por minuto).

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Rodada 132 — catálogo de campos: 106/106 rótulos e 49/49 descrições

Fechei os últimos três rótulos que faltavam (`approvals.mcpReloadConfirm`, `security.allowPrivateUrls`,
`checkpoints.maxSnapshots`) e conferi o resto com o verificador.

**Número final, medido por script**: **106 de 106 rótulos** e **49 de 49 descrições** — e, importante,
**zero valores idênticos ao inglês**, ou seja, nada foi "traduzido" copiando.

O verificador também aponta **duas chaves falsas** que ele mesmo inventa ao ler valores multi-linha
(`voice.chained`, `updates.nonInteractiveLocalChanges`). Conferi no arquivo: as traduções reais dessas duas existem
(`voiceChatMode`, e o texto de `updates`). É limitação do meu parser, não do catálogo — registro para não inflar
número nenhum.

### O que sobrou em inglês no painel

Só o que **não é do catálogo do frontend**:
- descrições e valores de enum que vêm do **schema do backend** (`terminal.backend`, `memory.provider`,
  `updates.nonInteractiveLocalChanges` → "Stash"), provado em duas rodadas que não são sobrescrevíveis daqui;
- textos de tela fora do catálogo (Quick Entry, que precisa de locale pelo bridge).

Verificação: `src/i18n` + `src/app/settings` = 93 arquivos / 725 testes; gate 14 ok; MSIX reconstruído.

### Rodada 133 — Quick Entry deixa de nascer em inglês (ponte de locale entre janelas)

Era a última lacuna de i18n real que eu tinha mapeado: a **janela do atalho global** é um renderer separado, sem
`I18nProvider` e sem cliente de config, então `display.language` — a fonte canônica — nunca chegava até ela.

**Como resolvi, sem duplicar a leitura de config:**

1. `src/i18n/window-locale.ts` (novo): `persistDesktopLocale` / `readDesktopLocale` / `adoptDesktopLocale` sobre uma
   chave compartilhada (`b3po.desktop.activeLocale`). As duas janelas compartilham o mesmo `localStorage` — mesma
   origem, mesma partição.
2. `context.tsx` grava a locale resolvida no efeito que já a aplicava (uma linha, sem novo caminho de dados).
3. `quick-entry-root.tsx` chama `adoptDesktopLocale()` **antes** de renderizar, então `translateNow` já responde no
   idioma certo quando o React monta.
4. `quick-entry-app.tsx` passou a usar `translateNow('settings.quickEntryWindow.*')` nos quatro textos
   ("Send to", "Current tab", "New session", "Target session") com `en` + `pt` no catálogo.

**Testes novos**: `window-locale.test.ts` com **7 casos** — publica, lê, ignora valor desconhecido, devolve `null`
sem nada publicado, aplica no tradutor de módulo, mantém o padrão quando vazio, e não explode quando o
`localStorage` nega acesso.

`overlay-completeness` pediu o registro das 4 chaves novas em `overlay-gaps.json`; regenerei com
`OVERLAY_GAPS_UPDATE=1` (+4 entradas, como esperado) e o reteste passou.

**Limitação declarada**: `translateNow` não é reativo — se o usuário trocar o idioma com a janela do Quick Entry
aberta, ela só reflete na próxima abertura. É aceitável para um compositor de atalho que vive segundos; registrar
evita prometer o que não existe.

Verificação: `src/i18n` + `src/app/quick-entry` + `src/app/settings` = 95 arquivos / 733 testes; gate 14 ok; MSIX
reconstruído.

### Rodada 134 — medição honesta do inglês residual: 5 linhas em 13 telas

Rodei a varredura por CDP nas **13 telas de Configurações** com o app empacotado e contei as linhas que ainda
parecem inglês (heurística: palavras funcionais em inglês, sem acento, descontando nomes de marca/provedor).

Antes desta rodada: **8 linhas**. Traduzi 3 (duas de `updates` — "não foi possível falar com o servidor de
atualizações", "o backend já está na versão mais recente" — e o `pluginPages.blurb`). **Agora: 5.**

As 5 restantes, com o motivo de cada uma:

| Tela | Texto | Motivo |
|---|---|---|
| Provedores | "Sign in with a subscription…" | `quickEntry.providers.intro` — bloco `quickEntry` de topo **não existe no pt** (ver dívida abaixo) |
| Cobrança (2) | "Connect your Nous account" + corpo | mesma causa: `quickEntry.billing.state.notice.loggedOut.*` |
| Sobre | "No Python interpreter is available…" | vem do **schema do backend** |
| Avançado | "When Hermes updates itself…" (descrição) | também do schema — o catálogo tem a tradução, o app mostra a do schema |

### Dívida estrutural que eu encontrei e NÃO consertei às pressas

O `pt.ts` tem deriva de aninhamento: o bloco `settings.quickEntry` (chaves do painel "Entrada rápida") está no
**nível de topo** com recuo inconsistente, e `subpages` aparece **depois** dele (linha ~1140), embora os rótulos de
sub-página funcionem nas capturas. Tentar criar um `quickEntry` de topo para os 3 textos da janela esbarra em
`TS1117` (chave duplicada) e num `settings` que não contém `subpages`.

Isso é dívida real, não cosmética: qualquer tradução futura de `quickEntry.*` vai bater nela. **Parei** em vez de
fazer cirurgia de aninhamento no fim da rodada — o arquivo está funcionando e verde, e quebrar i18n inteiro para
ganhar 3 strings seria troca ruim. Fica registrado como a próxima tarefa de limpeza, com o diagnóstico pronto.

Verificação: `src/i18n` + `src/app/settings` = 94 arquivos / 732 testes; gate 14 ok; MSIX reconstruído.

### Rodada 135 — investigação da dívida do catálogo (sem mudança de código, de propósito)

Fui atacar as 3 linhas restantes de `quickEntry.*` e **descobri que o catálogo inglês e o tipo discordam**: o
`en.ts` tem `quickEntry.providers` num bloco que meu rastreio resolve como topo, mas `types.ts` só declara
`quickEntry` **dentro de `settings`** — e esse, por sua vez, só aceita as chaves do painel (`enabledTitle`, …).

Tentei as duas rotas e as duas reprovam em `tsc`:
- `quickEntry` no topo → `TS2353: 'quickEntry' does not exist in type …`
- `providers` dentro de `settings.quickEntry` → `TS2353` com a lista fechada de chaves do painel

**Revertí tudo**: o `git status` voltou vazio. O arquivo está exatamente como estava, verde (119 testes de i18n).

Em vez de forçar, escrevi **`docs/b3po/PT-CATALOG-DEBT.md`**: estado medido, as 5 linhas com caminho e motivo, o
que já descobri sobre o bloqueio, o que **não** fazer (renomear, duplicar em en, cirurgia no fim da rodada) e o
roteiro de ataque em 5 passos. A próxima tentativa começa informada em vez de repetir a investigação.

Rodada sem código novo é o certo aqui: o ganho eram 3 strings e o risco era o i18n inteiro.

### Rodada 136 — inglês residual caiu para 2 linhas (e meu diagnóstico anterior estava errado)

Na rodada passada eu registrei que as 3 strings pendentes viviam em `quickEntry.*` e que catálogo e tipo
divergiam. **Errado.** Refiz o rastreio com **contagem de chaves** (autoritativa) em vez de recuo de indentação:
elas estão em `settings.providers.intro`, `settings.billing.state.notice.loggedOut.*` e `settings.pluginPages.blurb`.

Traduzi o bloco **`settings.providers` inteiro** (20 chaves: conectar conta, "prefere usar chave de API?",
conectado, recolher, conectar outro provedor, desconectar, os textos de remoção por terminal/CLI/chave, busca de
chaves, endpoint local/personalizado, carregando) e o aviso de conta Nous em Cobrança.

**Inglês residual nas 13 telas: 5 → 2.** As 2 restantes são **schema do backend** (`Sobre` e uma descrição em
`Avançado`), provadamente não sobrescrevíveis pelo frontend.

Evidência: `docs/b3po/evidence/provedores-pt.png`, `docs/b3po/evidence/cobranca-pt.png`. Corrigi também o
`PT-CATALOG-DEBT.md`, que agora diz a verdade em vez do diagnóstico errado.

Verificação: `src/i18n` + `src/app/settings` = 94 arquivos / 732 testes; gate 14 ok; MSIX reconstruído.

### Rodada 137 — suíte desktop completa: 16.733 passam, 56 falham (todas pré-existentes)

Rodei a suíte **inteira** do desktop, não só as pastas que eu vinha mexendo. Resultado honesto:

| | |
|---|---|
| Testes | **16.733 passam**, **56 falham**, 216 pulados (de 17.005) |
| Arquivos | **1.915 passam**, **29 falham**, 18 pulados (de 1.962) |

**Nenhum dos arquivos que falham foi tocado por este branch** — `git diff --stat main..HEAD` nesses caminhos
volta vazio. Conferi a amostra `src/sdk/profile-routing.test.ts`: falha com
`TypeError: Cannot read properties of undefined (reading 'finally')`, erro de mock/ambiente, e o arquivo é byte a
byte o de `main`.

Pior que o número de antes (eu vinha reportando "5 testes upstream falham por Windows") porque agora medi a suíte
toda em vez de só as pastas do meu trabalho. A concentração está em `electron/` e `scripts/` (empacotamento, tray,
updater, assinatura de payload, instalador) — áreas que dependem de Windows real/rede/artefato assinado — e em
alguns testes de keybinds/roteamento com mock incompleto. **Nenhuma falha é de texto traduzido.**

Isso não isenta o produto: 56 testes vermelhos precisam de triagem um a um. O que está garantido é que o número
não foi causado pelo trabalho desta sessão, e isso agora está escrito com evidência, não suposição:
`docs/b3po/BASELINE-DESKTOP-SUITE.md` (lista arquivo por arquivo) e a tabela em `TEST-RESULTS.md`.

### Rodada 138 — dois bugs reais achados ao triar as falhas de UI (e os dois eram meus)

Fui atrás das 56 falhas da suíte e encontrei **duas que o trabalho desta sessão causou**:

**1. `/crm` abria um chat chamado "crm".** O branch adicionou `{ id: 'crm', path: '/crm', view: 'crm' }` em
`APP_ROUTES`, mas a lista de `<Route>` (`app/contrib/surfaces.tsx`) é mantida à mão em outro arquivo e ficou sem a
entrada. Sem `<Route>`, o caminho casa com `:sessionId` e o app abre uma sessão com o nome da página — exatamente o
que o teste `surfaces.app-routes.test.tsx` denuncia: *"/crm has its own route and never opens as a session"*.
Corrigi com `<Route element={page(<CrmView />)} path="crm" />`, com `CrmView` em `lazy()` como as outras páginas.

**2. O item CRM da sidebar estava sem rótulo.** O rótulo vem de `s.nav[item.id]`; a chave `sidebar.nav.crm` não
existia, então o `?? item.label` caía no `label: ''` da definição e a linha aparecia só com o ícone. Adicionei
`crm: 'CRM'` no `en.ts` e no `pt.ts`.

**3. De brinde, o painel "Atalhos de teclado" inteiro em português.** A falha do `keybinds/actions.test.ts`
(`pt: expected false to be true`) era consequência de eu ter criado o locale `pt`: o teste passa a cobrir todos os
idiomas e exige que a dica `voiceShortcutHintDesc` cite o nome da ação **no mesmo idioma**. A dica dizia "conversa
por voz" e a ação só existia em inglês. Traduzi o bloco `keybinds` completo em `src/i18n/pt_keybinds.ts` — **107
nomes de ação** (sessão, perfis, compositor, visualização, abas, terminal) + rótulos do painel.

Também tirei o link "Abrir a página do CRM" de dentro da própria página do CRM (virava link para onde o usuário
já está), via prop `showOpenLink` — sem tocar no router, que quebraria os 7 testes da seção.

Evidência: `docs/b3po/evidence/crm-page-pt.png` (CRM em português, sidebar com "CRM" rotulado).
Verificação: `src/app/settings` + `src/app/contrib` + `src/i18n` = **122 arquivos / 990 testes**; gate 14 ok; MSIX
reconstruído.

**Nota honesta sobre as outras falhas:** `browser-hints.test.tsx` passa sozinho (9s) e falha na suíte completa —
é timeout sob carga paralela, não assertion. Registrado como tal, não como "verde".

### Rodada 139 — projeto `|ui|` verde na prática: 12.872 passam, 4 falham (timeout, provado)

Rodei a suíte `src/` inteira: **12.872 testes passam, 4 falham em 3 arquivos**. Os 3 arquivos levam ~20 s cada e
falham no limite; com `--no-file-parallelism` os **12/12 passam** em 20,66 s. É timeout sob carga, medido e não
suposto.

**Duas correções reais nesta rodada:**

1. **`traceWakeStep` quebrava com valor não-Promise.** `src/sdk/wake-trace.ts` fazia `work.finally(...)`; quando
   `dial()` devolve `undefined` (stub, caminho rápido em cache), isso é `TypeError` — enquanto `await undefined`
   é perfeitamente legal. Quem estava errado era o wrapper, não o chamador. Troquei por
   `Promise.resolve(work).finally(...)`. `src/sdk/profile-routing.test.ts` foi de **6 falhas para 49/49**.
2. **`skip-gate.test.tsx` fixava a copy antiga.** O teste procurava "Let's get you setup with Hermes Agent"; o
   rebrand desta sessão trocou para "…with B-3PO". O contrato do arquivo é o *gate* (o overlay abre ou não), não
   o literal, então atualizei o literal e deixei o contrato intacto.

Somando as duas rodadas, saíram **9 testes vermelhos** e **2 bugs de produto** (`/crm` caindo em sessão, wrapper
que quebrava com não-Promise). O que sobra de vermelho é `electron/`/`scripts/` e os 3 arquivos de timeout.

### Rodada 140 — baseline recontado (56 → 43) e dois vermelhos que eram meus

Descobri que a medição anterior estava **inflada por erro meu**: rodei a suíte com `HERMES_PYTHON` apontando para o
Python do checkout ativo, que não tem `ruamel.yaml`. Os testes de `electron/` que falam com o lado Python morriam
com `ModuleNotFoundError` e eu contei isso como falha de produto.

Com o Python do testenv: **43 falhas em 23 arquivos** (era 56/29), **16.746 passam**.

Correções desta rodada:

1. **`locales/_keys.desktop.json` desatualizado** — o teste `scripts/i18n-keys.test.mjs` cobrou o arquivo derivado
   das chaves do `en.ts`. Foi o meu próprio i18n (`settings.providers`, `keybinds`, `sidebar.nav.crm`, `updates`).
   Regenerei com `npm run i18n:keys`; passa 2/2.
2. **`electron/tray-host.test.ts` (3 falhas)**: `process.getuid is not a function` no Windows — o módulo é
   `watchLinuxTrayHost` (D-Bus do Linux) e o arquivo não tinha guarda de plataforma. Marquei
   `test.skipIf(process.platform !== 'linux')`, seguindo `app-relaunch.test.ts`. Viraram 3 pulados com motivo.

Sobre os 43 restantes: symlink/ACL no Windows (17), empacotamento e assinatura (23) e timeout sob carga (3).
Nenhum é de tradução, marca ou produto — e agora o número tem procedência medida.

### Rodada 141 — tarefas do CRM: da conversa ao acompanhamento

O CRM tinha contatos e funil, e nada entre a conversa e o acompanhamento. Implementei **tarefas** com o mesmo
desenho dos outros dois stores (JSON sob `userData`, `write` + `rename` atômicos, validação no processo principal,
erro de validação como resposta e não como exceção):

- `electron/crm-tasks-store.ts` + `crm-tasks-ipc.ts` (registrados no mesmo `mountCrmContacts`), ponte `crmTasks` no
  preload, cliente tipado `src/api/crm-tasks.ts` e a tela `crm-tasks-section.tsx`, montada em `/crm` e em
  Configurações.
- Prazo em **timestamp**, não data local: trocar de fuso não muda o vencimento. "Atrasada" é calculado do relógio
  de agora, nunca gravado — tarefa que venceu ontem fica atrasada hoje sem ninguém tocar nela.
- Ordem do quadro: abertas antes das concluídas, prazo mais próximo primeiro, sem prazo no fim. Vínculo com contato
  é opcional.

**Prova real, não mock**: no app empacotado, via CDP, digitei um título e cliquei "Adicionar tarefa" — a tarefa
apareceu na lista e o arquivo `crm-tasks.json` foi criado no perfil (342 bytes). Evidência:
`docs/b3po/evidence/crm-tarefas-pt.png`.

Dois erros meus que os testes pegaram antes de mim: a copy da seção repetia "não tem disco local" (colidia com a de
contatos na mesma página, e era ruído para o usuário) e os nomes de placeholder do `pt` não batiam com o `en`
(`abertas` vs `open`) — o teste de cobertura compara os nomes dentro do template porque um nome trocado renderiza
`undefined`. Os dois corrigidos.

Verificação: `electron/crm` + `src/app/settings` + `src/i18n` = 94 arquivos / 732 testes; gate 14 ok; MSIX
reconstruído.

### Rodada 142 — indicadores do CRM, com números que saem do disco

Seis números no topo de `/crm`: contatos, oportunidades abertas, valor em aberto, ganho, tarefas abertas e tarefas
atrasadas. `summarizeCrm()` é puro e testado; a faixa **não desenha** enquanto os três stores não respondem (número
pela metade é pior que nenhum) e some inteira sem bridge, em vez de mostrar zeros que seriam mentira.

Prova com dados reais semeados no perfil (2 contatos, R$ 15.000 em negociação, R$ 4.500 ganho, 2 tarefas com 1
atrasada): a faixa renderizou `Contatos 2 · Oportunidades abertas 1 · Valor em aberto R$ 15.000,00 · Ganho
R$ 4.500,00 · Tarefas abertas 2 · Tarefas atrasadas 1`. Evidência: `docs/b3po/evidence/crm-indicadores-pt.png`.

**Erro meu, do tipo que não faz barulho:** usei `text-(--ui-danger)` — um token que não existe neste app. A cor
simplesmente não aplicava e nada quebrava. Troquei por `text-destructive` e passei a verificar a **cor computada**
(`rgb(248, 81, 73)` na célula de atrasadas contra `srgb(0.90…)` nas outras), não o "parece certo" na captura.

Também registrei a duplicação consciente de `taskCounts` (store do processo principal e cliente do renderer): duas
cópias de uma regra só continuam iguais se alguém cobrar, então um teste roda as duas sobre a mesma lista e compara.

### Rodada 143 — funil do CRM virou funil na tela

O funil existia no dado e não na tela: era uma lista única com seletor de estágio em cada linha. Agora são sete
colunas, cada uma com contagem e total reais da etapa, com o cartão mantendo mover/perder/remover.

**Três iterações até ficar legível**, e as duas primeiras eram erro de produto:

1. colunas elásticas espremiam sete etapas a ponto de truncar os nomes ("Neg o…") e sobrepor o seletor ao botão;
2. largura fixa com rolagem horizontal tirou duas colunas da tela e quebrou o valor no meio do número;
3. **final**: colunas de largura fixa que quebram em duas linhas — funil inteiro visível —, telefone e valor em
   linhas separadas no cartão.

Também subi a página do CRM de `max-w-3xl` para `max-w-6xl`: sete colunas não cabiam na largura antiga. Evidência:
`docs/b3po/evidence/crm-funil-pt.png`, com dados reais semeados (Negociação R$ 15.000, Ganho R$ 4.500).

### Rodada 144 — PR #1 atualizado com o estado real (estava 72 commits e várias correções atrás)

O corpo do PR ainda descrevia 142 commits e HEAD `55deba5cd2`. A branch está em **214 commits / `57f59691c0` / 770
arquivos**, e o texto não mencionava nada do que mudou desde então. Reescrevi com o que é verificável hoje:

- **Idioma**: inglês residual nas 13 telas caiu para **2 linhas** (ambas do schema do backend), e o painel de
  atalhos entrou em pt-BR com 107 nomes de ação.
- **CRM no desktop**: página `/crm` com indicadores reais, contatos, funil em 7 colunas e tarefas — com as três
  evidências novas.
- **Suítes**: números medidos (16.746/43/216 no desktop completo; i18n 119; settings 725; bots 1.074; mobile 165;
  CRM 140; gateway 19), e a explicação de que **nenhuma das 43 falhas é de marca, tradução ou produto**.
- **Correções da triagem**: `/crm` caindo em sessão, `traceWakeStep` com não-`Promise`, `tray-host` sem guarda de
  plataforma, `locales/_keys.desktop.json` desatualizado.
- **Transparência**: registrei que o baseline inicial de 56 falhas estava inflado por `HERMES_PYTHON` apontando
  para um Python sem `ruamel.yaml`.
- **Limitações**: as 2 linhas de schema, Quick Entry não reativo, sessão do mobile não persistindo, aprovação sem
  gateway real, CRM sem conversas, instalação/atualização/desinstalação não testadas, robô estático por decisão
  do proprietário.

Continua **draft** e **NOT_READY**, como o GOAL exige: não fechar, não mesclar, não publicar.

### Rodada 145 — filtro no funil (busca livre + estágio), com contagens honestas

`filterOpportunities()` puro e testado (8 casos): busca em título, telefone e motivo da perda; recorte por estágio.
As contagens das colunas e o rótulo `1 de 2` usam o conjunto filtrado — coluna dizendo "3" com um cartão seria
mentira.

Prova no app: digitei "Consultoria" via CDP, o quadro foi para `1 de 2`, "Implantação" saiu e "Consultoria" ficou
(`docs/b3po/evidence/crm-filtro-pt.png`).

Dois defeitos pegos antes de mim: o `aria-label` do filtro repetia o do cartão (`Stage`), o que quebrou o teste da
seção por ambiguidade e confundiria leitor de tela — virou "Filtrar por etapa"; e o rótulo dizia "limpar" ao lado
do botão "Limpar filtro".

### Rodada 147 — oportunidade de contato excluído deixa de parecer normal

Apagar contato não apaga a oportunidade (o histórico vale), mas o cartão mostrava um telefone solto sem aviso.
`isKnownContact()` puro e testado: telefone fora da lista de contatos → o lugar do valor diz "contato excluído" em
cor de perigo; sem telefone continua sendo item solto, que é permitido.

Prova no app empacotado com perfil semeado (oportunidade apontando para telefone inexistente): cartão renderizou
"contato excluído". Evidência: `docs/b3po/evidence/crm-contato-excluido-pt.png`.

**Erro meu:** o primeiro `replace` não casou a linha do cartão e o script imprimiu "cartão marcado" mesmo assim —
a verificação no app mostrou a marca ausente. Corrigi o alvo, confirmei por `grep` no fonte e só então pela
captura. É o tipo de falso positivo que só a verificação externa pega.

### Rodada 148 — tentativa revertida: marcar contato excluído nas tarefas

Tentei estender a marca "contato excluído" (rodada 147, oportunidades) para as **tarefas**. A edição de copy caiu na
seção errada do catálogo duas vezes seguidas (`crmTasks` × `crmPipeline`), o `tsc` acusou as duas, e eu **revertí**
tudo em vez de insistir: `git status` voltou vazio, HEAD continua `12b16e3651`, e as áreas afetadas seguem verdes
(**95 arquivos / 741 testes** em `src/app/crm` + `src/app/settings` + `src/i18n`).

**O que ficou pendente, com o diagnóstico pronto:** `crm-tasks-section.tsx` linha ~185 monta o subtítulo da tarefa
com `task.contact_phone` direto. O `isKnownContact()` já existe em `src/app/crm/filters.ts` e já é usado no cartão do
funil; falta só a chave `contactRemoved` dentro de `settings.crmTasks` (ela existe em `settings.crmPipeline`) e a
troca no array do subtítulo.

**Por que parei:** duas tentativas de inserir a chave produziram catálogo inválido, e o custo de continuar às cegas
(contexto curto) era maior que o benefício de uma linha de texto. Reverter e registrar é mais honesto que deixar meio
caminho quebrado.

### Rodada 149 — contato excluído nas tarefas: o pendente da rodada 148, fechado

A rodada 148 reverteu esta mudança porque a copy caiu duas vezes na seção errada do catálogo. Aqui a inserção foi
**determinística**: localizei o bloco `crmTasks: {` por regex e medi o fechamento por **contagem de chaves**, então a
chave entrou no bloco certo nos três arquivos (`types.ts`, `en.ts`, `pt.ts`) — `tsc` limpo na primeira tentativa.

A tarefa agora troca o telefone cru pelo aviso quando o contato não existe mais:
`task.contact_phone && !isKnownContact(contacts, task.contact_phone) ? copy.contactRemoved : task.contact_phone`.

**Prova no app empacotado** (perfil com contatos vazio e uma tarefa apontando para um telefone): a linha renderizou
`Alta · vence 05/11/2026 · contato excluído`. Evidência:
`docs/b3po/evidence/crm-tarefa-contato-excluido-pt.png`.

Verificação: `src/app/crm` + `src/app/settings` + `src/i18n` = **95 arquivos / 741 testes**; gate 14 ok.
