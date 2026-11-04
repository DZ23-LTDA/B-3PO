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
