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
