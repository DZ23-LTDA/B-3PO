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
